// 'AI 티' 정적 검사(빌드 스펙 8.4절). 실행: node scripts/check-rules.ts (npm run check)
//  - src/에 gradient( · backdrop-filter · filter: blur · stroke-dasharray · dashed 없음
//  - box-shadow와 색 hex는 src/theme/에만
//  - 이모지(Extended_Pictographic) 없음(문자열·주석 포함)
//  - @ant-design/icons는 Outlined만, @ant-design/plots·kbar·@refinedev/inferencer·@refinedev/kbar import 없음
//  - CSS font-weight·fontWeight는 400·600·700만
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|css)$/.test(f) && !f.endsWith(".generated.ts")) files.push(p);
  }
};
walk(src);

const problems: string[] = [];
const report = (file: string, line: number, msg: string) => problems.push(`${relative(root, file)}:${line}  ${msg}`);

for (const file of files) {
  const rel = relative(src, file);
  const inTheme = rel.startsWith("theme/");
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((text, i) => {
    const n = i + 1;
    if (/gradient\(/.test(text)) report(file, n, "그라데이션 금지");
    if (/backdrop-filter|filter:\s*blur/.test(text)) report(file, n, "블러·유리 효과 금지");
    if (/stroke-dasharray|strokeDasharray|\bdashed\b/.test(text)) report(file, n, "점선 금지");
    if (!inTheme && /box-shadow|boxShadow/.test(text)) report(file, n, "그림자는 src/theme/에서만(--ws-shadow-*)");
    if (!inTheme && /#[0-9a-fA-F]{3,8}\b/.test(text) && !/&#/.test(text)) report(file, n, "색 hex는 src/theme/에서만(CSS 변수 사용)");
    if (/\p{Extended_Pictographic}/u.test(text)) report(file, n, "이모지 금지");
    const w = /font-?[wW]eight\s*[:=]\s*\{?\s*["']?(\d{3})/.exec(text);
    if (w && !["400", "600", "700"].includes(w[1]!)) report(file, n, `굵기 ${w[1]} 금지(400·600·700만)`);
    if (/from\s+["'](@ant-design\/plots|kbar|@refinedev\/inferencer|@refinedev\/kbar)["']/.test(text)) report(file, n, "쓰지 않는 패키지 import");
  });
  const src0 = lines.join("\n");
  for (const m of src0.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']@ant-design\/icons["']/g)) {
    if (m[1]) continue;
    for (const name of m[2]!.split(",").map((s) => s.trim().split(/\s+as\s+/)[0]!).filter(Boolean)) {
      if (!name.endsWith("Outlined")) report(file, 0, `아이콘은 Outlined만: ${name}`);
    }
  }
  for (const m of src0.matchAll(/from\s+["']@ant-design\/icons\/(\w+)["']/g)) {
    if (!m[1]!.endsWith("Outlined") && !src0.includes("import type")) report(file, 0, `아이콘은 Outlined만: ${m[1]}`);
  }
}

if (problems.length) {
  console.error(`규칙 검사 실패 ${problems.length}건:\n` + problems.join("\n"));
  process.exit(1);
}
console.log(`규칙 검사 통과(${files.length}개 파일)`);
