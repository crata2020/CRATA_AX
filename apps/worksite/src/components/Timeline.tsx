// Timeline: 세로 1px 선 + 8px 점(tone 마크색) + 시각(caption, tabular). 진행 기록·버전·8D 단계·연혁에 씁니다.
import type { ReactNode } from "react";
import { useWorksite } from "@/app/TenantBoundary";
import { formatRelative } from "@/lib/format";
import type { Tone } from "@/theme/tokens";
import { PersonChip, type PersonChipProps } from "./PersonChip";

export interface TimelineItem {
  id: string;
  /** ISO 시각 또는 표시용 글자(예: "2015-05", "9월 18일 완료") */
  at: string;
  title: string;
  description?: string;
  actor?: PersonChipProps;
  tone?: Tone;
  /** 제목 옆 태그·아이콘 */
  icon?: ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  /** 기본 desc(최근이 위) */
  order?: "desc" | "asc";
  dense?: boolean;
  /** at이 ISO면 "3분 전"처럼 상대 시각으로(기본 true) */
  relative?: boolean;
  ariaLabel?: string;
}

const isIso = (s: string) => /^\d{4}-\d{2}-\d{2}T/.test(s);

export function Timeline({ items, order = "desc", dense, relative = true, ariaLabel }: TimelineProps) {
  const { clock } = useWorksite();
  const sorted = [...items].sort((a, b) => (order === "desc" ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)));
  return (
    <ol className={`ws-timeline${dense ? " ws-timeline--dense" : ""}`} aria-label={ariaLabel}>
      {sorted.map((it) => (
        <li key={it.id} className="ws-tl">
          <span className="ws-tl__dot" style={{ background: `var(--ws-${it.tone ?? "neutral"}-mark)` }} aria-hidden />
          <div className="ws-tl__time">{isIso(it.at) && relative ? formatRelative(it.at, clock.now()) : it.at}</div>
          <div className="ws-tl__title">{it.title}{it.icon}</div>
          {it.description && <div className="ws-tl__desc">{it.description}</div>}
          {it.actor && <div className="ws-tl__actor"><PersonChip size="sm" {...it.actor} /></div>}
        </li>
      ))}
    </ol>
  );
}
