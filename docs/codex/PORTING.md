# 다른 저장소로 옮겨 쓰기

이 킷은 CRATA_AX 저장소(`apps/worksite-next`, `apps/hr`가 있는 곳) 기준으로 쓰여 있어요. **CRATA_AX 안에서 쓸 거면 이 문서는 필요 없어요.** 새 저장소에서 같은 느낌으로 만들 때만 아래처럼 옮겨요.

핵심은 세 가지예요.
1. **디자인 시스템 원본 코드**(스타일 4개 + 부품 2개)를 그대로 가져가요. 규칙 문서만 가져가면 Codex가 비슷하게 '다시 그려서' 느낌이 흐려져요.
2. **본보기 화면 코드**를 같이 가져가요. Codex는 규칙보다 실제 파일을 보고 더 잘 따라 해요.
3. `AGENTS.md`의 **경로만** 새 저장소에 맞게 고치고, 디자인 규칙(3장)·완료 기준(7장)·배운 것(8장)은 그대로 둬요.

---

## 1. 무엇을 어디로 옮기나

`crata-all.zip`을 풀면 아래 원본이 다 있어요(`apps/`, `style/`).

| 옮길 것 | 가져올 곳 | 새 저장소 위치 |
|---|---|---|
| 디자인 시스템 원본 | `apps/hr/src/styles/{tokens,base,ui,shell}.css`, `apps/hr/src/ui/{index,charts}.tsx` | `<앱>/src/styles/`, `<앱>/src/ui/` |
| 앱 틀 | `apps/hr/`의 `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/shell/Shell.tsx` | `<앱>/` (메뉴·회사 카드만 바꿔요) |
| 조사 붙이기 | `apps/hr/src/lib/text.ts`(`josa`) | `<앱>/src/lib/text.ts` |
| 본보기 화면 코드 | `apps/worksite-next/src/pages/`, `apps/hr/src/pages/` 폴더 통째로 | `docs/design/examples/worksite/pages/`, `docs/design/examples/hr/pages/` |
| 킷 | `AGENTS.md`, `docs/codex/`, `docs/design/`, `scripts/`, `.agents/skills/`, `.gitignore` | 저장소 루트 그대로 |
| Orbix 레퍼런스 | `style/references/` | **저장소 밖**(`$REFS`, PROMPTS.md 준비 2) |

- 본보기 화면은 **실행하지 않는 읽기용**이에요. 앱 폴더 밖(`docs/design/examples/`)에 두면 빌드·타입 검사에 걸리지 않아요. 원래 앱의 데이터(`@/data/...`)를 불러오니 그대로 쓰지 말고 짜는 법만 봐요.
- 앱 틀은 `apps/hr`를 권해요. 회사 하나, 역할 전환 없이 단순해요. 회사·사람을 바꿔 보는 기능이 필요하면 `apps/worksite-next`의 셸과 `src/data/store.tsx`(주소의 `?tenant=`·`&as=` 읽기)를 봐요.
- 의존 패키지는 `react@18`, `react-dom@18`, `react-router@7`, `lucide-react`, `pretendard@1.3.9`뿐이에요. UI 라이브러리를 더하지 않아요.
- 브랜드색은 `tokens.css`의 `--brand` 4개 변수만 바꿔요(흰 글자 대비 4.5:1 이상).

## 2. AGENTS.md에서 고칠 곳

| 장 | 고칠 것 | 그대로 둘 것 |
|---|---|---|
| 0 | 프로젝트 한 줄 | "이미 승인한 디자인 시스템이 있어요" 문단, 지시 우선순위 |
| 1 폴더 지도 | 앱 경로, 디자인 시스템 원본(`<앱>/src/styles`, `src/ui`), 본보기(`docs/design/examples/`). 옛 앱 줄과 이 저장소에 없는 `*` 문서 줄은 지우거나 새 근거 문서로 바꿔요 | 레퍼런스 이미지는 저장소 밖이라는 문단 |
| 2 명령 | 앱 폴더, 포트, `npm test` 유무, routes 파일 이름 | 서버 띄우기·끄기(`.vite.pid`) 방식, `pkill -f` 금지 |
| 3 디자인 규칙 | 없음 | **전부** |
| 4 순서 | 3번 기준 화면 경로. 처음에는 `docs/design/examples/worksite/pages/Home.tsx`, 새 앱의 기준 화면을 만든 뒤에는 그 파일 | 브리프 먼저, 데이터·로직 먼저, 공통 파일 규칙 |
| 5 내용 | seed 경로, TODAY, `josa` 위치, 회사·역할 확인 방법. CRATA 고유 내용(ARA, 사업 > 프로젝트 > 파트)은 새 도메인 말로 | "오늘 내가 눌러야 할 것", AI는 추천까지·결정은 사람, KPI 다섯 칸, 문구 규칙 |
| 6 법·개인정보 | 도메인에 맞게 바꿔요. 채용·CRATA·ARA를 안 다루면 그 줄은 지워요 | "누가 볼 수 있고 누가 못 보는지" 한 줄 |
| 7 완료 기준 | 명령 이름만 | 나머지 전부 |
| 8 배운 것 | 없음 | 전부 |

고친 뒤 `wc -c AGENTS.md`로 크기를 봐요. 16KB 안팎이 좋아요(Codex는 기본 32KiB까지 읽고, 넘으면 뒤가 잘려요).

## 3. 다른 파일에서 고칠 곳
- `docs/codex/PLAYBOOK.md`, `docs/codex/SCREEN_BRIEF_TEMPLATE.md`, `.agents/skills/crata-screen/SKILL.md`, `docs/design/STYLE_GUIDE.md`: 본보기 경로를 바꿔요.
  - `apps/worksite-next/src/pages/` → `docs/design/examples/worksite/pages/`
  - `apps/hr/src/pages/` → `docs/design/examples/hr/pages/`
  - `apps/worksite-next/src/{styles,ui,shell}/`, `apps/hr/src/{styles,ui,shell}/` → `<앱>/src/{styles,ui,shell}/`
- `scripts/routes.*.json`: 새 앱 경로로 새로 만들어요(모든 경로 + 없는 경로 `/nope`). `scripts/flows/`의 예시는 지우거나 새 흐름으로 바꿔요.
- `docs/design/screenshots/`: 그대로 둬요. 새 앱의 시각 기준이에요. 새 앱 화면이 완성되면 같은 이름 규칙(`<이름>.png` + `<이름>.fold.png`)으로 더해요.
- `docs/codex/briefs/_examples/`: 그대로 둬요(브리프를 얼마나 구체적으로 쓰는지 보는 견본).

## 4. Codex에게 옮기는 일을 맡기는 프롬프트
킷과 원본을 1장 표대로 복사해 둔 뒤 저장소 루트에서 `codex`를 열고 붙여 넣어요.
```
/plan
이 저장소에 CRATA 디자인 킷을 옮겨 왔어. docs/codex/PORTING.md를 읽고 2장·3장대로 경로를 이 저장소에 맞게 고쳐 줘.
- 이 저장소의 앱: <경로>, 스택: <예: React 18 + Vite>, 포트: <예: 4321>
- 이 저장소에 없는 문서를 가리키는 줄은 지우거나 "확인 필요"로 바꿔
- AGENTS.md 3장·7장·8장의 규칙 문장은 바꾸지 마
- 끝나면 grep -rn "apps/worksite-next\|apps/hr" AGENTS.md docs .agents 결과와 wc -c AGENTS.md 를 보여 줘
커밋하지 마.
```
그다음 PROMPTS.md (0)으로 규칙을 제대로 읽었는지 확인하고, (1) 앱 틀 → (2) 기준 화면 순서로 가요.

## 5. 스택이 다를 때
- **React지만 Vite가 아닐 때(Next.js 등):** CSS 4개를 전역으로 불러와요(Next.js는 `app/layout.tsx`에서 `tokens → base → ui → shell` 순서). 부품 TSX는 그대로 쓰고, 상태를 쓰는 부품 파일 맨 위에 `"use client"`를 붙여요. 해시 라우터 대신 그 프레임워크의 라우팅을 써요.
- **Vue·Svelte 등:** CSS 4개와 클래스 이름을 그대로 써요. 부품은 `src/ui/index.tsx`와 **같은 마크업·클래스 구조**로 옮기라고 시켜요. 차트는 `charts.tsx`의 SVG 계산(단조 곡선, 캡슐 막대, 도넛 간격)을 옮겨요. 차트 라이브러리로 바꾸면 느낌이 깨져요.
- **Tailwind 프로젝트:** 토큰은 CSS 변수로 두고, Tailwind 설정에서 `var(--…)`로 불러 써요. Tailwind 기본 팔레트(blue-500 등)는 쓰지 않아요.
- **이미 UI 라이브러리(antd, MUI, shadcn)가 있는 프로젝트:** 섞으면 느낌이 깨져요. 새 화면은 이 디자인 시스템 부품만 쓰고, 옛 화면과의 경계를 AGENTS.md 1장에 적어요(이 저장소의 `apps/worksite`처럼 "참고하지 않음").

## 6. 옮긴 뒤 확인
1. 파일: `ls AGENTS.md scripts/ui-check.mjs scripts/package.json .agents/skills/crata-screen/SKILL.md docs/design/examples`
2. 검사 도구: `cd scripts && npm ci && npx playwright install chromium`
3. 남은 옛 경로: `grep -rn "apps/worksite-next\|apps/hr" AGENTS.md docs/codex .agents`가 본보기 안내 말고는 비어야 해요.
4. Codex PROMPTS.md (0): 디자인 시스템 원본 경로와 기준 화면을 새 저장소 기준으로 말하면 돼요.
