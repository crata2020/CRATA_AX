// 고리 차트(차트 라이브러리 없이 SVG 호 A 명령으로 그림). 홈 1단계 경로에서는 import하지 않고 index.ts로만 내보냅니다.
//   DonutChart: 상태 구성 한눈에(5조각 이하, 넘치면 앞 4 + 기타). 12시에서 시계 방향, 조각 사이 2px 틈, [표로 보기] 포함
//   Gauge: 비율 하나(반원 180°, 두께 12, 양끝 둥근 마감). 목표·지난값은 캡션 글자로. 값 글자가 곧 데이터라 표 쌍둥이 없음
import { useState } from "react";
import { formatNumber, formatQty } from "@/lib/format";
import type { Tone } from "@/theme/tokens";
import { ChartFrame, segmentColor, type ShareSegment, type StackedShareBarProps } from "./charts";

export interface DonutChartProps {
  segments: StackedShareBarProps["segments"];
  unit: string;
  ariaLabel: string;
  centerValue?: string;
  centerLabel?: string;
  /** 지름 px, 기본 160 */
  size?: number;
  /** 고리 두께 px, 기본 20 */
  thickness?: number;
}

const TAU = Math.PI * 2;
/** 12시 기준 시계 방향 각도 a(라디안)의 점 */
const pt = (c: number, r: number, a: number) => `${(c + r * Math.sin(a)).toFixed(2)},${(c - r * Math.cos(a)).toFixed(2)}`;

/** 고리 조각 = 바깥 호 + 안쪽 호. 양옆을 1px씩 비워 이웃 조각과 2px 틈 */
function ringPath(c: number, ro: number, ri: number, a0: number, a1: number): string {
  const span = a1 - a0;
  const go = Math.min(1 / ro, span / 2);
  const gi = Math.min(1 / ri, span / 2);
  const lo = span - 2 * go > Math.PI ? 1 : 0;
  const li = span - 2 * gi > Math.PI ? 1 : 0;
  return `M${pt(c, ro, a0 + go)}A${ro},${ro} 0 ${lo} 1 ${pt(c, ro, a1 - go)}L${pt(c, ri, a1 - gi)}A${ri},${ri} 0 ${li} 0 ${pt(c, ri, a0 + gi)}Z`;
}

export function DonutChart({ segments, unit, ariaLabel, centerValue, centerLabel, size = 160, thickness = 20 }: DonutChartProps) {
  const [tip, setTip] = useState<{ x: number; y: number; v: string; n: string } | null>(null);
  const base = segments.filter((s) => s.value > 0);
  const segs: ShareSegment[] = base.length > 5
    ? [...base.slice(0, 4), { key: "__other", label: "기타", value: base.slice(4).reduce((t, s) => t + s.value, 0), slot: "other" }]
    : base;
  const total = segs.reduce((t, s) => t + s.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  const c = size / 2;
  const rm = c - thickness / 2;
  const show = (s: ShareSegment, a: number) =>
    setTip({ x: c + rm * Math.sin(a), y: c - rm * Math.cos(a), v: `${formatQty(s.value, unit)} · ${pct(s.value)}%`, n: s.label });
  let acc = 0;
  return (
    <ChartFrame table={{ columns: ["항목", "비중(%)", `값(${unit})`], rows: segments.map((s) => [s.label, pct(s.value), s.value]), caption: ariaLabel }}>
      <div className="ws-donut">
        <div className="ws-donut__body">
          <div className="ws-donut__ring" style={{ width: size, height: size }} onMouseLeave={() => setTip(null)}>
            {/* 그림 하나 = 이미지 하나(조각마다 Tab 자리를 만들지 않아요). 값은 접근성 이름·범례·[표로 보기]에 다 있어요 */}
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${ariaLabel}: ${segs.map((s) => `${s.label} ${formatQty(s.value, unit)}(${pct(s.value)}%)`).join(", ")}`}>
              {segs.length < 2 ? (
                <circle
                  cx={c} cy={c} r={rm} fill="none" strokeWidth={thickness}
                  stroke={segs[0] ? segmentColor(segs[0], 0) : "var(--ws-sunken)"}
                  onMouseEnter={segs[0] ? () => show(segs[0]!, 0) : undefined}
                />
              ) : segs.map((s, i) => {
                const a0 = (acc / total) * TAU;
                acc += s.value;
                const a1 = (acc / total) * TAU;
                return <path key={s.key} d={ringPath(c, c, c - thickness, a0, a1)} fill={segmentColor(s, i)} onMouseEnter={() => show(s, (a0 + a1) / 2)} />;
              })}
            </svg>
            {(centerValue || centerLabel) && (
              <span className="ws-donut__center">
                {centerValue && <span className="ws-donut__value">{centerValue}</span>}
                {centerLabel && <span className="ws-donut__label">{centerLabel}</span>}
              </span>
            )}
            {tip && (
              <div className="ws-tip" style={{ left: tip.x, top: tip.y }} role="presentation">
                <span className="ws-tip__value">{tip.v}</span><span className="ws-tip__name">{tip.n}</span>
              </div>
            )}
          </div>
          <ul className="ws-legend">
            {segs.map((s, i) => (
              <li key={s.key}>
                <span className="ws-legend__key" style={{ background: segmentColor(s, i) }} aria-hidden />
                <span className="ws-legend__name">{s.label}</span>
                <span className="ws-legend__val">{pct(s.value)}% · {formatQty(s.value, unit)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ChartFrame>
  );
}

export interface GaugeProps {
  value: number;
  max: number;
  /** 위 라벨(보이는 글자) + 접근성 이름 */
  label: string;
  /** 호 안 값 글자. 기본 `${formatNumber(value)} / ${formatNumber(max)}` */
  valueText?: string;
  /** 아래 13/20 muted 한 줄. aria-valuetext 뒤에도 붙음 */
  caption?: string;
  /** 채움 = tone mark. 없으면 chart-accent */
  tone?: Tone;
  /** 최대 폭 px, 기본 160 */
  width?: number;
}

/** 반원 호: 중심 (80,80), 반지름 74(두께 12의 반을 뺀 값). t = 0(왼쪽) → 1(오른쪽), 위로 시계 방향 */
const gaugeArc = (t: number) =>
  `M6,80A74,74 0 0 1 ${(80 - 74 * Math.cos(Math.PI * t)).toFixed(2)},${(80 - 74 * Math.sin(Math.PI * t)).toFixed(2)}`;

export function Gauge({ value, max, label, valueText, caption, tone, width = 160 }: GaugeProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const text = valueText ?? `${formatNumber(value)} / ${formatNumber(max)}`;
  return (
    <div className="ws-gauge">
      <span className="ws-gauge__label">{label}</span>
      <div
        className="ws-gauge__dial"
        style={{ maxWidth: width }}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={caption ? `${text}, ${caption}` : text}
      >
        <svg viewBox="0 0 160 86" aria-hidden>
          <path d={gaugeArc(1)} fill="none" stroke="var(--ws-sunken)" strokeWidth={12} strokeLinecap="round" />
          {ratio > 0 && <path d={gaugeArc(ratio)} fill="none" stroke={tone ? `var(--ws-${tone}-mark)` : "var(--ws-chart-accent)"} strokeWidth={12} strokeLinecap="round" />}
        </svg>
        <span className="ws-gauge__value">{text}</span>
      </div>
      {caption && <span className="ws-gauge__caption">{caption}</span>}
    </div>
  );
}
