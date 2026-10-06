// 라우팅(해시): 미리보기처럼 서버 없는 곳에서도 새로고침이 됩니다.
import { lazy, Suspense } from "react";
import { createHashRouter, RouterProvider } from "react-router";
import { AppProvider } from "@/data/store";
import { Shell } from "@/shell/Shell";

const page = (load: () => Promise<{ default: React.ComponentType }>) => {
  const C = lazy(load);
  return <Suspense fallback={<div className="muted small" style={{ padding: 24 }}>불러오는 중…</div>}><C /></Suspense>;
};

const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: page(() => import("@/pages/Home")) },
      { path: "/tasks", element: page(() => import("@/pages/Tasks")) },
      { path: "/projects", element: page(() => import("@/pages/Projects")) },
      { path: "/meetings", element: page(() => import("@/pages/Meetings")) },
      { path: "/docs", element: page(() => import("@/pages/Docs")) },
      { path: "/quality", element: page(() => import("@/pages/Quality")) },
      { path: "/report", element: page(() => import("@/pages/Report")) },
      { path: "/ai", element: page(() => import("@/pages/Ai")) },
      { path: "/integrations", element: page(() => import("@/pages/Integrations")) },
      { path: "/company", element: page(() => import("@/pages/Company")) },
      { path: "/members", element: page(() => import("@/pages/Members")) },
      { path: "/settings", element: page(() => import("@/pages/Settings")) },
      { path: "/ara", element: page(() => import("@/pages/Ara")) },
      { path: "*", element: page(() => import("@/pages/NotFound")) },
    ],
  },
]);

export function App() {
  return <AppProvider><RouterProvider router={router} /></AppProvider>;
}
