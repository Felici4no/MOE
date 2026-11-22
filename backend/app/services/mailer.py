"""E-mail transacional por SMTP (SES, Resend, Gmail com senha de app etc.).

Sem PF_SMTP_HOST o envio fica desligado e a empresa copia o link na tela.
"""
import logging
import smtplib
import ssl
from email.message import EmailMessage
from html import escape

from app.core.config import Settings

log = logging.getLogger(__name__)


class Mailer:
    def __init__(self, settings: Settings):
        self.s = settings

    @property
    def ready(self) -> bool:
        return bool(self.s.smtp_host and self.s.smtp_from)

    def send(self, to: str, subject: str, text: str, html: str) -> bool:
        if not self.ready:
            return False
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = self.s.smtp_from, to, subject
        msg.set_content(text)
        msg.add_alternative(html, subtype="html")
        try:
            context = ssl.create_default_context()
            if self.s.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.s.smtp_host, self.s.smtp_port, timeout=10, context=context)
            else:
                server = smtplib.SMTP(self.s.smtp_host, self.s.smtp_port, timeout=10)
                server.starttls(context=context)
            with server:
                if self.s.smtp_user:
                    server.login(self.s.smtp_user, self.s.smtp_password.get_secret_value())
                server.send_message(msg)
            return True
        except Exception as exc:  # o convite continua válido; a empresa pode copiar o link
            log.warning("Falha ao enviar e-mail (%s)", type(exc).__name__)
            return False

    def invite(self, to: str, name: str, company: str, link: str, expires: str, tests=(), job: str | None = None) -> bool:
        hello = f"Oi, {name}!" if name else "Oi!"
        minutes = ", ".join(t.minutes for t in tests) or "cerca de 10 minutos"
        about = f"a vaga {job}" if job else "uma conversa de pontos fortes"
        how = (f"É uma entrevista por voz com a Lia ({minutes}), sem questionário: você conta histórias reais de como trabalha."
               if tests else "É uma simulação no escritório: você conversa com personagens do time, da gerência e da diretoria.")
        text = (f"{hello}\n\n{company} convidou você para {about} no Resona.\n\n"
                f"{how}\n\nAceite o convite: {link}\n\n"
                f"Use fone e microfone num lugar tranquilo. Se a conexão cair, você tem até 3 tentativas.\n"
                f"O convite vale até {expires}.\n")
        html = (f"<p>{escape(hello)}</p><p><b>{escape(company)}</b> convidou você para {escape(about)} no Resona.</p>"
                f"<p>{escape(how)}</p>"
                f'<p><a href="{escape(link)}" style="display:inline-block;padding:12px 22px;background:#2e5bff;'
                f'color:#fcfcfd;border-radius:9999px;text-decoration:none;font-weight:500">Aceitar convite</a></p>'
                f"<p>Use fone e microfone num lugar tranquilo. Se a conexão cair, você tem até 3 tentativas. "
                f"O convite vale até {escape(expires)}.</p>")
        subject = f"{company}: convite para {job}" if job else f"{company} convidou você para o Resona"
        return self.send(to, subject, text, html)
