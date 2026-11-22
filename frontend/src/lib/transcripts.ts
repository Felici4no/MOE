// Mensagens de transcrição da Agora ConvoAI chegam pelo data stream, às vezes em pedaços base64.
export type Line = { speaker: "user" | "assistant"; text: string; final: boolean; turn: string };

export class Transcripts {
  private chunks = new Map<string, { at: number; total: number; parts: Map<number, string> }>();

  feed(bytes: Uint8Array): Line | null {
    const raw = new TextDecoder().decode(bytes);
    if (raw.length > 262144) return null;
    try {
      let data: Record<string, unknown>;
      if (raw.trimStart().startsWith("{")) data = JSON.parse(raw);
      else {
        const [id, index, count, payload] = raw.split("|");
        const part = Number(index), total = Number(count);
        if (!id || !Number.isInteger(part) || !Number.isInteger(total) || part < 1 || part > total || total > 128) return null;
        const now = Date.now();
        for (const [key, value] of this.chunks) if (now - value.at > 10000) this.chunks.delete(key);
        const entry = this.chunks.get(id) ?? { at: now, total, parts: new Map<number, string>() };
        this.chunks.set(id, entry);
        entry.parts.set(part, payload);
        if (entry.parts.size !== total) return null;
        this.chunks.delete(id);
        const joined = Array.from({ length: total }, (_, i) => atob(entry.parts.get(i + 1) ?? "")).join("");
        data = JSON.parse(new TextDecoder().decode(Uint8Array.from(joined, (c) => c.charCodeAt(0))));
      }
      const text = (data.text ?? data.transcription) as unknown;
      if (typeof text !== "string" || !text.trim()) return null;
      const speaker = data.object === "user.transcription" || data.role === "user" ? "user" : "assistant";
      const final = !(data.final === false || data.is_final === false || data.turn_status === 0);
      return { speaker, text: text.trim(), final, turn: String(data.turn_id ?? data.message_id ?? Date.now()) };
    } catch {
      return null;
    }
  }
}
