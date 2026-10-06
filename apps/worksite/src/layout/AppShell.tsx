// AppShell(빌드 스펙 2.1절, 07 명세 5.1): 구간별 배치. 흰 SideNav·TopBar가 'ㄱ'자로 평평한 회색 캔버스(--ws-panel, 라운드 없음)를 감쌉니다.
//   wide(≥1440)·desktop(1280~1439): SideNav 240(접으면 72) + TopBar 64 + 캔버스 [+ RightRail 320, 홈만·wide만]
//   tablet(768~1279): NavRail 80 + TopBar 64(메뉴 서랍) + 캔버스 안쪽 24
//   mobile(≤767): TopBar 56 + 화면 전체 캔버스 + MobileTabBar 64(+안전 영역) + 메뉴 서랍
// 창(window)이 스크롤합니다(상단 바 is-scrolled, 표 머리 sticky 64, 레일 sticky가 이를 가정).
// 첫 Tab은 SkipLink("본문으로 건너뛰기"). 본문은 <main id="main">.
import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";
import { App } from "antd";
import { useWorksite } from "@/app/TenantBoundary";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { getPrefs, setPrefs } from "@/lib/storage";
import { NavRail, SideNav } from "./SideNav";
import { lazyDrawer } from "@/lib/lazyDrawer";
import { TopBar } from "./TopBar";
import { MobileTabBar } from "./MobileTabBar";
import { RailCtx } from "./RightRail";

const NavDrawer = lazyDrawer(() => import("./NavDrawer").then((m) => m.NavDrawer));

export function SkipLink() {
  return (
    <a
      href="#main"
      className="ws-skip"
      onClick={(e) => {
        e.preventDefault();
        const main = document.getElementById("main");
        main?.focus();
        main?.scrollIntoView({ block: "start" });
      }}
    >
      본문으로 건너뛰기
    </a>
  );
}

function BootNotices() {
  const { bootNotices } = useWorksite();
  const { message } = App.useApp();
  useEffect(() => {
    for (const n of bootNotices) message.info(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function AppShell() {
  const { nav, tabs, tenant } = useWorksite();
  const bp = useBreakpoint();
  const [collapsed, setCollapsed] = useState(() => getPrefs().navCollapsed === true);
  const [drawer, setDrawer] = useState(false);
  const [railNode, setRailNode] = useState<HTMLElement | null>(null);
  const [railActive, setRailActive] = useState(false);
  const railCtx = useMemo(() => ({ node: railNode, setActive: setRailActive }), [railNode]);

  const onCollapse = (v: boolean) => { setCollapsed(v); setPrefs({ navCollapsed: v }); };

  return (
    <RailCtx.Provider value={railCtx}>
      <div className={`ws-shell ws-shell--${bp}`} data-tenant-slug={tenant.slug}>
        <SkipLink />
        {(bp === "desktop" || bp === "wide") && <SideNav collapsed={collapsed} onCollapse={onCollapse} />}
        {bp === "tablet" && <NavRail />}
        <div className="ws-main">
          <TopBar bp={bp} navOpen={drawer && bp !== "desktop" && bp !== "wide"} onOpenNav={() => setDrawer(true)} />
          <div className="ws-body">
            <main id="main" tabIndex={-1} className="ws-panel">
              <div className="ws-panel-inner"><Outlet /></div>
            </main>
            {bp === "wide" && (
              <aside className="ws-rail" ref={setRailNode} aria-label="오늘" hidden={!railActive} />
            )}
          </div>
        </div>
        {bp === "mobile" && <MobileTabBar tabs={tabs} />}
        <NavDrawer open={drawer && bp !== "desktop" && bp !== "wide"} onClose={() => setDrawer(false)} title={tenant.displayName} items={nav} />
        <BootNotices />
      </div>
    </RailCtx.Provider>
  );
}
