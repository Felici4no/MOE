"""Cria ou confere o catálogo do Pontos Fortes na Stripe (somente modo teste).

    backend/.venv/bin/python scripts/stripe_catalog.py          # mostra o plano
    backend/.venv/bin/python scripts/stripe_catalog.py --apply  # cria o que faltar

Lê STRIPE_SECRET_KEY do arquivo externo (~/.config/pontos-fortes/stripe.env ou PF_STRIPE_ENV_FILE).
Idempotente: procura cada preço pelo lookup_key antes de criar. Preços da Stripe são imutáveis;
para mudar um valor, crie um preço novo com transfer_lookup_key (flag --reprice).
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import stripe  # noqa: E402

from app.core.config import STRIPE_ENV_FILE, Settings  # noqa: E402
from app.domain.plans import PLANS  # noqa: E402

# Sem tax_code nem tax_behavior: a Stripe Tax não é suportada no Brasil. Se um dia for ativada,
# escolha o código com SearchTaxCodes e confirme no painel antes de preencher; nunca chute.


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--reprice", action="store_true", help="cria preço novo se o valor mudou")
    args = parser.parse_args()
    key = Settings().stripe_secret_key.get_secret_value()
    if not key.startswith("sk_test_"):
        raise SystemExit(f"Coloque STRIPE_SECRET_KEY=sk_test_… em {STRIPE_ENV_FILE} (só modo teste).")
    stripe.api_key = key

    for plan in PLANS:
        if not plan.lookup_key:
            print(f"{plan.name}: contato direto, sem preço na Stripe")
            continue
        found = stripe.Price.list(lookup_keys=[plan.lookup_key], expand=["data.product"], limit=1).data
        price = found[0] if found else None
        recurring = {"interval": "month"} if plan.billing == "monthly" else None
        if price and price.unit_amount == plan.price_cents:
            print(f"{plan.name}: ok ({price.id}, R$ {plan.price_cents / 100:.2f})")
            continue
        if price and not args.reprice:
            print(f"{plan.name}: valor na Stripe difere (R$ {price.unit_amount / 100:.2f}); use --reprice")
            continue
        print(f"{plan.name}: {'criar' if not price else 'novo preço'} R$ {plan.price_cents / 100:.2f}"
              f"{' / mês' if recurring else ''} lookup_key={plan.lookup_key}")
        if not args.apply:
            continue
        product_id = price.product.id if price else stripe.Product.create(
            name=f"Pontos Fortes {plan.name}", description=plan.pitch, type="service", metadata={"plan": plan.id},
            idempotency_key=f"pf-product-{plan.id}").id
        stripe.Price.create(product=product_id, currency="brl", unit_amount=plan.price_cents,
                            recurring=recurring, lookup_key=plan.lookup_key, transfer_lookup_key=bool(price),
                            metadata={"plan": plan.id})
    if not args.apply:
        print("\nNada foi criado. Rode com --apply para criar.")


if __name__ == "__main__":
    main()
