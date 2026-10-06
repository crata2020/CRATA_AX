// 숫자 표현: StatTile(라벨·값·단위·증감 칩·추이) · StatRow(카드 안 묶음) · KpiStrip/KpiCard(페이지 위 지표 카드 띠)
//   BigNumber(히어로 안 큰 숫자) · DeltaText(증감 칩 + 흐린 문장)
// dataviz 규칙: 숫자를 색으로 칠하지 않음(증감은 칩 바탕·아이콘 + 문장, 글자는 ink). 큰 숫자는 비례 숫자, 표 칸만 tabular.
import type { ReactNode } from "react";
import { CaretDownOutlined, CaretUpOutlined, MinusOutlined } from "@ant-design/icons";
import { formatNumber, formatQty } from "@/lib/format";
import type { Tone } from "@/theme/tokens";
import { StatusTag } from "./StatusTag";
import { LineSpark } from "./charts";
import { SectionCard } from "./SectionCard";
import { DemoDataBadge } from "./basics";

export interface DeltaTextProps {
  /** 증감 값(부호 포함). 예: -3 */
  value: number;
  unit?: string;
  /** "지난주보다" */
  period: string;
  /** 오르는 게 좋은지(up)·내리는 게 좋은지(down)·판단 없음(none) */
  goodWhen: "up" | "down" | "none";
}

/** 증감 칩(▼ 3건, 바탕만 좋음/나쁨) + 흐린 문장(지난주보다 줄었어요). 스크린리더는 숨은 한 문장("지난주보다 3건 줄었어요")만 읽어요 */
function deltaParts({ value, unit = "", period, goodWhen }: DeltaTextProps): [ReactNode, ReactNode] {
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const tone: Tone = dir === "flat" || goodWhen === "none" ? "neutral" : dir === goodWhen ? "good" : "critical";
  const Icon = dir === "up" ? CaretUpOutlined : dir === "down" ? CaretDownOutlined : MinusOutlined;
  const abs = formatQty(Math.abs(value), unit);
  const verb = dir === "up" ? "늘었어요" : "줄었어요";
  return [
    <span key="chip" className="ws-delta__chip" data-tone={tone} aria-hidden><Icon />{abs}</span>,
    <span key="text" className="ws-delta__text">
      <span aria-hidden>{dir === "flat" ? `${period} 변화가 없어요` : `${period} ${verb}`}</span>
      <span className="ws-sr-only">{dir === "flat" ? `${period} 변화가 없어요` : `${period} ${abs} ${verb}`}</span>
    </span>,
  ];
}

/** StatTile 밖에서 쓰는 증감 한 줄(칩 + 문장) */
export function DeltaText(props: DeltaTextProps) {
  return <span className="ws-delta">{deltaParts(props)}</span>;
}

export interface StatTileProps {
  label: string;
  value: number | string;
  unit?: string;
  delta?: DeltaTextProps;
  /** 추이 → LineSpark(마지막 점 강조). 칸 폭을 다 채우는 높이 28 추이선 */
  trend?: number[];
  /** figure-hero 크기. 화면당 1개 */
  hero?: boolean;
  caption?: string;
  /** 값 옆 StatusTag로만(숫자 색칠 금지) */
  tone?: Tone;
  toneLabel?: string;
  /** 추이 접근성 이름(기본: "{label} 추이") */
  trendLabel?: string;
  /** 왼쪽(KpiCard 안에서는 오른쪽 위) 아이콘 원. 장식이라 읽지 않아요 */
  icon?: ReactNode;
  /** 아이콘 원 색(기본 brand = brand-weak 바탕) */
  iconTone?: Tone | "brand";
}

export function StatTile({ label, value, unit, delta, trend, hero, caption, tone, toneLabel, trendLabel, icon, iconTone = "brand" }: StatTileProps) {
  const shown = typeof value === "number" ? formatNumber(value) : value;
  const [chip, text] = delta ? deltaParts(delta) : [null, null];
  return (
    <div className={`ws-stat${hero ? " ws-stat--hero" : ""}${icon ? " ws-stat--icon" : ""}`}>
      {icon && <span className="ws-iconcircle" data-tone={iconTone} aria-hidden>{icon}</span>}
      <div className="ws-stat__body">
        <span className="ws-stat__label">{label}</span>
        <span className="ws-stat__value">
          <span className={hero ? "ws-t-figure-hero" : "ws-t-figure"}>{shown}</span>
          {unit && <span className="ws-stat__unit">{unit}</span>}
          {chip}
          {tone && toneLabel && <StatusTag tone={tone} label={toneLabel} />}
        </span>
        {text}
        {caption && <span className="ws-stat__caption">{caption}</span>}
        {trend && trend.length > 1 && (
          <span className="ws-stat__trend">
            <LineSpark fluid values={trend} ariaLabel={trendLabel ?? sparkLabel(label, trend, unit)} />
          </span>
        )}
      </div>
    </div>
  );
}

/** StatTile 여러 개를 한 줄에(카드 안 그리드, 칸 사이 짧은 세로선).
 *  바깥 .ws-stats-box는 크기 컨테이너: 칸 수를 화면 폭이 아니라 이 줄이 놓인 카드 안쪽 폭으로 정해요(좁은 홈 칸에서 3칸으로 끼지 않게) */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="ws-stats-box"><div className="ws-stats">{children}</div></div>;
}

export interface KpiStripProps { title?: string; demo?: boolean; ariaLabel?: string; children: ReactNode }
/** 페이지 위 지표 카드 띠(카드 한 장 = 지표 하나). 띠 자체는 카드가 아니라 카드 안에 넣지 않습니다 */
export function KpiStrip({ title, demo, ariaLabel, children }: KpiStripProps) {
  const name = ariaLabel ?? title;
  const Tag = name ? "section" : "div";
  return (
    <Tag className="ws-kpis-block" aria-label={name}>
      {(title || demo) && (
        <div className="ws-kpis__head">
          {title && <h2 className="ws-kpis__title">{title}</h2>}
          {demo && <DemoDataBadge variant="inline" />}
        </div>
      )}
      <div className="ws-kpis">{children}</div>
    </Tag>
  );
}

export interface KpiCardProps { children: ReactNode }
/** KpiStrip 안 카드 한 장(StatTile 또는 Gauge 하나). 이름은 안의 라벨 글자 */
export function KpiCard({ children }: KpiCardProps) {
  return <SectionCard as="div" className="ws-kpi">{children}</SectionCard>;
}

export interface BigNumberProps { value: number | string; unit?: string; label: string }
/** 히어로 카드 안 큰 숫자(흰 글자, figure-hero 36/44) */
export function BigNumber({ value, unit, label }: BigNumberProps) {
  return (
    <div className="ws-bignum">
      <span className="ws-bignum__label">{label}</span>
      <span className="ws-bignum__value">
        <span className="ws-t-figure-hero">{typeof value === "number" ? formatNumber(value) : value}</span>
        {unit && <span className="ws-bignum__unit">{unit}</span>}
      </span>
    </div>
  );
}

function sparkLabel(label: string, v: number[], unit = "") {
  const min = Math.min(...v);
  const max = Math.max(...v);
  return `${label} 추이, 최저 ${formatQty(min, unit)}, 최고 ${formatQty(max, unit)}, 마지막 ${formatQty(v[v.length - 1]!, unit)}`;
}
