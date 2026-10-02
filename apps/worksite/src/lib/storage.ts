// 브라우저 저장소 접근은 모두 이 파일의 try/catch 함수로만 합니다(빌드 스펙 5.5.2절).
// 저장소를 못 쓰면(사생활 보호 창, 차단) 조용히 메모리로만 동작합니다.

const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    const s = window.localStorage;
    const k = "__ws_probe__";
    s.setItem(k, "1");
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}
let cached: Storage | null | undefined;
const store = () => (cached === undefined ? (cached = ls()) : cached);

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(key) ?? memory.get(key) ?? null;
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    store()?.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string) {
  memory.delete(key);
  try { store()?.removeItem(key); } catch { /* 무시 */ }
}

/** prefix로 시작하는 키 목록(데모 초기화·검사용) */
export function keysWithPrefix(prefix: string): string[] {
  const out = new Set<string>([...memory.keys()].filter((k) => k.startsWith(prefix)));
  try {
    const s = store();
    if (s) for (let i = 0; i < s.length; i += 1) { const k = s.key(i); if (k?.startsWith(prefix)) out.add(k); }
  } catch { /* 무시 */ }
  return [...out];
}

/** 편의 값(localStorage["ws:v1:prefs"]) */
export interface Prefs {
  lastTenant?: string;
  personaByTenant?: Record<string, string>;
  navCollapsed?: boolean;
  /** 변경 내용 이 브라우저에 저장(기본 true) */
  persist?: boolean;
  recentSearches?: string[];
}
export const PREFS_KEY = "ws:v1:prefs";
export const getPrefs = (): Prefs => readJson<Prefs>(PREFS_KEY, {});
export const setPrefs = (patch: Partial<Prefs>) => writeJson(PREFS_KEY, { ...getPrefs(), ...patch });

/** 회사 데이터 변경분 키 / ARA 개인 영역 키(5.5.2·5.9절) */
export const opsKey = (tenantId: string) => `ws:v1:${tenantId}:ops`;
export const araKey = (tenantId: string, memberId: string) => `ws:v1:${tenantId}:ara:${memberId}`;
