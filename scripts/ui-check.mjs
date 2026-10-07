#!/usr/bin/env node
// scripts/ui-check.mjs — 모든 화면 × 화면 폭을 찍고 기계 검사를 해요. 클릭한 뒤의 상태(--flow)도 찍어요.
//
// 검사: 가로 넘침(스크롤 상자 밖으로 나간 '범인' 요소 이름까지), h1 개수(기본 1), 보이는 짙은 버튼(.btn--dark) 개수(기본 1개 이하),
//       콘솔 오류·페이지 오류(favicon 404는 무시), --a11y면 라벨 없는 입력·이름 없는 버튼·링크.
//       --flow 캡처에서는 토스트가 버튼·링크를 가리면 WARN으로 알려요(실패로 세지 않아요. 공통 파일 문제라 보고에 적어요).
// 결과: <out>/<변형>-<폭키>-<경로>.png(전체 캡처, 3000px에서 자름), 같은 이름의 .fold.png(첫 화면), <out>/report.json.
// 종료 코드: 0 = 문제 없음, 1 = 문제 있음, 2 = 인자 오류·서버 없음·playwright 없음.
//
// 기본 명령(앱 폴더에서. 명령 끝에 다른 글자를 붙이지 않아요):
//   node ../../scripts/ui-check.mjs --base http://localhost:4314/ --routes /training,/moves --fold --a11y
//   node ../../scripts/ui-check.mjs --base http://localhost:4314/ --routes @../../scripts/routes.hr.json --fold --a11y
//   node ../../scripts/ui-check.mjs --base http://localhost:4304/ --routes @../../scripts/routes.worksite.json --viewports d:1440x1000,m:390x844 --fold --a11y
//   node ../../scripts/ui-check.mjs --base http://localhost:4314/ --flow @.ui-check/flows/training.json --viewports d:1440x1000,m:390x844 --out .ui-check/flow
//
// 인자:
//   --base <URL>            (필수) 앱 주소. 해시 라우팅이면 <base>#<경로>로 열어요.
//   --routes <목록|@파일>   "/,/tasks" 쉼표 목록, 또는 @routes.json / routes.txt(한 줄에 하나). 여러 번 줄 수 있어요.
//   --flow <@파일|JSON>     클릭 흐름(아래 형식). "shot" 단계마다 <변형>-<폭키>-flow-<이름>-<shot>.fold.png를 찍고 같은 검사를 해요.
//                           여러 번 줄 수 있어요. --routes 없이 --flow만 주면 흐름만 돌아요.
//   --viewports <목록>      기본 d:1440x1000,t:1024x900,m:390x844 ("키:폭x높이", "키=폭x높이"도 돼요)
//   --out <폴더>            기본 .ui-check
//   --wait <ms>             load·글꼴 준비 뒤 더 기다릴 시간. 기본 900
//   --step-wait <ms>        흐름 단계 사이에 기다릴 시간. 기본 300
//   --server-wait <ms>      서버가 응답할 때까지 기다릴 시간. 기본 20000(서버를 막 띄웠을 때 sleep이 필요 없어요)
//   --ready <선택자>        이 요소가 보일 때까지 기다려요(5초). 안 보이면 오류로 셉니다
//   --max-height <px>       전체 캡처를 자르는 높이. 기본 3000
//   --dark-selector <css>   짙은 버튼 선택자. 기본 .btn--dark
//   --max-dark <n>          보이는 짙은 버튼 최대 개수. 기본 1 (경로 파일의 maxDark가 우선)
//   --toast-selector <css>  토스트 선택자(가림 검사용). 기본 .toast
//   --ignore-console <re>   무시할 콘솔 오류 정규식(글자·주소에 적용). 기본 favicon, ""이면 아무것도 무시 안 함
//   --no-hash               히스토리 라우팅 앱이면 <base><경로>로 열어요
//   --fold                  첫 화면 캡처 <이름>.fold.png. 기본으로 켜져 있어요(옛 명령과 맞추려고 받아요). 끄려면 --no-fold
//   --a11y                  라벨 없는 입력, 이름 없는 버튼·링크도 문제로 봐요
//   --only <글자>           파일 이름에 이 글자가 들어간 조합만 찍어요
//   --no-fail               문제가 있어도 exit 0
// 환경 변수:
//   PW_MODULE=<경로>        playwright 또는 playwright-core 모듈 폴더(맨 먼저 시도). 없으면 앱 폴더 → scripts 폴더에서 'playwright' → 'playwright-core'
//                           (처음 한 번: 저장소 루트에서 cd scripts && npm ci && npx playwright install chromium)
//                           예: PW_MODULE=/opt/node-tools/node_modules/playwright-core
//   CHROMIUM_PATH=<경로>    크로미움 실행 파일. 없으면 playwright 기본 브라우저(PLAYWRIGHT_BROWSERS_PATH 또는 npx playwright install chromium)
//
// routes.json 형식(배열만 줘도 돼요: ["/", "/moves"]):
//   { "variants": [ { "name": "tr-plant", "query": "tenant=tr&as=tr-plant" },
//                   { "name": "tr-op1", "query": "tenant=tr&as=tr-op1", "routes": ["/", "/report"], "viewports": ["m"] } ],
//     "routes": [ "/", "/tasks", { "path": "/hiring/pos-qa", "name": "position", "viewports": ["d", "m"], "maxDark": 1, "h1": 1, "query": "a=a-q02" } ] }
//
// 흐름 파일 형식(객체 하나 또는 배열. 예: scripts/flows/hr-position.example.json):
//   { "name": "training", "route": "/training", "viewports": ["d", "m"], "steps": [
//       { "shot": "start" },
//       { "uncheck": "tbody tr.is-sel [role=checkbox] >> nth=0" },
//       { "click": "role=button[name=/교육 일정 잡기/]" },
//       { "shot": "schedule-drawer" },
//       { "click": ".drawer__foot .btn--brand" }, { "wait": 400 },
//       { "shot": "after-confirm" },
//       { "goto": "/moves" }, { "shot": "moves-after" } ] }
//   단계: click · check · uncheck(선택자) · fill(선택자 + "value") · press(키 이름, 예 "Escape")
//         · goto(경로. 해시만 바뀌어 스토어가 남아요) · wait(ms) · waitFor(선택자) · scroll(선택자 또는 y px) · shot(이름)
//   선택자는 Playwright 문법이에요(css, text=…, role=button[name=/…/]). 여러 개가 맞으면 첫 번째를 써요.
//   단계가 실패하면 그 자리를 <이름>-failed로 찍고 그 폭의 흐름을 멈춰요.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// ---------- 인자 ----------
const argv = process.argv.slice(2);
const opt = {
  base: "", routes: [], flows: [], viewports: "d:1440x1000,t:1024x900,m:390x844", out: ".ui-check", wait: 900, stepWait: 300, serverWait: 20000,
  maxHeight: 3000, dark: ".btn--dark", maxDark: 1, toast: ".toast", ignore: "favicon", hash: true, a11y: false, fail: true, ready: "", only: "", fold: true,
};
function usage() {
  const lines = fs.readFileSync(new URL(import.meta.url), "utf8").split("\n");
  const end = lines.findIndex((l, i) => i > 0 && !l.startsWith("//"));
  console.log(lines.slice(1, end).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
}
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  const v = () => {
    const x = argv[++i];
    if (x === undefined) { console.error(`${k} 뒤에 값이 필요해요`); process.exit(2); }
    return x;
  };
  if (k === "--base") opt.base = v();
  else if (k === "--routes" || k === "--route") opt.routes.push(v());
  else if (k === "--flow" || k === "--flows") opt.flows.push(v());
  else if (k === "--viewports") opt.viewports = v();
  else if (k === "--out") opt.out = v();
  else if (k === "--wait") opt.wait = Number(v());
  else if (k === "--step-wait") opt.stepWait = Number(v());
  else if (k === "--server-wait") opt.serverWait = Number(v());
  else if (k === "--ready") opt.ready = v();
  else if (k === "--max-height") opt.maxHeight = Number(v());
  else if (k === "--dark-selector") opt.dark = v();
  else if (k === "--max-dark") opt.maxDark = Number(v());
  else if (k === "--toast-selector") opt.toast = v();
  else if (k === "--ignore-console") opt.ignore = v();
  else if (k === "--only") opt.only = v();
  else if (k === "--no-hash") opt.hash = false;
  else if (k === "--fold") opt.fold = true;
  else if (k === "--no-fold") opt.fold = false;
  else if (k === "--a11y") opt.a11y = true;
  else if (k === "--no-fail") opt.fail = false;
  else if (k === "-h" || k === "--help") { usage(); process.exit(0); }
  else if (!k.startsWith("-")) {
    console.error(`옵션이 아닌 값 '${k}'가 있어요. 경로는 --routes 뒤에 쉼표로 붙여요. 명령 끝에 붙은 '${k}'라면 지우고 다시 돌려요.`);
    process.exit(2);
  } else { console.error(`알 수 없는 인자: ${k} (--help로 사용법 보기)`); process.exit(2); }
}
if (!opt.base) { console.error("--base <URL>이 필요해요. 예: --base http://localhost:4314/"); process.exit(2); }
for (const [k, n] of [["--wait", opt.wait], ["--step-wait", opt.stepWait], ["--server-wait", opt.serverWait], ["--max-height", opt.maxHeight], ["--max-dark", opt.maxDark]]) {
  if (!Number.isFinite(n) || n < 0) { console.error(`${k} 값이 숫자가 아니에요`); process.exit(2); }
}

// ---------- 화면 폭 ----------
const VP = {};
for (const s of opt.viewports.split(",").map((x) => x.trim()).filter(Boolean)) {
  const m = s.match(/^(?:([\w-]+)[:=])?(\d+)x(\d+)$/);
  if (!m) { console.error(`화면 폭 형식이 틀렸어요: ${s} (예: m:390x844)`); process.exit(2); }
  VP[m[1] || `${m[2]}x${m[3]}`] = { w: Number(m[2]), h: Number(m[3]) };
}

// ---------- 경로·흐름 목록 ----------
function readData(raw, what) {
  const file = raw.startsWith("@") ? raw.slice(1) : raw;
  const isFile = raw.startsWith("@") || (/\.(json|txt)$/.test(raw) && fs.existsSync(raw));
  if (!isFile) return { isFile: false };
  if (!fs.existsSync(file)) { console.error(`${what} 파일이 없어요: ${file}`); process.exit(2); }
  const txt = fs.readFileSync(file, "utf8");
  try {
    return { isFile: true, data: file.endsWith(".json") ? JSON.parse(txt) : txt.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) };
  } catch (e) { console.error(`${what} 파일을 읽지 못했어요: ${file} (${e.message})`); process.exit(2); }
}
function loadRoutes() {
  let variants = [{ name: "", query: "" }];
  const routes = [];
  for (const raw of opt.routes) {
    const { isFile, data } = readData(raw, "경로");
    if (!isFile) routes.push(...raw.split(",").map((s) => s.trim()).filter(Boolean));
    else if (Array.isArray(data)) routes.push(...data);
    else {
      if (Array.isArray(data.variants) && data.variants.length) variants = data.variants;
      routes.push(...(data.routes || []));
    }
  }
  const list = (routes.length || opt.flows.length ? routes : ["/"]).map((r) => (typeof r === "string" ? { path: r } : r));
  for (const r of list) if (!r.path || !r.path.startsWith("/")) { console.error(`경로는 /로 시작해야 해요: ${JSON.stringify(r)}`); process.exit(2); }
  return { variants, routes: list };
}
function loadFlows() {
  const flows = [];
  for (const raw of opt.flows) {
    let data;
    const r = readData(raw, "흐름");
    if (r.isFile) data = r.data;
    else {
      try { data = JSON.parse(raw); } catch (e) { console.error(`--flow는 @파일이나 JSON이어야 해요 (${e.message})`); process.exit(2); }
    }
    for (const f of Array.isArray(data) ? data : [data]) {
      if (!f || !f.route || !f.route.startsWith("/") || !Array.isArray(f.steps)) { console.error(`흐름에는 route(/로 시작)와 steps 배열이 필요해요: ${JSON.stringify(f).slice(0, 120)}`); process.exit(2); }
      flows.push({ name: f.name || slug(f.route), ...f });
    }
  }
  return flows;
}
const slug = (s) => s.replace(/[?#&=]/g, "-").replace(/\//g, "_").replace(/[^\p{L}\p{N}_.-]/gu, "") || "_"; // 한글 shot 이름도 살려요
const { variants, routes } = loadRoutes();
const flows = loadFlows();

// ---------- playwright 불러오기 ----------
async function loadPlaywright() {
  // 앱 폴더(지금 폴더) → scripts 폴더(scripts/node_modules) 순서로 찾아요
  const reqs = [createRequire(path.join(process.cwd(), "noop.js")), createRequire(import.meta.url)];
  const tries = [process.env.PW_MODULE, "playwright", "playwright-core"].filter(Boolean);
  for (const name of tries) for (const req of reqs) {
    try {
      const target = name.startsWith(".") || path.isAbsolute(name) ? path.resolve(name) : name;
      const resolved = req.resolve(target);
      const mod = await import(pathToFileURL(resolved).href);
      const chromium = mod.chromium || mod.default?.chromium;
      if (chromium) return { chromium, from: resolved };
    } catch { /* 다음 후보 */ }
  }
  console.error("playwright를 찾지 못했어요. 저장소 루트에서 한 번만: cd scripts && npm ci && npx playwright install chromium\n" +
    "이미 설치된 곳이 있으면 PW_MODULE=/경로/node_modules/playwright-core 로 알려 줘도 돼요.");
  process.exit(2);
}

function urlFor(route, variant) {
  const q = [variant.query, route.query].filter(Boolean).join("&");
  const base = opt.base.replace(/[#?].*$/, "");
  if (opt.hash) return `${base}${q ? `?${q}` : ""}#${route.path}`;
  return `${base.replace(/\/$/, "")}${route.path}${q ? (route.path.includes("?") ? "&" : "?") + q : ""}`;
}

// ---------- 서버 확인(뜰 때까지 기다려요) ----------
{
  const until = Date.now() + opt.serverWait;
  let last = "";
  for (;;) {
    try {
      const res = await fetch(opt.base.replace(/#.*$/, ""), { signal: AbortSignal.timeout(5000) });
      if (res.ok) break;
      last = `HTTP ${res.status}`;
    } catch (e) { last = e.cause?.code || e.message; }
    if (Date.now() >= until) {
      console.error(`앱 주소에 닿지 않아요: ${opt.base} (${last}). 개발 서버가 떴는지, 포트가 맞는지 확인하세요(.vite.log).`);
      process.exit(2);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

// ---------- 검사(화면 안에서) ----------
function inspectInPage({ dark, a11y, toast }) {
  const vw = window.innerWidth;
  const visible = (el) => !!el.offsetParent || getComputedStyle(el).position === "fixed";
  const label = (e) => {
    const one = (x) => `${x.tagName.toLowerCase()}${x.id ? "#" + x.id : ""}${typeof x.className === "string" && x.className.trim() ? "." + x.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
    return e.parentElement && e.parentElement !== document.body ? `${one(e.parentElement)}>${one(e)}` : one(e);
  };
  // 이 요소가 화면 폭 안에 있는 스크롤·잘림 상자(overflow-x ≠ visible) 안에서 잘리면 넘침의 범인이 아니에요.
  // position:absolute 요소는 '기준 상자'(가장 가까운 position ≠ static 조상)가 그 상자 밖이면 잘리지 않고 빠져나가요(.sr-only 사례).
  const clipped = (e) => {
    let needCb = getComputedStyle(e).position === "absolute";
    for (let a = e.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (needCb) {
        if (cs.position === "static" && cs.transform === "none" && cs.contain === "none") continue;
        needCb = false;
      }
      if (cs.overflowX !== "visible" && a.getBoundingClientRect().right <= vw + 1) return true;
      if (cs.position === "fixed") return true;
      if (cs.position === "absolute") needCb = true;
    }
    return false;
  };
  const wideAll = [...document.querySelectorAll("body *")]
    .filter((e) => e.getBoundingClientRect().right > vw + 1 && getComputedStyle(e).position !== "fixed" && visible(e));
  const out = {
    overflow: document.documentElement.scrollWidth > vw,
    wide: wideAll.slice(0, 5).map(label),
    culprits: wideAll.filter((e) => !clipped(e)).slice(0, 5).map((e) => `${label(e)}(${getComputedStyle(e).position === "absolute" ? "absolute, " : ""}right ${Math.round(e.getBoundingClientRect().right)})`),
    h1: document.querySelectorAll("h1").length,
    dark: [...document.querySelectorAll(dark)].filter(visible).length,
    scrollHeight: document.documentElement.scrollHeight,
    title: document.querySelector("h1")?.textContent?.trim().slice(0, 60) || "",
    covered: [],
  };
  if (a11y) {
    out.unlabeled = [...document.querySelectorAll("input,select,textarea")]
      .filter((el) => el.type !== "hidden" && !(el.closest("[aria-hidden=true]") && el.tabIndex < 0)) // 보이는 버튼이 대신 여는 숨긴 파일 입력은 빼요
      .filter((el) => !(el.labels && el.labels.length) && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"))
      .map((el) => el.id || el.name || el.type);
    out.nameless = [...document.querySelectorAll("button,a[href]")]
      .filter((el) => !(el.textContent.trim() || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title"))).length;
  }
  // 토스트가 누를 것(버튼·링크·입력)을 가리는지
  for (const t of [...document.querySelectorAll(toast)].filter(visible)) {
    const tr = t.getBoundingClientRect();
    for (const el of document.querySelectorAll("button,a[href],[role=button],input,select,textarea")) {
      if (t.contains(el) || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      const x1 = Math.max(r.left, tr.left), x2 = Math.min(r.right, tr.right), y1 = Math.max(r.top, tr.top), y2 = Math.min(r.bottom, tr.bottom);
      if (x2 - x1 < 4 || y2 - y1 < 4) continue;
      const top = document.elementFromPoint((x1 + x2) / 2, (y1 + y2) / 2);
      if (top && t.contains(top)) out.covered.push(`${label(el)} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20)}"`);
    }
  }
  return out;
}

// ---------- 실행 ----------
const { chromium, from } = await loadPlaywright();
fs.mkdirSync(opt.out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const ignore = opt.ignore ? new RegExp(opt.ignore, "i") : null;
const results = [];
const started = Date.now();

async function openPage(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }); // 화면마다 새 상태(스토어가 메모리라서)
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const where = m.location()?.url || "";
    if (ignore && (ignore.test(m.text()) || ignore.test(where))) return;
    errors.push(`${m.text().slice(0, 200)}${where ? ` @ ${where.slice(0, 120)}` : ""}`);
  });
  return { ctx, page, errors };
}
async function load(page, url, errors) {
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    if (opt.ready) await page.waitForSelector(opt.ready, { timeout: 5000 }).catch(() => errors.push(`ready 선택자가 안 보여요: ${opt.ready}`));
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(opt.wait);
  } catch (e) { errors.push(`goto: ${e.message.split("\n")[0]}`); }
}
// 검사 + 캡처 + 결과 한 줄. full=false면 fold만 찍어요(흐름).
async function record({ page, errors, name, variant, vk, w, h, route, url, full, maxDark, expectH1, flow }) {
  const info = await page.evaluate(inspectInPage, { dark: opt.dark, a11y: opt.a11y, toast: opt.toast })
    .catch((e) => ({ overflow: false, wide: [], culprits: [], covered: [], h1: -1, dark: 0, scrollHeight: h, title: "", evalError: e.message }));
  const file = path.join(opt.out, `${name}.png`);
  if (full) {
    const clipH = Math.max(1, Math.min(info.scrollHeight || h, opt.maxHeight));
    await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width: w, height: clipH } })
      .catch((e) => errors.push(`screenshot: ${e.message.split("\n")[0]}`));
  }
  if (opt.fold || !full) await page.screenshot({ path: path.join(opt.out, `${name}.fold.png`) }).catch((e) => errors.push(`screenshot: ${e.message.split("\n")[0]}`));
  const problems = [];
  const warnings = [];
  if (info.overflow) {
    problems.push(info.culprits.length
      ? `OVERFLOW(범인: ${info.culprits.join(" ")})`
      : `OVERFLOW(${info.wide.join(" ") || "?"} — 스크롤 상자 밖 범인을 못 찾았어요. PLAYBOOK 8.1)`);
  }
  if (info.h1 !== expectH1) problems.push(`h1=${info.h1}`);
  if (info.dark > maxDark) problems.push(`dark=${info.dark}`);
  if (errors.length) problems.push(`errors=${errors.length}`);
  if (opt.a11y && (info.unlabeled?.length || info.nameless)) problems.push(`a11y(unlabeled=${info.unlabeled?.length || 0}, nameless=${info.nameless || 0})`);
  if (info.covered?.length) warnings.push(`TOAST_COVERS(${info.covered.slice(0, 4).join(", ")})`);
  results.push({ name, variant: variant.name, viewport: vk, width: w, height: h, path: route.path, url, flow: flow || undefined,
    file: full ? file : path.join(opt.out, `${name}.fold.png`), ...info, errors: [...errors], problems, warnings, ok: problems.length === 0 });
  errors.length = 0; // 흐름에서는 다음 shot까지 새로 생긴 오류만 세요
}

// 1) 경로
for (const variant of variants) for (const [vk, { w, h }] of Object.entries(VP)) for (const route of routes) {
  if (route.viewports && !route.viewports.includes(vk)) continue;
  if (route.variants && !route.variants.includes(variant.name)) continue;
  if (variant.viewports && !variant.viewports.includes(vk)) continue;
  if (variant.routes && !variant.routes.includes(route.path)) continue;
  const name = [variant.name, vk, slug(route.name || route.path)].filter(Boolean).join("-");
  if (opt.only && !name.includes(opt.only)) continue;
  const { ctx, page, errors } = await openPage(w, h);
  const url = urlFor(route, variant);
  await load(page, url, errors);
  await record({ page, errors, name, variant, vk, w, h, route, url, full: true, maxDark: route.maxDark ?? opt.maxDark, expectH1: route.h1 ?? 1 });
  await ctx.close();
}

// 2) 클릭 흐름
for (const variant of variants) for (const [vk, { w, h }] of Object.entries(VP)) for (const flow of flows) {
  if (flow.viewports && !flow.viewports.includes(vk)) continue;
  if (flow.variants && !flow.variants.includes(variant.name)) continue;
  if (variant.viewports && !variant.viewports.includes(vk)) continue;
  const prefix = [variant.name, vk, "flow", slug(flow.name)].filter(Boolean).join("-");
  if (opt.only && !prefix.includes(opt.only)) continue;
  const { ctx, page, errors } = await openPage(w, h);
  const route = { path: flow.route, query: flow.query };
  let url = urlFor(route, variant);
  await load(page, url, errors);
  const base = { page, errors, variant, vk, w, h, full: false, maxDark: flow.maxDark ?? opt.maxDark, expectH1: flow.h1 ?? 1, flow: flow.name };
  for (const [i, step] of flow.steps.entries()) {
    const [kind] = Object.keys(step).filter((k) => k !== "value");
    const arg = step[kind];
    try {
      const loc = () => page.locator(String(arg)).first();
      if (kind === "shot") { await record({ ...base, name: `${prefix}-${slug(String(arg))}`, route: { path: page.url().split("#")[1] || flow.route }, url: page.url() }); continue; }
      else if (kind === "click") await loc().click({ timeout: 5000 });
      else if (kind === "check") await loc().setChecked(true, { timeout: 5000 });
      else if (kind === "uncheck") await loc().setChecked(false, { timeout: 5000 });
      else if (kind === "fill") await loc().fill(String(step.value ?? ""), { timeout: 5000 });
      else if (kind === "press") await page.keyboard.press(String(arg));
      else if (kind === "goto") { url = urlFor({ path: String(arg), query: flow.query }, variant); await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(opt.wait); }
      else if (kind === "wait") await page.waitForTimeout(Number(arg) || 0);
      else if (kind === "waitFor") await loc().waitFor({ state: "visible", timeout: 5000 });
      else if (kind === "scroll") {
        if (typeof arg === "number") await page.evaluate((y) => window.scrollTo(0, y), arg);
        else await loc().scrollIntoViewIfNeeded({ timeout: 5000 });
      } else throw new Error(`모르는 단계예요: ${JSON.stringify(step)}`);
      if (kind !== "wait") await page.waitForTimeout(opt.stepWait);
    } catch (e) {
      errors.push(`step ${i + 1} ${kind} ${JSON.stringify(arg)}: ${e.message.split("\n")[0].slice(0, 160)}`);
      await record({ ...base, name: `${prefix}-failed`, route: { path: flow.route }, url: page.url() });
      break;
    }
  }
  await ctx.close();
}
await browser.close();

// ---------- 결과 ----------
const bad = results.filter((r) => !r.ok);
const warned = results.filter((r) => r.warnings.length);
const report = {
  base: opt.base, playwright: from, startedAt: new Date(started).toISOString(), ms: Date.now() - started,
  viewports: VP, total: results.length, failed: bad.length, warned: warned.length, results,
};
fs.writeFileSync(path.join(opt.out, "report.json"), JSON.stringify(report, null, 1));
console.log(`${results.length} shots, ${bad.length} with problems${warned.length ? `, ${warned.length} with warnings` : ""} → ${path.join(opt.out, "report.json")}`);
for (const r of bad) console.log(`  FAIL ${r.name}  ${r.problems.join("  ")}${r.errors.length ? "\n      " + r.errors.join("\n      ") : ""}`);
for (const r of warned) console.log(`  WARN ${r.name}  ${r.warnings.join("  ")}`);
if (!results.length) console.log("  찍은 화면이 없어요. --routes·--flow·--only·variants 조건을 확인하세요.");
process.exitCode = opt.fail && (bad.length || !results.length) ? 1 : 0;
