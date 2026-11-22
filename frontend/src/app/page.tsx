import Link from "next/link";
import { AuthDoor } from "@/components/AuthDoor";
import { Arrow } from "@/components/icons";
import { Wordmark } from "@/components/Wordmark";
import s from "./entry.module.css";

export default async function Entry({
  searchParams,
}: {
  searchParams: Promise<{ acesso?: string | string[]; modo?: string | string[] }>;
}) {
  const { acesso, modo } = await searchParams;
  const portal = acesso === "empresa" ? "empresa" : "individual";
  const mode = modo === "cadastro" ? "signup" : "login";

  return (
    <>
      <header className={s.header}>
        <div className={s.topbar}>
          <Wordmark />
          <Link className={s.plansLink} href="/planos">Ver planos <Arrow /></Link>
        </div>
      </header>
      <main className={s.page}>
        <section className={s.story} aria-labelledby="hero">
          <h1 id="hero">Seus pontos fortes aparecem quando você conversa</h1>
          <p className={s.lede}>
            Em cerca de 10 minutos de conversa com a Lia, você descobre seus talentos.
            No perfil, o grifo mostra o trecho da sua fala que sustenta cada tema.
          </p>
        </section>
        <div id="acesso" className={s.access}>
          <AuthDoor key={`${portal}-${mode}`} initialPortal={portal} initialMode={mode} />
        </div>
        <figure className={s.sample} aria-labelledby="sample-title">
          <figcaption className={s.sampleHead}>
            <span id="sample-title">Trecho da entrevista</span>
            <span>Exemplo fictício</span>
          </figcaption>
          <div className={s.exchange}>
            <div className={s.q}>
              <b aria-hidden>P</b>
              <p><span className="sr-only">Pergunta da Lia. </span>Me conta uma vez em que você percebeu um erro antes de todo mundo.</p>
            </div>
            <div className={s.a}>
              <b aria-hidden>R</b>
              <div>
                <p><span className="sr-only">Resposta. </span>Eu <mark className="grifo-draw">percebi que o preço do leite estava errado na gôndola e avisei</mark> antes de dar prejuízo.</p>
                <span className="tag" data-domain="fazer">Fazer Acontecer · Olho Clínico</span>
              </div>
            </div>
          </div>
        </figure>
      </main>
    </>
  );
}
