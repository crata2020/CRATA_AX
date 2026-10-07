# Codex에 줄 프롬프트 모음

이 문서는 사람이 읽는 문서예요. 상황에 맞는 프롬프트를 골라 복사해서 Codex에 붙여 넣으세요. 오래 지킬 규칙은 이미 `AGENTS.md`에 있어서 Codex가 자동으로 읽어요. 그래서 프롬프트에는 **이번 일의 목표, 첨부한 이미지의 뜻, 완료 조건**만 적으면 돼요.

- `<…>` 칸은 붙여 넣기 전에 채워요.
- 첫 줄이 `/plan`인 프롬프트는 계획부터 세우라는 뜻이에요. 붙여 넣었을 때 명령으로 잡히지 않으면 `/plan`만 먼저 보내고, 나머지를 다음 메시지로 붙여 넣어요.

| 번호 | 언제 |
|---|---|
| 준비 | 처음 한 번 |
| (0) | 새 대화를 열 때마다, 규칙을 제대로 읽었는지 확인 |
| (1) | 새 앱을 시작할 때: 시작 틀(`docs/codex/starter/`) 복사·셋업 |
| (2) | 새 앱의 기준 화면 1개 |
| (3) | 화면 1개(브리프를 채워서) |
| (4) | 캡처를 보고 다듬기 |
| (5) | 전 화면 검사·마무리 |
| (6) | 도메인 로직이 있는 앱(인사 앱처럼) |
| (7) | 느낌(모양)이 어긋났을 때 되돌리기 |
| (8) | 구성이 용도와 안 맞을 때: 요소·배치 다시 짜기 |

---

## 준비(한 번만)

### 1. 킷을 저장소에 넣어요
`AGENTS.md`, `docs/codex/`(`briefs/` 포함), `docs/design/`, `scripts/`(`ui-check.mjs`, `package.json`, `package-lock.json`, `routes.*.json`, `flows/`), `.agents/skills/`, `.gitignore`를 **통째로** 저장소 루트에 복사하고 커밋해요. 이 저장소(CRATA_AX)에는 이미 들어 있어요. **다른 저장소**에서 쓰려면 `docs/codex/PORTING.md`를 따라요. 루트에 `.gitignore`가 이미 있으면 덮어쓰지 말고 킷의 줄만 덧붙여요. 커밋해야 다른 PC나 Cloud에서도 Codex가 읽어요. `ui-check.mjs`만 복사하면 경로 파일과 스킬이 없어서 Codex가 손으로 메워야 해요(킷 시험에서 실제로 그랬어요).

빠졌는지 확인: `ls AGENTS.md scripts/ui-check.mjs scripts/package.json scripts/package-lock.json scripts/routes.hr.json scripts/flows .agents/skills/crata-screen/SKILL.md docs/codex/briefs docs/codex/starter`

### 2. Orbix 레퍼런스는 저장소 밖에 둬요
스타일 묶음 zip(`crata-orbix-style-all.zip`, 또는 나눠 받은 `crata-orbix-style.zip` + `-refs-1` + `-refs-2`)을 저장소 밖, 예를 들어 홈 폴더에서 풀어요. 나눠 받은 zip도 같은 자리에 풀면 `~/crata-orbix-style/` 한 폴더로 모여요. 레퍼런스는 아래 두 곳에 있어요.
- `~/crata-orbix-style/references/instagram-posts/post_1.jpg` ~ `post_6.jpg`
- `~/crata-orbix-style/references/orbix-refs/*.jpg`(40장)

전체 묶음(`crata-all.zip`)을 받았다면 `~/crata-all/style/references/`예요. 제3자 저작물이라 저장소에 넣지 않아요. 아래 프롬프트에서는 이 위치를 `$REFS`라고 불러요. 셸에서 `export REFS=~/crata-orbix-style/references`를 해 두면 `-i` 경로가 짧아져요. 확인: `ls $REFS/orbix-refs | wc -l`이 40이면 돼요.

### 3. Codex를 시작해요
- 저장소 루트에서 `codex`를 실행해요. 폴더를 신뢰하겠느냐고 물으면 **신뢰(trusted)**를 골라요. 신뢰하지 않으면 `AGENTS.md`를 읽지 않아요.
- 앱 하나만 작업할 때도 저장소 루트에서 시작하는 게 편해요. `codex --cd apps/hr`처럼 앱 폴더에서 시작해도 루트 `AGENTS.md`와 스킬은 읽히지만, 브리프(`docs/codex/briefs/`)가 작업 폴더 밖이 돼서 쓸 때마다 승인을 물을 수 있어요.
- **로컬 CLI나 ChatGPT 데스크톱 앱을 권해요.**
  - 레퍼런스 이미지가 내 PC에 있어요.
  - 개발 서버, Playwright, `view_image`가 다 돼요.
  - 데스크톱 앱은 내장 브라우저로 화면을 직접 열어 볼 수도 있어요.
- Cloud에서는 Orbix 이미지를 볼 수 없고 브라우저 사용도 아직 안 돼요. Cloud를 꼭 쓰려면 이렇게 설정해요.
  - 환경 Install script: `cd apps/hr && npm ci && cd ../../scripts && npm ci && npx playwright install --with-deps chromium`(업무사이트는 `apps/worksite-next`)
  - 허용 도메인: Package managers 프리셋 + `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`
  - Node 22 이상
  - Cloud에서 캡처를 찍어 `view_image`로 보는 것까지 되는지는 아직 확인하지 못했어요. 디자인을 맞추는 작업은 로컬에서 해요.

### 4. 검사 도구를 설치해요(PC마다 한 번)
캡처 도구(Playwright)는 앱이 아니라 `scripts/package.json`에 버전을 고정해 뒀어요. 두 앱이 같이 써요. 터미널에서 직접 하거나 Codex에게 시켜요. 인터넷 승인을 물으면 허용해요.
```
저장소 루트에서 cd scripts && npm ci && npx playwright install chromium 을 실행해 줘.
```
PC에 Playwright가 이미 있으면 설치하지 않고 위치만 알려 줘도 돼요: `PW_MODULE=/…/node_modules/playwright-core`(브라우저가 기본 위치에 없으면 `CHROMIUM_PATH=/…/chrome`도).

같은 명령을 매번 승인하기 번거로우면, 승인 창에서 '항상 허용'을 골라요. 그러면 규칙 파일(`~/.codex/rules/default.rules`)에 기록돼요.

### 5. 이미지를 주는 법
- **시작할 때:** `codex -i 그림1.png,그림2.jpg "프롬프트"`처럼 쉼표로 이어요. `-i`를 여러 번 써도 돼요.
- **대화 중에:** 이미지를 터미널에 붙여 넣거나 끌어다 놓아요. 또는 경로를 글로 적으면 Codex가 `view_image`로 직접 열어요. IDE 확장에서는 Shift를 누른 채 끌어다 놓아요.
- **이미지마다 무엇인지 적어요.** 예: "1번은 지금 화면, 2번은 레퍼런스. 카드 머리와 KPI 줄만 보세요."
- **레퍼런스는 부분을 짚어 줘요.** "이 화면처럼"이라고만 하면 배치까지 베껴요. "이 표의 접히는 그룹 머리 모양", "이 KPI 카드의 숫자·증감 칩"처럼 가져올 부품을 적고, 화면 구성은 브리프의 질문에서 정하게 해요.
- 캡처는 **뷰포트 크기**(1440×1000, 390×844)가 좋아요. 세로로 긴 전체 캡처는 크게 줄어들어 디테일이 안 보여요. `ui-check --fold`가 만드는 `*.fold.png`를 쓰고, 우리 기준 캡처도 같은 크기인 `docs/design/screenshots/**/<이름>.fold.png`를 줘요.
- 이미지에 안 보이는 것(호버, 클릭 뒤 상태, 키보드 동작)은 글로 적어요.

### 6. Build Web Apps 플러그인을 쓴다면
프롬프트에 "ImageGen 콘셉트는 만들지 마세요. `docs/design/STYLE_GUIDE.md`와 `docs/design/screenshots/`가 승인된 디자인이에요"를 꼭 넣어요. 플러그인 기본값이 새 콘셉트부터 만드는 방식이라서요.

---

## (0) 첫 대화: 규칙을 읽었는지 확인

**언제:** 새 대화를 열 때마다. 특히 킷을 처음 넣었을 때.
**첨부:** 없음.
**빠른 확인(대화 없이):** `codex --ask-for-approval never "지금 받은 프로젝트 지시를 요약해 줘"`

```
AGENTS.md를 읽고 아래를 짧게 정리해 줘. 아직 아무 파일도 고치지 마.
1. 이 저장소의 디자인 시스템 원본 경로와, 절대 보거나 고치면 안 되는 폴더
2. 시그니처 요소 5개와 금지 5개
3. 화면 하나를 끝냈다고 말하기 전에 돌릴 명령과 통과 기준
4. 채용·CRATA·ARA에서 지킬 법·개인정보 기준 3개
5. docs/codex/PLAYBOOK.md에서 지금 작업과 관련된 장
틀린 게 있으면 내가 고쳐 줄게.
```

---

## (1) 새 앱 시작: 시작 틀 복사·셋업

**언제:** `apps/<새앱>`을 새로 만들 때.
**첨부:** `docs/design/screenshots/hr/home.fold.png`(틀 모양 기준)
**명령 예:** `codex -i docs/design/screenshots/hr/home.fold.png`

```
/plan
목표: apps/<새앱>을 새로 만들어. 업무사이트·인사 앱과 한 제품처럼 보여야 해.
앱 설명: <한 줄. 예: 교육·자격 관리 앱, 가상 회사 예시정밀산업 47명>

맥락:
- 시작 틀은 docs/codex/starter/ 야. 그 README.md의 명령대로 복사해. 디자인 시스템 원본(apps/hr/src/styles 4개, src/ui 2개)과 src/lib/text.ts는 README대로 원본에서 복사해.
- apps/hr의 App.tsx·Shell.tsx는 인사 앱 데이터를 불러와서 그대로 복사하면 빌드가 안 돼. 셸 모양은 starter의 Shell.tsx가 같아.
- 첨부 이미지는 완성된 인사 앱 홈이야. 흰 사이드바 + 흰 상단 바 + 옅은 회색 본문 틀만 보면 돼.

할 일:
1. starter README대로 apps/<새앱>을 만들고 npm ci, npm run typecheck, npm test, npm run build를 통과시켜.
2. package.json의 name, index.html의 title, src/shell/Shell.tsx의 COMPANY·ME·NAV·PAGE_TITLE을 이 앱에 맞게 바꿔. name을 바꾸면 npm install로 lockfile도 맞춰.
3. 스타일·ui 파일은 tokens.css의 --brand 4개 변수 말고는 바꾸지 마(흰 글자 대비 4.5:1 이상).
4. 라우트를 다 만들고(App.tsx + NAV + PAGE_TITLE), 각 화면은 PageHead 하나만 있는 두 줄짜리 빈 페이지로 둬.
5. scripts/routes.<새앱>.json을 만들어(모든 경로 + /nope).

제약: 새 UI 라이브러리, 새 글꼴, 그라데이션 금지. 부품을 새로 만들지 말고 복사한 것만 써. 커밋하지 마.

완료 조건:
- npm run typecheck, npm test, npm run build 통과
- 개발 서버를 4321 포트로 띄우고(AGENTS.md 2장의 .vite.pid 방식) node ../../scripts/ui-check.mjs --base http://localhost:4321/ --routes @../../scripts/routes.<새앱>.json --fold --a11y 결과가 "N shots, 0 with problems"
- d-_.fold.png와 첨부 이미지를 view_image로 나란히 보고, 틀(사이드바 폭, 상단 바 높이, 캔버스 색)이 같은지 확인
- 서버 끄기: kill -- -"$(cat .vite.pid)" 2>/dev/null || kill "$(cat .vite.pid)" (pkill -f 금지)
- 바꾼 파일 목록과 확인 결과를 보고해 줘
```

---

## (2) 기준 화면 1개 만들기

**언제:** (1) 다음, 다른 화면보다 먼저. 이 앱의 핵심 화면 하나를 끝까지 만들어서 나머지 화면의 기준으로 삼아요.
**첨부:** 이 화면의 레퍼런스 2~3장 + 우리 완성 화면 중 가장 비슷한 것 1장
**명령 예:** `codex -i $REFS/orbix-refs/projectflow-grouped-task-table.jpg,$REFS/orbix-refs/hope-hr-analytics.jpg,docs/design/screenshots/worksite/tasks.fold.png`

```
/plan
목표: apps/<새앱>의 기준 화면 <화면 이름>(<경로>)을 끝까지 만들어. 이 화면이 나머지 화면의 품질·밀도 기준이 돼.

브리프: docs/codex/briefs/<화면>.md 를 먼저 읽어(SCREEN_BRIEF_TEMPLATE.md 형식).
첨부 이미지:
1. <레퍼런스 파일 이름>: <가져올 부분. 예: 접히는 그룹 머리, 진행 막대 + % 열>
2. <레퍼런스 파일 이름>: <가져올 부분>
3. docs/design/screenshots/<…>.fold.png: 우리 완성 화면. 밀도와 문법을 이것과 맞춰.
레퍼런스와 우리 화면은 모양(부품 생김새, 숫자 무게, 밀도)의 기준이야. 배치를 그대로 옮기지 말고, 이 화면의 용도에 맞게 요소와 자리를 정해. 색·사진·영어 문구는 버리고, 구현은 저장소 토큰과 src/ui 부품으로 옮겨.

순서:
1. docs/codex/PLAYBOOK.md 5.0(구성)과 4장(모양)을 읽어. 브리프의 '구성'(질문 → 요소 → 자리)이 비어 있으면 채우고, 구성안 2개를 텍스트 와이어프레임으로 보여 준 뒤 하나를 골라 이유를 말해. 내가 대화 중이면 내가 고를 때까지 기다려. 출발 레시피(5.1)는 그다음에 골라.
2. 화면이 쓸 데이터와 계산 함수부터 만들어. 로직이 있으면 src/lib/<이름>.test.ts에 테스트도(npm test가 돌려).
3. 화면을 만들어. 파일 첫 줄 주석에 레퍼런스 파일 이름과 가져온 것을 적어.
4. ui-check(--fold --a11y)를 돌리고, fold 캡처와 첨부 이미지를 view_image로 비교해. 다른 점 목록(PLAYBOOK 8.4 형식, kind 모양/구성)을 쓰고 모양 차이는 고쳐. 구성 차이는 용도 때문이면 keep 이유를 적어. 이걸 2번 이상 해. 주 동작은 --flow(PLAYBOOK 2.11)로 눌러 본 캡처도 봐.

완료 조건: AGENTS.md 7장 체크리스트 전부 + 데스크톱·태블릿·모바일 fold 캡처 경로를 보고. 내가 확인하기 전에는 다른 화면을 만들지 마.
```

---

## (3) 화면 1개 만들기(브리프 템플릿을 채워서)

**언제:** 기준 화면이 확정된 뒤, 화면을 하나씩 만들 때.
**준비:** `docs/codex/SCREEN_BRIEF_TEMPLATE.md` 1장 틀을 복사해 `docs/codex/briefs/<화면>.md`로 채워요(대표님이나 담당자가 채워도 되고, Codex에게 초안을 맡겨도 돼요). 2장의 채운 예는 형식 견본이라 숫자를 그대로 쓰지 않아요.
**첨부:** 브리프에 적은 레퍼런스 1~3장
**명령 예:** `codex -i $REFS/orbix-refs/projectflow-grouped-task-table.jpg,$REFS/instagram-posts/post_3.jpg`
**스킬로:** `$crata-screen docs/codex/briefs/training.md`처럼 불러도 같은 절차로 돌아요.

```
목표: docs/codex/briefs/<화면>.md 브리프대로 <화면 이름>(<경로>)을 만들어.

첨부 이미지:
1. <파일 이름>: <가져올 부분>
2. <파일 이름>: <가져올 부분>
기준 화면: <apps/…/pages/<기준>.tsx>와 docs/design/screenshots/<…>.fold.png. 같은 품질·밀도·문법으로. 배치는 따라 하지 말고 브리프의 '구성'(질문 → 요소 → 자리)대로 짜. 구성이 비어 있으면 PLAYBOOK 5.0대로 먼저 채워.

제약:
- 내 화면 파일만 고쳐: src/pages/<Page>.tsx, .css(+ .parts.tsx).
- src/ui, src/styles, src/shell, src/data, src/lib, App.tsx는 읽기만 해. 고칠 게 있으면 결과에 적어.
- [혼자 작업일 때만 이 줄을 넣어요] 오케스트레이터가 없어. App.tsx 라우트 1줄, src/shell/Shell.tsx 메뉴 1줄 + PAGE_TITLE 1줄, 새 파일 src/lib/<page>.ts와 src/lib/<page>.test.ts(npm test가 돌려)는 만들어도 돼. 기존 공통 코드는 수정 금지. 바꾼 공통 줄은 보고에 적어(PLAYBOOK 9.1).
- [무인 실행일 때만 이 줄을 넣어요] 브리프 확인을 기다리지 말고 docs/codex/briefs/<page>.md에 쓰고 바로 진행해. 판단한 것은 보고의 '승인 전 가정'에 적어.
- 개발 서버는 <포트>번만 써(AGENTS.md 2장 .vite.pid 방식). 새 패키지, 커밋 금지.

완료 조건:
- npm run typecheck, npm run build 통과 + npm test(hr)
- ui-check --routes <경로>[,<경로>] --fold --a11y 결과 "N shots, 0 with problems"(명령 끝에 다른 글자 없이). 셸을 바꿨으면 전 경로도
- 주 동작 클릭 흐름을 --flow로 찍고 그 캡처도 확인
- fold 캡처와 레퍼런스를 view_image로 비교해 다른 점 목록을 2번 이상 비우기(모양 차이는 고치고, 용도 때문인 구성 차이는 keep 이유)
- docs/codex/CHECKLIST.md 확인
- 보고: 고른 구성안과 이유, 바꾼 파일(공통 줄 포함), 캡처 경로, 남은 다른 점, 승인 전 가정, 공통 파일에서 고칠 것
```

**여러 화면을 동시에 맡길 때:** 화면마다 브리프 하나, 세션(또는 서브에이전트) 하나, 포트 하나, 가능하면 git worktree 하나를 줘요. 공통 파일은 아무도 고치지 않게 하고, 보고된 공통 문제는 끝난 뒤 한 세션이 모아서 고쳐요(PLAYBOOK 9장).

---

## (4) 캡처를 보고 다듬기

**언제:** 화면이 돌아가지만 느낌이 덜 맞을 때. 또는 내가 직접 보고 고칠 점을 찾았을 때.
**첨부:** [지금 화면 캡처] + [레퍼런스나 우리 기준 캡처]. 같은 폭으로 찍은 것끼리 줘요.
**명령 예:** 대화 중에 `.ui-check/<화면>/d-_<경로>.fold.png`와 레퍼런스를 끌어다 놓아요.

```
1번은 지금 화면(<폭>), 2번은 <레퍼런스 또는 기준 화면>이야. 느낌이 덜 맞아.
- 특히 볼 곳: <예: 카드 머리 높이, KPI 숫자 굵기, 표 줄 높이, 빈 공간>
- 내가 본 문제: <있으면 적기. 예: 오른쪽 카드 아래가 비어 보여, 버튼이 너무 많아>

할 일:
1. 두 이미지를 비교해서 다른 점 목록을 PLAYBOOK 8.4 형식(JSON 한 줄씩, kind·severity 포함)으로 써 줘. 색·사진·영어 문구 차이는 빼.
   - kind 모양: 카드 머리, 간격, 위계, 숫자 무게, 강조 개수, 밀도, 차트 모양 → 고쳐.
   - kind 구성: 요소 종류, 배치, 카드 수 → 브리프의 질문(PLAYBOOK 5.0)으로 따져서 용도 때문이면 keep 이유만 적고 고치지 마.
2. high부터 고치고, 같은 파일 이름으로 다시 찍어서 view_image로 전후를 비교해.
3. 목록이 빌 때까지 반복하되 최소 2번. 데스크톱과 모바일 둘 다.
4. 바꾸는 값은 토큰과 기존 클래스로 해. 새 색, 새 그림자, 새 라운드 값 금지.
마지막에 고친 것과 남긴 것(이유 포함)을 보고해 줘.
```

---

## (5) 전 화면 검사·마무리

**언제:** 화면을 다 만든 뒤, 커밋이나 공개 전에.
**첨부:** 없음.

```
목표: apps/<앱> 전체를 마무리 검사해. 이번에는 네가 오케스트레이터라 공통 파일(src/ui, src/styles, src/shell 등)도 고쳐도 돼. 공통 파일을 고쳤으면 전 화면을 다시 검사해.

1. npm run typecheck, npm test(있으면), npm run build. worksite-next는 npm run build:public까지.
2. 개발 서버를 띄우고 ui-check를 모든 경로 × d·t·m으로, --fold --a11y 를 켜서 돌려. 업무사이트는 routes.worksite.json(회사 × 사람 변형)으로. 결과는 0 problems여야 해.
3. 내용 검사:
   - 금지어 grep: 치료, 우울 개선, AI 상담사, 위험 직원, 자동 탈락, 수정 0, 완벽, 혁신적. '불합격'은 사람이 고르는 동작에만 있는지 확인해.
   - '최근' 목록에 TODAY 이후 날짜가 없는지
   - 같은 숫자가 화면마다 같은지(예: 홈 검토 대기 = 내 업무 검토 탭)
   - 동의 안 한 사람의 CRATA 값이 어디에도 안 나오는지
   - 조사 오류(받침 뒤 '예요', '가' 등)
   - 모든 화면 아래 '예시 데이터' 표시
4. 공개 빌드 실제 이름 검사(worksite-next, 이름을 출력하지 말고 건수만):
   for k in name shortName; do V=$(sed -n "s/.*[{ ]$k: \"\([^\"]*\)\".*/\1/p" src/data/identity.ts | head -1); echo "$k: $(grep -rl -- "$V" dist-public/ | wc -l)건"; done
   두 줄 모두 0건이어야 해.
5. docs/codex/CHECKLIST.md를 화면마다 확인하고, 못 지킨 항목과 이유를 표로 보고해.
서버는 kill -- -"$(cat .vite.pid)" 2>/dev/null || kill "$(cat .vite.pid)" 로 꺼. pkill -f나 pgrep -f는 쓰지 마(내 셸까지 죽어).
```

---

## (6) 도메인 로직이 있는 앱: 로직과 테스트 먼저

**언제:** 인사 앱처럼 판단·계산·해석이 들어가는 앱이나 기능을 만들 때(적합도, 추천, 문장 해석, 기한 계산 등).
**첨부:** 없음. 근거 문서 경로를 적어요.

```
/plan
목표: <기능 이름>의 도메인 로직과 단위 테스트를 화면보다 먼저 만들어. 이번 작업에서는 화면을 만들지 마.

근거: docs/<…>.md (<장 번호>). 근거에 없는 규칙이나 숫자는 지어내지 말고 "확인 필요"로 남겨 줘.

순서:
1. 타입: src/lib/model.ts에 <타입들>을 추가해.
2. 이야기 시트: 회사 한 줄, 등장 역할, 관통하는 사건 2~3개, TODAY를 docs/<앱>/story.md에 짧게 써.
3. 예시 데이터: src/data/seed.ts. 모든 상태에 최소 1건(정상·경고·막힘·비어 있음·동의 안 함). 점수와 비율은 결정적 난수로 넓게 퍼뜨려. 미래 날짜는 '예정' 목록에만.
4. 계산 함수: src/lib/<이름>.ts. 결과에는 늘 근거(reasons), 걱정(concerns), 확신도나 점수를 같이 돌려줘. AI가 '결정'하는 함수는 만들지 말고 '추천'과 '근거'까지만.
5. 테스트: src/lib/<이름>.test.ts(node:test). 경계값, 동의 안 한 사람 제외, 5명 미만 숨김, 조사(josa), 못 알아들은 입력을 포함해.
6. npm test 통과를 확인하고, 화면이 쓸 함수 목록(이름, 인자, 반환)을 보고해 줘.

제약: 외부 API·LLM 호출 금지(규칙 기반). 새 패키지 금지. 이번 작업은 바탕 작업이라 src/lib, src/data를 고쳐도 돼(AGENTS.md 4장의 공통 파일 금지는 화면 작업용이야).
```

---

## (7) 느낌이 어긋났을 때 되돌리기

**언제:** 결과가 흔한 'AI 대시보드'처럼 보일 때. 예: 그라데이션, 굵은 숫자, 버튼이 많음, 영어 라벨, 차트 라이브러리 모양. 또는 옛 앱을 참고한 흔적이 보일 때.
**첨부:** [어긋난 화면 캡처] + `docs/design/screenshots/`에서 가장 비슷한 우리 화면 1장
**명령 예:** `codex -i .ui-check/x/d-_x.fold.png,docs/design/screenshots/worksite/home.fold.png`

```
멈추고 되돌려 줘. 1번(지금 화면)이 우리 디자인 시스템에서 벗어났어. 2번이 맞는 느낌이야.
이 저장소는 이미 승인된 디자인 시스템이 있는 곳이라, 새 콘셉트나 대담한 스타일은 원하지 않아.

1. docs/design/STYLE_GUIDE.md 2장(원칙)과 docs/codex/PLAYBOOK.md 6장(망치는 것)을 다시 읽어.
2. 1번 화면에서 아래 항목을 하나씩 찾아 목록으로 보여 줘(파일:줄 포함).
   - 그라데이션·유리·큰 그림자·새 색(hex 직접 쓰기)·새 글꼴
   - 굵기 600~700 숫자·제목
   - 짙은 버튼이나 브랜드 버튼 2개 이상
   - 영어 라벨, 이모지, lucide가 아닌 아이콘
   - 차트 라이브러리나 직접 그린 차트(src/ui/charts.tsx를 안 쓴 것)
   - src/ui 부품 대신 새로 만든 버튼·카드·칩
   - 허용 목록(PLAYBOOK 6.2 표: 토큰 6·8·12·16·20·999, 원 50%, 부품 고정값)에 없는 라운드
   - 같은 크기 카드의 단순 반복, 카드 안 카드 안 카드
   - apps/worksite(옛 앱)에서 가져온 구조나 문구
3. 하나씩 토큰·기존 부품·기준 화면(<Home.tsx 또는 Moves.tsx>) 문법으로 바꿔. 기능과 데이터는 그대로 둬.
4. 다시 찍어서 2번 이미지와 view_image로 비교하고, 남은 차이를 보고해 줘.
같은 어긋남이 두 번째라면 AGENTS.md 8장 '배운 것'에 한 줄 추가해 줘.
```

---

## (8) 구성이 용도와 안 맞을 때: 요소·배치 다시 짜기

**언제:** 모양은 맞는데 화면이 쓸모없어 보일 때. 예: 숫자는 많은데 무엇을 해야 할지 모르겠음, 레퍼런스를 옮긴 듯한 카드, 다른 화면과 구성이 똑같음, 주 동작이 아래에 묻힘.
**첨부:** 지금 화면 fold 캡처(데스크톱·모바일)

```
이 화면은 모양은 맞는데 용도에 맞게 짜이지 않았어. 디자인 모양(토큰·부품)은 그대로 두고 구성만 다시 짜 줘.
이 화면을 쓰는 사람: <역할 / 기기 / 빈도>
이 사람이 화면을 열며 묻는 것: <예: 오늘 처리할 게 뭐지? 어느 팀이 모자라지?>

1. docs/codex/PLAYBOOK.md 5.0을 읽고, 지금 화면의 카드마다 "어느 질문에 답하나"를 표로 써. 답하지 않는 카드는 뺄 후보로 표시해.
2. 질문을 중요한 순서로 3~5개 정하고, 질문마다 5.0 표에서 요소를 골라.
3. 구성안 2개를 텍스트 와이어프레임으로 보여 줘(위에서 아래로 카드 이름 · 칸 비율 · 질문 번호). 1번 질문의 답과 행동이 첫 화면(1440×1000, 390×844)에 오게.
4. 내가 하나를 고르면 그대로 고쳐. 데이터·문구·법 기준은 그대로 두고, 부품은 src/ui와 charts.tsx만 써.
5. ui-check(--fold --a11y)를 다시 돌리고 전후 fold 캡처를 view_image로 비교해서 보고해. 브리프의 '구성'도 고친 대로 바꿔.
```
