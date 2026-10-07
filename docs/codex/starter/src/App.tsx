// 라우팅(해시): 미리보기처럼 서버 없는 곳에서도 새로고침이 돼요.
// 화면을 더할 때: 아래 children에 한 줄 + src/shell/Shell.tsx의 NAV·PAGE_TITLE에 한 줄씩.
import { lazy, Suspense } from "react";
import { createHashRouter, RouterProvider } from "react-router";
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
      { path: "*", element: page(() => import("@/pages/NotFound")) },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
