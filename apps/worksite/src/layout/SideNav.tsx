// SideNav(데스크톱 240, 접으면 72) · NavTree(서랍 안 메뉴) · NavRail(태블릿 80). 07 명세 5.2: 흰 바탕 + 오른쪽 1px 선,
// 로고 줄은 상자 없이(머리 = 로고 + 28 원형 접기 버튼), 펼친 사이드바에는 장식 섹션 라벨 '메뉴'(aria-hidden, Tab 정지점 아님).
// 꺼진 항목 400, 활성 항목: brand-weak 바탕 + brand 글자 + 굵기 600 + aria-current="page" + 왼쪽 3px 막대(색만으로 표시하지 않음).
// 하위 항목이 켜지면 그룹 줄은 brand 글자·아이콘만 남기고(바탕·막대 없음), 바탕·막대·점은 하위 항목에만.
// 하위 항목은 아이콘 없이 점 불릿, 활성 그룹만 펼칩니다(서랍은 모든 그룹을 펼칠 수 있음).
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Button, Tooltip } from "antd";
import { LockOutlined, DoubleLeftOutlined, DoubleRightOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { useWorksite } from "@/app/TenantBoundary";
import { activeNav, NAV_BADGE_LABEL, type NavBadgeKey, type NavItem } from "@/modules";
import { CountBadge } from "@/components/basics";
import { NavIcon } from "./icons";
import { useNavBadges } from "./useNavBadges";

function Brand({ collapsed }: { collapsed?: boolean }) {
  const { tenant } = useWorksite();
  return (
    <Link to="/" className="ws-brand" aria-label={`${tenant.displayName} 홈`}>
      <span className="ws-monogram" aria-hidden>{tenant.monogram}</span>
      {!collapsed && <span className="ws-brand__name">{tenant.displayName}</span>}
    </Link>
  );
}

/** 접힌 그룹의 배지: 하위 항목 배지를 더하되, 무엇을 센 건지 툴팁·스크린리더 글자로 밝힘("내 업무 4"가 내 업무 수로 읽히지 않게) */
function GroupBadge({ group, badges }: { group: NavItem; badges: Partial<Record<NavBadgeKey, number>> }) {
  const parts = group.children
    .map((c) => (c.badgeKey && badges[c.badgeKey] ? `${NAV_BADGE_LABEL[c.badgeKey]} ${badges[c.badgeKey]}건` : null))
    .filter((x): x is string => !!x);
  const count = group.children.reduce((s, c) => s + (c.badgeKey ? badges[c.badgeKey] ?? 0 : 0), 0);
  if (!count) return null;
  return (
    <Tooltip title={parts.join(" · ")} placement="right">
      <span className="ws-count">
        <span aria-hidden>{count > 99 ? "99+" : count}</span>
        <span className="ws-sr-only">{parts.join(", ")}</span>
      </span>
    </Tooltip>
  );
}

/** 메뉴 트리. mode="side"는 활성 그룹만 펼침, "drawer"는 그룹을 눌러 펼침 */
export function NavTree({ items, collapsed, mode = "side", onNavigate }: { items: NavItem[]; collapsed?: boolean; mode?: "side" | "drawer"; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const active = activeNav(items, pathname);
  const badges = useNavBadges();
  const [openKey, setOpenKey] = useState<string | undefined>(active.group);

  return (
    <nav className={`ws-nav${mode === "drawer" ? " ws-drawer-nav" : ""}`} aria-label="주 메뉴">
      {/* 장식 섹션 라벨: 초점을 받지 않고 스크린리더도 읽지 않아요(nav 이름이 이미 '주 메뉴') */}
      {mode === "side" && !collapsed && <div className="ws-nav__heading" aria-hidden="true">메뉴</div>}
      <ul>
        {items.map((g) => {
          const isActive = active.group === g.key;
          const exact = isActive && !active.child;
          const expanded = mode === "side" ? isActive && !collapsed : openKey === g.key;
          const label = (
            <>
              <NavIcon name={g.icon} />
              {!collapsed && (
                <span className="ws-nav__label">
                  <span>{g.label}</span>
                  {g.private && (
                    <span className="ws-nav__private">
                      {g.caption && <span className="ws-nowrap">{g.caption}</span>}
                      <span className="ws-nowrap"><LockOutlined aria-hidden /> 나만 보여요</span>
                    </span>
                  )}
                </span>
              )}
              {!collapsed && !expanded && <GroupBadge group={g} badges={badges} />}
            </>
          );
          // 하위 항목이 켜져 있으면 그룹은 글자·아이콘 색만(바탕·막대는 하위 항목 하나에만 — 두 줄이 같이 칠해지지 않게)
          const childShown = isActive && !!active.child && expanded;
          const linkCls = `ws-nav__link${isActive ? " is-active" : ""}${childShown ? " has-active-child" : ""}`;
          const link = mode === "drawer" && g.children.length > 0 ? (
            <button type="button" className={linkCls} aria-expanded={expanded} onClick={() => setOpenKey(expanded ? undefined : g.key)}>
              {label}
              {expanded ? <DownOutlined aria-hidden style={{ fontSize: 12 }} /> : <RightOutlined aria-hidden style={{ fontSize: 12 }} />}
            </button>
          ) : (
            <Link to={g.to} className={linkCls} aria-current={exact || (isActive && g.children.length === 0) ? "page" : undefined} onClick={onNavigate} aria-label={collapsed ? g.label : undefined}>
              {label}
            </Link>
          );
          return (
            <li key={g.key} className="ws-nav__group">
              {g.dividerBefore && <div className="ws-nav__divider" role="separator" />}
              {collapsed ? <Tooltip title={g.private ? `${g.label} · ${g.caption ? `${g.caption} · ` : ""}나만 보여요` : g.label} placement="right">{link}</Tooltip> : link}
              {expanded && g.children.length > 0 && (
                <ul className="ws-nav__children">
                  {g.children.map((c) => {
                    const on = active.child === c.key;
                    return (
                      <li key={c.key}>
                        {c.section && <div className="ws-nav__section">{c.section}</div>}
                        <Link to={c.to} className={`ws-nav__sub${on ? " is-active" : ""}`} aria-current={on ? "page" : undefined} onClick={onNavigate}>
                          <span className="ws-nav__dot" aria-hidden />
                          <span style={{ flex: 1 }}>{c.label}</span>
                          <CountBadge count={c.badgeKey ? badges[c.badgeKey] : undefined} label={c.badgeKey ? NAV_BADGE_LABEL[c.badgeKey] : c.label} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: (v: boolean) => void }) {
  const { nav } = useWorksite();
  return (
    <aside className={`ws-sidenav${collapsed ? " is-collapsed" : ""}`} aria-label="메뉴">
      <div className="ws-sidenav__head">
        <Brand collapsed={collapsed} />
        <Tooltip title={collapsed ? "메뉴 펼치기" : "메뉴 접기"} placement="right">
          <Button
            shape="circle"
            size="small"
            className="ws-collapse-btn"
            aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
            aria-expanded={!collapsed}
            icon={collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
            onClick={() => onCollapse(!collapsed)}
          />
        </Tooltip>
      </div>
      <NavTree items={nav} collapsed={collapsed} />
    </aside>
  );
}

/** 태블릿(768~1279) 레일: 아이콘 20 + 글자 13. 하위 메뉴는 상단 바의 메뉴 서랍에서 */
export function NavRail() {
  const { nav, tenant } = useWorksite();
  const { pathname } = useLocation();
  const active = activeNav(nav, pathname);
  const badges = useNavBadges();
  return (
    <aside className="ws-navrail" aria-label="메뉴">
      <Link to="/" className="ws-brand ws-brand--rail" aria-label={`${tenant.displayName} 홈`}>
        <span className="ws-monogram" aria-hidden>{tenant.monogram}</span>
      </Link>
      <nav aria-label="주 메뉴">
        {nav.map((g) => {
          const on = active.group === g.key;
          return (
            <div key={g.key}>
              {g.dividerBefore && <div className="ws-nav__divider" role="separator" />}
              <Link to={g.to} className={`ws-navrail__item${on ? " is-active" : ""}`} aria-current={on ? "page" : undefined}>
                <NavIcon name={g.icon} />
                <span>{g.label}</span>
                {g.private && <span className="ws-sr-only">나만 보여요</span>}
                <span className="ws-navrail__badge"><GroupBadge group={g} badges={badges} /></span>
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
