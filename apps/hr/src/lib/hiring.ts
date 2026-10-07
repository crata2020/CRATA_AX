// 채용: 서류 조건 확인 → CRATA 검사 결과로 팀·직무 적합도 → 면접 추천.
// AI는 추천과 근거만 내요. 탈락·합격은 담당자가 정하고, 추천에서 빠진 사람도 담당자가 면접에 넣을 수 있어요.
import type { Applicant, CrataProfile, Person, Position, Team, TeamEnv } from "./model.ts";
import { COLOR, CORE, MOTIVE } from "./model.ts";
import { fit, type Fit } from "./fit.ts";
import { q } from "./text.ts";

export interface Screening { ok: boolean; misses: string[] }
export type Tier = "recommend" | "consider" | "hold" | "pending";
export const TIER: Record<Tier, { label: string; tone: "good" | "info" | "warn" | "neutral" }> = {
  recommend: { label: "면접 추천", tone: "good" },
  consider: { label: "검토", tone: "info" },
  hold: { label: "담당자 판단", tone: "warn" },
  pending: { label: "검사 전", tone: "neutral" },
};

export interface Rec {
  tier: Tier;
  score?: number;
  fit?: Fit;
  screening: Screening;
  reasons: string[];
  concerns: string[];
  questions: string[];
}

/** 회사가 강조한 항목을 팀 환경 위에 얹은 '찾는 사람' 기준 */
export function desiredEnv(pos: Position, team: Team): TeamEnv {
  return { ...team.env, ...pos.want } as TeamEnv;
}

export function screen(pos: Position, a: Applicant): Screening {
  const misses: string[] = [];
  if (a.years < pos.minYears) misses.push(`경력 ${a.years}년(기준 ${pos.minYears}년 이상)`);
  if (pos.shift && !a.shiftOk) misses.push("교대 근무가 어렵다고 적었어요");
  for (const l of pos.mustLicenses) if (!a.licenses.includes(l)) misses.push(`'${l}' 없음`);
  return { ok: misses.length === 0, misses };
}

const usable = (p: Person): p is Person & { crata: CrataProfile } => p.consent === "placement" && !!p.crata;

export function recommend(pos: Position, team: Team, members: Person[], a: Applicant): Rec {
  const screening = screen(pos, a);
  if (!a.crata) {
    return { tier: "pending", screening, reasons: screening.ok ? ["서류 조건을 채웠어요"] : [], concerns: screening.misses, questions: [] };
  }
  const env = desiredEnv(pos, team);
  const f = fit(env, a.crata, team.name);
  let score = f.score;
  const reasons = f.parts.filter((p) => p.good === true).sort((x, y) => y.max - x.max).slice(0, 3).map((p) => p.text);
  const concerns = [...screening.misses, ...f.parts.filter((p) => p.good === false).map((p) => p.text)];

  if (pos.mode === "complement") {
    const have = new Set(members.filter(usable).map((m) => m.crata.problem.core));
    if (env.needs.includes(a.crata.problem.core) && !have.has(a.crata.problem.core)) {
      score = Math.min(100, score + 6);
      reasons.unshift(`팀에 지금 없는 '${CORE[a.crata.problem.core]}' 방식을 채워요`);
    }
  }

  const questions: string[] = [];
  for (const p of f.parts.filter((x) => x.good !== true)) {
    if (questions.length >= 3) break;
    if (p.key === "core") { const w = env.needs.map((c) => CORE[c]); questions.push(`최근 일에서 '${w.join("·")}'${q(w[w.length - 1]!, "이가")} 필요했던 순간을 말해 주세요. 그때 어떻게 했나요?`); }
    if (p.key === "start") { const w = env.starts.map((m) => MOTIVE[m]); questions.push(`새 일을 맡을 때 무엇이 있으면 움직이기 편한가요? (이 팀은 '${w.join("·")}'${q(w[w.length - 1]!, "이가")} 분명한 편이에요)`); }
    if (p.key === "keep") questions.push("같은 일을 오래 할 때 힘이 빠지는 순간과 다시 힘이 나는 계기를 말해 주세요.");
    if (p.key === "think") questions.push(env.think === "solo" ? "혼자 판단해야 했던 일을 어떻게 정리했는지 말해 주세요." : "동료와 이야기하며 일을 풀었던 경험을 말해 주세요.");
    if (p.key === "conf") questions.push(env.conf === "mixed" ? "선배·후배가 섞인 팀에서 일한 경험이 있나요? 그때 어땠나요?" : "비슷한 연차끼리 함께 목표를 맡았던 경험을 말해 주세요.");
    if (p.key === "color") questions.push(`'${COLOR[env.color].env}'에서 일해 본 경험과 그때 어땠는지 말해 주세요.`);
    if (p.key === "center") questions.push("일이 잘 풀렸던 때 주변 환경이 어땠는지 말해 주세요.");
  }
  if (!screening.ok) questions.unshift(`서류에서 걸린 점(${screening.misses.join(", ")})을 먼저 확인하세요.`);

  const tier: Tier = !screening.ok ? "hold" : score >= 75 ? "recommend" : score >= 58 ? "consider" : "hold";
  return { tier, score, fit: f, screening, reasons: reasons.slice(0, 3), concerns, questions: questions.slice(0, 4) };
}
