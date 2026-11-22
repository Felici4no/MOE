import { test, expect, type Page } from "@playwright/test";

const RESPOSTAS = [
  "Primeiro listo o que vence hoje e combino a ordem com a gestora.",
  "Pergunto onde você travou e dividimos a parte mais urgente.",
  "Conto o que já foi entregue, os riscos e o próximo passo.",
];

/** Registra erros de console, exceções e respostas HTTP >= 400 (inclui o iframe). */
function watchProblems(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  return problems;
}

async function entrar(page: Page) {
  await page.goto("/moe");
  await page.getByRole("button", { name: "ENTRAR NO ESCRITÓRIO" }).click();
  await page.waitForFunction(
    () => (document.querySelector("iframe")?.contentWindow as unknown as { __moeOffice?: { ready: boolean } })?.__moeOffice?.ready,
    null,
    { timeout: 30_000 },
  );
}

async function responderCena(page: Page, npc: RegExp, texto: string) {
  await expect(page.getByRole("heading", { name: npc })).toBeVisible();
  await expect(page.getByRole("button", { name: "Responder" })).toBeEnabled({ timeout: 10_000 });
  await page.getByLabel(/SUA RESPOSTA PARA/).fill(texto);
  await page.getByRole("button", { name: "Responder" }).click();
}

test("entrada com marca MOE, aviso fixo, modo sem voz e crédito", async ({ page }) => {
  await page.goto("/moe");
  await expect(page.getByText("MY OFFICE EXPERIENCE").first()).toBeVisible();
  await expect(page.getByText("MOE / EXPERIENCE 001").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("VOCÊ CHEGOU AO ESCRITÓRIO.");
  await expect(page.getByText("DEMO SEM VOZ").first()).toBeVisible();
  await expect(page.getByText(/Esta é uma simulação fictícia/)).toBeVisible();
  await expect(page.getByText("Visual engine: Pixel Agents — MIT © 2026 Pablo De Lucca")).toBeVisible();
});

test("/office redireciona para /moe", async ({ page }) => {
  await page.goto("/office");
  await expect(page).toHaveURL(/\/moe$/);
});

test("escritório Pixel Agents real: layout, móveis, três NPCs e sprites desenhados", async ({ page }) => {
  const problems = watchProblems(page);
  await entrar(page);
  const info = await page.evaluate(() => (document.querySelector("iframe")!.contentWindow as unknown as { __moeOffice: { characters: string[]; layout: { furniture: number } } }).__moeOffice);
  expect(info.characters).toEqual(["maia", "leo", "nara"]);
  expect(info.layout.furniture).toBeGreaterThan(10);
  // O canvas tem pixels desenhados (não é um iframe vazio).
  const frame = page.frameLocator("iframe");
  await expect(frame.locator("canvas")).toBeVisible();
  const colored = await frame.locator("canvas").evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return seen.size;
  });
  expect(colored).toBeGreaterThan(20);
  for (const nome of ["Maia", "Léo", "Nara"]) await expect(frame.locator(`[data-moe-label]`, { hasText: nome })).toBeVisible();
  // Nada de terminal, editor ou controles de agentes de código.
  await expect(frame.locator(".xterm")).toHaveCount(0);
  await expect(frame.getByText(/Layout|New agent|Settings/)).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("S01 completo: Maia → Léo → Nara → devolutiva com citações literais", async ({ page }) => {
  const problems = watchProblems(page);
  await entrar(page);
  await expect(page.getByText("CENA 1 / 3")).toBeVisible();

  // Resposta vazia não avança.
  await expect(page.getByRole("button", { name: "Responder" })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Escreva sua resposta" })).toBeVisible();

  await responderCena(page, /Maia/, RESPOSTAS[0]);
  await expect(page.getByText("CENA 2 / 3")).toBeVisible();
  await responderCena(page, /Léo/, RESPOSTAS[1]);
  await responderCena(page, /Nara/, RESPOSTAS[2]);
  await expect(page.getByRole("status").filter({ hasText: "SIMULAÇÃO CONCLUÍDA" })).toBeVisible();

  await page.getByRole("button", { name: "VER MINHA DEVOLUTIVA" }).click();
  await expect(page.getByRole("heading", { name: "Sua experiência no escritório" })).toBeVisible();
  await expect(page.locator("blockquote")).toHaveText(RESPOSTAS);
  await expect(page.getByText("SIMULAÇÃO FICTÍCIA").first()).toBeVisible();
  await expect(page.getByText(/não viram evidências de talento/)).toBeVisible();
  // Falas dos NPCs aparecem como perguntas, nunca como "você respondeu".
  await expect(page.locator("blockquote").filter({ hasText: "Temos uma entrega hoje" })).toHaveCount(0);

  // Repetir reinicia do zero.
  await page.getByRole("button", { name: "Repetir" }).click();
  await expect(page.getByText("CENA 1 / 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Maia/ })).toBeVisible({ timeout: 30_000 });
  expect(problems).toEqual([]);
});

test("Recomeçar no meio volta à primeira cena; Silenciar alterna o som", async ({ page }) => {
  await entrar(page);
  await responderCena(page, /Maia/, RESPOSTAS[0]);
  await expect(page.getByText("CENA 2 / 3")).toBeVisible();
  const mute = page.getByRole("button", { name: "Silenciar" });
  await mute.click();
  await expect(page.getByRole("button", { name: "Som desligado" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Recomeçar" }).click();
  await expect(page.getByText("CENA 1 / 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Maia/ })).toBeVisible({ timeout: 30_000 });
});

test("teclado: entrar e responder com Ctrl+Enter", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "teclado físico só no desktop");
  await page.goto("/moe");
  await page.getByRole("button", { name: "ENTRAR NO ESCRITÓRIO" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Responder" })).toBeEnabled({ timeout: 30_000 });
  await page.getByLabel(/SUA RESPOSTA PARA/).focus();
  await page.keyboard.type("Separo o urgente do importante.");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("CENA 2 / 3")).toBeVisible();
});

test("fallback: sem o escritório 2D, a simulação continua por texto", async ({ page }) => {
  test.setTimeout(90_000);
  await page.route("**/office-engine/**", (r) => r.abort());
  await page.goto("/moe");
  await page.getByRole("button", { name: "ENTRAR NO ESCRITÓRIO" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Não foi possível carregar o escritório 2D" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Continuar só com texto" }).click();
  for (const [i, npc] of [/Maia/, /Léo/, /Nara/].entries()) await responderCena(page, npc, RESPOSTAS[i]);
  await page.getByRole("button", { name: "VER MINHA DEVOLUTIVA" }).click();
  await expect(page.locator("blockquote")).toHaveCount(3);
});

test("sem rolagem horizontal nas três telas", async ({ page }) => {
  await page.goto("/moe");
  const ovf = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await ovf()).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "ENTRAR NO ESCRITÓRIO" }).click();
  await expect(page.getByRole("heading", { name: /Maia/ })).toBeVisible({ timeout: 30_000 });
  expect(await ovf()).toBeLessThanOrEqual(0);
});
