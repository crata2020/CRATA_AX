// 라우팅(해시): 미리보기처럼 서버 없는 곳에서도 새로고침이 됩니다.
// 지원자 화면(/apply, /test)은 회사 메뉴 없이 따로 떠요.
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
      { path: "/moves", element: page(() => import("@/pages/Moves")) },
      { path: "/people", element: page(() => import("@/pages/People")) },
      { path: "/hiring", element: page(() => import("@/pages/Hiring")) },
      { path: "/hiring/:id", element: page(() => import("@/pages/Position")) },
      { path: "/policy", element: page(() => import("@/pages/Policy")) },
      { path: "*", element: page(() => import("@/pages/NotFound")) },
    ],
  },
  { path: "/apply/:id", element: page(() => import("@/pages/Apply")) },
  { path: "/test/:id", element: page(() => import("@/pages/Test")) },
]);

export function App() {
  return <AppProvider><RouterProvider router={router} /></AppProvider>;
}
