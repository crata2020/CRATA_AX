// 검색 일치 글자 굵게(색이 아니라 굵기로, 빌드 스펙 H-04). 소유: home 그룹(검색 화면·CommandMenu가 함께 씀).
import { Fragment } from "react";
import { getPrefs, setPrefs } from "@/lib/storage";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function Highlight({ text, q }: { text: string; q: string }) {
  const tokens = q.normalize("NFC").trim().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!tokens.length) return <>{text}</>;
  const re = new RegExp(`(${tokens.map(esc).join("|")})`, "gi");
  const parts = text.normalize("NFC").split(re);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

/** 최근 검색어(편의 값, 5개) */
export const recentSearches = (): string[] => (getPrefs().recentSearches ?? []).slice(0, 5);
export function rememberSearch(q: string) {
  const v = q.trim();
  if (!v) return;
  setPrefs({ recentSearches: [v, ...recentSearches().filter((x) => x !== v)].slice(0, 5) });
}
export function clearRecentSearches() {
  setPrefs({ recentSearches: [] });
}

/** 테넌트별 예시 검색어 */
export const EXAMPLE_QUERIES: Record<string, string[]> = {
  "tr-technology": ["CL-2026-03", "KN-07", "SUS321", "8D", "공장장"],
  "crata-demo": ["제안서", "예시기업", "성춘향", "특강", "학맞통"],
};
