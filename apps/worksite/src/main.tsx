// 시작점: 글꼴(Pretendard 다이내믹 서브셋, npm) · 리셋 CSS · 전역 스타일 · <App/>
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@refinedev/antd/dist/reset.css";
import "./theme/global.css";
import "./theme/layout.css";
import "./theme/components.css";
import App from "./app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
