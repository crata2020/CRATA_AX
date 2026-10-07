// 차트(Orbix 스타일): 부드러운 선, 캡슐 막대, 도넛, 반원 게이지, 히트맵, 스파크라인. 외부 라이브러리 없이 SVG.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** 컨테이너 크기를 재는 훅(차트가 카드 크기에 맞게) */
export function useSize<T extends HTMLElement>(): [React.RefObject<T>, number, number] {
  const ref = useRef<T>(null);
  const [sz, setSz] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSz([Math.round(e!.contentRect.width), Math.round(e!.contentRect.height)]));
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSz([Math.round(r.width), Math.round(r.height)]);
    return () => ro.disconnect();
  }, []);
  return [ref as React.RefObject<T>, sz[0], sz[1]];
}
export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const [ref, w] = useSize<T>();
  return [ref, w];
}

/** 단조 3차 보간(Fritsch–Carlson): 부드럽지만 데이터 밖으로 넘치지 않는 곡선(0 아래로 꺼지지 않게) */
function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 2) return "";
  const dx: number[] = [], dy: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1]![0] - pts[i]![0]); dy.push(pts[i + 1]![1] - pts[i]![1]); m.push(dy[i]! / (dx[i]! || 1)); }
  const t: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2);
  t.push(m[n - 2]!);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i]! / m[i]!, b = t[i + 1]! / m[i]!, h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]!; t[i + 1] = k * b * m[i]!; }
  }
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]!, [x1, y1] = pts[i + 1]!, h = dx[i]! / 3;
    d += ` C${x0 + h},${y0 + t[i]! * h} ${x1 - h},${y1 - t[i + 1]! * h} ${x1},${y1}`;
  }
  return d;
}
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

// ───────── 선 차트
export interface Series { name: string; color: string; values: number[] }
/** fill: 부모 높이를 채움(카드 줄 높이에 맞춰 빈 곳이 없게, 최소 height) */
export function LineChart({ series, labels, height: minH = 240, format = (v) => String(v), yTicks = 4, focus, unit, fill }: {
  series: Series[]; labels: string[]; height?: number; format?: (v: number) => string; yTicks?: number; focus?: number; unit?: string; fill?: boolean;
}) {
  const [ref, w, hh] = useSize<HTMLDivElement>();
  const height = fill ? Math.max(minH, hh) : minH;
  const [hover, setHover] = useState<number | null>(null);
  const idx = hover ?? focus ?? null;
  const padL = 8, padR = 44, padT = 16, padB = 28;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values)) * 1.1);
  const iw = Math.max(0, w - padL - padR), ih = height - padT - padB;
  const x = (i: number) => padL + (labels.length <= 1 ? 0 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => padT + ih - (v / max) * ih;
  return (
    <div ref={ref} style={{ position: "relative", height: fill ? "100%" : height, minHeight: minH }} onMouseLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height} style={{ position: "absolute", inset: 0 }} role="img" aria-label={`${series.map((s) => s.name).join(", ")} 추이`}>
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const v = (max / yTicks) * i;
            return <text key={i} x={w - 4} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--faint)">{format(v)}</text>;
          })}
          {labels.map((l, i) => (
            <g key={l + i}>
              <line x1={x(i)} x2={x(i)} y1={padT} y2={padT + ih} stroke="var(--line)" strokeWidth="1" />
              <text x={i === 0 ? Math.max(0, x(i) - 6) : x(i)} y={height - 8} textAnchor={i === 0 ? "start" : "middle"} fontSize="11.5" fill={idx === i ? "var(--ink)" : "var(--faint)"} fontWeight={idx === i ? 600 : 400}>{l}</text>
            </g>
          ))}
          {series.map((s) => (
            <path key={s.name} d={smoothPath(s.values.map((v, i) => [x(i), y(v)]))} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" />
          ))}
          {idx != null && series.map((s) => (
            <circle key={s.name} cx={x(idx)} cy={y(s.values[idx] ?? 0)} r="5" fill="#fff" stroke={s.color} strokeWidth="2.4" />
          ))}
          {labels.map((_, i) => (
            <rect key={i} x={x(i) - iw / (labels.length * 2)} y={0} width={iw / Math.max(1, labels.length - 1)} height={height} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
      )}
      {idx != null && w > 0 && (
        <div className="tip tip--light" style={{ left: Math.min(Math.max(x(idx), 90), w - 90), top: Math.min(...series.map((s) => y(s.values[idx] ?? 0))) }}>
          <div className="faint xs" style={{ marginBottom: 4 }}>{labels[idx]}</div>
          {series.map((s) => (
            <div key={s.name} className="tip__row"><i className="tip__sw" style={{ background: s.color }} /><span style={{ minWidth: 64 }}>{s.name}</span><b className="num">{format(s.values[idx] ?? 0)}{unit}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── 캡슐 막대(옅은 트랙 + 채운 캡슐, 하나 강조)
export interface CapsuleDatum { label: string; value: number; color?: string; soft?: string }
export function CapsuleBars({ data, height = 230, max, highlight, format = (v) => String(v), tipLabel, single }: {
  data: CapsuleDatum[]; height?: number; max?: number; highlight?: number; format?: (v: number) => string; tipLabel?: (d: CapsuleDatum) => ReactNode; single?: { color: string; soft: string };
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const idx = hover ?? highlight ?? null;
  const padL = 30, padB = 28, padT = 12;
  const m = max ?? niceMax(Math.max(...data.map((d) => d.value)) * 1.15);
  const ih = height - padB - padT;
  const col = data.length ? (w - padL) / data.length : 0;
  const bw = Math.min(26, Math.max(12, col * 0.36));
  const y = (v: number) => padT + ih - (v / m) * ih;
  const ticks = [0, m / 4, m / 2, (m * 3) / 4, m];
  return (
    <div ref={ref} style={{ position: "relative", height }} onMouseLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}>
          {ticks.map((t) => <text key={t} x={0} y={y(t) + 4} fontSize="11" fill="var(--faint)">{format(t)}</text>)}
          {data.map((d, i) => {
            const cx = padL + col * i + col / 2;
            const color = d.color ?? single?.color ?? "var(--brand)";
            const soft = d.soft ?? single?.soft ?? "var(--brand-soft)";
            const dim = idx != null && idx !== i && single;
            return (
              <g key={d.label} onMouseEnter={() => setHover(i)} style={{ cursor: "default" }}>
                <line x1={cx - col / 2} x2={cx - col / 2} y1={padT} y2={padT + ih} stroke={i === 0 ? "transparent" : "var(--line)"} />
                <rect x={cx - bw / 2} y={padT} width={bw} height={ih} rx={bw / 2} fill={soft} opacity={0.55} />
                <rect x={cx - bw / 2} y={y(d.value)} width={bw} height={padT + ih - y(d.value)} rx={bw / 2} fill={color} opacity={dim ? 0.45 : 1} />
                <circle cx={cx} cy={y(d.value) + bw / 2} r={bw / 2 - 0.5} fill={color} />
                <text x={cx} y={height - 8} textAnchor="middle" fontSize="11.5" fill={idx === i ? "var(--ink)" : "var(--faint)"} fontWeight={idx === i ? 600 : 400}>{d.label}</text>
                <rect x={cx - col / 2} y={0} width={col} height={height} fill="transparent" />
              </g>
            );
          })}
        </svg>
      )}
      {idx != null && w > 0 && data[idx] && (
        <div className="tip" style={{ left: Math.min(Math.max(padL + col * idx + col / 2, 60), w - 60), top: y(data[idx]!.value) }}>
          {tipLabel ? tipLabel(data[idx]!) : <><div style={{ opacity: .7 }}>{data[idx]!.label}</div><b className="num">{format(data[idx]!.value)}</b></>}
        </div>
      )}
    </div>
  );
}

// ───────── 도넛(둥근 끝, 조각 사이 틈)
export interface Slice { label: string; value: number; color: string }
export function Donut({ data, size = 200, thickness = 26, center, sub }: { data: Slice[]; size?: number; thickness?: number; center?: ReactNode; sub?: ReactNode }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  const gap = data.filter((d) => d.value > 0).length > 1 ? Math.min(14, c * 0.02) + thickness * 0.0 : 0;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map((d) => `${d.label} ${d.value}`).join(", ")} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const seg = Math.max(0, len - gap - thickness * 0.0);
          const el = (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={hover === i ? thickness + 4 : thickness}
              strokeDasharray={`${seg} ${c - seg}`} strokeDashoffset={-acc - gap / 2} strokeLinecap={seg > thickness ? "round" : "butt"}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ transition: "stroke-width .12s" }} />
          );
          acc += len;
          return d.value > 0 ? el : null;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", pointerEvents: "none" }}>
        {hover != null ? (
          <><div className="num" style={{ fontSize: 26, fontWeight: 500 }}>{Math.round((data[hover]!.value / total) * 100)}%</div><div className="small muted">{data[hover]!.label}</div></>
        ) : (
          <>{center && <div className="num" style={{ fontSize: 28, fontWeight: 500, lineHeight: "34px" }}>{center}</div>}{sub && <div className="small muted">{sub}</div>}</>
        )}
      </div>
    </div>
  );
}
export function Legend({ data, total, column = true }: { data: Slice[]; total?: number; column?: boolean }) {
  const t = total ?? data.reduce((s, d) => s + d.value, 0);
  return (
    <ul style={{ display: "flex", flexDirection: column ? "column" : "row", flexWrap: "wrap", gap: column ? 14 : "8px 18px" }}>
      {data.map((d) => (
        <li key={d.label} className="between" style={{ gap: 16 }}>
          <span className="tagsq"><i style={{ background: d.color }} />{d.label}</span>
          <span className="num small" style={{ color: "var(--ink)", fontWeight: 500 }}>{d.value}<span className="faint" style={{ fontWeight: 400 }}> · {t ? Math.round((d.value / t) * 100) : 0}%</span></span>
        </li>
      ))}
    </ul>
  );
}

// ───────── 반원 게이지
export function Gauge({ value, max = 100, size = 220, color = "var(--brand)", label, sub, segments }: {
  value: number; max?: number; size?: number; color?: string; label?: ReactNode; sub?: ReactNode; segments?: { to: number; color: string }[];
}) {
  const th = 16, r = (size - th) / 2, cx = size / 2, cy = size / 2;
  const arc = (from: number, to: number) => {
    const a0 = Math.PI * (1 - from), a1 = Math.PI * (1 - to);
    const p0 = [cx + r * Math.cos(a0), cy - r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy - r * Math.sin(a1)];
    return `M${p0[0]},${p0[1]} A${r},${r} 0 0 1 ${p1[0]},${p1[1]}`;
  };
  const f = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ position: "relative", width: size, height: size / 2 + 12 }}>
      <svg width={size} height={size / 2 + th / 2 + 2} role="img" aria-label={`${value} / ${max}`}>
        <path d={arc(0, 1)} fill="none" stroke="var(--sunken)" strokeWidth={th} strokeLinecap="round" />
        {segments ? segments.map((s, i) => {
          const from = i === 0 ? 0 : segments[i - 1]!.to;
          const to = Math.min(s.to, f);
          return to > from ? <path key={i} d={arc(from + (i ? 0.012 : 0), to)} fill="none" stroke={s.color} strokeWidth={th} strokeLinecap="round" /> : null;
        }) : f > 0 && <path d={arc(0, f)} fill="none" stroke={color} strokeWidth={th} strokeLinecap="round" />}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, textAlign: "center" }}>
        {sub && <div className="small muted">{sub}</div>}
        <div className="num" style={{ fontSize: 30, fontWeight: 500, lineHeight: "36px" }}>{label ?? value}</div>
      </div>
    </div>
  );
}

// ───────── 히트맵
export function Heatmap({ rows, cols, values, color = "var(--c-orange)", label }: { rows: string[]; cols: string[]; values: number[][]; color?: string; label: string }) {
  const max = Math.max(1, ...values.flat());
  return (
    <div role="img" aria-label={label} style={{ display: "grid", gridTemplateColumns: `36px repeat(${cols.length}, minmax(0, 1fr))`, gap: 4, alignItems: "center" }}>
      {rows.map((r, ri) => (
        <Row key={r} label={r}>
          {cols.map((c, ci) => {
            const v = values[ri]?.[ci] ?? 0;
            return <span key={c} title={`${r} ${c}: ${v}`} style={{ height: 22, borderRadius: 5, background: color, opacity: 0.12 + (v / max) * 0.88 }} />;
          })}
        </Row>
      ))}
      <span />
      {cols.map((c) => <span key={c} className="faint" style={{ fontSize: 11, textAlign: "center" }}>{c}</span>)}
    </div>
  );
}
const Row = ({ label, children }: { label: string; children: ReactNode }) => (<><span className="faint" style={{ fontSize: 11.5 }}>{label}</span>{children}</>);

// ───────── 스파크라인
export function Sparkline({ values, color = "var(--brand)", width = 120, height = 36 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const d = useMemo(() => {
    const max = Math.max(...values), min = Math.min(...values);
    const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (width - 4) + 2, height - 4 - ((v - min) / Math.max(1e-6, max - min)) * (height - 8)] as [number, number]);
    return smoothPath(pts);
  }, [values, width, height]);
  return <svg width={width} height={height} aria-hidden><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
}
