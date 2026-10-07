// 인사이동 대화 입력 해석. "이하은 품질팀으로", "박준기랑 신현우 자리 바꿔", "이하은 취소", "확정", "품질팀에 누가 좋아?"
// AI 없이도 돌아가는 규칙 해석기예요. 실제 서비스에서는 이 해석 결과를 ARA(LLM)가 문장으로 다듬어요.
import type { Person, Team } from "./model.ts";

export type Intent =
  | { kind: "move"; personIds: string[]; teamId: string; lead: boolean }
  | { kind: "swap"; a: string; b: string }
  | { kind: "undo"; personIds: string[] }
  | { kind: "confirm"; personIds: string[] }
  | { kind: "whereFor"; personId: string }
  | { kind: "whoFor"; teamId: string }
  | { kind: "about"; personId: string }
  | { kind: "help" }
  | { kind: "unknown"; reason: "noPerson" | "noTeam" | "ambiguous" | "sameTeam" | "empty"; candidates?: string[]; teamId?: string; personIds?: string[] };

interface Hit { id: string; at: number; end: number }

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** 이름 찾기: 성까지 쓴 이름 먼저, 없으면 이름 두 글자(겹치지 않을 때만) */
function findPeople(text: string, people: Person[]): { hits: Hit[]; ambiguous: string[] } {
  const hits: Hit[] = [];
  const taken: [number, number][] = [];
  for (const p of [...people].sort((a, b) => b.name.length - a.name.length)) {
    let i = text.indexOf(p.name);
    while (i >= 0) {
      if (!taken.some(([a, b]) => i < b && i + p.name.length > a)) { hits.push({ id: p.id, at: i, end: i + p.name.length }); taken.push([i, i + p.name.length]); }
      i = text.indexOf(p.name, i + 1);
    }
  }
  const ambiguous: string[] = [];
  const byGiven = new Map<string, Person[]>();
  for (const p of people) { const g = p.name.slice(1); byGiven.set(g, [...(byGiven.get(g) ?? []), p]); }
  for (const [g, ps] of byGiven) {
    if (g.length < 2) continue;
    let i = text.indexOf(g);
    while (i >= 0) {
      const covered = taken.some(([a, b]) => i < b && i + g.length > a);
      // 앞 글자가 한글이면 다른 단어의 일부(예: '품질하은')일 수 있어 건너뛰어요
      const prev = text[i - 1];
      const glued = prev && /[가-힣]/.test(prev);
      if (!covered && !glued) {
        if (ps.length === 1) { hits.push({ id: ps[0]!.id, at: i, end: i + g.length }); taken.push([i, i + g.length]); }
        else ambiguous.push(...ps.map((p) => p.id));
      }
      i = text.indexOf(g, i + 1);
    }
  }
  hits.sort((a, b) => a.at - b.at);
  const seen = new Set<string>();
  return { hits: hits.filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true))), ambiguous };
}

/** 팀 찾기: 팀 이름과 별칭(긴 것부터). 뒤에 '(으)로'가 붙은 팀을 목적지로 봐요 */
function findTeams(text: string, teams: Team[]): (Hit & { dest: boolean })[] {
  const hits: (Hit & { dest: boolean })[] = [];
  const taken: [number, number][] = [];
  const keys = teams.flatMap((t) => [t.name, ...t.aliases].map((k) => ({ k, id: t.id }))).sort((a, b) => b.k.length - a.k.length);
  for (const { k, id } of keys) {
    let i = text.indexOf(k);
    while (i >= 0) {
      if (!taken.some(([a, b]) => i < b && i + k.length > a)) {
        let end = i + k.length;
        // '품질팀', '생산2팀'처럼 별칭 뒤에 붙은 '팀'·'팀장'은 같은 말로 봐요
        while (text[end] === "팀" && !text.startsWith("팀장", end)) end++;
        const after = text.slice(end, end + 6);
        const dest = /^(\s*팀장)?\s*(으로|로|에|쪽|발령)/.test(after);
        hits.push({ id, at: i, end, dest });
        taken.push([i, end]);
      }
      i = text.indexOf(k, i + 1);
    }
  }
  return hits.sort((a, b) => a.at - b.at);
}

export function parse(raw: string, people: Person[], teams: Team[]): Intent {
  const text = norm(raw);
  if (!text) return { kind: "unknown", reason: "empty" };
  if (/^(도움말|도움|help|\?|뭐 할 수 있어|어떻게 써)/i.test(text)) return { kind: "help" };

  const { hits: ph, ambiguous } = findPeople(text, people);
  const th = findTeams(text, teams);
  const ids = ph.map((h) => h.id);

  if (/(모두|전부|다)?\s*확정/.test(text) && !/확정\s*(전|하지\s*마)/.test(text)) return { kind: "confirm", personIds: ids };
  if (/(취소|되돌려|원래대로|빼\s*줘|없던\s*걸로|철회)/.test(text)) return { kind: "undo", personIds: ids };
  if (/(바꿔|맞바꿔|교체|스왑|서로)/.test(text) && ids.length >= 2) return { kind: "swap", a: ids[0]!, b: ids[1]! };

  const asksWho = /(누가|누구를|누굴|보낼\s*사람|올\s*사람|채울\s*사람|사람\s*추천)/.test(text);
  const asksWhere = /(어디|어느\s*팀|맞는\s*팀|추천|어울리)/.test(text);

  if (asksWho && th.length && !ids.length) return { kind: "whoFor", teamId: th[th.length - 1]!.id };
  if (!ids.length) {
    if (ambiguous.length) return { kind: "unknown", reason: "ambiguous", candidates: [...new Set(ambiguous)] };
    // '○○ 품질팀으로'처럼 옮기려는데 이름을 못 찾았으면 되묻고, 팀 이름만 있으면 그 팀에 맞는 사람을 찾아요
    const dest = th.find((t) => t.dest && /(으로|로|발령)/.test(text.slice(t.end, t.end + 6)));
    if (dest) return { kind: "unknown", reason: "noPerson", teamId: dest.id };
    if (th.length) return { kind: "whoFor", teamId: th[th.length - 1]!.id };
    return { kind: "unknown", reason: "noPerson" };
  }
  if (asksWhere && !th.some((t) => t.dest) && ids.length === 1) return { kind: "whereFor", personId: ids[0]! };

  // 목적지: '(으)로' 붙은 팀 → 사람 이름 뒤에 나온 마지막 팀 → 마지막 팀
  const lastPersonAt = ph[ph.length - 1]!.at;
  const dest = th.find((t) => t.dest) ?? [...th].reverse().find((t) => t.at > lastPersonAt) ?? th[th.length - 1];
  if (!dest) return ids.length === 1 ? { kind: "about", personId: ids[0]! } : { kind: "unknown", reason: "noTeam", personIds: ids };
  const movers = ids.filter((id) => people.find((p) => p.id === id)!.teamId !== dest.id);
  if (!movers.length) return { kind: "unknown", reason: "sameTeam", personIds: ids, teamId: dest.id };
  const lead = /팀장/.test(text.slice(dest.at, dest.end + 4)) || /팀장\s*(으로|로|을|시켜|맡)/.test(text);
  return { kind: "move", personIds: movers, teamId: dest.id, lead };
}

export const EXAMPLES = [
  "이하은 품질보증팀으로",
  "박준기 어디가 맞을까?",
  "개발팀에 누가 좋아?",
  "권해솔이랑 정재윤 자리 바꿔",
  "이하은 취소",
  "모두 확정",
];
