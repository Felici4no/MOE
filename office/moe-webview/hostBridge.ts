import { parseHostMessage, type HostToOffice, type OfficeToHost } from './protocol';

/** Só conversa com o próprio host (mesma origem). Fora de iframe, não envia nada. */
export function postToHost(msg: OfficeToHost): void {
  if (window.parent === window) return;
  window.parent.postMessage(msg, window.location.origin);
}

/** Escuta comandos do host, ignorando qualquer outra origem ou formato. */
export function onHostMessage(handler: (msg: HostToOffice) => void): () => void {
  const listener = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    if (window.parent === window || e.source !== window.parent) return;
    const msg = parseHostMessage(e.data);
    if (msg) handler(msg);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
