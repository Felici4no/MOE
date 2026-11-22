'use client';

import { useId, useRef, useState } from 'react';
import { Mail, ExternalLink } from 'lucide-react';

type Etapa = 'endereco' | 'enviando_codigo' | 'codigo' | 'confirmando' | 'enviado';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Fluxo: endereço → confirmação explícita → código de verificação → envio do PDF.
 * Nunca mostra sucesso que não aconteceu: o estado 'enviado' só existe após 200 do servidor.
 */
export function EmailRequest({ reportId, disponivel, motivo }: { reportId: string; disponivel: boolean; motivo: string | null }) {
  const [etapa, setEtapa] = useState<Etapa>('endereco');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroCampo, setErroCampo] = useState<'email' | 'consent' | 'codigo' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const emailId = useId(), consentId = useId(), codeId = useId(), errId = useId();
  const codeRef = useRef<HTMLInputElement>(null);

  // A prévia só existe para documentos de demonstração (nunca renderiza dados reais).
  const preview = `/api/email/preview?id=${encodeURIComponent(reportId.startsWith('demo-') ? reportId : 'demo-tres')}`;

  if (!disponivel) {
    return (
      <div className="panel p-6" role="note" aria-labelledby={`${errId}-t`}>
        <p id={`${errId}-t`} className="meta flex items-center gap-2"><Mail size={16} aria-hidden="true" /> Receber por e-mail</p>
        <p className="mt-3 font-display text-xl font-medium">Envio real indisponível nesta versão.</p>
        <p className="small mt-2 text-ink-soft">{motivo}</p>
        <a href={preview} target="_blank" rel="noopener" className="btn btn-sm mt-5">
          Ver prévia do e-mail <ExternalLink size={16} aria-hidden="true" />
        </a>
        <p className="small mt-3 text-ink-soft">A prévia mostra como o e-mail ficaria. Nada é enviado.</p>
      </div>
    );
  }

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null); setErroCampo(null);
    if (!EMAIL_RE.test(email.trim())) { setErroCampo('email'); setErro('Confira o endereço: ele precisa ter o formato nome@dominio.com.'); return; }
    if (!consent) { setErroCampo('consent'); setErro('Para continuar, confirme que deseja receber o documento neste endereço.'); return; }
    setEtapa('enviando_codigo');
    try {
      const res = await fetch('/api/email/solicitar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, email: email.trim(), consentimento: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro ?? 'Não foi possível enviar o código agora. Tente de novo em alguns minutos.');
      setEtapa('codigo');
      setMsg(`Enviamos um código de 6 dígitos para ${email.trim()}. Ele vale por 10 minutos.`);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setEtapa('endereco');
      setErro((err as Error).message);
    }
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null); setErroCampo(null);
    if (!/^\d{6}$/.test(codigo)) { setErroCampo('codigo'); setErro('O código tem 6 números.'); return; }
    setEtapa('confirmando');
    try {
      const res = await fetch('/api/email/confirmar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, email: email.trim(), codigo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro ?? 'Não foi possível enviar o documento agora.');
      setEtapa('enviado');
      setMsg(data.status === 'ja_enviado'
        ? 'Este documento já tinha sido enviado para este endereço. Não enviamos de novo.'
        : `Pronto. O documento foi entregue ao provedor de e-mail para ${email.trim()}. Pode levar alguns minutos para chegar.`);
    } catch (err) {
      setEtapa('codigo');
      setErro((err as Error).message);
    }
  }

  return (
    <div className="panel p-6">
      <p className="meta flex items-center gap-2"><Mail size={16} aria-hidden="true" /> Receber por e-mail</p>
      {etapa === 'enviado' ? (
        <p role="status" className="mt-4 border-2 border-ink bg-green p-4 text-[#111]">{msg}</p>
      ) : etapa === 'codigo' || etapa === 'confirmando' ? (
        <form onSubmit={confirmar} noValidate className="mt-4">
          <p role="status" className="small mb-4">{msg}</p>
          <label htmlFor={codeId} className="field-label">Código de verificação</label>
          <input
            ref={codeRef} id={codeId} className="input font-mono tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} value={codigo} onChange={e => { setCodigo(e.target.value.replace(/\D/g, '')); if (erroCampo === 'codigo') { setErro(null); setErroCampo(null); } }}
            aria-invalid={erroCampo === 'codigo'} aria-describedby={erro ? errId : undefined}
          />
          {erro && <p id={errId} role="alert" className="field-error">{erro}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn btn-primary btn-sm" disabled={etapa === 'confirmando'}>{etapa === 'confirmando' ? 'Enviando documento…' : 'Confirmar e enviar'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEtapa('endereco'); setCodigo(''); setErro(null); }}>Trocar endereço</button>
          </div>
        </form>
      ) : (
        <form onSubmit={pedirCodigo} noValidate className="mt-4">
          <label htmlFor={emailId} className="field-label">Seu e-mail</label>
          <input
            id={emailId} className="input" type="email" autoComplete="email" value={email}
            onChange={e => { setEmail(e.target.value); if (erroCampo === 'email') { setErro(null); setErroCampo(null); } }}
            onBlur={() => { if (email && !EMAIL_RE.test(email.trim())) { setErroCampo('email'); setErro('Confira o endereço: ele precisa ter o formato nome@dominio.com.'); } }}
            aria-invalid={erroCampo === 'email'} aria-describedby={erro ? errId : undefined}
          />
          <div className="mt-4 flex items-start gap-3">
            <input id={consentId} type="checkbox" className="check" checked={consent}
              onChange={e => { setConsent(e.target.checked); if (erroCampo === 'consent') { setErro(null); setErroCampo(null); } }}
              aria-invalid={erroCampo === 'consent'} />
            <label htmlFor={consentId} className="small">
              Quero receber este documento neste endereço. Entendo que isso <strong>não</strong> compartilha nada com nenhuma empresa.
            </label>
          </div>
          {erro && <p id={errId} role="alert" className="field-error">{erro}</p>}
          <button className="btn btn-primary btn-sm mt-5" disabled={etapa === 'enviando_codigo'}>
            {etapa === 'enviando_codigo' ? 'Enviando código…' : 'Enviar código de verificação'}
          </button>
          <p className="small mt-3 text-ink-soft">Primeiro confirmamos que o endereço é seu. Só depois o PDF é enviado.</p>
        </form>
      )}
    </div>
  );
}
