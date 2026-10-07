---
name: crata-screen
description: CRATA 화면 만들기·다듬기(new screen, page, UI, dashboard, 화면, 페이지, 대시보드, 디자인 맞추기). apps/worksite-next나 apps/hr, 또는 같은 디자인 시스템을 쓰는 새 앱에서 화면 하나를 브리프대로 만들고, 캡처를 레퍼런스와 비교해 2번 이상 다듬은 뒤 ui-check로 끝낼 때 써요.
---

# CRATA 화면 하나 만들기

이 저장소에는 대표님이 승인한 디자인 시스템이 있어요. 새 콘셉트, ImageGen 시안, 그라데이션, 새 글꼴, UI 라이브러리는 쓰지 않아요. **모양은 그대로, 구성은 용도에서** 정해요. 기준 화면과 레퍼런스는 베낄 배치가 아니라 어휘와 품질 기준이에요. 지시가 부딪히면 사용자 요청 > 브리프 > `AGENTS.md` > PLAYBOOK 순서예요. 숫자·사람은 seed가 맞아요.

## 순서
1. **읽기와 브리프**
   - `AGENTS.md` 전체, `docs/codex/PLAYBOOK.md` 5.0(구성), 4장(모양, 4.0 복사할 파일 표 포함), 5.1(출발 레시피)
   - 브리프 `docs/codex/briefs/<page>.md`. 없으면 `docs/codex/SCREEN_BRIEF_TEMPLATE.md` 1장 틀로 초안을 써요. 2장(채운 예)은 형식만 보고 숫자는 seed에서 다시 계산해요.
   - 사람이 대화 중이면 초안을 보여 주고 확인받은 뒤 진행해요. **무인 실행**이면 `docs/codex/briefs/<page>.md`(또는 과제가 정한 위치)에 쓰고 바로 진행해요. 확인받지 못한 판단은 보고의 '승인 전 가정'에 적어요.
2. **구성 정하기와 기준 화면 읽기**
   - 브리프의 '구성'(질문 → 요소 → 자리)을 확인해요. 비어 있으면 PLAYBOOK 5.0대로 채워요: 질문 3~5개를 중요한 순서로, 질문마다 요소, 1번 질문의 답과 행동은 첫 화면 왼쪽 위.
   - 구성안 2개를 텍스트 와이어프레임으로 쓰고 하나를 골라요. 사람이 대화 중이면 고르게 하고, 무인 실행이면 고른 이유를 '승인 전 가정'에 적어요.
   - 그다음 가까운 출발 레시피(A~H)가 있으면 고르고(없으면 레시피 없이 짜요), PLAYBOOK 4.0 표에서 쓸 부품의 기준 파일(CSS·마크업)을 열어 둬요. 기준 화면(업무사이트 `apps/worksite-next/src/pages/Home.tsx`, 인사 앱 `apps/hr/src/pages/Moves.tsx`)은 밀도·문법을 보려고 읽어요. 배치는 따라 하지 않아요.
3. **데이터·로직 먼저**
   - 화면이 쓸 데이터와 계산 함수가 이미 있으면 그대로 써요.
   - 오케스트레이터가 있는 작업이면 공통 파일(`src/ui`, `src/styles`, `src/shell`, `src/data`, `src/lib`, `App.tsx`)을 바꾸지 않아요. 필요한 것이 없으면 멈추고 보고해요.
   - **혼자 작업(오케스트레이터 없음)**이면 이것만 허용돼요: `App.tsx` 라우트 1줄, `src/shell/Shell.tsx` 메뉴 1줄 + `PAGE_TITLE` 1줄(하단 탭은 그대로), 새 파일 `src/lib/<page>.ts`(계산 함수 + 이 화면만 쓰는 예시 데이터)와 `src/lib/<page>.test.ts`(`node:test`, 인사 앱만 `npm test`가 돌려요. 업무사이트는 test 스크립트가 없어서 test 파일은 만들지 말고 typecheck로 확인하고 보고해요). 기존 공통 코드는 고치지 않아요. 스토어에 없는 상태(예약 등)는 화면 state로 두고, store 함수로 올릴 것을 보고에 적어요.
4. **화면 만들기**
   - `src/pages/<Page>.tsx`, `.css`(+ `.parts.tsx`)만 만들어요.
   - 첫 줄 주석에 레퍼런스 파일 이름과 가져온 것을 적어요.
   - `src/ui` 부품, `charts.tsx`, 토큰만 써요. 띠·묶음 표·모바일 표·최소 눈금 막대는 기준 CSS를 복사해 접두사만 바꿔요.
5. **검사**(앱 폴더에서. 포트는 hr 4312~4315, worksite 4302~4305 중 하나)
   - `npm run typecheck`, `npm run build`, `npm test`(hr). worksite-next는 `npm run build:public`도
   - 서버 켜기: `setsid sh -c 'echo $$ > .vite.pid; exec node node_modules/vite/bin/vite.js --port 4314 --strictPort' > .vite.log 2>&1 < /dev/null &`
   - `node ../../scripts/ui-check.mjs --base http://localhost:4314/ --routes /<내 경로>,<관련 경로> --fold --a11y --out .ui-check/<Page>` (명령 끝에 다른 글자를 붙이지 않아요)
   - 클릭 뒤 상태: 흐름 파일을 `.ui-check/flows/<page>.json`에 쓰고 `--flow @.ui-check/flows/<page>.json --viewports d:1440x1000,m:390x844`로 찍어요(예: `scripts/flows/hr-position.example.json`).
6. **비교 루프(2번 이상)**
   - `.ui-check/<Page>/*.fold.png`, 브리프의 레퍼런스(사용자가 준 경로), `docs/design/screenshots/`에서 같은 부품(표·띠·KPI·서랍)이 들어간 완성 화면(같은 크기인 `<이름>.fold.png`)을 `view_image`로 나란히 봐요. 그 부품의 모양만 맞추고, 배치가 비슷한 화면을 고르지 않아요.
   - 다른 점 목록을 PLAYBOOK 8.4 형식(kind 모양/구성)으로 쓰고, high부터 고쳐요. 모양 차이는 고치고, 용도 때문인 구성 차이는 keep 이유를 적어요. 다시 찍어서 전후를 비교해요.
   - PLAYBOOK 8.3의 '구성' 질문(가~라)도 확인해요. 답하지 않는 카드가 있으면 빼요.
7. **마무리**
   - `docs/codex/CHECKLIST.md`를 확인해요. 셸을 바꿨으면 `--routes @../../scripts/routes.hr.json`(또는 worksite)로 전 경로를 다시 돌려요.
   - 서버 끄기: `kill -- -"$(cat .vite.pid)" 2>/dev/null || kill "$(cat .vite.pid)"; rm -f .vite.pid`. `pkill -f`·`pgrep -f`는 쓰지 않아요(내 셸까지 죽어요).
   - 보고: 고른 구성안과 이유, 바꾼 파일(공통 줄 포함), ui-check 결과 줄, fold 캡처 경로, 남은 다른 점, 승인 전 가정, **공통 파일에서 고칠 것**

## 지킬 것
- 짙은 버튼은 한 화면에 많아야 하나(없어도 돼요), h1은 하나. 같은 종류 여러 건의 일괄 동작이면 일괄 띠 오른쪽 끝, 화면 전체 동작이면 머리, 휴대폰 현장 화면이면 하단 고정 띠(`.rp-submit`)에 둬요. 서로 다른 결정 몇 건은 줄마다 버튼이에요.
- 숫자는 굵기 500에 `.num`. Delta 자리에는 비교값이나 뜻 있는 칩만, '예시'는 note로.
- 상태는 점 + 글자 칩. 사람 수 비교는 '10명 · 최소 9'.
- AI·규칙은 추천·제출까지만. 끝내는 버튼은 사람 화면에만 있어요.
- 다른 화면에 없는 사람·이동·건수를 이 화면에서만 지어내지 않아요.
- 동의하지 않은 사람의 CRATA 값은 어디에도 보이지 않아요.
- 해요체로 쓰고, 조사는 `josa()`로 붙여요. 날짜는 TODAY 기준이고, 예시 데이터라는 표시를 넣어요.
- Orbix 이미지는 보기만 해요. 저장소에 복사하지 않아요.
- 새 npm 패키지와 커밋은 사용자가 요청할 때만 해요.
