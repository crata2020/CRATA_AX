// 공개 미리보기(--mode public): 첫 고객 회사 이름을 가상 이름으로 바꿔 빌드합니다(identity.public.ts).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const isPublic = mode === "public";
  const src = fileURLToPath(new URL("./src", import.meta.url));
  return {
    base: "./",
    plugins: [react()],
    resolve: {
      alias: [
        ...(isPublic ? [{ find: /^\.\/identity$/, replacement: `${src}/data/identity.public.ts` }] : []),
        { find: "@", replacement: src },
      ],
    },
    build: { outDir: isPublic ? "dist-public" : "dist", chunkSizeWarningLimit: 900 },
  };
});
