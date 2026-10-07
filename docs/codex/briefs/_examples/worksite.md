# 새 업무사이트(apps/worksite-next) 화면 만들기 브리프

> **실제로 쓴 브리프(기록)예요.** 업무사이트(`apps/worksite-next`)을 만들 때 화면을 여러 작업자(서브에이전트)에게 나눠 맡기며 그대로 준 원문이에요. 새 브리프를 **얼마나 구체적으로** 써야 하는지 보는 용도예요.
> - `$REFS/`는 Orbix 레퍼런스 폴더예요(`post_*.jpg` → `$REFS/instagram-posts/`, `refs/*.jpg` → `$REFS/orbix-refs/`). 저장소 밖에 있어요(PROMPTS.md 준비 2).
> - '확인' 장의 캡처·서버 명령(`shotdev.js`, `pkill`, `ss`)은 그때 쓰던 임시 도구예요. 지금은 AGENTS.md 2장(`scripts/ui-check.mjs`, `.vite.pid` 방식)을 써요.
> - 숫자·화면 목록·문구 규칙은 그때 기준이에요. 지금은 seed, `AGENTS.md`, `docs/codex/PLAYBOOK.md`가 우선이에요.

사용자(한국, CRATA 대표)의 요청: **"기존 것은 아예 신경 쓰지 말고, 디자인은 내가 준 인스타(Orbix Studio Dashboard) 기준으로, 들어갈 내용은 리서치한 것을 참고해서 전체를 새로 만들어 줘."**
그래서 `apps/worksite-next`에 새 앱을 만들었습니다. 옛 앱 `apps/worksite`는 보지도, 고치지도, 참고하지도 마세요.

## 1. 디자인 기준(Orbix Studio 밝은 대시보드)
레퍼런스 이미지(Read 도구로 직접 보세요): `$REFS/` 아래 `post_1.jpg`~`post_6.jpg`, `refs/*.jpg`.
- 흰 사이드바 + 흰 상단 바 + 아주 옅은 회색 본문(`--canvas`). 카드는 흰색, 1px 옅은 테두리(`--line`), 라운드 16, 그림자 거의 없음.
- 큰 숫자는 굵기 500, 바로 옆에 증감 칩(↑ 4%p, 초록/빨강 옅은 배경). 라벨은 흐린 회색 13~14px.
- 카드 머리: 제목(17px 500) + 오른쪽에 알약 선택(“이번 주 ▾”)이나 ⋯ 네모 버튼.
- 버튼: 흰 테두리 버튼(라운드 12, 높이 40, 아이콘 + 글자). 화면에서 가장 중요한 동작 하나만 짙은 버튼(`variant="dark"`) 또는 브랜드 버튼.
- 짙은 세그먼트(켜진 것만 검정 알약, 나머지 흰 테두리), 밑줄 탭(아이콘 + 글자), 트랙 세그먼트(목록/보드).
- 차트: 캡슐 막대(옅은 트랙 + 채운 캡슐, 하나 강조 + 짙은 툴팁), 둥근 도넛(조각 사이 틈 + 범례 네모), 부드러운 선(흰 툴팁 카드), 반원 게이지, 히트맵.
- 상태는 옅은 배경 알약(점 + 글자). 아이콘은 lucide-react 선 아이콘(stroke 1.7~1.8).
- 아이콘 원(KPI 왼쪽, 파스텔 배경), 아바타 겹침, 진행 막대(카드마다 색).
- 한국어 문구는 해요체, 짧게. 숫자는 `className="num"`(고정폭 숫자).

**기준 화면:** `src/pages/Home.tsx` + `Home.css`를 먼저 읽으세요. 같은 품질·밀도·문법으로 만듭니다. 스크린샷 예: `docs/design/screenshots/worksite/home.fold.png`(지금 저장소 기준으로 바꿔 적었어요).

## 2. 쓸 수 있는 것(읽기만, 고치지 마세요)
- `src/ui/index.tsx`: Button(variant default|dark|brand|soft|ghost, size sm|lg, icon, count), IconButton, MoreButton, Card(title, icon, sub, actions, flush, line, foot, className="s-6" 등), PillSelect, Chip(tone good|bad|warn|info|brand|neutral|dark|outline, dot, sm), Delta(value, dir up|down|flat, good), Kpi(icon, hue, label, value, unit, delta, note), KpiCard, Segmented, Track, Tabs, Avatar, AvatarStack, Bar, StackBar, Toggle, Checkbox, Drawer, Menu, Empty, PageHead, cx.
- `src/ui/charts.tsx`: LineChart(series, labels, height, fill, focus, unit, format), CapsuleBars(data, highlight, single, format, tipLabel), Donut + Legend, Gauge(value, max, segments, label, sub), Heatmap, Sparkline, useSize/useWidth.
- `src/styles/ui.css` 클래스: grid g-12 + s-3..s-12, col, row, between, kpigrid, kpirow, table/tablewrap/cellmain, list/list__t/list__s, chip, tagsq, toolbar/search, phead, muted/faint/small/xs/ellipsis/num, tone-<hue>.
- 데이터: `src/data/types.ts`(TenantData 등), `src/data/tr.ts`(제조 첫 고객), `src/data/crata.ts`(교육·컨설팅), `src/data/format.ts`(md, mdw, when, dday, daysLeft, longDate, num, mins, slash, hm).
- 상태·동작: `import { useApp } from "@/data/store"` → `{ d, me, person(id), approvals, act, toast, tenant }`. act: approve, setTaskStatus, confirmSegment(meetingId, segId, lineCode?), acceptAction, confirmDecision, ruleDecision(id, ok), assignField(id, personId?), addFieldReport(kind, note, place), toggleIntegration(id), setStage, toggleShare(i).
- 회사 두 곳: `?tenant=tr`(제조, d.pack === "manufacturing") / `?tenant=crata`(교육). 사람 바꾸기 `&as=<personId>`(tr-plant, tr-qa, tr-ceo, tr-op1 … / cr-edu, cr-ceo …).

## 3. 규칙
- **내 화면 파일만** 만들고 고칩니다: `src/pages/<Page>.tsx` + `src/pages/<Page>.css`(필요하면 `src/pages/<Page>.parts.tsx`). 다른 에이전트가 동시에 다른 화면을 만듭니다. ui/·data/·shell/·styles/는 고치지 마세요. 공통 부품이 꼭 필요하면 내 화면 파일 안에 만들고, 고쳐야 할 공통 문제는 결과에 적으세요.
- 화면은 `export default function …`. 첫 줄 주석에 무엇을 Orbix의 어떤 레퍼런스에서 가져왔는지 적으세요.
- 첫 줄은 `PageHead`(제목 + 한 줄 설명 + 오른쪽 동작). 한 화면에 짙은 버튼은 하나.
- 내용은 리서치 기반(아래 화면별 명세). 데이터에 없는 숫자를 지어내야 하면 화면 안 상수로 두고 '예시'임이 자연스럽게.
- 두 회사 모두에서 깨지지 않게(제조 전용 화면은 교육 회사에서 Empty 안내). 모바일(390px)에서도 가로 넘침 없이(표는 tablewrap, 격자는 ui.css 반응형 규칙).
- 접근성: 버튼에 글자 또는 aria-label, 색만으로 상태 구분 금지(글자 함께).
- 새 npm 패키지 금지. 커밋 금지.

## 4. 확인
1. `cd apps/worksite-next && npx tsc -b --pretty false` (다른 화면 파일의 오류는 무시, 내 파일 오류는 0).
2. 개발 서버를 **내 포트**로 띄우기: `(cd apps/worksite-next && setsid npx vite --port <내 포트> --strictPort > /dev/null 2>&1 &)` 후 `curl -s localhost:<포트>/`로 뜬 것 확인.
3. 스크린샷: `node <그때 쓴 캡처 스크립트 shotdev.js> <포트> <저장폴더> <이름> <해시경로> [tr|crata] [personId] [폭] [높이]` (예: `... 4301 .shots tasks-tr /tasks tr tr-plant 1440 1000`, 모바일은 폭 390 높이 844). 출력의 errors가 비어야 하고(404 favicon은 괜찮음) overflow false.
4. 스크린샷을 Read로 보고 Orbix 레퍼런스와 나란히 비교해 다듬기(최소 2번 반복). 두 회사 × 데스크톱·모바일 확인.
5. 끝나면 개발 서버를 끄세요: `for pid in $(ss -ltnp | grep ":<포트> " | grep -o 'pid=[0-9]*' | cut -d= -f2); do kill $pid; done`

## 5. 화면별 명세
(리서치 근거: docs/research/00_direction.md 5장 모듈 ①~⑧, 02 회의 자동 분류, 03 Company DNA 10개 층, 04 데이터 등급 L0~L3, 08 수정 학습, 09 ARA MCP, 10 ARA 복지, docs/worksite/03 제조 팩, 06 입력 부담 점검)

### Tasks — 내 업무 (`/tasks`) · 레퍼런스: refs/projectflow-grouped-task-table.jpg, refs/orbixcrm-time-tracking-table.jpg, refs/orbixcrm-add-project-drawer.jpg
- 위: KPI 카드 띠 4장(오늘까지, 이번 주 마감, 검토 대기, 막힘).
- 툴바: 짙은 세그먼트(내 업무 / 내가 검토 / 팀 전체) + 검색 + 프로젝트·마감 알약 + 짙은 '업무 만들기'.
- 상태별로 묶인 표(막힘·진행 중·검토 중·할 일·완료 그룹 머리: 색 네모 + 이름 + 건수, 접기). 열: 체크, 업무명(+프로젝트), 담당·검토자 아바타, 마감(D-day 칩), 진행률 막대 %, 출처 칩(회의·현장·메일·AI·클레임·직접), 상태.
- 줄을 누르면 오른쪽 서랍: 설명, 체크리스트, 출처, AI로 제출했으면 'Claude로 제출 · 07:55', 검토자면 '승인'·'수정 요청'(act.setTaskStatus), 담당이면 '시작'·'제출'. AI는 '제출'까지만, '완료'는 검토자가 웹에서(09 문서).

### Projects — 프로젝트 (`/projects`) · 레퍼런스: post_1.jpg(Orbix CRM 칸반), refs/orbixcrm-projects-kanban-light.jpg, refs/orbixcrm-milestones-calendar.jpg, refs/orbixcrm-add-project-dropdown-detail.jpg
- 제목 옆 ⓘ ☆ 아이콘, 오른쪽 '활동' 버튼 + ⋯. 밑줄 탭(아이콘): 보드 / 사업 구조 / 일정.
- 툴바: 브랜드 '+ 새 프로젝트', 검색, 담당, 필터, 정렬 알약 + 사업 칩(색 점).
- 보드: 막힘·진행 중·검토 중·완료 4열(옅은 회색 레인, 머리에 색 네모 + 이름 + 건수 + ⋯ +). 카드: 제목, 날짜·시간, 설명 한 줄, 진행 막대(열 색) + %, 아래 체크리스트·댓글·파일 수 + 아바타 겹침. 레인 끝 '+ 업무 추가'.
- 사업 구조: 사업 > 프로젝트 > 파트를 카드로(사업 색, 프로젝트 건강도, 진행률, 담당·검토자, 데이터 등급 L1/L2 칩, '가설' 표시). "모든 것의 뼈대"라는 설명 한 줄(00 문서).
- 일정: 프로젝트별 가로 막대(오늘 세로선, 마감까지).

### Meetings — 회의 (`/meetings`, `?m=<id>` 선택) · 레퍼런스: post_2.jpg(Auralis 왼쪽 '진행 중/검토 준비' 목록 + 노드), refs/ai-support-inbox-dark.jpg(목록 + 상세 받은편지함 구조), refs/botrix-ai-command-center.jpg
- 리서치 GOAL A: 녹음(Plaud·클로바노트) → 구간 분할 → 사업·프로젝트로 다중 분류 → 결정·액션 추출 → 확인.
- 위 KPI 띠(이번 주 회의, 자동 분류율, 확인 대기 구간, 업무로 만든 액션).
- 왼쪽: 회의 목록(분류 중 / 확인 대기 / 정리됨 그룹, 출처·날짜·길이·구간 수). 오른쪽: 선택 회의 상세 — 머리(제목, 날짜, 길이, 참석자 겹침, 'Plaud에서 자동' 칩, 데이터 등급 칩), AI 요약, **구간 타임라인**(가로 막대를 사업 색으로 나눈 띠 + 범례: 한 회의가 여러 사업으로 나뉘는 게 한눈에), 구간 목록(시간, 주제, 사업›프로젝트 칩, 확신도 막대 %, 인용문, 상태, '맞아요'·'고치기'(다른 사업 고르기 메뉴) → act.confirmSegment), 결정(확정), 액션(추천 담당·기한, '업무로 만들기' → act.acceptAction). 분류 중 회의는 진행 상태 표시. '회의 올리기' 버튼.

### Docs — 문서·학습 (`/docs`) · 레퍼런스: refs/orbixcrm-growth-stats-kpis-charts.jpg, refs/fintech-transactions-table.jpg, refs/fintech-invoicing.jpg
- 리서치 08: 수정 → 범위 분류(템플릿 / 작성 규칙 / 이번만) → 승인 → 회사 규칙 → 효과 측정. "수정 0"을 약속하지 않고 재발률·편집량·검토 시간이 줄어드는 걸 숫자로.
- KPI 묶음(같은 수정 재발률 ↓, 1차 통과율 ↑, 평균 검토 시간 ↓, 운영 중 규칙 수) + 8주 선 차트(d.learning).
- 흐름 5단계 스텝(수정 → 범위 → 승인 → 규칙 → 효과) 작은 띠.
- 규칙 후보 카드(문장, 문서 종류, 근거 수, 범위 칩, '반영'·'이번만' → act.ruleDecision), 운영 중 규칙 표(적용 수, 무시 수).
- 최근 수정 표(문서, 전 → 후(지운 글 회색 취소선, 새 글 강조), 범위, 사람, 날짜). 산출물 표(제목, 종류, 판 v2, AI 초안 칩, 상태, 수정 수).

### Quality — 현장·품질 (`/quality`, 제조만) · 레퍼런스: post_3.jpg(FinSight: KPI 4장, 비용 예측 분할 막대, Compliance pulse 게이지, Getting started), refs/fleettrack-analytics.jpg, refs/ecommerce-ops-kpi.jpg
- KPI 4장(고객 PPM 18 vs 목표 10, 오늘 현장 등록, 진행 중 8D, 설비 가동 46/52).
- 고객 PPM 6개월 캡슐 막대(9월 강조, 목표 10 표시), 불량 유형 가로 막대, 초중종물 실시율 게이지 88%, 설비 상태 도넛(가동·정지·고장·준비).
- 현장 등록 목록(종류 칩, 내용, 위치, 등록자, 시간, 상태, 추천 담당 + '배정' → act.assignField). 이번 주 현장 등록 히트맵/쌓은 막대(d.quality.fieldWeek).
- 클레임·8D: CL-2026-03의 D0~D8 단계 점 스텝(현재 D4), 기한 D-6, 고객 비밀(L2) 칩 — AI 초안은 국내 경로가 열린 뒤에만(04 문서).
- 교육 회사(crata)에서는 Empty: "제조 회사에서 쓰는 화면이에요".

### Report — 현장 등록 (`/report`, 제조만, 모바일 우선) · 레퍼런스: refs/winx-add-product-form.jpg(폼), refs/smart-home-security.jpg(큰 타일)
- 리서치 06: 작업자는 탭 두 번 + 한 줄. 큰 타일 4개(불량 / 설비 이상 / 아차사고 / 기타, 파스텔 아이콘), 한 줄 설명(60자 카운터), 위치 칩(최근 공정·설비), 사진 버튼, 아차사고면 익명 토글, 큰 '등록하기'(act.addFieldReport). 아래 '오늘 내가 등록한 것' 목록. 데스크톱에서는 가운데 720px.
- 등록 뒤 누가 받는지 안내(불량 → 품질, 설비 → 공장장, 아차사고·기타 → 총무).

### Ai — AI 연결 (`/ai`) · 레퍼런스: post_3.jpg(FinSight: Live Runs Stream 표, Quick Action, Getting Started), refs/botrix-ai-command-center.jpg, refs/clarityai-dark.jpg(밝게 바꿔서)
- 리서치 09: 직원 각자의 AI(ChatGPT·Claude·Codex·Gemini)가 원격 MCP로 회사 업무를 다룸. 도구 6개(내 업무 보기, 업무 상세, 시작, 진행 기록, 결과 제출, 검토 상태). AI는 제출까지, 완료는 웹에서 검토자. 회사 ID로 데이터 분리.
- 빠른 동작 줄(연결 안내 보내기 · 정책 · 기록 내보내기), KPI 4장(연결한 사람, 이번 주 호출, 성공률, 차단).
- 실행 기록 표(사람, AI, 도구, 대상, 시간, 응답 ms, 결과 칩: 성공·차단 + 차단 이유).
- 연결 카드(사람별 AI, 범위, 마지막 사용). 도구 6개 카드. 데이터 등급 경로(L0·L1 해외 AI 허용 / L2 국내 경로만 / L3 처리 안 함 — FinSight compliance 목록처럼). '내 AI 연결하기' 단계 체크리스트.

### Integrations — 도구 연결 (`/integrations`) · 레퍼런스: refs/orbixcrm-integrations-grid.jpg
- 리서치: 메일 클라이언트·문서 에디터·STT는 만들지 않고 연결(00 문서 '만들지 말 것'). 분류 탭(전체·회의 녹음·메일·문서·지식·메신저·결재·ERP·현장), 검색, 카드 격자(모노 로고 네모, 이름, 설명, 범위, 상태 칩, 토글 → act.toggleIntegration, '예정'은 비활성).

### Settings — 설정 (`/settings`, 관리자) · 레퍼런스: refs/winx-add-product-form.jpg, refs/fintech-accounts.jpg
- 도입 단계(1단계 / 전체 Track → act.setStage) + 단계 체크리스트(d.rollout.steps, 담당 CRATA/회사 칩) + 목표.
- 회사 정보(이름, 업종 팩), 브랜드 색 미리보기, 데이터 등급 표(L0~L3 보관 위치·AI 경로), 알림 기본값 토글.

### Company — 회사 DNA (`/company`) · 레퍼런스: refs/hope-hr-analytics.jpg, refs/carenest-healthcare.jpg, refs/orbixcrm-growth-stats-kpis-charts.jpg
- 리서치 03: 회사가 일하는 방식을 10개 층(L1~L10, 스타일·경계·패턴)으로 뽑아 설정. 진단 진행률, 확인 필요, 가설.
- 층 카드 격자(코드, 이름, 묶음 칩, 진행 막대, 확신도, 찾은 것 칩, 할 일). 사업 구조 나무. 배분 규칙 표(언제 → 담당 → 검토자, 근거, 신뢰도 막대). 용어집 칩(확인 필요 표시). 회의·업무 리듬 목록. 가설(확신도 + '맞아요'/'아니에요').

### Members — 구성원 (`/members`) · 레퍼런스: refs/orbixcrm-team-members-grid.jpg, refs/mediflex-doctors.jpg
- 카드 격자: 큰 아바타, 이름, 직책·소속, 역할 칩(소유자·관리자·검토자·구성원), AI 연결 칩(Claude 연결됨 / 초대됨 / 안 함), 지금 업무 수·검토 수, 버튼(업무 보기). 툴바: 검색, 소속 세그먼트, 짙은 '초대하기'.
- ARA 개인 정보는 절대 보이지 않음(10 문서). 작은 안내 한 줄.

### Ara — ARA (`/ara`, 나만 보여요) · 레퍼런스: refs/orbix-ai-chat-home.jpg(가운데 큰 질문 + 입력 상자 + 카드 3장, 은은한 파스텔 배경)
- 리서치 10: 개인 영역은 회사가 볼 수 없음, 집계는 10명 이상일 때만, 인사평가 사용 금지, '치료' 표현 금지, 위기 시 109 안내.
- 맨 위 자물쇠 안내 띠. 가운데 "오늘 무엇을 도와드릴까요?" + 입력 상자(+ 버튼, 'ARA' 칩, 마이크, 보내기) + 카드 3장(일하는 방식 카드 / 마음 체크인 / 오늘 일정 정리).
- 아래: 최근 체크인 스파크라인(에너지·집중), '나의 일하는 방식' 카드(문장마다 '팀에 공유' 토글 → act.toggleShare), 오늘 제안 2개, 도움 연결(상담 연결, 109).

### NotFound — 404
- Empty + 홈으로 버튼.
