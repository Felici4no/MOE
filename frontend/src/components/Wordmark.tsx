import s from "./Wordmark.module.css";

/** Marca MOE, como nos slides: "MOE" em caixa alta + "My Office Experience" em mono. */
export function Wordmark({ inverse = false, sub = true }: { inverse?: boolean; sub?: boolean }) {
  return (
    <span className={s.mark} data-inverse={inverse || undefined}>
      <svg viewBox="0 0 26 26" aria-hidden="true" className={s.icon} shapeRendering="crispEdges">
        <rect width="26" height="26" fill="#141821" />
        <rect x="5" y="14" width="4" height="7" fill="#f8d94b" />
        <rect x="11" y="6" width="4" height="15" fill="#f08c5e" />
        <rect x="17" y="10" width="4" height="11" fill="#a0d4bc" />
      </svg>
      <span className={s.word}>MOE</span>
      {sub && <span className={s.sub}>My Office Experience</span>}
    </span>
  );
}
