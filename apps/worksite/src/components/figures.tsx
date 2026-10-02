// 숫자 표현: StatTile(라벨·값·단위·증감·추이) · BigNumber(히어로 안 큰 숫자) · DeltaText(증감 아이콘 + 문장)
// dataviz 규칙: 숫자를 색으로 칠하지 않음(증감은 아이콘 + 문장). 큰 숫자는 비례 숫자, 표 칸만 tabular.
import type { ReactNode } from "react";
import { CaretDownOutlined, CaretUpOutlined, MinusOutlined } from "@ant-design/icons";
import { formatNumber, formatQty } from "@/lib/format";
import type { Tone } from "@/theme/tokens";
import { StatusTag } from "./StatusTag";
import { LineSpark } from "./charts";

export interface DeltaTextProps {
  /** 증감 값(부호 포함). 예: -3 */
  value: number;
  unit?: string;
  /** "지난주보다" */
  period: string;
  /** 오르는 게 좋은지(up)·내리는 게 좋은지(down)·판단 없음(none) */
  goodWhen: "up" | "down" | "none";
}

/** "▼ 지난주보다 3건 줄었어요" — 아이콘 색만 좋음(good)/나쁨(critical), 글자는 ink-2 */
export function DeltaText({ value, unit = "", period, goodWhen }: DeltaTextProps) {
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const tone: Tone = dir === "flat" || goodWhen === "none" ? "neutral" : dir === goodWhen ? "good" : "critical";
  const Icon = dir === "up" ? CaretUpOutlined : dir === "down" ? CaretDownOutlined : MinusOutlined;
  const abs = formatQty(Math.abs(value), unit);
  const verb = dir === "up" ? "늘었어요" : dir === "down" ? "줄었어요" : "같아요";
  return (
    <span className="ws-delta">
      <span className="ws-delta__icon" data-tone={tone} aria-hidden><Icon /></span>
      <span>{dir === "flat" ? `${period} 변화가 없어요` : `${period} ${abs} ${verb}`}</span>
    </span>
  );
}

export interface StatTileProps {
  label: string;
  value: number | string;
  unit?: string;
  delta?: DeltaTextProps;
  /** 추이 → LineSpark(마지막 점 강조) */
  trend?: number[];
  /** figure-hero 크기. 화면당 1개 */
  hero?: boolean;
  caption?: string;
  /** 값 옆 StatusTag로만(숫자 색칠 금지) */
  tone?: Tone;
  toneLabel?: string;
  /** 추이 접근성 이름(기본: "{label} 추이") */
  trendLabel?: string;
}

export function StatTile({ label, value, unit, delta, trend, hero, caption, tone, toneLabel, trendLabel }: StatTileProps) {
  const shown = typeof value === "number" ? formatNumber(value) : value;
  return (
    <div className={`ws-stat${hero ? " ws-stat--hero" : ""}`}>
      <span className="ws-stat__label">{label}</span>
      <span className="ws-stat__value">
        <span className={hero ? "ws-t-figure-hero" : "ws-t-figure"}>{shown}</span>
        {unit && <span className="ws-stat__unit">{unit}</span>}
        {tone && toneLabel && <StatusTag tone={tone} label={toneLabel} />}
      </span>
      {delta && <DeltaText {...delta} />}
      {caption && <span className="ws-stat__caption">{caption}</span>}
      {trend && trend.length > 1 && (
        <span className="ws-stat__trend">
          <LineSpark values={trend} ariaLabel={trendLabel ?? sparkLabel(label, trend, unit)} />
        </span>
      )}
    </div>
  );
}

/** StatTile 여러 개를 한 줄에(카드 안 그리드) */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="ws-stats">{children}</div>;
}

export interface BigNumberProps { value: number | string; unit?: string; label: string }
/** 히어로 카드 안 큰 숫자(흰 글자, figure-hero 48/56) */
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
