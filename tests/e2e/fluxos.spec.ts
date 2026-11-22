import { test, expect, type Page } from '@playwright/test';

async function semOverflowHorizontal(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

test.describe('landing', () => {
  test('seções, CTA e ausência de links quebrados', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Você é mais do que seu cargo/i);
    for (const t of [/Não é um teste/i, /Como funciona/i, /16 talentos/i, /Um documento, não um placar/i, /Suas histórias/i, /Pronto para descobrir/i]) {
      await expect(page.getByRole('heading', { name: t })).toBeVisible();
    }
    await semOverflowHorizontal(page);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll(as => [...new Set(as.map(a => (a as HTMLAnchorElement).getAttribute('href')!.split('#')[0] || '/'))]);
    for (const h of hrefs) {
      const res = await request.get(h);
      expect(res.status(), h).toBeLessThan(400);
    }
  });

  test('CTA principal leva à entrevista', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Começar conversa' }).click();
    await expect(page).toHaveURL(/\/entrevista$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Antes de começar' })).toBeVisible();
    await expect(page.getByText('Modo demonstração')).toBeVisible();
  });

  test('teclado: link de pular, foco visível e grade de talentos', async ({ page, browserName }, info) => {
    test.skip(info.project.name === 'mobile', 'teclado físico só no desktop');
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeFocused();
    const outline = await skip.evaluate(el => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');
    const bussola = page.getByRole('button', { name: /Bússola/ });
    await bussola.focus();
    await page.keyboard.press('Enter');
    await expect(bussola).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Você é alguém que faz o certo mesmo quando ninguém está olhando.')).toBeVisible();
    expect(browserName).toBe('chromium');
  });
});

test.describe('entrevista → processamento → relatório (demonstração)', () => {
  test('conversa completa gera relatório com três talentos', async ({ page }) => {
    await page.goto('/entrevista?ritmo=rapido');
    await page.getByRole('button', { name: 'Começar demonstração' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'marque a confirmação' })).toBeVisible();
    await page.getByLabel(/demonstração com dados sintéticos/).check();
    await page.getByRole('button', { name: 'Começar demonstração' }).click();
    await expect(page.getByText('Demonstração · sintético')).toBeVisible();
    await expect(page.getByText('Sem áudio nesta demonstração')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Seu mapa está pronto.' })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('demonstrativa').first()).toBeVisible();
    await page.getByRole('button', { name: 'Abrir meu mapa' }).click();
    await expect(page).toHaveURL(/\/relatorio\/demo-sessao-21$/, { timeout: 20_000 });
    await expect(page.locator('#seus-talentos article')).toHaveCount(3);
  });

  test('encerrar cedo produz resultado parcial honesto', async ({ page }) => {
    await page.goto('/entrevista');
    await page.getByLabel(/demonstração com dados sintéticos/).check();
    await page.getByRole('button', { name: 'Começar demonstração' }).click();
    await expect(page.getByText(/Pode sim, pode começar/).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Encerrar' }).click();
    await page.getByRole('button', { name: 'Sim, encerrar' }).click();
    await expect(page.getByRole('heading', { name: 'Seu mapa está pronto.' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Abrir meu mapa' }).click();
    await expect(page).toHaveURL(/\/relatorio\/demo-sessao-\d+$/, { timeout: 20_000 });
    await expect(page.locator('#seus-talentos article')).toHaveCount(0);
    await expect(page.getByText(/Nenhum talento teve evidência suficiente/)).toBeVisible();
  });

  test('pausar e transcrição opcional', async ({ page }) => {
    await page.goto('/entrevista');
    await page.getByLabel(/demonstração com dados sintéticos/).check();
    await page.getByRole('button', { name: 'Começar demonstração' }).click();
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Pausada' })).toBeVisible();
    await page.getByRole('button', { name: 'Mostrar transcrição' }).click();
    await expect(page.getByRole('list', { name: 'Transcrição' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Pausada' })).toHaveCount(0);
  });
});

test.describe('relatório', () => {
  for (const [id, n] of [['demo-zero', 0], ['demo-um', 1], ['demo-dois', 2], ['demo-tres', 3]] as const) {
    test(`${id}: ${n} talentos, sem overflow`, async ({ page }) => {
      await page.goto(`/relatorio/${id}`);
      await expect(page.locator('#seus-talentos article')).toHaveCount(n);
      await expect(page.getByText('Demonstração · dados sintéticos').locator('visible=true').first()).toBeVisible();
      await semOverflowHorizontal(page);
    });
  }

  test('PDF é baixável e é um PDF de verdade', async ({ request }) => {
    const res = await request.get('/api/relatorios/demo-tres/pdf');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('e-mail: indisponível na demo, com prévia que não simula envio', async ({ page, request }) => {
    await page.goto('/relatorio/demo-tres');
    await expect(page.getByText('Envio real indisponível nesta versão.')).toBeVisible();
    const res = await request.get('/api/email/preview?id=demo-tres');
    expect(await res.text()).toContain('nada foi enviado');
    const api = await request.post('/api/email/solicitar', { data: { reportId: 'demo-tres', email: 'a@b.com', consentimento: true } });
    expect(api.status()).toBe(503);
  });

  test('alerta de bem-estar mostra apenas apoio', async ({ page }) => {
    await page.goto('/relatorio/demo-apoio');
    await expect(page.getByText(/CVV — 188/)).toBeVisible();
    await expect(page.locator('blockquote')).toHaveCount(0);
  });

  test('relatório inexistente → 404 e não indexável', async ({ page }) => {
    const res = await page.goto('/relatorio/AAAAAAAAAAAAAAAAAAAAAA');
    expect(res?.status()).toBe(404);
    const ok = await page.request.get('/relatorio/demo-tres');
    expect(ok.headers()['x-robots-tag']).toContain('noindex');
  });
});
