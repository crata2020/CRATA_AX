// 라우트: manifest.ts(63개) + import.meta.glob("../pages/*/index.tsx")로 자동 연결합니다. 그룹은 이 파일을 고치지 않습니다.
// 리디렉션: /admin → /admin/settings · /company → /company/notices · CRATA(제조 팩 없음)의 /ops → /ops/sales · 768px 이상의 /more → /
// 모든 페이지는 RouteFrame이 PageGuard(모듈·권한)와 data-page-ready 신호, 문서 제목("{페이지} · {회사}")으로 감쌉니다.
import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Skeleton } from "antd";
import { MANIFEST, OWNER_ADMIN_ONLY, APPROVE_PAGES, type RouteEntry } from "@/routes/manifest";
import { useWorksite } from "./TenantBoundary";
import { RouteCtx } from "./routeContext";
import { PageReadyRoot, usePageReady } from "./pageReady";
import { AppShell } from "@/layout/AppShell";
import { PageGuard } from "@/layout/PageGuard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useBreakpoint } from "@/lib/useBreakpoint";

const pageFiles = import.meta.glob<{ default: ComponentType }>("../pages/*/index.tsx");
const PAGES: Record<string, ComponentType> = {};
for (const [path, load] of Object.entries(pageFiles)) {
  const dir = path.split("/").at(-2)!;
  PAGES[dir] = lazy(load);
}
const Kit = import.meta.env.DEV ? lazy(() => import("./Kit")) : null;

/** 화면이 바뀌면(경로가 바뀔 때만, ?탭·서랍은 제외) 초점을 본문으로 옮기고 화면 이름을 읽어 줘요.
 *  눌렀던 메뉴 링크에 초점이 남아 화면이 바뀐 걸 스크린리더가 모르는 문제(리뷰 2차). 첫 화면은 건드리지 않아요. */
let lastPath: string | null = null;
function announce(text: string) {
  let el = document.getElementById("ws-route-announcer");
  if (!el) {
    el = document.createElement("div");
    el.id = "ws-route-announcer";
    el.className = "ws-sr-only";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    document.body.appendChild(el);
  }
  el.textContent = "";
  const node = el;
  window.setTimeout(() => { node.textContent = text; }, 50);
}
function useRouteFocus(pathname: string, name: string) {
  useEffect(() => {
    const prev = lastPath;
    lastPath = pathname;
    if (prev == null || prev === pathname) return;
    const main = document.getElementById("main");
    // 페이지 h1이 이미 그려졌으면 h1로, 아니면 본문 영역으로
    const h1 = main?.querySelector<HTMLElement>("h1");
    const target = h1 ?? main;
    if (target) {
      if (target === h1 && !h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
    announce(`${name} 화면`);
  }, [pathname, name]);
}

function PageLoading() {
  usePageReady(false);
  return <Skeleton active title paragraph={{ rows: 4 }} />;
}

function MissingPage({ entry }: { entry: RouteEntry }) {
  return (
    <>
      <PageHeader title={entry.nameKo} />
      <EmptyState kind="empty" title="준비 중이에요" description={`src/pages/${entry.dir}/index.tsx 파일이 아직 없어요.`} />
    </>
  );
}

export function RouteFrame({ entry }: { entry: RouteEntry }) {
  const { tenant } = useWorksite();
  const loc = useLocation();
  const bp = useBreakpoint();
  useEffect(() => { document.title = `${entry.nameKo} · ${tenant.displayName}`; }, [entry.nameKo, tenant.displayName]);
  useRouteFocus(loc.pathname, entry.nameKo);
  if (entry.dir === "more" && bp !== "mobile") return <Navigate to="/" replace />;
  const Page = PAGES[entry.dir];
  return (
    <RouteCtx.Provider value={entry}>
      <PageReadyRoot key={loc.pathname}>
        <PageGuard roles={OWNER_ADMIN_ONLY.has(entry.id) ? ["owner", "admin"] : undefined} action={APPROVE_PAGES.has(entry.id) ? "approve" : "list"}>
          <Suspense fallback={<PageLoading />}>{Page ? <Page /> : <MissingPage entry={entry} />}</Suspense>
        </PageGuard>
      </PageReadyRoot>
    </RouteCtx.Provider>
  );
}

export function AppRoutes() {
  const { tenant } = useWorksite();
  const login = MANIFEST.find((m) => m.bare)!;
  const manufacturing = tenant.packs.includes("manufacturing");
  return (
    <Routes>
      <Route path={login.path} element={<RouteFrame entry={login} />} />
      <Route element={<AppShell />}>
        <Route path="/admin" element={<Navigate to="/admin/settings" replace />} />
        <Route path="/company" element={<Navigate to="/company/notices" replace />} />
        {MANIFEST.filter((m) => !m.bare).map((m) => (
          <Route
            key={m.id}
            path={m.path}
            element={m.path === "/ops" && !manufacturing ? <Navigate to="/ops/sales" replace /> : <RouteFrame entry={m} />}
          />
        ))}
        {Kit && <Route path="/__kit" element={<PageReadyRoot><Suspense fallback={null}><Kit /></Suspense></PageReadyRoot>} />}
      </Route>
    </Routes>
  );
}
