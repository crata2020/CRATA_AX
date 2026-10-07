// 적합도와 ARA의 이동 조언. 결정은 사람이 하고, 여기서는 근거와 우려만 정리해요.
// - CRATA 결과는 '배치 참고'에 동의한 사람만 씁니다. 동의하지 않은 사람은 조직 정보로만 봐요.
// - ARA 복지 공간의 대화·마음 체크인은 여기에 들어오지 않습니다.
import type { CrataProfile, Person, Team, TeamEnv } from "./model.ts";
import { COLOR, CORE, CENTER, CONF_SHORT, MOTIVE, THINK_SHORT } from "./model.ts";
import { josa, monthsBetween, q } from "./text.ts";

export interface FitPart { key: string; label: string; got: number; max: number; good: boolean | null; text: string }
export interface Fit { score: number; parts: FitPart[] }

/** 팀 환경(또는 채용 기준)과 한 사람의 CRATA 결과가 얼마나 맞는지 0~100 */
export function fit(env: TeamEnv, p: CrataProfile, teamName = "이 팀"): Fit {
  const parts: FitPart[] = [];
  const add = (key: string, label: string, max: number, got: number, good: boolean | null, text: string) => parts.push({ key, label, max, got, good, text });

  const core = env.needs.includes(p.problem.core);
  add("core", "문제해결 · 핵심역량", 25, core ? 25 : 8, core,
    core ? `핵심역량 '${CORE[p.problem.core]}'${q(CORE[p.problem.core], "이가")} ${teamName}에 필요한 방식이에요`
      : `핵심역량은 '${CORE[p.problem.core]}'인데 ${josa(teamName, "은는")} '${env.needs.map((c) => CORE[c]).join("·")}' 방식을 더 많이 써요`);

  const center = env.centers.includes(p.problem.center);
  add("center", "문제해결 · 중심역량", 15, center ? 15 : 5, center,
    center ? `중심을 잡아 주는 조건 '${CENTER[p.problem.center]}'${q(CENTER[p.problem.center], "이가")} ${teamName}에 있어요` : `중심을 잡아 주는 조건 '${CENTER[p.problem.center]}'${q(CENTER[p.problem.center], "이가")} ${teamName}에는 적어요`);

  const sOwn = env.starts.includes(p.motive.start.own), sNow = env.starts.includes(p.motive.start.now);
  add("start", "행동동기 · 시작", 15, sOwn ? 15 : sNow ? 9 : 3, sOwn ? true : sNow ? null : false,
    sOwn ? `'${MOTIVE[p.motive.start.own]}'${q(MOTIVE[p.motive.start.own], "이가")} 있을 때 움직이는데, ${josa(teamName, "이가")} 그걸 줘요`
      : `'${MOTIVE[p.motive.start.own]}'${q(MOTIVE[p.motive.start.own], "이가")} 있어야 시작하는 편인데 ${josa(teamName, "은는")} '${env.starts.map((m) => MOTIVE[m]).join("·")}' 위주예요`);

  const kOwn = env.keeps.includes(p.motive.keep.own), kNow = env.keeps.includes(p.motive.keep.now);
  add("keep", "행동동기 · 지속", 15, kOwn ? 15 : kNow ? 9 : 3, kOwn ? true : kNow ? null : false,
    kOwn ? `오래 가게 하는 '${MOTIVE[p.motive.keep.own]}'${q(MOTIVE[p.motive.keep.own], "이가")} ${teamName}에 있어요` : `오래 가려면 '${MOTIVE[p.motive.keep.own]}'${q(MOTIVE[p.motive.keep.own], "이가")} 필요한데 ${teamName}에서는 덜 채워질 수 있어요`);

  const think = p.relation.think.own === env.think;
  add("think", "관계성장 · 생각 정리", 10, think ? 10 : 4, think,
    think ? `${THINK_SHORT[p.relation.think.own]}하는 편이고, ${teamName} 일도 그렇게 돌아가요` : `${THINK_SHORT[p.relation.think.own]}하는 편인데 ${josa(teamName, "은는")} ${THINK_SHORT[env.think]} 위주예요`);

  const conf = p.relation.conf.own === env.conf;
  add("conf", "관계성장 · 자신감", 10, conf ? 10 : 4, conf,
    conf ? `${CONF_SHORT[p.relation.conf.own]}의 사람들과 있을 때 힘이 나는데 ${teamName} 구성이 그래요`
      : `${CONF_SHORT[p.relation.conf.own]}의 사람들과 있을 때 힘이 나는데 ${josa(teamName, "은는")} ${env.conf === "peer" ? "비슷한 연차끼리 일하는" : "선후배가 섞인"} 구성이에요`);

  const c = p.color;
  const colorGot = c.challenge === env.color ? 0 : c.comfort === env.color ? 10 : c.outer === env.color || c.inner === env.color ? 6 : 4;
  add("color", "색채 · 환경", 10, colorGot, c.challenge === env.color ? false : c.comfort === env.color ? true : null,
    c.challenge === env.color ? `${teamName} 환경(${COLOR[env.color].label})이 지금 필요하지 않은 환경(챌린지존)과 같아요`
      : c.comfort === env.color ? `지금 필요한 환경(${COLOR[c.comfort].label} · ${COLOR[c.comfort].env})이 ${teamName} 환경과 같아요`
      : `${teamName} 환경은 ${COLOR[env.color].label}, 지금 필요한 환경은 ${josa(COLOR[c.comfort].label, "이에요")}`);

  const score = Math.round(parts.reduce((s, x) => s + x.got, 0));
  return { score, parts };
}

export type Verdict = "good" | "mixed" | "caution" | "unknown";
export const VERDICT: Record<Verdict, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  good: { label: "잘 맞아요", tone: "good" },
  mixed: { label: "살펴볼 점 있어요", tone: "warn" },
  caution: { label: "신중하게", tone: "bad" },
  unknown: { label: "CRATA 결과 없음", tone: "neutral" },
};
export const verdictOf = (score: number): Verdict => (score >= 75 ? "good" : score >= 55 ? "mixed" : "caution");

export interface World { people: Person[]; teams: Team[]; today: string }
export interface Note { text: string; severe?: boolean }
export interface Advice {
  personId: string;
  fromTeamId: string;
  toTeamId: string;
  verdict: Verdict;
  score?: number;
  fromScore?: number;
  headline: string;
  pros: string[];
  cons: Note[];
  tips: string[];
  better?: { teamId: string; score: number };
  usedCrata: boolean;
}

const usable = (p: Person): p is Person & { crata: CrataProfile } => p.consent === "placement" && !!p.crata;
export const teamOf = (w: World, id: string) => w.teams.find((t) => t.id === id)!;
export const membersOf = (w: World, teamId: string) => w.people.filter((p) => p.teamId === teamId);

/** 한 사람을 toTeamId로 옮기면? world는 '이 이동 전' 상태(다른 확정 전 이동은 반영된 상태) */
export function adviseMove(w: World, personId: string, toTeamId: string): Advice {
  const p = w.people.find((x) => x.id === personId)!;
  const from = teamOf(w, p.teamId), to = teamOf(w, toTeamId);
  const pros: string[] = [], cons: Note[] = [], tips: string[] = [];
  const name = `${p.name} 님`;

  // 조직 정보(동의와 상관없이 써요)
  const fromLeft = membersOf(w, from.id).filter((x) => x.id !== p.id);
  if (fromLeft.length < from.min) cons.push({ text: `${josa(from.name, "이가")} ${fromLeft.length + 1}명 → ${fromLeft.length}명이 돼요(최소 ${from.min}명).`, severe: true });
  for (const s of p.skills.filter((s) => from.keySkills.includes(s))) {
    const left = fromLeft.filter((x) => x.skills.includes(s)).length;
    if (left === 0) cons.push({ text: `${from.name}에 '${s}' 할 수 있는 사람이 남지 않아요.`, severe: true });
    else if (left === 1) cons.push({ text: `${from.name}의 '${s}' 가능자가 2명 → 1명이 돼요.` });
  }
  if (p.leader) cons.push({ text: `${from.name} 팀장 자리가 비어요. 후임을 같이 정해 주세요.`, severe: true });
  const missing = to.requires.filter((r) => !p.licenses.includes(r));
  if (missing.length) {
    cons.push({ text: `${josa(to.name, "은는")} '${missing.join("', '")}'${q(missing[missing.length - 1]!, "이가")} 필요한데 아직 없어요.` });
    tips.push(`옮기기 전에 '${missing[0]}' 일정을 먼저 잡아 주세요.`);
  }
  if (to.shift && !p.shiftOk) cons.push({ text: `${josa(to.name, "은는")} 교대 근무인데, 교대가 어렵다고 적혀 있어요.`, severe: true });
  const sinceJoin = monthsBetween(p.joined, w.today);
  if (sinceJoin < 6) cons.push({ text: `입사 ${Math.max(sinceJoin, 0)}개월째라 아직 적응 중이에요.` });
  else if (p.lastMoved && monthsBetween(p.lastMoved, w.today) < 6) cons.push({ text: `${monthsBetween(p.lastMoved, w.today)}개월 전에 팀을 옮겼어요. 잦은 이동은 적응에 부담이 돼요.` });
  const toNow = membersOf(w, to.id);
  const keyGain = p.skills.filter((s) => to.keySkills.includes(s) && toNow.filter((x) => x.skills.includes(s)).length <= 1);
  if (keyGain.length) pros.push(`${to.name}에 부족한 '${keyGain[0]}' 일을 할 수 있어요.`);

  const severe = cons.filter((c) => c.severe).length;

  if (!usable(p)) {
    const verdict: Verdict = severe ? "caution" : "unknown";
    return {
      personId, fromTeamId: from.id, toTeamId: to.id, verdict, usedCrata: false, pros, cons, tips: [...tips, "본인 이야기를 먼저 들어 보세요."],
      headline: `${name}은 CRATA 결과를 배치에 쓰는 데 동의하지 않았어요. 조직 정보로만 봤어요.`,
    };
  }

  const f = fit(to.env, p.crata, to.name);
  const f0 = fit(from.env, p.crata, from.name);
  for (const part of [...f.parts].sort((a, b) => b.got / b.max - a.got / a.max)) {
    if (part.good === true && pros.length < 4) pros.push(part.text);
  }
  for (const part of f.parts.filter((x) => x.good === false).sort((a, b) => b.max - a.max).slice(0, 2)) cons.push({ text: part.text });

  // 팀 구성: 아직 없는 방식을 채우는지, 한쪽으로 쏠리는지(동의한 사람 기준)
  const toData = toNow.filter(usable);
  const sameCore = toData.filter((x) => x.crata.problem.core === p.crata.problem.core).length;
  if (to.env.needs.includes(p.crata.problem.core) && sameCore === 0) pros.push(`${to.name}에 아직 없는 '${CORE[p.crata.problem.core]}' 방식을 채워요.`);
  if (toData.length >= 3 && sameCore >= toData.length - 1 && sameCore >= 3) cons.push({ text: `${to.name}에 '${CORE[p.crata.problem.core]}' 방식이 ${sameCore + 1}명으로 쏠려요(동의한 사람 기준).` });
  if (p.crata.color.challenge === to.env.color) tips.push("챌린지존 환경이라 첫 3개월은 2주에 한 번 짧게 이야기해 주세요.");
  const drift: string[] = [];
  const cm = p.crata.motive, rl = p.crata.relation;
  if (cm.start.now !== cm.start.own) drift.push(`시작은 본래 '${MOTIVE[cm.start.own]}', 지금은 '${MOTIVE[cm.start.now]}'`);
  if (cm.keep.now !== cm.keep.own) drift.push(`지속은 본래 '${MOTIVE[cm.keep.own]}', 지금은 '${MOTIVE[cm.keep.now]}'`);
  if (rl.think.now !== rl.think.own) drift.push(`생각 정리는 본래 ${THINK_SHORT[rl.think.own]}, 지금은 ${THINK_SHORT[rl.think.now]}`);
  if (drift.length) tips.push(`지금 환경에 맞추느라 본래 방식과 다르게 움직이고 있어요(${drift[0]}). 옮긴 뒤 첫 달은 면담을 잡아 주세요.`);

  let verdict = verdictOf(f.score);
  if (severe && verdict === "good") verdict = "mixed";
  if (severe >= 2) verdict = "caution";

  let better: Advice["better"];
  for (const t of w.teams) {
    if (t.id === to.id || t.id === from.id || t.office) continue;
    const s = fit(t.env, p.crata, t.name).score;
    if (s >= 60 && s >= f.score + 8 && (!better || s > better.score)) better = { teamId: t.id, score: s };
  }

  const headline =
    verdict === "good" ? `${name}은 ${josa(to.name, "과와")} 잘 맞아요.`
      : verdict === "mixed" ? (severe ? `${josa(to.name, "과와")}는 맞는 편이지만, ${from.name}에 빈자리가 생겨요.` : `${josa(to.name, "과와")} 맞는 점이 많지만 살펴볼 점이 있어요.`)
      : severe >= 2 ? `지금 옮기면 ${from.name}에 공백이 커요.` : `${name}에게 ${josa(to.name, "은는")} 맞지 않는 점이 더 많아요.`;
  if (tips.length === 0) tips.push("확정 전에 본인과 먼저 이야기해 보세요.");

  return { personId, fromTeamId: from.id, toTeamId: to.id, verdict, score: f.score, fromScore: f0.score, headline, pros: pros.slice(0, 4), cons, tips, better, usedCrata: true };
}

/** 이 사람에게 맞는 팀(지금 팀 제외). 들어가서 받으면 되는 교육은 조금, 국가자격은 크게 뺍니다 */
export function suggestTeams(w: World, personId: string, n = 3) {
  const p = w.people.find((x) => x.id === personId)!;
  if (!usable(p)) return [];
  return w.teams.filter((t) => t.id !== p.teamId && !t.office)
    .map((t) => ({ team: t, fit: fit(t.env, p.crata, t.name), advice: adviseMove(w, p.id, t.id) }))
    .map((x) => ({ ...x, rank: x.fit.score - x.advice.cons.filter((c) => c.severe).length * 10 - x.team.requires.filter((r) => !p.licenses.includes(r)).reduce((s, r) => s + (r.includes("교육") ? 2 : 8), 0) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, n);
}

/** 이 팀으로 보낼 만한 사람(다른 팀에서, 동의한 사람만) */
export function suggestPeople(w: World, teamId: string, n = 3) {
  const t = teamOf(w, teamId);
  return w.people.filter((p) => p.teamId !== teamId && usable(p) && !teamOf(w, p.teamId).office)
    .map((p) => ({ person: p, advice: adviseMove(w, p.id, teamId) }))
    .map((x) => ({ ...x, rank: (x.advice.score ?? 0) - x.advice.cons.filter((c) => c.severe).length * 15 - x.advice.cons.length * 3 }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, n)
    .map((x) => ({ ...x, team: t }));
}

/** 팀 안 CRATA 분포. 동의 범위와 상관없이 검사한 사람이 5명 이상일 때만 보여 줘요. */
export function teamDistribution(w: World, teamId: string) {
  const takers = membersOf(w, teamId).filter((p) => p.crata && p.consent !== "none");
  if (takers.length < 5) return { shown: false as const, n: takers.length };
  const count = <K extends string>(get: (c: CrataProfile) => K) => takers.reduce<Record<string, number>>((m, p) => { const k = get(p.crata!); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  return {
    shown: true as const, n: takers.length,
    core: count((c) => c.problem.core), think: count((c) => c.relation.think.own), conf: count((c) => c.relation.conf.own), comfort: count((c) => c.color.comfort),
  };
}
