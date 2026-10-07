# 새 앱 시작 틀(starter)

업무사이트·인사 앱과 같은 틀(흰 사이드바 + 상단 바 + 옅은 회색 캔버스)의 빈 앱이에요. 데이터·화면은 없고, 바로 빌드되고 `ui-check`가 0 problems로 나와요. 인사 앱 `App.tsx`·`Shell.tsx`를 복사하면 그 앱의 데이터·화면을 불러와서 빌드가 안 되니, 새 앱은 여기서 시작해요.

## 들어 있는 것
| 파일 | 내용 |
|---|---|
| `package.json`, `package-lock.json` | 인사 앱과 같은 버전(React 18, react-router 7, Vite 8, TypeScript 5.9). 스크립트 `dev`·`build`·`typecheck`·`test` |
| `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore` | `@` → `src` 별칭, 해시 라우팅용 `base: "./"` |
| `src/main.tsx` | 스타일 4개를 `tokens → base → ui → shell` 순서로 불러와요 |
| `src/App.tsx` | 라우트: `/` 홈, 나머지는 404 |
| `src/shell/Shell.tsx` | 앱 틀. 바꿀 곳은 `COMPANY`, `ME`, `NAV`, `PAGE_TITLE` 네 개뿐이에요 |
| `src/pages/Home.tsx`, `NotFound.tsx` | 틀 확인용 홈(KPI 띠 + 8:4 격자)과 404 |
| `src/lib/text.test.ts` | `npm test` 자리(조사 테스트 1개) |

디자인 시스템 원본(`src/styles`, `src/ui`)과 `src/lib/text.ts`는 **여기 두지 않아요**. 사본이 셋이 되면 어긋나서, 쓸 때 원본에서 복사해요.

## 쓰는 법(저장소 루트에서)
```bash
APP=apps/<새앱>                       # 예: apps/training
mkdir -p $APP && cp -r docs/codex/starter/. $APP/ && rm $APP/README.md
mkdir -p $APP/src/styles $APP/src/ui
cp apps/hr/src/styles/{tokens,base,ui,shell}.css $APP/src/styles/
cp apps/hr/src/ui/{index,charts}.tsx $APP/src/ui/
cp apps/hr/src/lib/text.ts $APP/src/lib/
cd $APP && npm ci && npm run typecheck && npm test && npm run build
```
- `package.json`의 `name`과 `index.html`의 `<title>`을 이 앱 이름으로 바꿔요. `name`을 바꾸면 `npm install`을 한 번 돌려 `package-lock.json`도 맞춰요.
- 브랜드색은 `src/styles/tokens.css`의 `--brand` 4개만 바꿔요(흰 글자 대비 4.5:1 이상).
- `scripts/routes.<새앱>.json`을 만들어요: `{ "routes": ["/", { "path": "/nope", "viewports": ["d", "m"] }] }`에서 시작해 화면을 더할 때마다 경로를 넣어요.
- 확인: 개발 서버를 AGENTS.md 2장 방식으로 띄우고 `node ../../scripts/ui-check.mjs --base http://localhost:<포트>/ --routes @../../scripts/routes.<새앱>.json --fold --a11y` → `N shots, 0 with problems`.
- 다음은 `docs/codex/PROMPTS.md` (2) 기준 화면이에요. 홈 카드는 그때 통째로 바꿔요.

다른 저장소에서 쓸 때는 `apps/hr/src/...` 대신 옮겨 온 원본 위치에서 복사해요(`docs/codex/PORTING.md`).
