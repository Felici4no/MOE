"""Cobrança na Stripe (modo teste).

- Equipe/Empresa: Checkout mode=subscription; faturas recorrentes geradas pela Stripe Billing.
- Enterprise: sem checkout; vira um Lead para contato direto.
- Portal de cobrança para a empresa trocar cartão, baixar faturas e cancelar.
- Coleta de CPF/CNPJ e endereço. Stripe Tax ainda não é suportada no Brasil: STRIPE_AUTOMATIC_TAX fica false
  e a NFS-e é emitida fora da Stripe.
Preços vêm dos lookup_keys criados por scripts/stripe_catalog.py; o valor nunca vem do cliente.
Sem chave Stripe, só em dev, a assinatura é simulada.
"""
from datetime import UTC, datetime, timedelta

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import new_secret
from app.domain.plans import PLANS_BY_ID, PLANS_BY_LOOKUP
from app.models import Lead, Role, Tenant, User
from app.repositories import Users
from app.schemas import CheckoutOut, LeadInput
from .errors import ServiceError, forbidden

ACTIVE = {"active", "trialing"}


def _ts(value) -> datetime | None:
    return datetime.fromtimestamp(value, UTC) if value else None


class Billing:
    def __init__(self, db: Session, settings: Settings):
        self.db, self.settings = db, settings
        self.key = settings.stripe_secret_key.get_secret_value()

    # --- helpers --------------------------------------------------------------
    def _price(self, lookup_key: str) -> str:
        prices = stripe.Price.list(api_key=self.key, lookup_keys=[lookup_key], active=True, limit=1)
        if not prices.data:
            raise ServiceError(503, "Plano ainda não cadastrado na Stripe. Rode scripts/stripe_catalog.py.")
        return prices.data[0].id

    def _common(self) -> dict:
        extra = {"tax_id_collection": {"enabled": True}, "billing_address_collection": "required"}
        if self.settings.stripe_automatic_tax:
            extra["automatic_tax"] = {"enabled": True}
        return extra

    def _admin_tenant(self, user: User) -> Tenant:
        membership = Users(self.db).membership(user.id)
        if not membership or membership.role not in (Role.owner, Role.admin):
            raise forbidden()
        return membership.tenant

    # --- Empresa (assinatura) -----------------------------------------------
    def checkout_plan(self, user: User, plan_id: str) -> CheckoutOut:
        plan = PLANS_BY_ID.get(plan_id)
        if not plan or plan.billing != "monthly":
            raise ServiceError(422, "Escolha o plano Equipe ou Empresa. O Enterprise é por contato direto.")
        tenant = self._admin_tenant(user)
        if tenant.subscription_status in ACTIVE and tenant.stripe_subscription_id:
            return self.portal(user)  # troca de plano e cancelamento ficam no portal
        if self.settings.stripe_ready:
            if not tenant.stripe_customer_id:
                customer = stripe.Customer.create(api_key=self.key, email=user.email, name=tenant.name,
                                                  metadata={"tenant_id": tenant.id}, idempotency_key=f"cus-tenant-{tenant.id}")
                tenant.stripe_customer_id = customer.id
                self.db.commit()
            session = stripe.checkout.Session.create(
                api_key=self.key, mode="subscription", customer=tenant.stripe_customer_id, client_reference_id=tenant.id,
                line_items=[{"price": self._price(plan.lookup_key), "quantity": 1}],
                customer_update={"address": "auto", "name": "auto"},
                # Modo flexível: comportamento de cobrança recomendado pela Stripe para assinaturas novas.
                subscription_data={"metadata": {"tenant_id": tenant.id, "plan": plan.id},
                                   "billing_mode": {"type": "flexible"}},
                success_url=f"{self.settings.public_url}/app/empresa?plano=ok",
                cancel_url=f"{self.settings.public_url}/app/empresa?plano=cancelado",
                metadata={"tenant_id": tenant.id, "plan": plan.id}, **self._common())
            return CheckoutOut(url=session.url, mode="stripe")
        self._dev_only()
        now = datetime.now(UTC)
        tenant.plan, tenant.subscription_status = plan.id, "active"
        tenant.stripe_subscription_id = "dev_" + new_secret()[:12]
        tenant.period_start, tenant.period_end = now, now + timedelta(days=30)
        self.db.commit()
        return CheckoutOut(url=f"{self.settings.public_url}/app/empresa?plano=ok", mode="dev")

    def portal(self, user: User) -> CheckoutOut:
        tenant = self._admin_tenant(user)
        if not self.settings.stripe_ready or not tenant.stripe_customer_id:
            raise ServiceError(409, "O portal de cobrança fica disponível depois da primeira assinatura.")
        session = stripe.billing_portal.Session.create(api_key=self.key, customer=tenant.stripe_customer_id,
                                                       return_url=f"{self.settings.public_url}/app/empresa")
        return CheckoutOut(url=session.url, mode="stripe")

    # --- Enterprise (contato direto) ---------------------------------------------
    def lead(self, data: LeadInput, user: User | None) -> None:
        tenant_id = None
        if user:
            membership = Users(self.db).membership(user.id)
            tenant_id = membership.tenant_id if membership else None
        self.db.add(Lead(tenant_id=tenant_id, **data.model_dump()))
        self.db.commit()

    # --- Webhooks ---------------------------------------------------------------
    def webhook(self, payload: bytes, signature: str) -> None:
        secret = self.settings.stripe_webhook_secret.get_secret_value()
        if not secret:
            raise ServiceError(503, "Webhook não configurado.")
        try:
            event = stripe.Webhook.construct_event(payload, signature, secret)
        except (ValueError, stripe.SignatureVerificationError):
            raise ServiceError(400, "Assinatura inválida.") from None
        kind, data = event["type"], event["data"]["object"]
        if kind in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
            if data.get("mode") == "subscription" and data.get("subscription"):
                sub = stripe.Subscription.retrieve(data["subscription"], api_key=self.key)
                self._sync_subscription(sub)
        elif kind in ("customer.subscription.created", "customer.subscription.updated",
                      "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed"):
            self._sync_subscription(data)
        elif kind == "invoice.paid" and data.get("subscription"):
            sub = stripe.Subscription.retrieve(data["subscription"], api_key=self.key)
            self._sync_subscription(sub)

    def _sync_subscription(self, sub) -> None:
        tenant_id = (sub.get("metadata") or {}).get("tenant_id")
        tenant = self.db.get(Tenant, tenant_id) if tenant_id else self.db.scalar(
            select(Tenant).where(Tenant.stripe_customer_id == sub.get("customer")))
        if not tenant:
            return
        item = sub["items"]["data"][0] if sub.get("items", {}).get("data") else {}
        lookup = (item.get("price") or {}).get("lookup_key")
        plan = PLANS_BY_LOOKUP.get(lookup)
        tenant.stripe_subscription_id = sub["id"]
        tenant.subscription_status = sub["status"]
        tenant.plan = plan.id if plan else tenant.plan
        # Em versões novas da API o período fica no item da assinatura.
        tenant.period_start = _ts(item.get("current_period_start") or sub.get("current_period_start"))
        tenant.period_end = _ts(item.get("current_period_end") or sub.get("current_period_end"))
        self.db.commit()

    def _dev_only(self) -> None:
        if self.settings.env == "prod":
            raise ServiceError(503, "Pagamento indisponível no momento.")
