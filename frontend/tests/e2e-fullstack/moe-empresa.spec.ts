import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const PW = "senha-forte-123";
// MOE_CAPTURE=1 grava capturas para a documentação (docs/moe/capturas).
const shot = (p: Page, n: string) =>
  process.env.MOE_CAPTURE ? p.screenshot({ path: `../docs/moe/capturas/empresa-${n}.png`, fullPage: true }) : Promise.resolve(Buffer.from(""));

async function signupCompany(request: APIRequestContext, baseURL: string) {
  const r = await request.post("/api/v1/auth/company/signup", {
    headers: { origin: baseURL },
    data: { name: "Rui Gestor", email: `rui${Date.now()}@acme.com`, password: PW, company: "Acme Testes" },
  });
  expect(r.status()).toBe(201);
}

async function waitOffice(page: Page) {
  await page.waitForFunction(
    () => (document.querySelector("iframe")?.contentWindow as unknown as { __moeOffice?: { ready: boolean } })?.__moeOffice?.ready,
    null, { timeout: 60_000 });
}

test("empresa configura, pessoa joga, lê os pontos e compartilha; empresa só vê depois", async ({ browser, baseURL }) => {
  // ---- Empresa: cria a partir do modelo, flexiona e publica ----------------------------------
  const adminCtx = await browser.newContext({ baseURL });
  await signupCompany(adminCtx.request, baseURL!);
  const admin = await adminCtx.newPage();
  await admin.goto("/app/empresa/moe");
  await expect(admin.getByRole("heading", { name: "Simulações do escritório" })).toBeVisible({ timeout: 60_000 });
  await admin.getByRole("button", { name: /Começar pelo modelo/ }).click();
  await expect(admin.getByRole("heading", { name: "Entrega sob pressão", level: 3 })).toBeVisible();

  // Personagem novo, com personalidade, entra no lugar da Nara.
  await admin.getByRole("tab", { name: "Personagens" }).click();
  await admin.getByLabel("Nome").fill("Iara");
  await admin.getByLabel("Papel no escritório").fill("Diretora de produto");
  await admin.getByLabel(/Traços/).fill("cética, curiosa");
  await admin.getByLabel("Postura na conversa").selectOption("cetica");
  await admin.getByLabel("Jeito de falar").fill("Pergunta sempre qual é a evidência.");
  await admin.getByLabel("Tom").selectOption("firme");
  await admin.getByLabel(/Aparência/).selectOption("4");
  await admin.getByRole("button", { name: "Salvar personagem" }).click();
  await expect(admin.getByRole("heading", { name: "Iara", level: 3 })).toBeVisible();
  await shot(admin, "personagens");

  // Tema sensível é recusado com explicação.
  await admin.getByRole("tab", { name: "Pontos" }).click();
  await admin.getByLabel("Nome").fill("Disponibilidade");
  await admin.getByLabel("O que interessa observar").fill("Se tem filhos pequenos");
  await admin.getByRole("button", { name: "Salvar ponto" }).click();
  await expect(admin.getByRole("alert").filter({ hasText: "temas pessoais" })).toBeVisible();

  // Flexiona o cenário: pressão alta, clima tenso, Iara na última cena.
  await admin.getByRole("tab", { name: "Cenários" }).click();
  await admin.getByRole("button", { name: "Editar" }).click();
  await admin.getByLabel(/Pressão/).fill("5");
  await admin.getByLabel("Clima").selectOption("tenso");
  await admin.getByLabel("Quem fala na cena 3").selectOption({ label: "Iara · Diretora de produto" });
  await admin.getByLabel("Fala de abertura do personagem").nth(2).fill("Antes da reunião: o que você me diz sobre riscos e próximos passos?");
  await admin.getByRole("button", { name: "Salvar cenário" }).click();
  await expect(admin.getByText(/pressão Crítica · clima tenso/)).toBeVisible();
  await admin.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(admin.getByText("Publicado · v1")).toBeVisible();
  await shot(admin, "cenarios");

  // ---- Convite e aceite da pessoa ---------------------------------------------------------------
  const invite = await adminCtx.request.post("/api/v1/tenant/invites", { headers: { origin: baseURL! }, data: { email: `bia${Date.now()}@acme.com` } });
  const token = (await invite.json()).link.split("/").pop();
  const personCtx = await browser.newContext({ baseURL });
  const acc = await personCtx.request.post("/api/v1/auth/invites/accept", { headers: { origin: baseURL! }, data: { token, name: "Bia Pessoa", password: PW } });
  expect(acc.status()).toBeLessThan(300);

  // ---- Pessoa joga o cenário da empresa -------------------------------------------------------
  const person = await personCtx.newPage();
  await person.goto("/app/moe");
  await expect(person.getByRole("heading", { name: "Entrega sob pressão", level: 3 })).toBeVisible({ timeout: 60_000 });
  await person.getByRole("link", { name: "Entrar no escritório" }).click();
  await expect(person.getByText("Cenário da empresa", { exact: false })).toBeVisible({ timeout: 60_000 });
  await expect(person.getByText("cética · curiosa · postura cética")).toBeVisible();
  await person.getByRole("button", { name: "Entrar no escritório" }).click();
  await waitOffice(person);
  const cast = await person.evaluate(() => (document.querySelector("iframe")!.contentWindow as unknown as { __moeOffice: { characters: string[] } }).__moeOffice.characters.length);
  expect(cast).toBe(3);
  await expect(person.frameLocator("iframe").locator("[data-moe-label]", { hasText: "Iara" })).toBeVisible();
  await expect(person.getByRole("button", { name: "Responder" })).toBeEnabled({ timeout: 15_000 });
  await person.screenshot({ path: process.env.MOE_CAPTURE ? "../docs/moe/capturas/empresa-escritorio.png" : "test-results/tmp.png" });

  const respostas = [
    "Primeiro separo o que vence hoje e pergunto o que é inegociável.",
    "Pergunto onde você travou e dividimos a parte mais urgente.",
    "Já entregamos o módulo A, o risco é o B atrasar e revisamos às 16h.",
  ];
  for (const [i, nome] of ["Maia", "Léo", "Iara"].entries()) {
    await expect(person.getByRole("heading", { name: new RegExp(nome) })).toBeVisible({ timeout: 30_000 });
    await expect(person.getByRole("button", { name: "Responder" })).toBeEnabled({ timeout: 15_000 });
    await person.getByLabel(/Sua resposta para/).fill(respostas[i]);
    await person.getByRole("button", { name: "Responder" }).click();
  }
  await expect(person).toHaveURL(/\/moe\?sessao=/);
  await person.getByRole("button", { name: "Ver minha leitura" }).click();
  await expect(person.getByRole("heading", { name: "Pontos que a empresa quis explorar" })).toBeVisible({ timeout: 30_000 });
  await expect(person.getByText("Priorização · foco 4/5")).toBeVisible();
  await expect(person.locator("blockquote").first()).toHaveText(respostas[0]);

  // Antes do consentimento a empresa não vê nada.
  await admin.reload();
  await admin.getByRole("tab", { name: /Resultados compartilhados/ }).click();
  await expect(admin.getByText(/Ninguém compartilhou/)).toBeVisible();

  await person.getByRole("button", { name: "Compartilhar com a empresa" }).click();
  await expect(person.getByRole("status").filter({ hasText: "Compartilhado." })).toBeVisible();
  await shot(person, "leitura");

  await admin.reload();
  await admin.getByRole("tab", { name: /Resultados compartilhados/ }).click();
  await expect(admin.getByRole("heading", { name: "Bia Pessoa" })).toBeVisible();
  await expect(admin.getByText(respostas[1])).toBeVisible();
  await shot(admin, "resultados");

  // Desfazer remove da visão da empresa.
  await person.getByRole("button", { name: "Deixar de compartilhar" }).click();
  await admin.reload();
  await admin.getByRole("tab", { name: /Resultados compartilhados/ }).click();
  await expect(admin.getByText(/Ninguém compartilhou/)).toBeVisible();

  await adminCtx.close();
  await personCtx.close();
});
