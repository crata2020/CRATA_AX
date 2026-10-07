// UI 키트(Orbix 스타일). 화면은 이 부품과 styles/ui.css의 클래스로만 그립니다.
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Check, ChevronDown, Minus, MoreHorizontal, X } from "lucide-react";

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export { cx };

// ───────── 버튼
type BtnVariant = "default" | "dark" | "brand" | "soft" | "ghost";
export function Button({ variant = "default", size, pill, block, icon, count, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: "sm" | "lg"; pill?: boolean; block?: boolean; icon?: ReactNode; count?: number;
}) {
  return (
    <button type="button" className={cx("btn", variant !== "default" && `btn--${variant}`, size && `btn--${size}`, pill && "btn--pill", block && "btn--block", className)} {...rest}>
      {icon}{children}{count != null && <span className="btn__count num">{count}</span>}
    </button>
  );
}
export function IconButton({ label, round, size, plain, badge, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string; round?: boolean; size?: "sm"; plain?: boolean; badge?: number;
}) {
  return (
    <button type="button" aria-label={label} title={label} className={cx("iconbtn", round && "iconbtn--round", size && `iconbtn--${size}`, plain && "iconbtn--plain", className)} {...rest}>
      {children}{badge ? <span className="iconbtn__badge num">{badge}</span> : null}
    </button>
  );
}
export const MoreButton = ({ label = "더보기" }: { label?: string }) => <IconButton label={label} size="sm"><MoreHorizontal /></IconButton>;

// ───────── 카드
export function Card({ title, icon, sub, actions, children, flush, line, foot, className, style }: {
  title?: ReactNode; icon?: ReactNode; sub?: ReactNode; actions?: ReactNode; children?: ReactNode; flush?: boolean; line?: boolean; foot?: ReactNode; className?: string; style?: CSSProperties;
}) {
  return (
    <section className={cx("card", className)} style={style}>
      {title != null && (
        <header className={cx("card__head", line && "card__head--line")}>
          <div style={{ minWidth: 0 }}>
            <h2 className="card__title">{icon}{title}</h2>
            {sub && <p className="card__sub">{sub}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className={cx("card__body", flush && "card__body--flush")}>{children}</div>
      {foot && <footer className="card__foot">{foot}</footer>}
    </section>
  );
}

/** “주간 ▾” 같은 알약 선택 */
export function PillSelect<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const cur = options.find((o) => o.value === value)?.label ?? value;
  return (
    <span className="pillselect">
      {cur}<ChevronDown />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </span>
  );
}

// ───────── 칩·증감
export type Tone = "good" | "bad" | "warn" | "info" | "brand" | "neutral" | "dark" | "outline";
export function Chip({ tone = "neutral", dot, icon, sm, children }: { tone?: Tone; dot?: boolean; icon?: ReactNode; sm?: boolean; children: ReactNode }) {
  return <span className={cx("chip", tone !== "neutral" && `chip--${tone}`, sm && "chip--sm")}>{dot && <i className="chip__dot" />}{icon}{children}</span>;
}
/** 증감 칩. good: 이 방향이 좋은지(색), dir: 화살표 방향 */
export function Delta({ value, dir, good }: { value: string; dir: "up" | "down" | "flat"; good?: boolean }) {
  const tone = dir === "flat" ? "flat" : good ? "good" : "bad";
  return (
    <span className={`delta delta--${tone} num`} aria-label={`${dir === "up" ? "증가" : dir === "down" ? "감소" : "변화 없음"} ${value}`}>
      {dir === "up" ? <ArrowUpRight /> : dir === "down" ? <ArrowDownRight /> : <Minus />}{value}
    </span>
  );
}

// ───────── KPI
export type Hue = "coral" | "amber" | "green" | "cyan" | "violet" | "blue" | "orange" | "brand";
export function Kpi({ icon, hue = "brand", label, value, unit, delta, note }: { icon: ReactNode; hue?: Hue; label: string; value: ReactNode; unit?: string; delta?: ReactNode; note?: ReactNode }) {
  return (
    <div className="kpi">
      <span className={`kpi__icon tone-${hue}`}>{icon}</span>
      <div className="kpi__body">
        <div className="kpi__label">{label}</div>
        <div className="kpi__row"><span className="kpi__value">{value}{unit && <span className="kpi__unit">{unit}</span>}</span>{delta}</div>
        {note && <div className="kpi__note">{note}</div>}
      </div>
    </div>
  );
}
/** 한 장짜리 KPI 카드(라벨 + 오른쪽 위 아이콘 점 + 큰 숫자 + 증감) */
export function KpiCard({ icon, hue = "brand", label, value, unit, delta, foot }: { icon: ReactNode; hue?: Hue; label: string; value: ReactNode; unit?: string; delta?: ReactNode; foot?: ReactNode }) {
  return (
    <section className="card kpicard">
      <div className="kpicard__top"><span className="kpicard__label">{label}</span><span className={`kpicard__dot tone-${hue}`}>{icon}</span></div>
      <div className="kpicard__val"><span className="kpi__value">{value}{unit && <span className="kpi__unit">{unit}</span>}</span>{delta}</div>
      {foot && <div className="kpicard__foot">{foot}</div>}
    </section>
  );
}

// ───────── 세그먼트·탭
export function Segmented<T extends string>({ value, options, onChange, size, label }: { value: T; options: { value: T; label: ReactNode; n?: number }[]; onChange: (v: T) => void; size?: "sm"; label: string }) {
  return (
    <div className={cx("seg", size && `seg--${size}`)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="seg__btn" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}{o.n != null && <span className="seg__n num">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}
export function Track<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode; icon?: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="track" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.icon}{o.label}</button>)}
    </div>
  );
}
export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode; icon?: ReactNode; n?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" className="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon}{o.label}{o.n != null && <span className="tab__n num">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

// ───────── 아바타
const AVA_COLORS = ["#6d7cf2", "#f08a5d", "#3fb68b", "#e0699a", "#4aa8d8", "#a07cf0", "#e3a23a", "#5b6b8c"];
export function Avatar({ name, size }: { name: string; size?: "sm" | "lg" | "xl" }) {
  const clean = name.replace(/\(.*?\)/g, "").trim();
  const initial = clean.slice(0, 1);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return <span className={cx("ava", size && `ava--${size}`)} style={{ background: AVA_COLORS[h % AVA_COLORS.length] }} title={name} aria-label={name}>{initial}</span>;
}
export function AvatarStack({ names, max = 3, size = "sm" }: { names: string[]; max?: number; size?: "sm" }) {
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  return (
    <span className="avastack" aria-label={names.join(", ")}>
      {shown.map((n) => <Avatar key={n} name={n} size={size} />)}
      {more > 0 && <span className={cx("ava avastack__more", size && `ava--${size}`)}>{more}+</span>}
    </span>
  );
}

// ───────── 진행 막대
export function Bar({ value, color, lg, label }: { value: number; color?: string; lg?: boolean; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return <div className={cx("bar", lg && "bar--lg")} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><i style={{ width: `${v}%`, background: color }} /></div>;
}
export function StackBar({ parts, label }: { parts: { value: number; color: string; label: string }[]; label: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return <div className="stack" role="img" aria-label={`${label}: ${parts.map((p) => `${p.label} ${p.value}`).join(", ")}`}>{parts.map((p) => <i key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}</div>;
}

// ───────── 토글·체크
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="toggle" onClick={() => onChange(!on)} />;
}
export function Checkbox({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="checkbox" aria-checked={on} aria-label={label} className="check" onClick={() => onChange(!on)}>{on && <Check />}</button>;
}

// ───────── 서랍
export function Drawer({ open, title, onClose, children, foot }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "상세"}>
        <header className="drawer__head"><h2 className="drawer__title">{title}</h2><IconButton label="닫기" size="sm" onClick={onClose}><X /></IconButton></header>
        <div className="drawer__body">{children}</div>
        {foot && <footer className="drawer__foot">{foot}</footer>}
      </aside>
    </>
  );
}

// ───────── 펼침 메뉴
export function Menu({ trigger, children, align = "left", width }: { trigger: (p: { open: boolean; toggle: () => void }) => ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right"; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); window.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && <div className="menu" style={{ top: "calc(100% + 6px)", [align]: 0, width }}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

// ───────── 빈 상태
export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return <div className="empty"><span className="empty__icon">{icon}</span><div className="empty__t">{title}</div>{children}</div>;
}

// ───────── 페이지 머리
export function PageHead({ eyebrow, title, icon, desc, actions }: { eyebrow?: ReactNode; title: ReactNode; icon?: ReactNode; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="phead">
      <div className="phead__main">
        {eyebrow && <div className="phead__eyebrow">{eyebrow}</div>}
        <h1 className="phead__title">{title}{icon}</h1>
        {desc && <p className="phead__desc">{desc}</p>}
      </div>
      {actions && <div className="phead__actions">{actions}</div>}
    </div>
  );
}
