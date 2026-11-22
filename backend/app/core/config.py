"""Configuração tipada; segredos só vêm do ambiente, do .env local ou do arquivo Stripe externo."""
import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]
# Chaves Stripe ficam fora de qualquer repositório; PF_STRIPE_ENV_FILE troca o caminho.
STRIPE_ENV_FILE = Path(os.environ.get("PF_STRIPE_ENV_FILE", Path.home() / ".config" / "pontos-fortes" / "stripe.env"))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(ROOT / ".env", STRIPE_ENV_FILE), extra="ignore")

    env: Literal["dev", "test", "prod"] = Field("dev", alias="PF_ENV")
    public_url: str = Field("http://localhost:3000", alias="PF_PUBLIC_URL")
    database_url: str = Field(f"sqlite:///{ROOT / '.runtime' / 'pontos-fortes.db'}", alias="PF_DATABASE_URL")
    jwt_secret: SecretStr = Field(SecretStr("dev-only-change-me-dev-only-change-me"), alias="PF_JWT_SECRET")
    session_days: int = Field(7, alias="PF_SESSION_DAYS")
    tools_url: str = Field("", alias="PF_TOOLS_URL")
    interview_master_user_id: str = Field("", alias="PF_INTERVIEW_MASTER_USER_ID", pattern=r"^(?:[a-f0-9]{32})?$")

    agora_app_id: SecretStr = Field(SecretStr(""), alias="AGORA_APP_ID")
    agora_app_certificate: SecretStr = Field(SecretStr(""), alias="AGORA_APP_CERTIFICATE")
    llm_model: str = Field("gpt-4o-mini", alias="OPENAI_MODEL")
    tts_model: str = Field("speech_2_6_turbo", alias="TTS_MODEL")
    tts_voice: str = Field("Portuguese_SentimentalLady", alias="TTS_VOICE_ID")
    # minimax: força português com language_boost; openai: voz gerenciada pela Agora (tts-1);
    # microsoft: vozes pt-BR nativas da Azure (ex.: pt-BR-FranciscaNeural), exige AZURE_SPEECH_KEY.
    tts_vendor: Literal["minimax", "openai", "microsoft"] = Field("minimax", alias="TTS_VENDOR")
    azure_speech_key: SecretStr = Field(SecretStr(""), alias="AZURE_SPEECH_KEY")
    azure_speech_region: str = Field("brazilsouth", alias="AZURE_SPEECH_REGION")
    tts_language_boost: str = Field("Portuguese", alias="TTS_LANGUAGE_BOOST")
    tts_speed: float = Field(1.0, alias="TTS_SPEED")

    # Prompt B (analista de texto). Vazio: relatório pelas evidências da Lia ou pelos sinais do catálogo.
    analyst_api_key: SecretStr = Field(SecretStr(""), alias="ANALYST_LLM_API_KEY")
    analyst_model: str = Field("gpt-4o-mini", alias="ANALYST_LLM_MODEL")

    interview_payments_enabled: bool = Field(True, alias="PF_INTERVIEW_PAYMENTS_ENABLED")
    stripe_secret_key: SecretStr = Field(SecretStr(""), alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: SecretStr = Field(SecretStr(""), alias="STRIPE_WEBHOOK_SECRET")
    # Stripe Tax só calcula onde a conta tem registro; no Brasil a NFS-e continua fora da Stripe.
    stripe_automatic_tax: bool = Field(False, alias="STRIPE_AUTOMATIC_TAX")
    smtp_host: str = Field("", alias="PF_SMTP_HOST")
    smtp_port: int = Field(587, alias="PF_SMTP_PORT")
    smtp_user: str = Field("", alias="PF_SMTP_USER")
    smtp_password: SecretStr = Field(SecretStr(""), alias="PF_SMTP_PASSWORD")
    smtp_from: str = Field("", alias="PF_SMTP_FROM")  # ex.: "Pontos Fortes <convites@seudominio.com.br>"
    sales_email: str = Field("", alias="PF_SALES_EMAIL")  # opcional: e-mail comercial exibido no Enterprise

    @field_validator("public_url", "tools_url")
    @classmethod
    def strip_slash(cls, value: str) -> str:
        return value.rstrip("/")

    @property
    def secure_cookies(self) -> bool:
        return self.public_url.startswith("https://")

    @property
    def agora_ready(self) -> bool:
        return bool(self.agora_app_id.get_secret_value() and self.agora_app_certificate.get_secret_value())

    @property
    def stripe_ready(self) -> bool:
        return self.stripe_secret_key.get_secret_value().startswith("sk_test_")

    @property
    def individual_checkout_available(self) -> bool:
        return self.interview_payments_enabled and (self.stripe_ready or self.env != "prod")

    def check_production(self) -> None:
        if self.env != "prod":
            return
        if len(self.jwt_secret.get_secret_value()) < 32 or "dev-only" in self.jwt_secret.get_secret_value():
            raise ValueError("PF_JWT_SECRET precisa de 32+ caracteres aleatórios em produção.")
        if not self.public_url.startswith("https://"):
            raise ValueError("PF_PUBLIC_URL precisa ser HTTPS em produção.")
        live = self.stripe_secret_key.get_secret_value()
        if live and not live.startswith("sk_test_"):
            raise ValueError("O MVP aceita apenas chaves Stripe de teste (sk_test_).")


@lru_cache
def get_settings() -> Settings:
    return Settings()
