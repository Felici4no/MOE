import s from "./Wordmark.module.css";

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={s.mark} data-inverse={inverse || undefined} aria-label="Pontos Fortes">
      <span className={s.p}>Pontos</span> Fortes
    </span>
  );
}
