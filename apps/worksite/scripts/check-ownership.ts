// 소유 경로 검사(빌드 스펙 7.3절). 바뀐 파일이 그룹이 고칠 수 있는 경로 안인지 봅니다.
// 실행: node scripts/check-ownership.ts --group work [--base origin/main]
//   그룹을 주지 않으면 바뀐 파일마다 소유자를 보여 주기만 합니다(실패하지 않음).
// 그룹이 고칠 수 있는 곳: src/pages/<그 그룹 dir>/**, src/data/seed/<group>.ts, notes/<group>.md
// (home은 src/pages/home/widgets/**·src/pages/search/CommandMenu.tsx 포함 — 둘 다 home 폴더 안)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const group = opt("--group");
const base = opt("--base");
const GROUPS = ["home", "work", "collab", "industry", "ara_settings"];
if (group && !GROUPS.includes(group)) { console.error(`모르는 그룹이에요: ${group} (${GROUPS.join(", ")})`); process.exit(2); }

// 매니페스트에서 dir → 그룹
const manifest = readFileSync(resolve(root, "src/routes/manifest.ts"), "utf8");
const dirGroup = new Map<string, string>();
for (const m of manifest.matchAll(/e\("[A-Z]-\d+", "[^"]+", "[^"]+", "([^"]+)", "([^"]+)"/g)) dirGroup.set(m[1]!, m[2]!);

const sh = (c: string) => { try { return execSync(c, { cwd: root, encoding: "utf8" }); } catch { return ""; } };
const prefix = sh("git rev-parse --show-prefix").trim();
const changed = new Set<string>();
const add = (out: string) => out.split("\n").map((s) => s.trim()).filter(Boolean).forEach((p) => {
  const path = p.startsWith(prefix) ? p.slice(prefix.length) : null;
  if (path) changed.add(path);
});
if (base) add(sh(`git diff --name-only ${base}...HEAD`));
add(sh("git diff --name-only HEAD"));
add(sh("git ls-files --others --exclude-standard --full-name"));

function ownerOf(path: string): string {
  let m = /^src\/pages\/([^/]+)\//.exec(path);
  if (m) return dirGroup.get(m[1]!) ?? "foundation";
  m = /^src\/data\/seed\/(home|work|collab|industry|ara_settings)\.ts$/.exec(path);
  if (m) return m[1]!;
  m = /^notes\/(home|work|collab|industry|ara_settings)\.md$/.exec(path);
  if (m) return m[1]!;
  return "foundation";
}

const rows = [...changed].sort().map((p) => ({ path: p, owner: ownerOf(p) }));
if (!group) {
  for (const r of rows) console.log(`${r.owner.padEnd(12)} ${r.path}`);
  console.log(`소유 확인: 바뀐 파일 ${rows.length}개(그룹을 주면 --group <이름>으로 검사해요)`);
  process.exit(0);
}
const outside = rows.filter((r) => r.owner !== group);
if (outside.length) {
  console.error(`${group} 그룹 소유 밖 변경 ${outside.length}건 — 공통 변경은 notes/${group}.md에 적어 주세요:\n` + outside.map((r) => `  ${r.path} (소유: ${r.owner})`).join("\n"));
  process.exit(1);
}
console.log(`${group} 그룹: 소유 경로 안 변경만 있어요(${rows.length}개)`);
