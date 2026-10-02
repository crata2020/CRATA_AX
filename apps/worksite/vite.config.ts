import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 상대 경로 빌드(base "./") + 해시 라우팅: dist/를 어떤 정적 호스팅의 어느 하위 경로에 올려도 동작합니다.
// 묶음 나누기(Vite 8 = rolldown): rollup의 manualChunks는 rolldown에서 일부만 먹혀서 output.codeSplitting.groups로 나눠요.
//   react(+router) · refine 코어(+tanstack)는 따로, 예시 데이터(src/data/seed)는 TenantBoundary가 import()로 따로 받아요.
//   첫 화면(홈) gzip 449KB(목표 450KB, notes/INTEGRATION.md 측정법 · tests/e2e/smoke.spec.ts '첫 화면 JS 예산'이 지켜요). 표 묶음은 목록 화면에서만,
//   서랍·폼(날짜 선택)은 처음 열 때(src/lib/lazyDrawer.tsx) 받아요.
// 경고 기준(chunkSizeWarningLimit)은 기본값(500kB) 그대로 둡니다.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5173, strictPort: false },
  preview: { port: 4173, strictPort: false },
  build: {
    rolldownOptions: {
      // package.json에 sideEffects 표시가 없는 의존성(react-markdown·micromark·papaparse 등, Refine이 import만 하고 이 앱은 안 씀)이
      // 첫 화면 묶음에 통째로 들어가지 않게, node_modules의 JS는 부작용 없는 모듈로 봐요(CSS·dayjs 로캘처럼 import만으로 동작하는 것은 제외).
      treeshake: {
        moduleSideEffects: (id: string) => {
          // 공통 컴포넌트(src/components)는 import만으로 하는 일이 없어요 → 창구(index.ts)에서 안 쓰는 부품(표·보드·서랍)은 첫 화면에서 빠져요
          if (/src[\\/]components[\\/][^\\/]+\.tsx?$/.test(id)) return false;
          if (!id.includes("node_modules")) return true;
          if (/\.css($|\?)/.test(id) || /[\\/]dayjs[\\/]/.test(id)) return true;
          return false;
        },
      },
      output: {
        codeSplitting: {
          // react·refine 코어만 묶음으로 고정하고, antd·아이콘·@refinedev/antd는 묶지 않아요(묶으면 화면 어디서든 쓰는 부품이 모두
          // 한 덩어리가 되어 첫 화면이 다 받아요. 안 묶으면 첫 화면은 상단 바·메뉴가 쓰는 부품만, 나머지는 화면별 공유 조각으로 가요)
          groups: [
            { name: "vendor-react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/, priority: 40 },
            { name: "vendor-refine", test: /node_modules[\\/](@refinedev[\\/](core|react-router|devtools-internal)|@tanstack)[\\/]/, priority: 30 },
          ],
        },
      },
    },
  },
});
