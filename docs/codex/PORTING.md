# 다른 저장소로 옮겨 쓰기

이 킷은 CRATA_AX 저장소(`apps/worksite-next`, `apps/hr`가 있는 곳) 기준으로 쓰여 있어요. **CRATA_AX 안에서 쓸 거면 이 문서는 필요 없어요**(새 앱은 `docs/codex/starter/`에서 시작해요). 새 저장소에서 같은 느낌으로 만들 때만 아래처럼 옮겨요.

핵심은 세 가지예요.
1. **디자인 시스템 원본 코드**(스타일 4개 + 부품 2개)를 그대로 가져가요. 규칙 문서만 가져가면 Codex가 비슷하게 '다시 그려서' 느낌이 흐려져요.
2. **본보기 화면 코드**를 같이 가져가요. Codex는 규칙보다 실제 파일을 보고 더 잘 따라 해요.
3. 문서의 **경로와 앱 이름만** 새 저장소에 맞게 고치고, 디자인 규칙(AGENTS.md 3장)·완료 기준(7장)·배운 것(8장)은 그대로 둬요.

원본은 CRATA_AX 저장소에서 가져와요. 저장소에 접근할 수 없으면 `crata-all.zip`을 풀어요(킷 + 두 앱 + 스타일 묶음이 들어 있어요. 저장소가 더 최신일 수 있어요).

---

## 1. 무엇을 어디로 옮기나

| 옮길 것 | 가져올 곳(CRATA_AX 기준) | 새 저장소 위치 |
|---|---|---|
| 킷 | `AGENTS.md`, `docs/codex/`, `docs/design/`, `.agents/skills/`, `scripts/{ui-check.mjs,package.json,package-lock.json}` | 같은 위치 |
| 첫 앱 틀 | `docs/codex/starter/` 통째로(`package-lock.json`, `.gitignore` 포함) | `apps/<앱>/` |
| 디자인 시스템 원본 | `apps/hr/src/styles/{tokens,base,ui,shell}.css`, `apps/hr/src/ui/{index,charts}.tsx` | `apps/<앱>/src/styles/`, `apps/<앱>/src/ui/` |
| 조사 붙이기 | `apps/hr/src/lib/text.ts`(`josa`) | `apps/<앱>/src/lib/text.ts` |
| 본보기 화면 코드 | `apps/worksite-next/src/{pages,shell}/`, `apps/hr/src/{pages,shell}/` 폴더 통째로 | `docs/design/examples/worksite/{pages,shell}/`, `docs/design/examples/hr/{pages,shell}/` |
| Orbix 레퍼런스 | 스타일 묶음 `references/` | **저장소 밖**(`$REFS`, PROMPTS.md 준비 2) |

복사 명령 예(CRATA_AX를 `$SRC`에 받아 두고, 새 저장소 루트에서):
```bash
SRC=~/CRATA_AX; APP=apps/<앱>
cp $SRC/AGENTS.md . && mkdir -p docs scripts .agents
cp -r $SRC/docs/codex $SRC/docs/design docs/ && cp -r $SRC/.agents/skills .agents/
cp $SRC/scripts/{ui-check.mjs,package.json,package-lock.json} scripts/
cat $SRC/.gitignore >> .gitignore            # 이미 있으면 덮어쓰지 않고 덧붙여요
mkdir -p $APP && cp -r $SRC/docs/codex/starter/. $APP/ && rm $APP/README.md
mkdir -p $APP/src/styles $APP/src/ui
cp $SRC/apps/hr/src/styles/{tokens,base,ui,shell}.css $APP/src/styles/
cp $SRC/apps/hr/src/ui/{index,charts}.tsx $APP/src/ui/ && cp $SRC/apps/hr/src/lib/text.ts $APP/src/lib/
for a in worksite:worksite-next hr:hr; do mkdir -p docs/design/examples/${a%%:*}
  cp -r $SRC/apps/${a#*:}/src/pages $SRC/apps/${a#*:}/src/shell docs/design/examples/${a%%:*}/; done
```
- `scripts/`의 다른 파일(`routes.hr.json`, `routes.worksite.json`, `flows/hr-position.example.json`, 리서치용 `build_research_appendix.py`)은 가져가지 않아요. 새 앱의 `scripts/routes.<앱>.json`을 만들어요(starter README).
- 본보기는 **실행하지 않는 읽기용**이에요. 앱 폴더 밖(`docs/design/examples/`)이라 빌드·타입 검사에 걸리지 않아요. 원래 앱의 데이터(`@/data/...`)를 불러오니 짜는 법만 봐요.
- 앱 틀은 starter를 써요. 인사 앱 `App.tsx`·`Shell.tsx`를 복사하면 그 앱의 데이터·화면을 불러와서 빌드가 안 돼요.
- 의존 패키지는 `react@18`, `react-dom@18`, `react-router@7`, `lucide-react`, `pretendard@1.3.9`뿐이에요(starter `package.json`). UI 라이브러리를 더하지 않아요.
- 브랜드색은 `tokens.css`의 `--brand` 4개 변수만 바꿔요(흰 글자 대비 4.5:1 이상).

## 2. AGENTS.md에서 고칠 곳

| 장 | 고칠 것 | 그대로 둘 것 |
|---|---|---|
| 0 | 프로젝트 한 줄. 지시 우선순위 문단의 seed 경로(새 앱의 예시 데이터 파일, 아직 없으면 "확인 필요") | "이미 승인한 디자인 시스템이 있어요" 문단, 우선순위 순서 |
| 1 폴더 지도 | 앱 경로, 디자인 시스템 원본은 `apps/<앱>/src/{styles,ui}` 하나, 본보기 `docs/design/examples/`, starter. 옛 앱 줄은 지워요. 이 저장소에 없는 `*` 문서 줄은 지우거나 새 근거 문서로 바꾸고, 하나도 안 남으면 `*` 각주도 지워요 | 레퍼런스 이미지는 저장소 밖이라는 문단 |
| 2 명령 | 앱 폴더, 포트(사람용·Codex용), `npm test` 대상, routes 파일 이름, `build:public` 줄(없으면 지워요) | 서버 띄우기·끄기(`.vite.pid`) 방식, `pkill -f` 금지, Playwright 설치 줄 |
| 3 디자인 규칙 | 기준 파일 이름(`Position.tsx` 등)은 그대로 두고 본보기 위치만 1장에 적어요 | **규칙 문장 전부** |
| 4 순서 | 3번 기준 화면 경로. 처음에는 `docs/design/examples/worksite/pages/Home.tsx`, 새 앱의 기준 화면을 만든 뒤에는 그 파일 | 브리프 먼저, 데이터·로직 먼저, 공통 파일 규칙 |
| 5 내용 | TODAY, `josa` 위치(`apps/<앱>/src/lib/text.ts`), 실제 고객 이름을 두는 곳, 회사·역할 확인 방법. CRATA 고유 내용(ARA, 사업 > 프로젝트 > 파트)은 새 도메인 말로 | "오늘 내가 눌러야 할 것", AI는 추천까지·결정은 사람, KPI 다섯 칸, 문구 규칙 |
| 6 법·개인정보 | 도메인에 맞게 바꿔요. 채용·CRATA·ARA를 안 다루면 그 줄은 지워요 | "누가 볼 수 있고 누가 못 보는지" 한 줄 |
| 7 완료 기준 | 명령 이름만(`npm test` 대상, `build:public`) | 나머지 전부 |
| 8 배운 것 | 없음 | 전부 |

고친 뒤 `wc -c AGENTS.md`로 크기를 봐요. 18KB 아래가 좋아요(Codex는 홈의 `~/.codex/AGENTS.md`까지 합쳐 기본 32KiB까지 읽고, 넘으면 뒤가 잘려요).

## 3. 다른 파일에서 고칠 곳

### 3.1 경로 바꾸기(본보기·원본을 가리키는 곳만)
대상: `docs/codex/{PLAYBOOK,PROMPTS,CHECKLIST,SCREEN_BRIEF_TEMPLATE}.md`, `docs/codex/briefs/README.md`, `docs/design/STYLE_GUIDE.md`, `.agents/skills/crata-screen/SKILL.md`, `scripts/ui-check.mjs` 머리 주석.

| 지금 경로 | 바꿀 경로 |
|---|---|
| `apps/worksite-next/src/pages/`, `apps/worksite-next/src/shell/` | `docs/design/examples/worksite/pages/`, `…/worksite/shell/` |
| `apps/hr/src/pages/`, `apps/hr/src/shell/` | `docs/design/examples/hr/pages/`, `…/hr/shell/` |
| `apps/worksite-next/src/{styles,ui}/`, `apps/hr/src/{styles,ui}/` | `apps/<앱>/src/{styles,ui}/` |
| `apps/hr/src/lib/text.ts` | `apps/<앱>/src/lib/text.ts` |

**바꾸지 말 곳:**
- `SCREEN_BRIEF_TEMPLATE.md` 2장 '앱·파일' 줄은 **새로 만들 화면 위치**라서 본보기 폴더가 아니라 `apps/<앱>/src/pages/`로 바꿔요.
- `docs/codex/starter/README.md`는 starter를 다시 쓸 때의 복사 원본을 적은 곳이에요. `apps/hr/src/...`를 `apps/<앱>/src/...`로 바꿔요.

**손으로 고칠 곳:** 원본이 하나가 되면서 '원본 + 복사본' 설명이 틀려져요.
- `docs/design/STYLE_GUIDE.md` 맨 위 '저장소 사본이에요' 문단과 9장 첫 문단: "원본은 `apps/<앱>/src/{styles,ui}` 하나예요"로.
- `docs/codex/PLAYBOOK.md` 2.4의 "두 앱의 `ui.css`…" 문장: 앱이 하나면 지우고, 둘 이상이면 같은 규칙(원본 하나, 나머지는 복사본)으로.

### 3.2 앱 이름·포트·데이터를 가리키는 곳
아래로 찾아서 새 앱 값으로 바꾸거나, 해당 없으면 지워요.
```bash
grep -rnE "routes\.(hr|worksite)|hr-position|431[1-5]|430[1-5]|build:public|identity\.ts|seed\.ts|\{tr,crata\}|tenant=|예시정밀산업" \
  AGENTS.md docs/codex docs/design .agents scripts/ui-check.mjs --exclude=PORTING.md --exclude-dir=_examples --exclude-dir=examples --exclude-dir=starter
```
- 포트는 AGENTS.md 2장에 정한 새 값으로(사람용 하나, Codex용 범위 하나).
- `hr-position.example.json`을 가리키는 곳(AGENTS 2장, PLAYBOOK 2.11, SKILL.md)은 새 앱의 흐름 예시를 만들면 그 이름으로, 아직 없으면 "흐름 예시는 PLAYBOOK 2.11의 형식"으로 바꿔요.
- `PROMPTS.md`: 준비 3(Cloud Install script, `codex --cd` 예), (1)의 '맥락' 줄(원본 위치 → `apps/<앱>/src`), (5)의 공개 빌드 이름 검사(실제 고객 이름을 따로 두는 앱이 있을 때만 남겨요).
- `.agents/skills/crata-screen/SKILL.md` 머리의 `description`: 앱 이름을 새 앱으로.

### 3.3 그대로 둘 것
- `docs/design/screenshots/`: 새 앱의 시각 기준이에요. 새 앱 화면이 완성되면 같은 이름 규칙(`<이름>.png` + `<이름>.fold.png`)으로 더해요.
- `docs/codex/briefs/_examples/`: 브리프를 얼마나 구체적으로 쓰는지 보는 견본(옛 경로가 남아 있어도 돼요).

## 4. Codex에게 옮기는 일을 맡기는 프롬프트
1장 복사를 끝낸 뒤 저장소 루트에서 `codex`를 열고 붙여 넣어요.
```
/plan
이 저장소에 CRATA 디자인 킷을 옮겨 왔어. docs/codex/PORTING.md를 읽고 2장·3장대로 고쳐 줘.
- 이 저장소의 앱: apps/<앱>, 스택: <예: React 18 + Vite>, 사람용 포트 <예: 4320>, Codex용 포트 <예: 4321~4325>
- 이 저장소에 없는 문서를 가리키는 줄은 지우거나 "확인 필요"로 바꿔
- AGENTS.md 3장·7장·8장의 규칙 문장은 바꾸지 마
- 끝나면 PORTING.md 6장의 확인을 모두 돌리고 결과를 보여 줘
커밋하지 마.
```
그다음 PROMPTS.md (0)으로 규칙을 제대로 읽었는지 확인하고, (2) 기준 화면으로 가요. 앱 틀은 1장에서 이미 만들었으니 (1)은 건너뛰어요.

## 5. 스택이 다를 때
- **React지만 Vite가 아닐 때(Next.js 등):** CSS 4개를 전역으로 불러와요(Next.js는 `app/layout.tsx`에서 `tokens → base → ui → shell` 순서). 부품 TSX는 그대로 쓰고, 상태를 쓰는 부품 파일 맨 위에 `"use client"`를 붙여요. 해시 라우터 대신 그 프레임워크의 라우팅을 써요. starter의 `Shell.tsx`는 레이아웃 컴포넌트로 옮겨요.
- **Vue·Svelte 등:** CSS 4개와 클래스 이름을 그대로 써요. 부품은 `src/ui/index.tsx`와 **같은 마크업·클래스 구조**로 옮기라고 시켜요. 차트는 `charts.tsx`의 SVG 계산(단조 곡선, 캡슐 막대, 도넛 간격)을 옮겨요. 차트 라이브러리로 바꾸면 느낌이 깨져요.
- **Tailwind 프로젝트:** 토큰은 CSS 변수로 두고, Tailwind 설정에서 `var(--…)`로 불러 써요. Tailwind 기본 팔레트(blue-500 등)는 쓰지 않아요.
- **이미 UI 라이브러리(antd, MUI, shadcn)가 있는 프로젝트:** 섞으면 느낌이 깨져요. 새 화면은 이 디자인 시스템 부품만 쓰고, 옛 화면과의 경계를 AGENTS.md 1장에 적어요(CRATA_AX의 `apps/worksite`처럼 "참고하지 않음").

## 6. 옮긴 뒤 확인
1. 파일: `ls AGENTS.md scripts/ui-check.mjs scripts/package.json scripts/package-lock.json .agents/skills/crata-screen/SKILL.md docs/design/examples apps/<앱>/package-lock.json`
2. 앱: `cd apps/<앱> && npm ci && npm run typecheck && npm test && npm run build`
3. 검사 도구: 저장소 루트에서 `cd scripts && npm ci && npx playwright install chromium`
4. 화면: AGENTS.md 2장 방식으로 서버를 띄우고 `node ../../scripts/ui-check.mjs --base http://localhost:<포트>/ --routes @../../scripts/routes.<앱>.json --fold --a11y` → `N shots, 0 with problems`. 서버를 꺼요.
5. 남은 옛 경로(PORTING·_examples·examples·starter는 일부러 빼요):
   ```bash
   grep -rn "apps/worksite\|apps/hr" AGENTS.md docs/codex docs/design .agents scripts/ui-check.mjs \
     --exclude=PORTING.md --exclude-dir=_examples --exclude-dir=examples --exclude-dir=starter
   ```
   남아도 되는 건 **두 앱을 어떻게 만들었는지 설명하는 문장**뿐이에요(PLAYBOOK 첫 문단·1장·10장 제목, STYLE_GUIDE 첫 문단, PROMPTS (7)의 "옛 앱에서 가져온 구조" 점검 줄). "읽어요·복사해요·열어요·실행해요"처럼 **지시하는 문장**에 남아 있으면 고쳐요. AGENTS.md에는 하나도 남지 않아야 해요. 3.2의 grep도 다시 돌려서 남은 줄이 새 앱 값인지 봐요.
6. Codex PROMPTS.md (0): 디자인 시스템 원본 경로와 기준 화면을 새 저장소 기준으로 말하면 돼요.
