// 시작점: 글꼴(Pretendard 다이내믹 서브셋, npm) · 리셋 CSS · 전역 스타일 · <App/>
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
// 공유용 빌드(--mode public)는 vite.config.ts에서 이 파일을 font-public.css(글꼴 내장)로 바꿔 끼워요
import "@/theme/font.css";
import "@refinedev/antd/dist/reset.css";
import "./theme/global.css";
import "./theme/layout.css";
import "./theme/components.css";
import App from "./app/App";
import { REBOOT_EVENT } from "./lib/url";

/** 공유용 빌드에서 회사·인물을 바꾸면 새로고침 대신 앱을 다시 마운트해요(lib/url.ts) */
function Rebootable() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const onReboot = () => setKey((k) => k + 1);
    window.addEventListener(REBOOT_EVENT, onReboot);
    return () => window.removeEventListener(REBOOT_EVENT, onReboot);
  }, []);
  return <App key={key} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Rebootable />
  </StrictMode>,
);
