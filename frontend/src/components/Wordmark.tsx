import s from "./Wordmark.module.css";

/** Marca Resona: três barras de nível (a voz e o ranking) num quadrado azul. */
export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={s.mark} data-inverse={inverse || undefined}>
      <svg viewBox="0 0 26 26" aria-hidden="true" className={s.icon}>
        <rect width="26" height="26" rx="7" fill="#2e5bff" />
        <rect x="6" y="13" width="3" height="7" rx="1.5" fill="#fcfcfd" />
        <rect x="11.5" y="6" width="3" height="14" rx="1.5" fill="#fcfcfd" />
        <rect x="17" y="10" width="3" height="10" rx="1.5" fill="#fcfcfd" />
      </svg>
      Resona
    </span>
  );
}
