import { describe, it, expect } from 'vitest';
import { fingerprint, staticField, dividerPattern, RAMP, charFor, hash32 } from '@/lib/ascii/core';

const soRampa = (s: string) => [...s].every(c => RAMP.includes(c));

describe('AsciiFingerprint (núcleo)', () => {
  it('é determinística para o mesmo identificador', () => {
    expect(fingerprint('abc')).toEqual(fingerprint('abc'));
  });
  it('muda com o identificador', () => {
    expect(fingerprint('abc').join('')).not.toEqual(fingerprint('abd').join(''));
  });
  it('respeita dimensões e usa apenas caracteres ASCII da rampa', () => {
    const fp = fingerprint('X1', 33, 9);
    expect(fp).toHaveLength(9);
    for (const l of fp) { expect(l).toHaveLength(33); expect(soRampa(l)).toBe(true); }
  });
  it('é espelhada (carimbo simétrico)', () => {
    for (const l of fingerprint('sim', 32, 6)) expect(l).toBe([...l].reverse().join(''));
  });
});

describe('outros padrões', () => {
  it('campo estático e divisor são determinísticos e ASCII', () => {
    expect(staticField(40, 3, 1)).toEqual(staticField(40, 3, 1));
    expect(soRampa(staticField(40, 3, 1).join(''))).toBe(true);
    expect(dividerPattern(50, 2)).toHaveLength(50);
    expect(/^[ -~]+$/.test(dividerPattern(50, 2))).toBe(true);
  });
  it('charFor limita a densidade', () => {
    expect(charFor(-1)).toBe(' ');
    expect(charFor(2)).toBe('@');
  });
  it('hash32 é estável', () => {
    expect(hash32('mapa')).toBe(hash32('mapa'));
  });
});
