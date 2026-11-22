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

    def invite(self, to: str, name: str, company: str, link: str, expires: str, tests=()) -> bool:
        hello = f"Oi, {name}!" if name else "Oi!"
        lines = "\n".join(f"- {t.name} ({t.minutes}): {t.description}" for t in tests)
        items = "".join(f"<li><b>{escape(t.name)}</b> ({escape(t.minutes)}): {escape(t.description)}</li>" for t in tests)
        text = (f"{hello}\n\n{company} convidou você para conversar com a Lia, a entrevistadora do Mapa de Talentos.\n\n"
                f"Você vai fazer:\n{lines}\n\nAceite o convite: {link}\n\n"
                f"Use fone e microfone num lugar tranquilo. Se a conexão cair, você tem até 3 tentativas por teste.\n"
                f"O convite vale até {expires}. O resultado é seu: você decide se a empresa vê os seus talentos.\n")
        html = (f"<p>{escape(hello)}</p><p><b>{escape(company)}</b> convidou você para conversar com a Lia, "
                f"a entrevistadora do Mapa de Talentos.</p><p>Você vai fazer:</p><ul>{items}</ul>"
                f"<p>Use fone e microfone num lugar tranquilo. Se a conexão cair, você tem até 3 tentativas por teste.</p>"
                f'<p><a href="{escape(link)}" style="display:inline-block;padding:12px 18px;background:#14204a;'
                f'color:#fff;border-radius:8px;text-decoration:none">Aceitar convite</a></p>'
                f"<p>O convite vale até {escape(expires)}. O resultado é seu: você decide se a empresa vê os seus talentos.</p>")
        return self.send(to, f"{company} convidou você para o Mapa de Talentos", text, html)
