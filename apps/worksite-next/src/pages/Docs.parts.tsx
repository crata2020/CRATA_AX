// 문서·학습 화면 부품: 범위 칩, 전 → 후 비교, 흐름 띠, 규칙 후보 카드, 근거 찾기, SKILL.md 만들기.
import type { ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, FileText, Sparkles } from "lucide-react";
import { when } from "@/data/format";
import type { Correction, Person, Rule, TenantData } from "@/data/types";
import { Avatar, Button, Chip, cx, type Hue } from "@/ui";

export type Scope = Correction["scope"];

/** 범위 3갈래(+미분류). 리서치 08 '범위 분류 휴리스틱'과 '자산으로 변환' */
export const SCOPE: Record<Scope, { label: string; color: string; rule: string; to: string }> = {
  writing: { label: "작성 규칙", color: "var(--brand)", rule: "같은 수정이 3번 넘게, 여러 문서·사람에게서 나와요", to: "규칙 후보 → 승인 → SKILL.md" },
  template: { label: "템플릿", color: "var(--c-violet)", rule: "글꼴·표·순서처럼 문서 틀이 같은 쪽으로 바뀌어요", to: "템플릿 파일의 판을 올려요" },
  once: { label: "이번만", color: "var(--c-amber)", rule: "고객사 이름·금액·고유명사처럼 이 문서에만 맞아요", to: "이 문서에만 두고 규칙으로 올리지 않아요" },
  unsorted: { label: "미분류", color: "var(--faint)", rule: "AI가 아직 범위를 정하지 못했어요", to: "사람이 한 번 골라요" },
};
export const SCOPE_ORDER: Scope[] = ["writing", "template", "once", "unsorted"];
/** 규칙 후보가 되는 기준(같은 수정 3번) */
export const EVIDENCE_MIN = 3;

export function ScopeTag({ scope }: { scope: Scope }) {
  return <span className={`chip chip--sm dc-scope dc-scope--${scope}`}><i className="chip__dot" />{SCOPE[scope].label}</span>;
}

/** 전 → 후: 지운 글은 회색 취소선, 새 글은 강조 */
export function Diff({ before, after }: { before: string; after: string }) {
  return (
    <span className="dc-diff">
      <del><span className="sr-only">지운 글 </span>{before}</del>
      <ArrowRight className="dc-diff__arr" aria-hidden />
      <ins><span className="sr-only">새 글 </span>{after}</ins>
    </span>
  );
}

// ───────── 흐름 띠(수정 → 범위 → 승인 → 규칙 → 효과)
export interface FlowStep { key: string; label: string; icon: ReactNode; hue: Hue; value: ReactNode; sub: ReactNode; current?: boolean }
export function FlowBand({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="dc-flow" aria-label="수정이 규칙이 되는 다섯 단계">
      {steps.map((s, i) => (
        <li key={s.key} className={cx("dc-flow__step", s.current && "is-current")} aria-current={s.current ? "step" : undefined}>
          <span className={`dc-flow__ic tone-${s.hue}`}>{s.icon}</span>
          <div className="dc-flow__body">
            <div className="dc-flow__label"><span className="dc-flow__no num">{i + 1}</span>{s.label}{s.current && <span className="dc-flow__now">지금 할 일</span>}</div>
            <div className="dc-flow__val num">{s.value}</div>
            <div className="dc-flow__sub">{s.sub}</div>
          </div>
          {i < steps.length - 1 && <ChevronRight className="dc-flow__arr" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

// ───────── 규칙 후보 카드
export function CandidateCard({ rule, example, approver, today, canDecide, onDecide }: {
  rule: Rule; example?: Correction; approver?: Person; today: string; canDecide: boolean; onDecide: (ok: boolean) => void;
}) {
  const enough = rule.evidence >= EVIDENCE_MIN;
  const pips = Math.max(6, rule.evidence);
  return (
    <li className="dc-cand">
      <div className="dc-cand__top">
        <ScopeTag scope={rule.scope} />
        <Chip tone="outline" sm icon={<FileText />}>{rule.docType}</Chip>
        <span className="dc-cand__ai"><Sparkles aria-hidden />AI가 정리 · <span className="num">{when(rule.createdAt, today)}</span></span>
      </div>
      <p className="dc-cand__t">{rule.text}</p>
      <div className="dc-cand__ev">
        <span className="dc-pips" role="img" aria-label={`근거 수정 ${rule.evidence}번, 기준 ${EVIDENCE_MIN}번`}>
          {Array.from({ length: pips }, (_, i) => <i key={i} className={cx(i < rule.evidence && "on", i === EVIDENCE_MIN - 1 && "th")} />)}
        </span>
        <span>같은 수정 <b className="num">{rule.evidence}</b>번</span>
        <Chip tone={enough ? "good" : "warn"} sm>{enough ? `기준 ${EVIDENCE_MIN}번 넘음` : "근거가 아직 적어요"}</Chip>
      </div>
      {example && (
        <div className="dc-cand__ex">
          <span className="dc-cand__exdoc">근거 예시 · {example.doc}</span>
          <Diff before={example.before} after={example.after} />
        </div>
      )}
      <div className="dc-cand__foot">
        <span className="dc-cand__who">
          <Avatar name={approver?.name ?? "?"} size="sm" />
          <span className="ellipsis">승인 {approver?.name ?? "미정"}</span>
          {!canDecide && <span className="faint xs">· 승인자만 반영해요</span>}
        </span>
        <Button size="sm" disabled={!canDecide} onClick={() => onDecide(false)} aria-label={`이번만: ${rule.text}`}>이번만</Button>
        <Button size="sm" variant="soft" icon={<Check />} disabled={!canDecide} onClick={() => onDecide(true)} aria-label={`반영: ${rule.text}`}>반영</Button>
      </div>
    </li>
  );
}

/** 규칙마다 근거가 된 수정 하나(문서 종류가 같은 것 중 낱말이 가장 많이 겹치는 것, 겹치지 않게) */
export function evidenceMap(rules: Rule[], corrections: Correction[]): Record<string, Correction | undefined> {
  const words = (s: string) => s.split(/[\s·(),.[\]:]+/).filter((w) => w.length >= 2);
  const used = new Set<string>();
  const out: Record<string, Correction | undefined> = {};
  for (const r of rules) {
    const key = r.docType.replace(/\s/g, "");
    const pool = corrections.filter((c) => !used.has(c.id) && c.doc.replace(/\s/g, "").includes(key));
    const ws = words(r.text);
    let best: Correction | undefined, score = -1;
    for (const c of pool) {
      const hay = `${c.before} ${c.after}`;
      const s = ws.filter((w) => hay.includes(w)).length;
      if (s > score) { score = s; best = c; }
    }
    if (best) used.add(best.id);
    out[r.id] = best;
  }
  return out;
}

/** 승인한 작성 규칙을 SKILL.md(Agent Skill 공개 형식)로 */
export function skillMarkdown(d: TenantData, name: (id: string) => string): string {
  const active = d.rules.filter((r) => r.status === "active");
  const types = [...new Set(active.map((r) => r.docType))];
  const body = types.map((t) => [`## ${t}`, ...active.filter((r) => r.docType === t).map((r) => `- ${r.text} (근거 ${r.evidence}건 · 승인 ${name(r.approver)} · ${r.createdAt}부터)`)].join("\n")).join("\n\n");
  return [
    "---",
    `name: ${d.id}-writing-rules`,
    `description: ${d.shortName}에서 승인한 문서 작성 규칙이에요. 이 회사 문서 초안을 쓸 때 불러와요.`,
    "---",
    "",
    `# ${d.shortName} 작성 규칙`,
    "",
    "사람이 승인한 규칙만 담았어요. 고객사 이름·금액처럼 '이번만' 수정은 넣지 않았어요.",
    "",
    body || "아직 승인한 규칙이 없어요.",
    "",
  ].join("\n");
}
