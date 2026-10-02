// 차트(차트 라이브러리 없이 SVG·HTML 직접 구현, 빌드 스펙 4.8절 + dataviz 스킬).
//   SimpleBarChart: 단일 계열 강조형(이번 기간만 chart-accent) 또는 비교형(이전 chart-muted · 이번 chart-accent) + 목표 수평선
//   StackedShareBar: 비중(도넛 대신). 상태 비중이면 tone 색, 아니면 범주 슬롯 색. 6개 넘으면 "기타"
//   LineSpark: 96×28 추이선(선 chart-muted, 마지막 점 chart-accent + 2px 바탕 고리)
//   Meter: 진행 막대(트랙은 같은 색 계열 옅은 단계)
//   ChartFrame: [표로 보기]/[차트로 보기] 토글(모든 차트의 접근성 쌍둥이)
// 마크: 막대 두께 ≤24px, 데이터 끝 4px 라운드·기준선 쪽 직각, 붙은 막대 사이 2px 틈, 격자·축 1px 실선, 글자는 데이터 색을 입지 않음.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button, Tooltip } from "antd";
import { formatNumber, formatQty } from "@/lib/format";
import type { Tone } from "@/theme/tokens";

// ───────── 공통
function useWidth<T extends HTMLElement>(fallback = 480): [React.RefObject<T>, number] {
  const ref = useRef<T>(null) as React.RefObject<T>;
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(120, Math.floor(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** 깔끔한 눈금(0 / 1,000 / 2,000 …) */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step);
  return ticks;
}

/** 위쪽(데이터 끝)만 4px 라운드인 막대 경로. 기준선 쪽은 직각 */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

const fmt = (v: number, unit: string) => formatQty(v, unit);

export interface ChartFrameProps {
  /** 보이는 제목(카드 제목이 이미 있으면 생략) */
  title?: string;
  table: { columns: string[]; rows: (string | number)[][]; caption?: string; numericFrom?: number };
  children: ReactNode;
}

/** [표로 보기] 토글. 표로 바꿔도 같은 자리(높이 점프 없게 최소 높이 유지) */
export function ChartFrame({ title, table, children }: ChartFrameProps) {
  const [asTable, setAsTable] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [minH, setMinH] = useState<number | undefined>();
  const numericFrom = table.numericFrom ?? 1;
  return (
    <figure className="ws-chart" data-chart style={{ margin: 0 }}>
      {title && <figcaption className="ws-chart__head"><span className="ws-chart__title">{title}</span></figcaption>}
      <div ref={boxRef} style={{ minHeight: minH }}>
        {asTable ? (
          <table className="ws-charttable">
            {table.caption && <caption>{table.caption}</caption>}
            <thead><tr>{table.columns.map((c, i) => <th key={c} scope="col" className={i >= numericFrom ? "is-num" : undefined}>{c}</th>)}</tr></thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className={j >= numericFrom ? "is-num" : undefined}>{typeof c === "number" ? formatNumber(c) : c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        ) : children}
      </div>
      <div className="ws-chart__foot">
        <Button
          size="small"
          type="text"
          className="ws-chart__toggle"
          aria-pressed={asTable}
          onClick={() => {
            if (!asTable && boxRef.current) setMinH(boxRef.current.getBoundingClientRect().height);
            setAsTable((v) => !v);
          }}
        >
          {asTable ? "차트로 보기" : "표로 보기"}
        </Button>
      </div>
    </figure>
  );
}

// ───────── SimpleBarChart
export interface SimpleBarChartProps {
  data: { key: string; label: string; value: number; previous?: number }[];
  unit: string;
  /** 이 막대만 chart-accent + 값 라벨, 나머지 chart-muted. 없으면 모두 chart-accent(최댓값에 라벨) */
  highlightKey?: string;
  /** 짝 막대(이전 chart-muted · 이번 chart-accent, 사이 2px 틈) + 범례 */
  compare?: { currentLabel: string; previousLabel: string };
  /** 수평 실선 목표 + 글자 라벨 */
  target?: { value: number; label: string };
  /** 기본 180, x축 글자 띠 포함 */
  height?: number;
  ariaLabel: string;
  tableCaption: string;
  /** 보이는 제목(보통 카드 제목으로 충분) */
  title?: string;
}

export function SimpleBarChart({ data, unit, highlightKey, compare, target, height = 180, ariaLabel, tableCaption, title }: SimpleBarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<{ x: number; y: number; lines: [string, string][] } | null>(null);
  const axisW = 44, top = 22, bottom = 26, right = 8;
  const plotW = Math.max(40, width - axisW - right);
  const plotH = Math.max(40, height - top - bottom);
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, compare ? d.previous ?? 0 : 0)), target?.value ?? 0);
  const ticks = niceTicks(max);
  const yMax = ticks[ticks.length - 1]!;
  const y = (v: number) => top + plotH - (v / yMax) * plotH;
  const band = plotW / Math.max(1, data.length);
  const labelKey = highlightKey ?? data.reduce((a, b) => (b.value > a.value ? b : a), data[0] ?? { key: "", value: 0 }).key;

  const legend = compare || target ? (
    <ul className="ws-legend ws-legend--inline" aria-hidden>
      {compare && <li><span className="ws-legend__key" style={{ background: "var(--ws-chart-muted)" }} />{compare.previousLabel}</li>}
      {compare && <li><span className="ws-legend__key" style={{ background: "var(--ws-chart-accent)" }} />{compare.currentLabel}</li>}
      {target && <li><span className="ws-legend__line" />{target.label}</li>}
    </ul>
  ) : null;

  const table = compare
    ? { columns: ["항목", `${compare.previousLabel}(${unit})`, `${compare.currentLabel}(${unit})`], rows: data.map((d) => [d.label, d.previous ?? "—", d.value]), caption: tableCaption }
    : { columns: ["항목", `값(${unit})`], rows: data.map((d) => [d.label, d.value]), caption: tableCaption };
  if (target) table.rows.push([target.label, ...(compare ? ["", target.value] : [target.value])]);

  return (
    <ChartFrame title={title} table={table}>
      {legend}
      <div ref={ref} style={{ position: "relative" }} onMouseLeave={() => setTip(null)}>
        {/* 그림 하나 = 이미지 하나(막대마다 Tab 자리를 만들지 않아요). 값은 접근성 이름과 [표로 보기]에 다 있어요 */}
        <svg width={width} height={height} role="img" aria-label={`${ariaLabel}: ${data.map((d) => (compare ? `${d.label} ${compare.currentLabel} ${fmt(d.value, unit)}, ${compare.previousLabel} ${fmt(d.previous ?? 0, unit)}` : `${d.label} ${fmt(d.value, unit)}`)).join(", ")}${target ? `, ${target.label} ${fmt(target.value, unit)}` : ""}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={axisW} x2={axisW + plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--ws-chart-muted)" : "var(--ws-line)"} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={axisW - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--ws-muted)">{formatNumber(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = axisW + band * i + band / 2;
            const hl = !highlightKey || d.key === highlightKey;
            const pair = !!compare;
            const bw = Math.min(pair ? 16 : 24, (band - 8) / (pair ? 2 : 1) - (pair ? 1 : 0));
            const xs = pair ? [cx - bw - 1, cx + 1] : [cx - bw / 2];
            const vals = pair ? [d.previous ?? 0, d.value] : [d.value];
            const fills = pair ? ["var(--ws-chart-muted)", "var(--ws-chart-accent)"] : [hl ? "var(--ws-chart-accent)" : "var(--ws-chart-muted)"];
            const lines: [string, string][] = pair
              ? [[fmt(d.value, unit), `${d.label} ${compare!.currentLabel}`], [fmt(d.previous ?? 0, unit), compare!.previousLabel]]
              : [[fmt(d.value, unit), d.label]];
            const show = () => setTip({ x: cx, y: y(Math.max(...vals)), lines });
            return (
              <g key={d.key} className="ws-hit" onMouseEnter={show}>
                <rect x={axisW + band * i} y={top} width={band} height={plotH} fill="transparent" className="ws-hit__ring" rx={6} />
                {vals.map((v, j) => <path key={j} d={barPath(xs[j]!, y(v), bw, top + plotH - y(v))} fill={fills[j]} />)}
                {d.key === labelKey && (
                  <text x={pair ? xs[1]! + bw / 2 : cx} y={y(d.value) - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ws-ink)">{fmt(d.value, unit)}</text>
                )}
                <text x={cx} y={top + plotH + 18} textAnchor="middle" fontSize={12} fill={d.key === highlightKey ? "var(--ws-ink)" : "var(--ws-muted)"} fontWeight={d.key === highlightKey ? 600 : 400}>{d.label}</text>
              </g>
            );
          })}
          {target && (
            <g aria-hidden>
              <line x1={axisW} x2={axisW + plotW} y1={y(target.value)} y2={y(target.value)} stroke="var(--ws-muted)" strokeWidth={1} shapeRendering="crispEdges" />
            </g>
          )}
        </svg>
        {tip && (
          <div className="ws-tip" style={{ left: tip.x, top: tip.y }} role="presentation">
            {tip.lines.map(([v, n]) => <span key={n} style={{ display: "block" }}><span className="ws-tip__value">{v}</span><span className="ws-tip__name">{n}</span></span>)}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}

// ───────── StackedShareBar
export interface StackedShareBarProps {
  /** color(직접 CSS 색, 예: 업무 상태 고정 색) > tone(상태색) > slot(범주색) */
  segments: { key: string; label: string; value: number; slot?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | "other"; tone?: Tone; color?: string }[];
  unit: string;
  /** 기본 8(가는 막대) */
  height?: number;
  /** 기본 list: 점 + 이름 + % + 값, 2열 */
  legend?: "list" | "none";
  ariaLabel: string;
}

export function StackedShareBar({ segments, unit, height = 8, legend = "list", ariaLabel }: StackedShareBarProps) {
  const base = segments.filter((s) => s.value > 0);
  let segs = base;
  if (base.length > 6) {
    const head = base.slice(0, 5);
    const rest = base.slice(5).reduce((s, x) => s + x.value, 0);
    segs = [...head, { key: "__other", label: "기타", value: rest, slot: "other" as const }];
  }
  const total = segs.reduce((s, x) => s + x.value, 0);
  // 넓은 면이라 '좋음'은 차분한 채움색(--ws-good-fill). 진한 상태색은 예외(정지·고장 등) 조각과 작은 점에만
  const colorOf = (s: (typeof segs)[number], i: number) =>
    "color" in s && s.color ? s.color : s.tone === "good" ? "var(--ws-good-fill)" : s.tone ? `var(--ws-${s.tone}-mark)` : s.slot === "other" ? "var(--ws-chart-muted)" : `var(--ws-chart-${s.slot ?? i + 1})`;
  const pct = (v: number) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  return (
    <ChartFrame table={{ columns: ["항목", "비중(%)", `값(${unit})`], rows: segments.map((s) => [s.label, pct(s.value), s.value]), caption: ariaLabel }}>
      <div className="ws-share" role="img" aria-label={`${ariaLabel}: ${segs.map((s) => `${s.label} ${formatQty(s.value, unit)}(${pct(s.value)}%)`).join(", ")}`} style={{ height }}>
        {total === 0 ? (
          <span className="ws-share__seg" style={{ flex: 1, background: "var(--ws-line)" }} />
        ) : segs.map((s, i) => (
          // 조각은 마우스 툴팁만(Tab 자리 없음). 값은 묶음의 접근성 이름·범례·[표로 보기]에 있어요
          <Tooltip key={s.key} title={`${formatQty(s.value, unit)} · ${s.label} ${pct(s.value)}%`}>
            <span className="ws-share__seg" style={{ flex: s.value, background: colorOf(s, i) }} />
          </Tooltip>
        ))}
      </div>
      {legend === "list" && (
        <ul className="ws-legend">
          {segs.map((s, i) => (
            <li key={s.key}>
              <span className="ws-legend__key" style={{ background: colorOf(s, i) }} aria-hidden />
              <span className="ws-legend__name">{s.label}</span>
              <span className="ws-legend__val">{pct(s.value)}% · {formatQty(s.value, unit)}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}

// ───────── LineSpark
export interface LineSparkProps { values: number[]; width?: number; height?: number; ariaLabel: string }
/** 추이선: 선 2px chart-muted, 마지막 점 chart-accent 지름 8 + 2px 바탕 고리, 축 없음 */
export function LineSpark({ values, width = 96, height = 28, ariaLabel }: LineSparkProps) {
  if (values.length < 2) return null;
  const pad = 5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke="var(--ws-chart-muted)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last]!)} r={4} fill="var(--ws-chart-accent)" stroke="var(--ws-surface)" strokeWidth={2} />
    </svg>
  );
}

// ───────── Meter
export interface MeterProps {
  value: number; max: number; label: string; tone?: Tone; showValue?: boolean; valueText?: string;
  /** 기준 눈금(예: 지금 시각까지 계획상 해야 할 양). 트랙 위 세로 실선 + 접근성 글자 */
  marker?: { value: number; label: string };
}
/** 높이 8 진행 막대. 트랙 = 같은 색 계열 옅은 단계(accent면 brand-weak, tone이면 태그 바탕). 값 글자는 ink */
export function Meter({ value, max, label, tone, showValue = true, valueText, marker }: MeterProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const mRatio = marker && max > 0 ? Math.min(1, Math.max(0, marker.value / max)) : null;
  const fill = tone ? `var(--ws-${tone}-mark)` : "var(--ws-chart-accent)";
  const track = tone ? `var(--ws-${tone}-bg)` : "var(--ws-brand-weak)";
  const text = valueText ?? `${formatNumber(value)} / ${formatNumber(max)}`;
  return (
    <div className="ws-meter">
      <div className="ws-meter__top">
        <span className="ws-meter__label">{label}</span>
        {showValue && <span className="ws-meter__value">{text}</span>}
      </div>
      <div className="ws-meter__trackwrap">
        <div className="ws-meter__track" style={{ background: track }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={marker ? `${text}, ${marker.label}` : text}>
          <div className="ws-meter__fill" style={{ width: `${ratio * 100}%`, background: fill }} />
        </div>
        {mRatio != null && <span className="ws-meter__marker" style={{ left: `${mRatio * 100}%` }} aria-hidden title={marker!.label} />}
      </div>
    </div>
  );
}
