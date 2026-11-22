// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { getDemoReport } from '@/lib/demo/fixtures';
import { ReportView, SupportView } from '@/components/relatorio/ReportView';
import { ChapterTalents } from '@/components/relatorio/ReportParts';
import { TalentGrid } from '@/components/marketing/TalentGrid';
import { EmailRequest } from '@/components/relatorio/EmailRequest';
import { TEMAS } from '@/lib/domain/catalogo';

afterEach(cleanup);

const noEmail = { disponivel: false, motivo: 'Indisponível.' };

describe('relatório com 0, 1, 2 e 3 talentos', () => {
  it.each([['demo-zero', 0], ['demo-um', 1], ['demo-dois', 2], ['demo-tres', 3]])('%s renderiza exatamente %i blocos', (id, n) => {
    render(<ChapterTalents doc={getDemoReport(id)!} />);
    const section = screen.getByRole('region', { name: /seus talentos/i });
    expect(within(section).queryAllByRole('article')).toHaveLength(n);
    if (n === 0) expect(within(section).getByText(/nenhum talento teve evidência suficiente/i)).toBeTruthy();
  });

  it('mostra as citações literais como blockquote', () => {
    render(<ChapterTalents doc={getDemoReport('demo-tres')!} />);
    expect(screen.getAllByText(/Percebi que o preço do leite/).length).toBeGreaterThan(0);
  });

  it('relatório demo está identificado como demonstração e omite cliente ausente', () => {
    render(<ReportView doc={getDemoReport('demo-um')!} email={noEmail} ttlDays={30} />);
    expect(screen.getAllByText(/Demonstração · dados sintéticos/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Organização')).toBeNull();
    expect(screen.getByRole('link', { name: /baixar pdf/i }).getAttribute('href')).toBe('/api/relatorios/demo-um/pdf');
  });

  it('cliente presente aparece na capa', () => {
    render(<ReportView doc={getDemoReport('demo-tres')!} email={noEmail} ttlDays={30} />);
    expect(screen.getByText('Organização')).toBeTruthy();
    expect(screen.getByText('Mercado Exemplo (fictício)')).toBeTruthy();
  });

  it('alerta de bem-estar mostra apenas apoio, sem citações', () => {
    render(<SupportView doc={getDemoReport('demo-apoio')!} />);
    expect(screen.getByText(/CVV — 188/)).toBeTruthy();
    expect(screen.queryByText(/Percebi que o preço/)).toBeNull();
  });
});

describe('e-mail na interface', () => {
  it('sem serviço configurado mostra indisponível e prévia, sem sucesso simulado', () => {
    render(<EmailRequest reportId="demo-tres" disponivel={false} motivo="Sem credenciais." />);
    expect(screen.getByText(/Envio real indisponível/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /prévia do e-mail/i }).getAttribute('href')).toContain('demo-tres');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('exige e-mail válido e confirmação antes de pedir código', () => {
    render(<EmailRequest reportId="AAAAAAAAAAAAAAAAAAAAAA" disponivel motivo={null} />);
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'invalido' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/formato/);
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/confirme/);
  });
});

describe('grade de talentos da landing', () => {
  it('lista os 16 temas reais do catálogo e revela o detalhe ao selecionar', () => {
    render(<TalentGrid />);
    const botoes = screen.getAllByRole('button', { pressed: false }).concat(screen.getAllByRole('button', { pressed: true }));
    expect(botoes).toHaveLength(16);
    fireEvent.click(screen.getByRole('button', { name: /Bússola/ }));
    expect(screen.getByRole('button', { name: /Bússola/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(TEMAS.find(t => t.nome === 'Bússola')!.essencia)).toBeTruthy();
  });
});
