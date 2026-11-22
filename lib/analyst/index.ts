import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Adaptador do analista LLM (Prompt B). O texto do prompt é lido de
 * prompts/prompts_mapa_de_talentos.md — fonte única, sem cópia nem alteração.
 * A saída NUNCA é exibida diretamente: passa por validarRelatorio().
 */
export interface AnalystProvider {
  analisar(transcricao: string): Promise<unknown>;
}

let cachedPrompt: string | null = null;

export async function loadAnalystPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  // Normaliza CRLF: no Windows o Git pode fazer checkout com \r\n.
  const md = (await readFile(path.join(process.cwd(), 'prompts', 'prompts_mapa_de_talentos.md'), 'utf8')).replace(/\r\n?/g, '\n');
  const secao = md.split('## PROMPT B')[1];
  const bloco = secao?.match(/```\n([\s\S]*?)```/);
  if (!bloco) throw new Error('Prompt B não encontrado na documentação');
  cachedPrompt = bloco[1].trim();
  return cachedPrompt;
}

export class AnalystError extends Error {
  constructor(message: string, public readonly etapa: 'configuracao' | 'provedor' | 'formato') {
    super(message);
  }
}

/** Qualquer endpoint compatível com POST {baseUrl}/chat/completions. */
export class OpenAICompatibleAnalyst implements AnalystProvider {
  constructor(private opts: { apiKey: string; baseUrl: string; model: string; fetchImpl?: typeof fetch }) {}

  async analisar(transcricao: string): Promise<unknown> {
    const system = await loadAnalystPrompt();
    const f = this.opts.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    let res: Response;
    try {
      res = await f(`${this.opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.opts.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.opts.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: transcricao },
          ],
        }),
      });
    } catch {
      throw new AnalystError('Falha de rede ao chamar o analista', 'provedor');
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new AnalystError(`Analista respondeu ${res.status}`, 'provedor');
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new AnalystError('Resposta vazia do analista', 'formato');
    try {
      return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    } catch {
      throw new AnalystError('Resposta do analista não é JSON', 'formato');
    }
  }
}
