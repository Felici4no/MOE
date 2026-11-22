import 'server-only';

/**
 * Armazenamento chave-valor com expiração. Duas implementações:
 * - Upstash Redis via REST (persistente; produção);
 * - memória do processo (apenas desenvolvimento local e testes).
 */
export interface KV {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  /** Grava somente se a chave não existir. Retorna true se gravou. */
  setIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean>;
  incr(key: string, ttlSeconds: number): Promise<number>;
  del(key: string): Promise<void>;
}

class MemoryKV implements KV {
  private map = new Map<string, { v: string; exp: number }>();
  private live(key: string) {
    const item = this.map.get(key);
    if (!item) return null;
    if (item.exp < Date.now()) { this.map.delete(key); return null; }
    return item;
  }
  async get<T>(key: string) {
    const item = this.live(key);
    return item ? (JSON.parse(item.v) as T) : null;
  }
  async set(key: string, value: unknown, ttl: number) {
    this.map.set(key, { v: JSON.stringify(value), exp: Date.now() + ttl * 1000 });
  }
  async setIfAbsent(key: string, value: unknown, ttl: number) {
    if (this.live(key)) return false;
    await this.set(key, value, ttl);
    return true;
  }
  async incr(key: string, ttl: number) {
    const item = this.live(key);
    const n = (item ? Number(JSON.parse(item.v)) : 0) + 1;
    this.map.set(key, { v: JSON.stringify(n), exp: item ? item.exp : Date.now() + ttl * 1000 });
    return n;
  }
  async del(key: string) { this.map.delete(key); }
}

class UpstashKV implements KV {
  constructor(private url: string, private token: string) {}
  private async cmd(args: (string | number)[]) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Store indisponível (${res.status})`);
    const data = (await res.json()) as { result?: unknown; error?: string };
    if (data.error) throw new Error('Store retornou erro');
    return data.result;
  }
  async get<T>(key: string) {
    const r = await this.cmd(['GET', key]);
    return typeof r === 'string' ? (JSON.parse(r) as T) : null;
  }
  async set(key: string, value: unknown, ttl: number) {
    await this.cmd(['SET', key, JSON.stringify(value), 'EX', ttl]);
  }
  async setIfAbsent(key: string, value: unknown, ttl: number) {
    return (await this.cmd(['SET', key, JSON.stringify(value), 'EX', ttl, 'NX'])) === 'OK';
  }
  async incr(key: string, ttl: number) {
    const n = Number(await this.cmd(['INCR', key]));
    if (n === 1) await this.cmd(['EXPIRE', key, ttl]);
    return n;
  }
  async del(key: string) { await this.cmd(['DEL', key]); }
}

const globalStore = globalThis as unknown as { __mapaKV?: KV };

export function getKV(): KV {
  if (globalStore.__mapaKV) return globalStore.__mapaKV;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  globalStore.__mapaKV = url && token ? new UpstashKV(url, token) : new MemoryKV();
  return globalStore.__mapaKV;
}

/** Somente para testes. */
export function __setKVForTests(kv: KV | undefined) {
  globalStore.__mapaKV = kv;
}

export { MemoryKV };
