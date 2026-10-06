// PageHeader: 페이지의 첫 요소(h1). 홈은 greeting이 h1을 대신합니다. 기간 세그먼트·탭·주 버튼을 한 줄에.
// LinkTabs: 같은 단계 하위 화면을 오가는 링크 탭(경로 탭 또는 ?tab= 탭).
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { SegmentedPills, type SegmentedPillsProps } from "./SegmentedPills";
import { CountBadge } from "./basics";

export interface LinkTab { key: string; label: string; to: string; badge?: number }

export interface PageHeaderProps {
  /** h1. 홈은 greeting이 h1을 대신함 */
  title: string;
  /** 해요체 한 줄 */
  description?: string;
  /** 흐린 날짜 눈썹 + "안녕하세요, {name}님"(28/36) + 요약 한 줄(있을 때) */
  greeting?: { name: string; dateText: string; summary?: string };
  /** 페이지당 1개, 모든 카드에 적용 */
  period?: SegmentedPillsProps<any>;
  /** 링크 탭 또는 ?tab= 탭 */
  tabs?: LinkTab[];
  /** 주 버튼 1 + 보조 1까지 */
  actions?: ReactNode;
  /** 상세 화면의 이동 경로 */
  back?: { label: string; to: string };
  /** StatusTag·SensitivityTag·caption 글 */
  meta?: ReactNode;
}

export function PageHeader({ title, description, greeting, period, tabs, actions, back, meta }: PageHeaderProps) {
  return (
    <header className={`ws-page-header${greeting ? " ws-page-header--greeting" : ""}`}>
      {back && <Link className="ws-back" to={back.to}><ArrowLeftOutlined aria-hidden />{back.label}</Link>}
      <div className="ws-page-header__row">
        <div className="ws-page-header__titles">
          {greeting ? (
            <>
              <p className="ws-page-header__eyebrow">{greeting.dateText}</p>
              <h1 className="ws-t-title-page ws-t-greeting">안녕하세요, <span className="ws-greeting__name">{greeting.name}</span>님</h1>
              {greeting.summary && <p className="ws-page-header__desc">{greeting.summary}</p>}
            </>
          ) : (
            <>
              <h1 className="ws-t-title-page">{title}</h1>
              {description && <p className="ws-page-header__desc">{description}</p>}
            </>
          )}
          {meta && <div className="ws-page-header__meta">{meta}</div>}
        </div>
        {(period || actions) && (
          <div className="ws-page-header__side">
            {period && <SegmentedPills {...period} />}
            {actions}
          </div>
        )}
      </div>
      {tabs && tabs.length > 0 && <LinkTabs tabs={tabs} />}
    </header>
  );
}

/** 링크 탭. to가 "?tab=x"면 같은 경로의 쿼리 탭, 아니면 경로 탭 */
export function LinkTabs({ tabs, ariaLabel = "하위 화면" }: { tabs: LinkTab[]; ariaLabel?: string }) {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const isActive = (to: string, i: number) => {
    if (to.startsWith("?")) {
      const want = new URLSearchParams(to.slice(1));
      const [[k, v]] = [...want.entries()] as [[string, string]];
      const cur = params.get(k);
      return cur ? cur === v : i === 0;
    }
    const [path, q] = to.split("?");
    if (q) {
      const want = new URLSearchParams(q);
      return loc.pathname === path && [...want.entries()].every(([k, v]) => params.get(k) === v);
    }
    return loc.pathname === path;
  };
  const hrefOf = (to: string) => {
    if (!to.startsWith("?")) return to;
    const next = new URLSearchParams(loc.search);
    for (const [k, v] of new URLSearchParams(to.slice(1))) next.set(k, v);
    next.delete("selected");
    next.delete("currentPage");
    return `${loc.pathname}?${next.toString()}`;
  };
  return (
    <nav className="ws-tabs" aria-label={ariaLabel}>
      {tabs.map((t, i) => {
        const active = isActive(t.to, i);
        return (
          <Link key={t.key} to={hrefOf(t.to)} className={`ws-tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} replace={t.to.startsWith("?")}>
            {t.label}
            <CountBadge count={t.badge} />
          </Link>
        );
      })}
    </nav>
  );
}
