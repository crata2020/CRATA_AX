// MobileTabBar(≤767): 5개 탭(아이콘 22 + 글자 13, 늘 함께). 안 켜진 탭은 muted 500, 켜진 탭은 brand 700 + 아이콘 뒤 옅은 알약(56×32) + 위쪽 2px 막대.
// 네 탭 밖의 화면은 '전체' 탭이 켜져요.
// 기본: 홈 · 내 업무 · 회의 · 알림 · 전체 / 제조: 홈 · 내 업무 · 현장 등록 · 알림 · 전체(레지스트리 mobile_tabs)
import { Link, useLocation } from "react-router";
import { NAV_BADGE_LABEL, type MobileTab, type NavBadgeKey } from "@/modules";
import { CountBadge } from "@/components/basics";
import { NavIcon } from "./icons";
import { useNavBadges } from "./useNavBadges";

export interface MobileTabBarProps {
  tabs: (MobileTab & { badge?: number })[];
  /** 기본: 현재 경로로 계산 */
  activeKey?: string;
}

function activeTabKey(tabs: MobileTab[], pathname: string): string | undefined {
  let best: { key: string; len: number } | undefined;
  for (const t of tabs) {
    const hit = t.to === "/" ? pathname === "/" : pathname === t.to || pathname.startsWith(t.to + "/");
    if (hit && (!best || t.to.length > best.len)) best = { key: t.key, len: t.to.length };
  }
  // 네 탭에 없는 곳(생산·품질, 회사, 관리 …)은 모두 '전체' 아래에 있어요 → 늘 어느 한 탭이 켜져 있게
  return best?.key ?? tabs.find((t) => t.to === "/more")?.key;
}

export function MobileTabBar({ tabs, activeKey }: MobileTabBarProps) {
  const { pathname } = useLocation();
  const badges = useNavBadges();
  const current = activeKey ?? activeTabKey(tabs, pathname);
  return (
    <nav className="ws-tabbar" aria-label="하단 탭">
      {tabs.map((t) => {
        const on = current === t.key;
        const count = t.badge ?? (t.badgeKey ? badges[t.badgeKey as NavBadgeKey] : undefined);
        return (
          <Link key={t.key} to={t.to} className={`ws-tabbar__item${on ? " is-active" : ""}`} aria-current={on ? "page" : undefined}>
            <NavIcon name={t.icon} />
            <span>{t.label}</span>
            {!!count && <span className="ws-tabbar__badge"><CountBadge count={count} label={t.badgeKey ? NAV_BADGE_LABEL[t.badgeKey as NavBadgeKey] : t.label} /></span>}
          </Link>
        );
      })}
    </nav>
  );
}
