// SectionCard: 캔버스 위의 흰 카드(라운드 12, 거의 안 보이는 1px --ws-sunken 선, 그림자 없음). 카드 안에 카드를 넣지 않습니다(개발 모드에서 콘솔 오류).
// HeroCard = SectionCard variant="hero"(브랜드 단색 면, 화면당 1장). CardGrid = 12열(태블릿 8열, 모바일 1열) 그리드.
import { createContext, useContext, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { RightOutlined } from "@ant-design/icons";
import { DemoDataBadge, PillLabel } from "./basics";

const NestCtx = createContext(false);

export type CardSize = "S" | "M" | "L";
// 태블릿(8열): S·M은 반 폭(4열)이라 두 장씩 나란히, L만 한 줄 전체(M이 8열이면 태블릿 홈이 한 줄기로 3,000px 넘게 길어져요)
const SIZE_SPAN: Record<CardSize, [number, number]> = { S: [4, 4], M: [6, 4], L: [12, 8] };

/** 그리드 열 수 → CSS 변수(데스크톱 12열 / 태블릿 8열) */
export function spanStyle(size?: CardSize, span?: number): CSSProperties | undefined {
  if (!size && !span) return undefined;
  const d = span ?? SIZE_SPAN[size!][0];
  const t = span ? (span >= 5 ? 8 : 4) : SIZE_SPAN[size!][1];
  return { ["--span-d" as string]: d, ["--span-t" as string]: t };
}

export interface SectionCardProps {
  title?: string;
  /** 알약 카드(화면당 3개 이하). 모양은 보통 카드 제목과 같고 제목 글자만 span.ws-pill[data-pill]로 감쌉니다 */
  pill?: boolean;
  /** 제목 줄 바로 아래 13/20 흐린 한 줄 */
  subtitle?: string;
  /** 제목 줄 오른쪽 '예시 데이터' 배지. 수치 카드는 true */
  demo?: boolean;
  actions?: ReactNode;
  more?: { label: string; to: string };
  /** 그리드 크기: S=4·M=6·L=12열(태블릿 4·8·8, 모바일 전체) */
  size?: CardSize;
  /** 직접 열 수(데스크톱 12열 기준). size보다 우선 */
  span?: number;
  /** hero = 브랜드 단색 면(화면당 1장) */
  variant?: "default" | "hero";
  as?: "section" | "div";
  /** 카드 아래 작은 설명(예: "평가용이 아니에요", "연동 미리보기") */
  caption?: string;
  className?: string;
  /** 제목 대신 접근성 이름만 줄 때 */
  ariaLabel?: string;
  children: ReactNode;
}

export function SectionCard({ title, pill, subtitle, demo, actions, more, size, span, variant = "default", as = "section", caption, className, ariaLabel, children }: SectionCardProps) {
  const nested = useContext(NestCtx);
  if (nested && import.meta.env.DEV) console.error("[SectionCard] 카드 안에 카드를 넣지 마세요(빌드 스펙 3.0절 2번). 구분선이나 간격으로 나눠 주세요.");
  const Tag = as;
  const hero = variant === "hero";
  const head = title || actions || more || demo;
  return (
    <NestCtx.Provider value>
      <Tag
        className={`ws-card${hero ? " ws-card--hero ws-on-brand" : ""}${pill && title ? " ws-card--pill" : ""}${className ? ` ${className}` : ""}`}
        style={spanStyle(size, span)}
        data-card
        {...(hero ? { "data-hero": "" } : {})}
        aria-label={ariaLabel ?? (pill ? title : undefined)}
      >
        {head && (
          <div className="ws-card__head">
            {(title || demo) && (
              <div className="ws-card__titles">
                {title && <h2 className="ws-card__title">{pill ? <PillLabel>{title}</PillLabel> : title}</h2>}
                {demo && <DemoDataBadge variant="inline" />}
              </div>
            )}
            {(actions || more) && (
              <div className="ws-card__actions">
                {actions}
                {more && <Link className="ws-card__more" to={more.to}>{more.label}<RightOutlined aria-hidden style={{ fontSize: 11 }} /></Link>}
              </div>
            )}
          </div>
        )}
        {subtitle && <p className="ws-card__sub">{subtitle}</p>}
        {children}
        {caption && <p className="ws-card__caption">{caption}</p>}
      </Tag>
    </NestCtx.Provider>
  );
}

/** 브랜드 단색 히어로 카드(화면당 1장: 홈 H-01, 생산·품질 홈 I-06, 안전보건 I-18) */
export function HeroCard(props: Omit<SectionCardProps, "variant">) {
  return <SectionCard {...props} variant="hero" />;
}

/** 마지막 카드 오른쪽이 비면(혼자 남았거나, S 옆에 M처럼 줄이 12열을 못 채우면) 그 카드가 줄 끝까지 차지하게 합니다.
 *  시작 열은 그대로 두고 grid-column을 `시작 / -1`로(위젯 크기가 늦게 정해져도 다시 잼) */
function useFillLastRow(on: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!on || !grid) return;
    let frame = 0;
    const measure = () => {
      const kids = Array.from(grid.children) as HTMLElement[];
      for (const k of kids) { k.classList.remove("ws-fill-row"); k.style.removeProperty("grid-column"); }
      const last = kids[kids.length - 1];
      if (!last || kids.length < 2) return;
      const box = grid.getBoundingClientRect();
      const lb = last.getBoundingClientRect();
      if (lb.right >= box.right - 8) return;
      // 같은 줄에서 이 카드 오른쪽에 다른 카드가 있으면 그대로(dense 배치로 앞 카드가 오른쪽에 놓인 경우)
      const sameRowRight = kids.slice(0, -1).some((k) => {
        const r = k.getBoundingClientRect();
        return r.left > lb.left && r.top < lb.bottom - 4 && r.bottom > lb.top + 4;
      });
      if (sameRowRight) return;
      const cs = getComputedStyle(grid);
      const cols = cs.gridTemplateColumns.split(" ").filter(Boolean).length;
      if (cols < 2) return;
      const gap = parseFloat(cs.columnGap) || 0;
      const colW = (box.width - gap * (cols - 1)) / cols;
      const start = Math.max(1, Math.min(cols, Math.round((lb.left - box.left) / (colW + gap)) + 1));
      if (start === 1) last.classList.add("ws-fill-row");
      else last.style.gridColumn = `${start} / -1`;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    ro?.observe(grid);
    const mo = new MutationObserver(schedule);
    mo.observe(grid, { childList: true });
    return () => { cancelAnimationFrame(frame); ro?.disconnect(); mo.disconnect(); };
  }, [on]);
  return ref;
}

/** 카드 그리드: 자식에 size/span을 주면 열을 차지합니다. fillLastRow면 줄에 혼자 남은 마지막 카드가 남은 열을 채워요 */
export function CardGrid({ children, className, style, fillLastRow }: { children: ReactNode; className?: string; style?: CSSProperties; fillLastRow?: boolean }) {
  const ref = useFillLastRow(!!fillLastRow);
  return <div ref={ref} className={`ws-grid${className ? ` ${className}` : ""}`} style={style}>{children}</div>;
}

/** 그리드 칸(카드가 아닌 것을 그리드에 놓을 때) */
export function GridCell({ size, span, children }: { size?: CardSize; span?: number; children: ReactNode }) {
  return <div style={spanStyle(size, span)}>{children}</div>;
}

/** 카드 안 묶음 구분선(카드 안 카드 대신) */
export const Divider = () => <hr className="ws-divider" />;

/** 카드 안에 있는지(DataTable 등이 흰 바탕을 겹쳐 그리지 않게) */
export const useInsideCard = () => useContext(NestCtx);
