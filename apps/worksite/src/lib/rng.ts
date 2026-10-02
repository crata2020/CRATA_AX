// 고정 난수(시드 재현용). 같은 테넌트 + 같은 stream 이름이면 늘 같은 순서의 값이 나옵니다.

export interface Rng {
  /** 0 이상 1 미만 */
  next(): number;
  /** min 이상 max 이하 정수 */
  int(min: number, max: number): number;
  /** 소수 둘째 자리까지 */
  float(min: number, max: number, digits?: number): number;
  pick<T>(list: readonly T[]): T;
  /** 가중치 고르기: [[값, 가중치], …] */
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
  chance(p: number): boolean;
  shuffle<T>(list: readonly T[]): T[];
  /** n개 서로 다른 항목 */
  sample<T>(list: readonly T[], n: number): T[];
}

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const next = mulberry32(xmur3(seed)());
  const rng: Rng = {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max, digits = 2) => Math.round((next() * (max - min) + min) * 10 ** digits) / 10 ** digits,
    pick: (list) => list[Math.floor(next() * list.length)] as (typeof list)[number],
    weighted: (entries) => {
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
      return entries[entries.length - 1]![0];
    },
    chance: (p) => next() < p,
    shuffle: (list) => {
      const a = [...list];
      for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
      return a;
    },
    sample: (list, n) => rng.shuffle(list).slice(0, Math.max(0, n)),
  };
  return rng;
}
