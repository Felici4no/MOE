import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components';
import { render } from '@react-email/render';
import type { ReportDocument } from '@/lib/domain/report';
import { codigoDocumento, formatarData } from '@/lib/domain/report';
import { AVISO_PADRAO } from '@/lib/domain/catalogo';
import { fingerprint } from '@/lib/ascii/core';

/*
 * Templates de e-mail. Clientes de e-mail não carregam webfonts com confiabilidade:
 * usamos pilhas seguras que preservam a hierarquia (grotesca / mono) e os mesmos tokens.
 */
const T = {
  paper: '#F5F2E9', ink: '#111111', surface: '#FFFFFF', signal: '#F8D94B', soft: '#3D3A33',
  sans: "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif",
  display: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', Courier, monospace",
};
const meta = { fontFamily: T.mono, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, margin: 0, color: T.ink };

export const ASSUNTO_RELATORIO = 'Seu Mapa de Talentos está pronto.';
export const ASSUNTO_CODIGO = 'Seu código de verificação — Mapa de Talentos';

function Shell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: T.paper, margin: 0, padding: '24px 0', fontFamily: T.sans, color: T.ink }}>
        <Container style={{ maxWidth: '560px', backgroundColor: T.surface, border: `2px solid ${T.ink}` }}>
          <Section style={{ padding: '14px 24px', borderBottom: `2px solid ${T.ink}` }}>
            <Text style={meta}>Mapa de Talentos / Documento pessoal</Text>
          </Section>
          {children}
          <Section style={{ padding: '16px 24px', borderTop: `2px solid ${T.ink}`, backgroundColor: T.paper }}>
            <Text style={{ fontSize: '12px', lineHeight: '18px', color: T.soft, margin: 0 }}>{AVISO_PADRAO}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function ReportEmail({ doc, link, demo }: { doc: ReportDocument; link: string | null; demo?: boolean }) {
  const fp = fingerprint(doc.id, 28, 6).join('\n');
  const primeiro = doc.participantName.split(' ')[0];
  return (
    <Shell preview="Seu documento está em anexo, em PDF.">
      {demo && (
        <Section style={{ padding: '10px 24px', backgroundColor: '#E7E2D7', borderBottom: `1px dashed ${T.ink}` }}>
          <Text style={meta}>Prévia de demonstração · dados sintéticos · nada foi enviado</Text>
        </Section>
      )}
      <Section style={{ padding: '28px 24px 8px' }}>
        <Heading as="h1" style={{ fontFamily: T.display, fontSize: '34px', lineHeight: '36px', letterSpacing: '-1px', margin: 0, textTransform: 'uppercase' }}>
          Seu Mapa de Talentos está pronto.
        </Heading>
        <Text style={{ fontFamily: T.mono, fontSize: '9px', lineHeight: '10px', whiteSpace: 'pre', color: T.ink, margin: '20px 0 0' }}>{fp}</Text>
      </Section>
      <Section style={{ padding: '8px 24px 24px' }}>
        <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
          Olá, {primeiro}. Em anexo está o seu Mapa de Talentos, em PDF: um documento com os padrões que as suas histórias de trabalho sustentam, cada um acompanhado das suas próprias palavras como evidência.
        </Text>
        <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
          O documento é seu. Ele não foi enviado a nenhuma empresa, e receber este e-mail não autoriza ninguém a vê-lo.
        </Text>
        {link && (
          <Section style={{ margin: '20px 0' }}>
            <Link href={link} style={{ display: 'inline-block', backgroundColor: T.signal, color: T.ink, border: `2px solid ${T.ink}`, padding: '12px 20px', fontFamily: T.display, fontWeight: 700, textDecoration: 'none' }}>
              Abrir meu mapa
            </Link>
            <Text style={{ fontSize: '12px', color: T.soft, margin: '8px 0 0' }}>Link privado. Ele deixa de funcionar quando o documento expira.</Text>
          </Section>
        )}
        <Hr style={{ borderColor: T.ink, borderWidth: '1px 0 0' }} />
        <Text style={meta}>{codigoDocumento(doc.id)} · {formatarData(doc.createdAt)}</Text>
      </Section>
    </Shell>
  );
}

export function CodeEmail({ code }: { code: string }) {
  return (
    <Shell preview={`Seu código: ${code}`}>
      <Section style={{ padding: '28px 24px' }}>
        <Text style={{ fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }}>Use este código para confirmar que este endereço é seu:</Text>
        <Text style={{ fontFamily: T.mono, fontSize: '36px', letterSpacing: '10px', backgroundColor: T.signal, border: `2px solid ${T.ink}`, padding: '12px 16px', margin: 0, display: 'inline-block' }}>{code}</Text>
        <Text style={{ fontSize: '14px', lineHeight: '22px', color: T.soft, marginTop: '16px' }}>
          O código vale por 10 minutos. Se você não pediu este e-mail, pode ignorá-lo: nada será enviado sem o código.
        </Text>
      </Section>
    </Shell>
  );
}

export const renderReportEmail = (doc: ReportDocument, link: string | null, demo = false) => render(<ReportEmail doc={doc} link={link} demo={demo} />);
export const renderCodeEmail = (code: string) => render(<CodeEmail code={code} />);
