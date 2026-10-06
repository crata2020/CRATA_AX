// 현장·품질 부품: 현장 등록 종류(Report와 같이 씀), 눈금 막대(refs/fleettrack-analytics.jpg 'Top Fuel Consuming'),
// 주간 쌓은 캡슐 막대(Orbix 캡슐 막대 문법), 8D 단계 점 스텝, 제조 전용 안내.
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Check, Factory, HardHat, MessageSquareMore, PackageX, Wrench, type LucideIcon } from "lucide-react";
import type { FieldReport } from "@/data/types";
import { Button, Card, Empty, PageHead, type Hue, type Tone } from "@/ui";

export type FieldKind = FieldReport["kind"];
export interface KindMeta { id: FieldKind; label: string; sub: string; hue: Hue; color: string; soft: string; Icon: LucideIcon; to: string }

/** 현장 등록 종류. 받는 사람(to)은 진단 전 가설(06 문서: 불량 → 품질, 설비 → 공장장, 아차사고·기타 → 총무) */
export const FIELD_KINDS: KindMeta[] = [
  { id: "defect", label: "불량", sub: "치수·외관·코 빠짐", hue: "coral", color: "var(--c-coral)", soft: "var(--c-coral-soft)", Icon: PackageX, to: "품질 담당" },
  { id: "equipment", label: "설비 이상", sub: "소음·멈춤·누유", hue: "amber", color: "var(--c-amber)", soft: "var(--c-amber-soft)", Icon: Wrench, to: "공장장" },
  { id: "nearmiss", label: "아차사고", sub: "다칠 뻔한 일", hue: "violet", color: "var(--c-violet)", soft: "var(--c-violet-soft)", Icon: HardHat, to: "총무 담당" },
  { id: "other", label: "기타", sub: "시설·의견", hue: "blue", color: "var(--c-blue)", soft: "var(--c-blue-soft)", Icon: MessageSquareMore, to: "총무 담당" },
];
export const KIND = Object.fromEntries(FIELD_KINDS.map((k) => [k.id, k])) as Record<FieldKind, KindMeta>;
/** 받침 있으면 a, 없으면 b(은/는, 이/가) */
export const josa = (word: string, a: string, b: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b;
};
/** 종류별 추천 담당(데모 데이터의 사람 id) */
export const FIELD_ROUTE: Record<FieldKind, string> = { defect: "tr-qa", equipment: "tr-plant", nearmiss: "tr-admin", other: "tr-admin" };

export const FIELD_STATUS: Record<FieldReport["status"], { label: string; tone: Tone }> = {
  new: { label: "미배정", tone: "bad" }, assigned: { label: "배정됨", tone: "info" }, done: { label: "처리됨", tone: "good" },
};

/** 종류 칩(파스텔 아이콘 + 글자) */
export function KindChip({ kind }: { kind: FieldKind }) {
  const k = KIND[kind];
  return <span className={`ql-kind tone-${k.hue}`}><k.Icon aria-hidden />{k.label}</span>;
}

/** 눈금 막대(채운 눈금 + 옅은 눈금 트랙) */
export function TickBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return <div className="ql-tick" role="img" aria-label={label}><i style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, color }} /></div>;
}

/** 주간 쌓은 캡슐 막대: 옅은 트랙 안에 종류별 조각을 쌓음 */
export function WeekStack({ days, kinds, focus, height = 170 }: {
  days: { day: string; values: Record<FieldKind, number> }[]; kinds: KindMeta[]; focus: number; height?: number;
}) {
  const totals = days.map((d) => kinds.reduce((s, k) => s + (d.values[k.id] ?? 0), 0));
  const max = Math.max(1, ...totals) * 1.25;
  return (
    <div className="ql-wk" role="img" aria-label={`이번 주 현장 등록: ${days.map((d, i) => `${d.day} ${totals[i]}건`).join(", ")}`}>
      {days.map((d, i) => (
        <div key={d.day + i} className={`ql-wk__col${i === focus ? " is-focus" : ""}`} title={`${d.day}: ${kinds.map((k) => `${k.label} ${d.values[k.id] ?? 0}`).join(" · ")}`}>
          <span className="ql-wk__n num">{totals[i] || ""}</span>
          <div className="ql-wk__track" style={{ height }}>
            {kinds.map((k) => {
              const v = d.values[k.id] ?? 0;
              return v ? <i key={k.id} style={{ height: `${(v / max) * 100}%`, background: k.color }} /> : null;
            })}
          </div>
          <span className="ql-wk__d">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

/** 8D 단계 점 스텝(D0~D8) */
export const D_STEPS = ["준비", "팀 구성", "문제 정의", "임시 조치", "근본 원인", "영구 대책", "실행·검증", "재발 방지", "마무리"];
export function DSteps({ step }: { step: number }) {
  return (
    <ol className="ql-steps" aria-label={`8D 진행: D${step} ${D_STEPS[step] ?? ""} 단계`}>
      {D_STEPS.map((n, i) => (
        <li key={n} className={i < step ? "is-done" : i === step ? "is-now" : undefined} aria-current={i === step ? "step" : undefined}>
          <span className="ql-steps__dot">{i < step ? <Check aria-hidden /> : <i />}</span>
          <span className="ql-steps__c num">D{i}</span>
          <span className="ql-steps__n">{n}</span>
        </li>
      ))}
    </ol>
  );
}

/** 교육 회사 등 제조 팩이 아닐 때 */
export function NotManufacturing({ title, desc }: { title: string; desc: ReactNode }) {
  const nav = useNavigate();
  return (
    <>
      <PageHead title={title} desc={desc} />
      <Card>
        <Empty icon={<Factory />} title="제조 회사에서 쓰는 화면이에요">
          <p className="small">불량·설비·아차사고 등록과 품질 지표는 제조 팩에서만 보여요.</p>
          <Button style={{ marginTop: 6 }} onClick={() => nav("/")}>홈으로</Button>
        </Empty>
      </Card>
    </>
  );
}
