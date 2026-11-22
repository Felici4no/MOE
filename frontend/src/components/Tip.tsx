"use client";
import { useId } from "react";

/** Explicação sob demanda: aparece ao passar o mouse ou focar o "i". */
export function Tip({ children, label = "Mais informações", side }: { children: React.ReactNode; label?: string; side?: "start" | "end" }) {
  const id = useId();
  return (
    <span className="tip" data-side={side}>
      <button type="button" aria-label={label} aria-describedby={id}>i</button>
      <span role="tooltip" id={id}>{children}</span>
    </span>
  );
}
