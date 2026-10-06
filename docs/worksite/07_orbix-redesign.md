# 07. Orbix 스타일 리디자인 명세 (업무사이트 `apps/worksite`)

- 작성: 디자인 리드 · 2026-10-06 (2차 개정: 비평 2건 반영)
- 범위: 겉모습만 바꿉니다. 기능·경로·데이터·문구·접근성은 그대로입니다. 셸, 공통 컴포넌트, 홈, 63개 화면 모두가 대상이고, 화면은 공통 컴포넌트와 페이지 CSS를 거쳐 바뀝니다.
- 우선순위: 이 문서는 `00_build-spec.md` 4장(디자인 토큰·라운드·타이포)의 **시각 값만** 덮어씁니다. 정책(히어로 1장, 알약 3개 이하, 카드 안 카드 금지, 상태는 아이콘과 글자, 숫자에 색칠 금지 등)은 그대로 따릅니다.
- 레퍼런스: Orbix Studio(instagram.com/orbixdashboard, dribbble.com/orbixstudiodashboard). 이미지 46장을 `scratchpad/orbix/refs/`에 모아 분석했습니다. 아래 파일 이름은 모두 그 폴더 기준입니다.
- 전/후 비교용 지금 화면: `scratchpad/orbix/before/`, `scratchpad/orbix/before-fix/`(tr-plant-home, tr-ceo-home, tr-quality 등).

**2차 개정에서 바뀐 큰 결정**
1. 히어로는 늘리지 않습니다. 내용 높이(1440에서 360px 이하)로 끝나고, 바로 아래에 다음 위젯 카드가 옵니다(홈은 5:7 두 줄기 MasonryGrid).
2. 화면에 짙은 덩어리는 히어로 한 장과 머리의 주 버튼 하나뿐입니다. 목록 행 버튼은 흰 알약(브랜드 글자)이고, 알약 제목은 검정 칩이 아니라 보통 카드 제목입니다.
3. 카드는 거의 안 보이는 `--ws-sunken` 선, 라운드 12입니다. 컨트롤은 라운드 8이고, 알약(999)은 툴바·머리·카드 머리·행 동작·히어로 안에서만 씁니다.
4. 600 굵기는 제목·숫자·주 버튼·목록 제목·켜진 상태에만 씁니다. 나머지는 400입니다.
5. 회색 막대는 `--ws-chart-muted`를 유지합니다(격자보다 진하게).
6. KPI는 숫자 옆에 증감 칩을 붙이고, 페이지 위 지표 줄은 KPI 카드 띠(`KpiStrip`)로 만듭니다.
7. `DonutChart`·`Gauge`·`KpiStrip`의 TypeScript 시그니처와 호출 식을 8장에 고정합니다.

---

## 0. 한 줄 요약

**회색 캔버스 위에 흰 카드를 놓고, 카드 가장자리는 거의 보이지 않는 1px 선으로만 둡니다. 강조색은 테넌트 브랜드 하나이고 누르는 곳에만 씁니다. 툴바·머리의 컨트롤은 알약 모양입니다. 숫자는 크고 차분하게 쓰고, 바로 옆에 작은 증감 칩을 붙입니다.**

지금 화면은 흰 셸 안에 라운드 28짜리 틴트 패널이 떠 있습니다. 카드는 테두리 없는 흰색이고 제목은 700으로 굵습니다. 홈의 남색 히어로는 옆 카드 높이(약 780px)까지 늘어나 아래 400px가 빈 남색 면입니다(`before-fix/tr-plant-home.png`). 바뀐 뒤 모습은 이렇습니다.

- 흰 사이드바(오른쪽 1px `--ws-line`)와 흰 상단 바(아래 1px `--ws-line`)가 'ㄱ'자 틀을 이룹니다.
- 그 안은 평평한 회색 캔버스입니다(라운드 없음).
- 캔버스 위 흰 카드는 1px `--ws-sunken` 선, 라운드 12, 그림자 없음입니다. 선은 캔버스와 거의 같은 밝기라 흰 면 자체로 구분됩니다(fintech 레시피).
- 제목·숫자는 600, 본문·메뉴·표·칩은 400입니다. 본문은 15px입니다.
- 짙은 면은 화면당 히어로 한 장(H-01·I-06·I-18)과 머리의 주 버튼 하나뿐입니다.

---

## 1. Orbix에서 가져오는 것

| # | 요소 | Orbix 근거(파일) | 우리 적용 |
|---|---|---|---|
| 1 | 중립 면이 화면을 끌고 감(흰색 + #f5~#fa 회색) | `fintech-admin-home`, `fintech-transactions-table`, `cashly-finance-overview` | 캔버스 `--ws-panel`을 거의 무채색으로(TR #F5F6F9, CRATA #F4F7F7). 사이드바·상단 바·카드는 흰색 |
| 2 | 그림자 없는 카드, 가장자리는 톤 차이 | `fintech-admin-home`(카드 가장자리 #F0F4F7 ≈ 캔버스 #F5F7FA) | 캔버스 위 카드·표 카드·레일 블록·모바일 목록은 `1px solid var(--ws-sunken)`(캔버스 대비 1.06:1, 거의 안 보임). `--ws-line`은 버튼·칩·사이드바 오른쪽·상단 바 아래·흰 면 위 구분선에만 |
| 3 | 강조색 하나, 누르는 곳에만. 짙은 요소는 화면당 하나 | `fintech-admin-home`(검정 Send 하나), `winx-ecommerce-home`(Open Site 하나), `finance-budget-dashboard`(Download 하나) | 테넌트 브랜드(TR 남색, CRATA 청록)만. 채운 브랜드 면은 히어로 1장 + 머리 주 버튼 1개. 목록 행 동작은 흰 알약(브랜드 글자). hover는 무채색 `--ws-hover` |
| 4 | 중간 굵기, 검정 제목, 나머지는 보통 굵기 | 전 레퍼런스(제목·숫자 500, 표·메뉴·칩 400) | 한글은 한 단계 올려 제목·숫자 **600**. 메뉴·탭·칩·표 머리·표 칸은 **400** (3.1) |
| 5 | 큰 숫자 + 같은 줄의 작은 증감 칩 + 아래 흐린 문장 | `orbixcrm-growth-stats-kpis-charts`(43 ↑37.8%), `fleettrack-analytics`(58 ↑+2.5%), `ig_post_6` | `StatTile` 값 줄 안에 `.ws-delta__chip`, 다음 줄에 `.ws-delta__text` 13/20 muted (5.10) |
| 6 | 묶음 KPI 카드(칸 사이 짧은 세로선) | `orbixcrm-growth-stats-kpis-charts` | `StatRow` 칸 사이 위아래 8px 띄운 1px `--ws-sunken` 세로선, 줄 사이 가로선 (5.10) |
| 7 | 페이지 위 KPI 카드 3~4장 한 줄 | `fleettrack-analytics`, `hope-hr-analytics`, `cashly-finance-overview` | 새 `KpiStrip` + `KpiCard`(카드 한 장 = 지표 하나, 112h 이상). 품질 현황 '공정 지표'에 씀 (5.10) |
| 8 | 툴바의 40h 알약 '동작' 버튼, 값 고르기는 작은 칩 | `orbixcrm-projects-kanban-light`(New Project·Search·Filter·Sort 40h) | 툴바 동작(검색칸·선택 상자·[필터])은 40h 알약. 값 칩 `.ws-chip`은 32h 13/400 (5.6) |
| 9 | 회색 트레이 안에 흰 카드 | `orbixcrm-projects-kanban-light`(레인 #f9f9f9, 라운드 12, 안쪽 8) | 칸반 레인 = `--ws-sunken` 트레이(라운드 10, 안쪽 8), 칸반 카드 = 흰 면(라운드 8, 테두리 없음) |
| 10 | 옅은 상태 팔레트 칩 | `fintech-transactions-table`(Completed/Canceled/Pending) | 기존 `STATUS_COLORS` bg/fg 그대로. 24h 알약, 아이콘 + 글자 |
| 11 | 회색 띠 표 머리(네 모서리 둥근 떠 있는 띠) | `cashly-finance-overview`, `fintech-transactions-table` | 표 머리 = `--ws-panel` 띠, 첫 칸 `8px 0 0 8px`·끝 칸 `0 8px 8px 0`, 13/20/400 ink-2, 아래 선 없음 (5.13) |
| 12 | 밑줄 탭 | `orbixcrm-projects-kanban-light`(2px 밑줄, 전체 폭 1px 기준선) | `LinkTabs`: 켜짐 ink 600 + 2px 브랜드 밑줄, 꺼짐 ink-2 400 |
| 13 | 카드 오른쪽 위 컨트롤 하나 | 대부분('Weekly ⌄', '⋯', 'See All') | 카드 머리의 `.ws-card__actions > .ws-card__more` = 32h 알약(1px line 테두리), 카드 actions 안 선택 상자 = 32h 알약 |
| 14 | 강조 막대 하나 + 옅은 나머지(격자보다 진함) | `fleettrack-analytics`(옅은 막대 #E1E1E1, 격자는 별도), `cashly-finance-overview` | highlight 막대 `--ws-chart-accent`, 나머지 **`--ws-chart-muted`**(TR #C6CAD5, 격자 대비 1.43:1). 격자 `--ws-sunken` 실선, 기준선 `--ws-chart-muted`, 목표선 `--ws-muted`. 막대 끝 라운드 6 |
| 15 | 도넛 | `orbixcrm-growth-stats-kpis-charts`(Productivity KPIs) | 새 `DonutChart`. **상태 구성 한눈에**에만(5조각 이하, 범례에 %와 값, [표로 보기]). 홈 '설비 상태' 위젯 하나 |
| 16 | 반원 게이지 | `fleettrack-analytics`(68% Utilized) | 새 `Gauge`(폭 160, 두께 12, 높이 96 이하, 값 24/32 호 안). 품질 '초중종물 실시율' 하나 |
| 17 | 사이드바: 로고 줄, 섹션 라벨, « 원형 접기 | `winx-ecommerce-home`(Menu 라벨, «), `orbixcrm-*`(« 원) | 로고 줄은 상자 없이(48h, 모노그램 32). "메뉴" 라벨 12/18/400 muted. 28 원형 접기 버튼 |
| 18 | 상단 바: 채운 검색 알약, 원형 아이콘 버튼 | `fintech-*`(#f5f7fa 검색 + ⌘K 칩), `orbixcrm-*`(36~40 원) | 검색·회사·누구로 보기 = `--ws-panel` 채운 알약(테두리 없음). 종 = 40 원 + 1px line |
| 19 | 인사말 머리: 흐린 날짜 위, 큰 인사 아래 | `fintech-admin-home`("Monday, Jun 12, 2026" / "Welcome Back, Ali!") | 홈 `PageHeader greeting`: 날짜 13/20 muted 위, h1 28/36/600, 요약 한 줄 |
| 20 | 브랜드로 칠한 작은 대표 타일 | `hope-hr-analytics`('Total employers', 1440 기준 약 270×150 — KPI 타일 한 장 크기) | HeroCard 유지. **늘리지 않음**, 안쪽 여백 20 24, 큰 숫자 36/44, 1440에서 높이 360 이하 |
| 21 | 빈 상태: 아이콘, 제목, 버튼 둘 | `fintech-invoicing-empty-state` | `EmptyState`: 48 원(`--ws-sunken`) + 17/24/600 제목 + 버튼(보조·주) |

## 2. 가져오지 않는 것과 이유

| 하지 않는 것 | 레퍼런스 예 | 이유 |
|---|---|---|
| 그라데이션(메시·무지개·카드 배경·테두리) | `opspulse-glass-gradient`, `fintech-transactions-table` KPI 카드, `orbixcrm-*` 'Ask AI' 테두리 | 'AI 티' 금지(`check-rules.ts`). 평평한 면으로 |
| 유리·블러·글로 | `orbixcrm-add-project-drawer` 뒤 블러, Premium 버튼 글로 | `backdrop-filter`·`filter: blur` 금지. 서랍·모달 뒤는 단색 마스크 `rgba(ink,.32)` |
| 점선(격자·드롭존·첨부 버튼·평균선) | `fleettrack-analytics` 격자, `orbixcrm-add-project-drawer` Upload | 점선 금지 규칙. 모두 1px 실선 |
| 빗금·바코드 미니 차트 | `hope-hr-analytics`, `cashly-finance-overview`, `fleettrack-analytics` Top Fuel | 패턴은 시끄러움. 남은 부분은 단색 `--ws-sunken` 트랙 |
| 형광·고채도 넓은 면 | `health-records-dashboard` 라임 카드, `revalo-real-estate` 주황 카드 | 넓은 면은 HeroCard 한 장(짙은 브랜드)만 |
| **히어로를 옆 카드 높이까지 늘리기** | (지금 화면 `before-fix/tr-plant-home.png`: 320×780 남색, CTA 아래 400px 빈 면) | Hope의 짙은 타일은 KPI 타일 한 장 크기. 늘리면 화면에서 가장 무거운 덩어리가 됨 → 내용 높이로 끝내고 아래에 다음 카드 |
| **목록 행마다 채운 주 버튼** | (지금 '승인 대기': 남색 '승인' 4개가 세로로 쌓임) | Orbix 밝은 대시보드는 화면당 짙은 요소 하나. 행 동작은 흰 알약(브랜드 글자) |
| **검정 알약 제목(카드 위 칩)** | Hope 'Digital Marketing'은 메타 태그이지 카드 제목이 아님 | 남색 히어로·버튼 옆에 세 번째 짙은 덩어리가 됨. 알약 카드 = 보통 카드 제목(3.5) |
| 사이드바 워크스페이스 전환 상자 | `fintech-admin-home` 'Agency' 상자 | 우리 로고는 홈 링크일 뿐. 상자 모양은 전환기처럼 보이고 상단 바 '회사' 선택과 겹침 |
| 같은 화면에 큰 CTA 여럿, 강조색 여럿 | Orbix CRM 초록 New Project + 보라 Premium | 강조색은 테넌트 브랜드 하나, 주 버튼은 머리마다 하나 |
| 업셀 카드(Upgrade·Premium) | 사이드바 아래 'Set up now', `winx-ecommerce-home` 배너 | 업무 화면이라 넣지 않음 |
| 사진·3D·국기·이모지 | `orbixcrm-team-members-grid`, `smart-home-security` | 이니셜 아바타와 Outlined 아이콘만 |
| 아이콘만 있는 상단 내비 | `ecommerce-ops-kpi`, `fleettrack-analytics` | 한국 B2B 사용자에게 글자 라벨이 필요. 아이콘 + 글자 |
| 10~11px 흐린 글자 | Revalo 축, 'Showing 1-10 of 124' | 한글 12px 이상, 4.5:1 이상. muted는 기존 값 유지 |
| 굵기 500, 한글 자간 | Orbix 제목 500 | 공유 빌드에 500 글꼴이 없음(3.1). 한글 글자에 letter-spacing 넣지 않음(숫자만 -0.01em) |
| 20~24 라운드 베개 트레이, 3단 중첩 | `fleettrack-analytics`, `revalo-real-estate` | 측정한 기준 레퍼런스(fintech·Orbix CRM)는 카드 10~12, 버튼 6~8. 카드 12, 안쪽 8 |
| 떠 있는 AI 바, 채팅 FAB | `ecommerce-ops-kpi`, `winx-ecommerce-home` | 내용을 가림 |
| 표 체크박스 열, 행 끝 연필·눈 아이콘 줄 | `fintech-*`, `orbixcrm-time-tracking-table` | 기능 추가가 됨. 기존 행 클릭과 서랍 유지 |

## 3. 결정 사항

### 3.1 굵기: 500은 쓰지 않고, 600은 좁게 씁니다(`check-rules.ts`는 그대로)
- 공유용 빌드(`font-public.css`)에는 Pretendard 400·600·700만 들어 있습니다. 500을 요청하면 400으로 그려져 개발 빌드와 모양이 달라집니다. 그래서 `scripts/check-rules.ts`는 바꾸지 않습니다.
- Orbix는 제목·숫자만 무겁고 나머지는 모두 보통 굵기입니다. 지금 화면(`before/tr-quality.png`)은 표 이름 칸까지 굵어서 시끄럽습니다.

| 굵기 | 쓰는 곳(이 목록 밖은 모두 400) |
|---|---|
| 400 | 본문, 꺼진 메뉴·하위 메뉴, 꺼진 탭, 칩(`.ws-chip`), 칩 묶음 라벨, 표 머리·표 칸(이름 칸 포함), `.ws-card__more`, 캡션·눈썹·섹션 라벨(`.ws-t-eyebrow`, `.ws-nav__heading`, `.ws-nav__section`), 기본·text·link 버튼, `.ws-tag`, 사람 칩 이름, 예시 데이터 배지, `.ws-kbd`, 축 글자, 행 보조 동작(`.ws-rowact-text`) |
| 600 | h1(`.ws-t-title-page`), 카드 제목(`.ws-card__title`, `.ws-t-title-card`, `.ws-t-subhead`, 서랍·모달 제목, 레일 블록 제목, 칸반 레인 제목), 숫자(`.ws-t-figure*`, 단위, 히어로 값, 증감 칩, 범례 값, 차트 값 라벨, 툴팁 값), 주 버튼(`.ant-btn-primary`)과 행 주 동작(`.ws-rowact`), 목록 제목(`.ws-listrow__title`, `.wa-row__title`, 칸반 카드 제목, 타임라인 제목), 켜진 상태(켜진 메뉴·탭, 눌린 칩, 세그먼트 선택, 선택 상자 고른 항목, 쪽 넘김 현재 쪽, 탭 바 켜짐), 상태 태그 `.ws-status`(13px 색 글자라 예외), 폼 라벨 `.ws-t-label`, 아바타 이니셜, 사이드바·탭 안 숫자 |
| 700 | 기본 숫자 배지(`.ws-count`, ink 바탕), 모노그램 |

### 3.2 캔버스 레시피
| 레시피 | 구성 | 레퍼런스 |
|---|---|---|
| A | 흰 본문 + 회색 사이드바, 카드에 보이는 선 | Orbix CRM |
| B | 회색 캔버스 + 흰 사이드바·상단 바·카드, 카드 선은 거의 안 보임 | fintech 계열 |
| C | 회색 위 회색 트레이 | FleetTrack |

**B를 고릅니다.** 지금 구조(흰 셸 + 틴트 패널)와 가장 가깝습니다. B에서는 카드 가장자리가 톤 차이로만 보이므로 카드에 진한 선을 두르지 않습니다(`--ws-sunken`, 캔버스 대비 1.06:1). Orbix CRM의 #EBEDEE 선은 흰 캔버스(A) 전용이라 쓰지 않습니다.

### 3.3 히어로: 유지하되 작게, 늘리지 않습니다
- H-01·I-06·I-18의 HeroCard(브랜드 단색)는 그대로 둡니다.
- `components.css`의 `.ws-grid > .ws-card--hero { align-self: stretch; }`를 지우고 **`align-self: start`**로 바꿉니다. 홈의 `.ws-grid.wh-home > .ws-card--pill:not(.ws-card--hero) { align-self: stretch; }`도 지웁니다.
- 홈(H-01)은 첫 줄 CardGrid를 없애고, 히어로·두 번째 위젯·나머지 위젯을 **한 MasonryGrid(5:7 두 줄기)**에 넣습니다(5.19). 히어로(왼쪽 첫 칸, 약 330px) 아래에는 MasonryGrid가 잰 높이로 다음 위젯을 바로 붙입니다. 히어로 아래가 남색 빈 면이나 큰 회색 구멍이 되지 않습니다.
  - 비평안(히어로와 다음 위젯을 `.ws-stack`으로 묶기)보다 이 방법을 고른 이유: 위젯 높이는 역할·단계마다 달라서 고정 묶음은 오른쪽 줄기 아래에 300px 가까운 구멍을 남깁니다. MasonryGrid는 이미 홈에서 쓰고 있고, 잰 높이로 짧은 줄기에 다음 카드를 놓습니다.
- 크기 목표: 1440에서 히어로 높이 **360px 이하**(줄 2개 기준), 줄 4개여도 400px 이하.

### 3.4 도넛·게이지는 좁게 허용합니다(README 4장 규칙을 이렇게 고침)
- 파이는 계속 금지입니다.
- 도넛은 '상태 구성 한눈에'에만 씁니다(5조각 이하, 범례에 %와 값, [표로 보기]). 가까운 값끼리 비교하는 데는 쓰지 않습니다.
- 반원 게이지는 비율 하나만 보여 줍니다. 목표·지난값은 아래 캡션 글자로 같이 둡니다.
- 근거: dataviz 지침이 도넛을 "part-to-whole at a glance only, ≤ 6 segments"로 허용합니다.

### 3.5 알약(`pill`) 카드 = 보통 카드 제목
- `[data-pill]`과 화면당 3개 이하 규칙은 그대로입니다(스모크가 셉니다).
- 모양은 바꿉니다. 알약 카드의 제목은 보통 카드 제목과 같은 `h2.ws-card__title`(17/24/600 ink)이고, 그 안에 `span.ws-pill[data-pill]`이 글자만 감쌉니다. 바탕·테두리는 없습니다. 히어로 안에서는 on-brand 글자입니다.
- 카드 위에 반쯤 걸친 검정 칩(`.ws-card__pillhead`), 머리 줄 absolute 배치, `padding-top:28px`, 그리드의 알약 자리 비우기(`padding-top:12px; row-gap:36px`)는 모두 지웁니다.
- 카드 제목 밖에서 쓰는 `PillLabel`(지금은 `#/__kit`뿐)은 조용한 태그입니다: 24h, 안쪽 0 10px, 라운드 999, 바탕 `--ws-sunken`, 글자 `--ws-ink-2` 13/20/600. 히어로 안이면 바탕 `--ws-hero-line`, 글자 `--ws-on-brand`.

### 3.6 짙은 요소는 화면당 하나(행 동작 규칙)
- 채운 브랜드 버튼(`type="primary"`)은 **페이지 머리 오른쪽에 하나**, 서랍·모달 꼬리에 하나만 씁니다.
- 목록 행(ListRows의 `action`, 홈 '승인 대기', 페이지의 행 안 버튼)의 동작은 채우지 않습니다.
  - 주 동작: `Button className="ws-rowact"` = 32h 알약, 흰색, 1px `--ws-line` 테두리, 14/20/600 `--ws-brand-text`, 안쪽 0 14px. hover `--ws-brand-weak` 바탕 + 같은 색 테두리.
  - 보조 동작('수정 요청', '고치기', '나중에'): `Button type="text" className="ws-rowact-text"` 또는 같은 class의 링크 = 32h, 안쪽 0 8px, 14/20/400 `--ws-ink-2`, hover `--ws-hover` 바탕 + ink.
  - 모바일(≤767)은 둘 다 최소 44h(터치 크기)입니다.
- 히어로가 있는 화면에서는 히어로 안 CTA(흰 알약)가 그 화면의 짙은 요소입니다.

### 3.7 라운드: 컨트롤은 8, 알약은 문맥에서만
- antd Button 전역 라운드는 **8**(입력칸과 같음)입니다. 서랍·모달 꼬리, 폼 안 버튼은 8입니다.
- 다음 문맥 안의 `.ant-btn`과 `.ant-select`만 알약(999)입니다: `.ws-topbar`(G2), `.ws-page-header__side`, `.ws-card__actions`, `.ws-filterbar`, `.ws-toolbar`, `.ws-listrow__action`, `.ws-card--hero`(G3). `.ws-rowact`·`.ws-rowact-text`·`.ws-chip`·`.ws-seg`·`.ws-status`·`.ws-tag`은 어디서나 알약입니다.

---

## 4. 토큰

### 4.1 색(`BrandTokens` → `--ws-*`)

새 토큰은 `sunken` 하나입니다. 아래에 없는 토큰은 그대로입니다.
- 그대로인 토큰: brand, brandText, brandWeak, onBrand, onBrand2, heroLine, info, surface, controlLine, ink, ink2, muted, **chartMuted**, chartAccent, chartProgress, chartPalette
- 그대로인 상수: STATUS_COLORS, INFO_BLUE, GOOD_FILL, CATEGORICAL_TAIL, CHART_ACCENT_CHOICES

| 토큰(CSS 변수) | 쓰임 | TR 전 → 후 | CRATA 전 → 후 | derive STEPS(전 → 후) |
|---|---|---|---|---|
| `panel` (`--ws-panel`) | 페이지 캔버스, 표 머리 띠, 흰 면 위 hover, 채운 검색·선택 알약, 넓은 옅은 채움 | #F3F5FB → **#F5F6F9** | #EFF7F6 → **#F4F7F7** | l .97 c .008 → **l .974 c .004** |
| `sunken` (`--ws-sunken`) **새** | 캔버스 위 카드·표 카드·레일 블록·모바일 목록 테두리, 칸반 레인 트레이, 세그먼트 트랙, 진행 트랙, 카드 안 행 구분선·격자, 캔버스 위 hover, 쪽 넘김 현재 쪽 | — → **#EEEFF4** | — → **#EBF1F0** | **l .953 c .006** |
| `line` (`--ws-line`) | 버튼·칩·`.ws-card__more` 테두리, 사이드바 오른쪽·상단 바 아래·탭 기준선·서랍 머리/꼬리 선, 흰 면 위 구분선 | #E2E6EF → **#E5E7ED** | #DEE9E8 → **#E2E9E8** | l .925 c .012 → **l .928 c .008** |
| `shadowPop` | 팝오버·드롭다운·툴팁·`.ws-tip` | `0 8px 24px rgba(27,30,37,0.12)` → **`0 0 0 1px rgba(27,30,37,0.06), 0 8px 24px rgba(27,30,37,0.08)`** | 같은 꼴, rgb 22,32,31 | 템플릿 `rgba(${rgbTriplet(ink)},…)` |
| `shadowModal` | 모달·서랍 | `0 16px 48px rgba(27,30,37,0.18)` → **`0 0 0 1px rgba(27,30,37,0.06), 0 24px 48px rgba(27,30,37,0.16)`** | 같은 꼴, rgb 22,32,31 | 같음 |

`cssVars.ts`에서 만들거나 바꾸는 변수입니다.

| 변수 | 값 |
|---|---|
| `--ws-sunken` | `t.sunken` |
| `--ws-shadow-raise` **새** | `0 0 0 1px rgba(<ink rgb>,0.06), 0 1px 2px rgba(<ink rgb>,0.06)` |
| `--ws-hover` | `t.brandWeak` → **`t.panel`**(흰 면 위 hover는 무채색, 선택·켜짐만 `--ws-brand-weak`). 지금 이 변수를 쓰는 곳이 없어 안전합니다 |

**대비 확인**(`node --experimental-strip-types`, `src/theme/color.ts`로 계산한 값)

| 확인 | TR | CRATA | 기준 |
|---|---|---|---|
| muted / panel | 5.24 | 5.17 | ≥4.5 |
| muted / sunken | 4.93 | 4.88 | ≥4.5(트랙·레인 위 글자) |
| ink-2 / sunken | 7.98 | 8.00 | ≥4.5 |
| controlLine / panel | 3.29 | 3.33 | ≥3 |
| controlLine / sunken | 3.09 | 3.14 | ≥3 |
| brandText / panel | 5.99 | 5.65 | ≥4.5 |
| chart-muted 막대 / 흰색 | 1.64 | 1.62 | 장식(표 쌍둥이 있음) |
| chart-muted 막대 / sunken 격자 | 1.43 | 1.42 | 막대가 격자보다 진해야 함 |
| panel · sunken · line / 흰색 | 1.08 · 1.15 · 1.24 | 1.08 · 1.14 · 1.23 | 장식 면·선 |
| sunken 카드 선 / panel 캔버스 | 1.06 | 1.06 | 의도적으로 거의 안 보임(3.2) |
| 히어로 증감 칩: 흰 글자 / hero-line을 브랜드 위에 겹친 색 | 5.30(#5F6B8B) | **3.69(#46918D) 실패** | 그래서 쓰지 않음 |
| 히어로 증감 칩(채택): 흰 글자 / 브랜드(투명 칩 + hero-line 테두리) | 10.75 | 6.09 | ≥4.5 |
| derive 전 hue 최악값(새 STEPS, 0~360° 훑기) | muted/sunken 4.85(h≈133), controlLine/sunken 3.05(h≈142) | | ≥4.5 / ≥3 |

TR·CRATA의 panel·sunken·line 값은 새 STEPS로 각 브랜드 hue에서 **정확히 계산한 값**이라 `deriveTenantTheme` near 검사(±2/채널)를 만족합니다. G1은 `rules.test.ts`에 `contrast(t.muted, t.sunken) >= 4.5`, `contrast(t.controlLine, t.sunken) >= 3`, `near(d.sunken, base.sunken)`를 더합니다.

### 4.2 그림자(모두 `src/theme/` 파일 안에서만)

| 이름 | 쓰는 곳 |
|---|---|
| 없음 | 평상시 카드, 버튼, 표, 칩 |
| `--ws-shadow-raise` | 세그먼트 선택 칸(antd Segmented `boxShadowTertiary`), 상단 바 아이콘 배지의 흰 고리 |
| `--ws-shadow-pop` | 팝오버, 드롭다운, 선택 목록, 툴팁, `.ws-tip` |
| `--ws-shadow-modal` | 모달, 서랍 |

### 4.3 라운드(`tokens.ts RADIUS` → `--ws-radius-*`)

측정 기준(1440 환산): `fintech-admin-home`·`orbixcrm-growth-stats-kpis-charts` 카드 10~12, fintech 버튼 6~8.

| 키 | 전 | 후 | 쓰는 곳 |
|---|---|---|---|
| panel | 28 | **16** | 아래 시트(모바일 서랍) 위 모서리, 큰 떠 있는 면. 본문 패널 라운드는 없어짐 |
| card | 20 | **12** | `.ws-card`, `.ws-table-card`, `.ws-mobile-list`, `.ws-rail__block`, `.ws-kpi`, antd Card·Modal, 페이지 최상위 상자 |
| bubble | 16 | **12** | ARA 말풍선 |
| control | 12 | **8** | 메뉴 항목, 목록 행 hover, 칸반 카드, 아이콘 타일, antd Button·Input·Select(전역) |
| input | 10 | **8** | 입력칸, 선택 상자(폼 안), 초점 선 |
| chip | 8 | **6** | 증감 칩, 키보드 칩, 복사 값 상자 |
| pill | 999 | 999 | 알약 문맥(3.7)의 버튼·선택 상자, 칩, 상태 태그, 세그먼트 |
| barEnd | 4 | **6** | 막대 데이터 끝 |

추가 고정 값
- 칸반 레인 트레이 10, 칸반 카드 8.
- 표 머리 띠 8(네 모서리, 5.13). 표 컨테이너 `.ws-table .ant-table-container`도 8.
- 배너 `.ws-banner`·카드 안 옅은 상자 8.

**카드 안 옅은 바탕 상자는 라운드 8 이하입니다.** 스모크 `nestedLook`(라운드 ≥12, 160×64 이상, 카드와 다른 바탕)을 피하는 규칙입니다.

### 4.4 간격·레이아웃

| 항목 | 값 |
|---|---|
| `--ws-gap` **새**(global.css) | 카드·묶음 사이. 20px, ≤1279px 16px, ≤767px 12px |
| `--ws-card-pad` **새**(global.css) | 카드 안쪽. 24px, ≤767px 20px |
| `--ws-row-h` | 56 → **52**(compact 44 → **40**) |
| `LAYOUT.contentMax` | 1200 → **1320**(본문 가운데 정렬) |
| 본문 `.ws-panel` 안쪽 | 데스크톱 28 32 48, 태블릿 24 24 40, 모바일 16 16 `calc(64px + 24px + env(safe-area-inset-bottom))` |
| 사이드바 | 240(접으면 72), 흰색, 오른쪽 1px `--ws-line` |
| 상단 바 | 64(모바일 56). `DataTable` sticky offset 64와 메시지 top 72가 이 값을 가정하므로 바꾸지 않음. 안쪽 0 24px(태블릿 0 16px, 모바일 0 8px) |
| 오른쪽 레일 | 320, 1440 이상 홈만. 흰 블록(카드 아님) |
| 툴바 동작(검색칸·선택 상자·[필터]) | 40h 알약 |
| 값 칩 `.ws-chip` | 32h(겹줄 판정 44px 아래 그대로) |

### 4.5 타이포(global.css, Pretendard, 굵기 400·600·700만)

| 클래스 | 전 | 후(데스크톱) | 모바일(≤767) | 자간 |
|---|---|---|---|---|
| `.ws-t-title-page` | 28/38/700 | **24/32/600** | 22/30 | 0 |
| `.ws-t-title-page.ws-t-greeting` **새** | — | **28/36/600** | 24/32 | 0 |
| `.ws-t-title-card` | 18/26/700 | **17/24/600** | 16/24 | 0 |
| `.ws-t-subhead` **새** | — | 15/22/600 ink | 같음 | 0 |
| `.ws-t-figure-hero` | 48/56/700 | **36/44/600** | 32/40 | -0.01em |
| `.ws-t-figure` | 28/36/700 | **28/36/600** | 24/32 | -0.01em |
| `.ws-t-body` | 16/24 | var(15/22) | 16/24 | 0 |
| `.ws-t-body-strong` | 600 | 600 | 같음 | 0 |
| `.ws-t-label` | 14/22/600 | 14/22/600(폼 라벨·작은 머리) | 같음 | 0 |
| `.ws-t-table` | 14/22/400 | 14/22/400 | 같음 | 0 |
| `.ws-t-caption` | 13/20 muted | 13/20/400 muted | 같음 | 0 |
| `.ws-t-eyebrow` **새** | — | 13/20/400 muted | 같음 | 0 |
| antd 표 머리 | 14/600 ink-2 | **13/20/400 ink-2** | 같음 | 0 |
| antd 버튼 | 600 | **400**, 주 버튼만 600 | 같음 | 0 |
| antd 세그먼트 | 600 / 선택 700 | **400 / 선택 600** | 같음 | 0 |
| 서랍·모달 제목 | 18/26/700 | **18/26/600** | 같음 | 0 |

**계단식 순서**: 인사말 h1은 `h1.ws-t-title-page.ws-t-greeting`입니다. 두 클래스가 한 단계 특이도라 순서에 따라 지는 문제가 있으므로, 인사말 규칙은 **`.ws-t-title-page.ws-t-greeting`(두 클래스)** 선택자로 쓰고 모바일 덮어쓰기도 같은 선택자로 씁니다. 한글 제목에서는 `letter-spacing: -0.01em`을 지웁니다(숫자 클래스만 남김).

### 4.6 밀도(`html[data-density]`)

| 밀도 | 본문 | 행 높이 |
|---|---|---|
| comfortable(기본) | 15/22(모바일 16/24) | 52 |
| compact | 15/22 | 40, antd 표 cellPaddingBlock 8 |
| public | 17/26(모든 폭) | 52 |

### 4.7 antd 테마(`antdTheme.ts`) 바뀌는 값

**전역 토큰**

| 토큰 | 값 |
|---|---|
| `borderRadius` / `LG` / `SM` / `XS` | 8 / 12 / 6 / 4 |
| `controlItemBgHover` | panel |
| `controlItemBgActive` | brandWeak(그대로) |
| `colorSplit` | **line 그대로**(서랍 머리·꼬리 선이 `--ws-line`이어야 함). 표 행 선은 Table `borderColor`로 따로 |
| `colorBgMask` | `rgba(<ink rgb>,0.32)` |
| `boxShadow`, `boxShadowSecondary` | shadowPop(새 값) |

**컴포넌트 토큰**

| 컴포넌트 | 값 |
|---|---|
| Button | `borderRadius 8, borderRadiusLG 8, borderRadiusSM 6`, `fontWeight 400`, `paddingInline 16, paddingInlineSM 12`, `defaultBorderColor line`, `defaultHoverBorderColor controlLine`, `defaultHoverBg panel`, `defaultHoverColor ink`, `defaultActiveBg sunken`, `defaultActiveBorderColor controlLine`, `defaultActiveColor ink`, `textHoverBg panel`, 그림자 none 3개 그대로 |
| Card | `borderRadiusLG 12`, `colorBorderSecondary sunken`, `boxShadowTertiary none` |
| Modal | `borderRadiusLG 12`, `titleFontSize 18` |
| Input, InputNumber, DatePicker | `borderRadius 8`, `hoverBorderColor ink2`, `activeBorderColor brand`, activeShadow none |
| Select | `borderRadius 8`, `optionSelectedBg brandWeak`, `optionSelectedColor brandText`, `optionSelectedFontWeight 600`, `optionActiveBg panel`, `colorFillTertiary panel`, `colorFillSecondary sunken`(상단 바 `variant="filled"` 바탕·hover) |
| Menu | `itemSelectedBg brandWeak`, `itemSelectedColor brandText`, `itemHoverBg panel`, `itemBorderRadius 8` |
| Segmented | `trackBg sunken`, `itemSelectedBg surface`, `itemSelectedColor ink`, `itemColor ink2`, `itemHoverColor ink`, `itemHoverBg "transparent"`, 라운드 999, `trackPadding 4`, `boxShadowTertiary shadowRaise 문자열` |
| Table | `headerBg panel`, `headerColor ink2`, `headerBorderRadius 8`, `headerSplitColor transparent`, `rowHoverBg panel`, `rowSelectedBg brandWeak`, `rowSelectedHoverBg brandWeak`, `borderColor sunken`, `cellPaddingBlock 14`(compact 8), `cellPaddingInline 16`, `cellFontSize 14`, `bodySortBg surface`, `headerSortActiveBg panel`, `headerSortHoverBg sunken` |
| Pagination | `itemSize 32`, `itemSizeSM 28`, `itemActiveBg sunken`, `borderRadius 999` |
| Tabs | `inkBarColor brand`, `itemSelectedColor ink`, `itemActiveColor ink`, `itemHoverColor ink`, `itemColor ink2`, `titleFontSize 14`, `horizontalItemGutter 24` |
| Tree | `nodeSelectedBg brandWeak`, `nodeHoverBg panel` |
| Dropdown | `controlItemBgHover panel` |
| Checkbox | `borderRadiusSM 4` |
| Layout | `bodyBg panel` |
| 그대로 | Tag, Tooltip(ink, 8), Switch, Badge, Calendar, Drawer 꼬리 여백 |

---

## 5. 컴포넌트별 명세

### 5.1 AppShell / 캔버스(`layout.css`, `AppShell.tsx`)

**구조**
- `.ws-shell`: 배경 `--ws-panel`.
- 본문 `.ws-panel`: 배경 투명, 라운드 0, 바깥 여백 0. 안쪽 4.4 표 값. `min-height: calc(100vh - 64px)`(모바일 56px).
- `.ws-panel-inner`: `max-width: var(--ws-w-content-max)`(1320), `margin-inline: auto`.
- 창(window)이 스크롤합니다. 패널 안 스크롤을 만들지 않습니다(sticky 상단 바·표 머리·레일).

**오른쪽 레일 `.ws-rail`**
- 320, `position: sticky; top: 64px; max-height: calc(100vh - 64px); overflow-y: auto`, 안쪽 28px 24px 24px 0, 배경 투명.
- `display`를 지정하지 않습니다(`hidden` 속성이 먹어야 함).
- 블록 `.ws-rail__block`: 흰색, **1px `--ws-sunken`**, 라운드 12, 안쪽 20. `[data-card]`가 아닙니다. 블록 사이 `--ws-gap`.
- 블록 제목 `h2.ws-rail__title`: 15/22/600, 아래 8. 행 `.ws-rail .ws-listrow { min-height: 48px }`.

**기타**: 부팅 화면 배경 #F5F6F9(layout.css 안 hex 허용). 로그인 바깥 `.ws-bare` 배경 `--ws-panel`.

### 5.2 SideNav(`SideNav.tsx`, `layout.css`)

```
aside.ws-sidenav
  div.ws-sidenav__head
    a.ws-brand            (상자 없음)
    Button.ws-collapse-btn
  nav.ws-nav[aria-label=주 메뉴]
    div.ws-nav__heading[aria-hidden="true"]  "메뉴"   ← side 모드·펼침일 때만
    ul > li.ws-nav__group …
```

- **사이드바 `.ws-sidenav`**: 흰색, 오른쪽 1px `--ws-line`, 안쪽 16px 12px. 접힘 72에서는 머리가 세로로 쌓입니다(gap 8).
- **로고 줄 `.ws-brand`**: 상자·테두리·hover 바탕 없음. 48h, 안쪽 0 8px, gap 10. 모노그램 32(라운드 8, 13/700). 이름 15/22/600 ink, 말줄임. 초점 선은 전역 규칙 그대로. 접힘: 48×48 가운데.
- **접기 버튼 `.ws-collapse-btn`**: 28 원, 흰색, `border: 1px solid var(--ws-line)`(antd 버튼 테두리), 아이콘 12. `DoubleLeftOutlined`(접기)·`DoubleRightOutlined`(펼치기). aria·툴팁 문구 그대로.
- **섹션 라벨 `.ws-nav__heading`**: "메뉴", 12/18/400 muted, 안쪽 0 12px 8px. 장식이라 `aria-hidden`.
- **구분선 `.ws-nav__divider`**: 1px `--ws-line`, 바깥 12px 12px.
- **메뉴 항목 `a.ws-nav__link`**(클래스·태그 유지: 초점 테스트): 40h, 안쪽 8px 12px, gap 12, 라운드 8, 14/22/**400** ink-2, 아이콘 18. hover `--ws-hover` + ink.
  - 켜짐 `.is-active`: `--ws-brand-weak` 바탕, `--ws-brand-text`, **600**, 왼쪽 3px 브랜드 막대(`::before`), `aria-current`.
  - 하위가 켜진 그룹 `.has-active-child`: 바탕·막대 없음, brand-text, 600.
- **하위 항목 `.ws-nav__sub`**: 36h, 안쪽 6px 12px 6px 30px, 14/22/400 ink-2, 라운드 8. 점 `.ws-nav__dot` 5px `--ws-chart-muted`(켜지면 brand). 켜짐: brand-weak, brand-text, 600, 막대.
- **하위 섹션 글자 `.ws-nav__section`**: 12/18/400 muted, 안쪽 12px 12px 4px 30px.
- **메뉴 숫자 `.ws-sidenav .ws-count`**: `--ws-sunken` 바탕, ink-2, 12/20/600.
- **NavRail(태블릿)**: 80 흰색, 오른쪽 1px line. 항목 64폭, 라운드 8, 아이콘 20, 글자 13/16(꺼짐 400, 켜짐 600). 켜짐: brand-weak, brand-text, 왼쪽 -8 위치 3px 막대. 브랜드 링크의 인라인 style은 `.ws-brand--rail` 클래스로 옮깁니다.
- **하지 않는 것**: 사이드바 아래 사용자·업셀 카드. Tab 정지점을 새로 만들지 않습니다(`/work`·`/docs` 45번 Tab 안에 표 머리).

### 5.3 TopBar(`TopBar.tsx`, `layout.css`)

**바 `.ws-topbar`**: 64h, 흰색, **아래 1px `--ws-line` 늘 보임**(`.is-scrolled`는 남기되 모양 같음). 안쪽 `0 24px`(태블릿 `0 16px`, 모바일 `0 8px`).

**회사·누구로 보기 선택**(비평 반영: 테두리 없는 채운 알약)
- `TenantSwitcher`·`PersonaSwitcher`는 `block`이 아닐 때 `variant="filled"`. 40h, 라운드 999, 바탕 `--ws-panel`, hover `--ws-sunken`, 테두리 없음, 14/22/400 ink, 안쪽 가로 16, 화살표 16 muted. 초점은 2px 브랜드 선(알약 라운드, 8장 '알약 선택 초점').
- 폭: 회사 `clamp(160px, 14vw, 200px)`, 누구로 보기 `clamp(160px, 17vw, 240px)`(지금 고정 200·`clamp(180px,18vw,240px)`).
- 라벨 13 muted는 1500 미만에서 숨김(유지).
- 접근성: 테두리가 없어도 글자와 화살표가 컨트롤임을 보여 줍니다(WCAG 1.4.11: 글자로 식별되는 컨트롤).

**검색 `.ws-searchbtn`**: 40h 알약, 테두리 없음, 바탕 `--ws-panel`, hover `--ws-sunken`, 안쪽 0 8px 0 14px. 최소폭 **200**(1440 이상에서만 240). 아이콘 16 muted + "검색" 14 muted + `.ws-kbd`(흰색, 1px line, 라운드 6, 12/18/400 ink-2, 안쪽 0 6). **1279 이하에서는 40 원 아이콘만**(지금 1100 → 1279로 올림).

**AI 칩 `.ws-aichip`**: 32 알약, 13/20/600. good: good-bg / good-fg. neutral: 흰색 + `border: 1px solid var(--ws-line)`(장식 outline 대신 border). 태블릿(768~1279)에서는 글자를 숨기고 32 원 아이콘만(이름은 `aria-label`에 있음). 이를 위해 TopBar.tsx에서 글자를 `span.ws-aichip__text`로 감쌉니다.

**아이콘 버튼 `.ws-iconbtn`**: 40 원, `border: 1px solid var(--ws-line)`, 흰색, 아이콘 18 ink-2. hover `--ws-hover`. 배지: 위 -2 / 오른쪽 -2, 18h, 12/18/700 ink 바탕, `box-shadow: 0 0 0 2px var(--ws-surface)`(layout.css 안). 모바일은 테두리 투명.

**사용자 버튼 `.ws-userbtn`**: 40h 알약, 테두리 없음, hover `--ws-hover`. 아바타 32, 이름 14/22/600(1600 이상).

**예시 데이터 배지(topbar)**: 모양은 `components.css`(G3, 5.11). 태블릿에서는 `<DemoDataBadge variant="topbar" compact />`(TopBar.tsx, `[data-demo-badge=topbar]`는 늘 렌더).

**알림 팝오버 `.ws-pop`**: 360, 머리 15/22/600, 꼬리 위 1px `--ws-sunken`.

**겹침 방지 확인값**(비평 반영)
- 1280(데스크톱): 상단 바 1040 − 안쪽 48 = 992. 왼쪽 ≈ 179 + 218 + 12 = 409, 오른쪽 ≈ 200 + 90 + 40 + 64 + 90 + 32 = 516 → 여유 약 55.
- 1101~1279(태블릿, 검색 아이콘만): 왼쪽 ≈ 40 + 12 + 160 + 187 + 12 = 411, 오른쪽 ≈ 40 + 32 + 40 + 64 + 40 + 32 = 248 → 여유 300 이상.
- 768: 상단 바 688 − 32 = 656, 왼쪽 ≈ 384, 오른쪽 ≈ 248 → 여유 약 12.

### 5.4 PageHeader(`PageHeader.tsx`, `components.css`)

- 머리 `.ws-page-header`: gap 16, 아래 24(모바일 16).
- 제목 줄 `.ws-page-header__row`: 아래 정렬(모바일 위 정렬), gap 16, 줄바꿈 허용.
- 제목 묶음 gap 4. h1 `.ws-t-title-page` 24/32/600. 설명 `__desc` 14/22 muted. 메타 13/20 ink-2.

**인사말 변형**(홈만, 문자열은 그대로)
```
header.ws-page-header.ws-page-header--greeting
  div.ws-page-header__titles
    p.ws-page-header__eyebrow   {dateText}                                        13/20/400 muted
    h1.ws-t-title-page.ws-t-greeting  안녕하세요, <span.ws-greeting__name>{name}</span>님   28/36/600
    p.ws-page-header__desc      {summary}                                         (없으면 생략)
```
지금은 날짜와 요약이 한 줄(`{dateText} · {summary}`)입니다. 날짜를 눈썹으로 올리고 요약만 남깁니다.

**오른쪽 `__side`**: 기간 세그먼트와 actions, gap 8. 버튼·선택 상자는 알약(3.7). 주 버튼은 하나.

**뒤로 `.ws-back`**: 13/20/400 ink-2, 아이콘 + 글자. hover ink.

### 5.5 탭(LinkTabs `.ws-tabs`)
- 기준선: 전체 폭 1px `--ws-line`. 탭 사이 gap 24, 탭 안쪽 10px 0 12px, 라운드 6px 6px 0 0(초점 선 모양용).
- 꺼짐: 14/22/**400** ink-2. hover ink(바탕 없음).
- 켜짐: ink **600** + `::after` 2px brand(왼 0 오른 0, 아래 -1, 라운드 2). `aria-current` 유지.
- 숫자 `.ws-tab .ws-count`: `--ws-sunken` 바탕, ink-2, 12/20/600.

### 5.6 FilterBar / 툴바(`components.css`)

| 요소 | 모양 |
|---|---|
| 값 칩 `.ws-chip` | **32h** 알약, 안쪽 0 12px, 13/20/**400** ink-2, 흰색, 1px `--ws-line`, 묶음 안 gap 6. hover: 테두리 control-line, ink |
| 눌린 칩 `[aria-pressed=true]` | `--ws-brand-weak` 바탕, 테두리 투명, `--ws-brand-text` **600**, 체크 아이콘 12 |
| `.ws-chip--sm` | 28h, 12/18 |
| 묶음 라벨 `.ws-chips__label` | 32h, 13/20/400 muted |
| 구분선 `.ws-filterbar__sep` | 1×20, 위 6, `--ws-line` |
| 검색 `.ws-filterbar__search` | **40h** 알약, 폭 240, 안쪽 가로 14, 테두리 control-line(입력칸 3:1) |
| 선택 상자·[필터] 버튼 | **40h** 알약(3.7) |
| 줄 간격·여백 | gap 8 12, 아래 20(모바일 16, 가로 스크롤) |

- JS 겹줄 판정(`.ws-filterbar__groups` 높이 > 44, 첫 자식보다 4px 넘게 아래)은 32h 칩에서 그대로 맞습니다.
- **`.ws-toolbar` 새**: 페이지 동작 알약 줄(`display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:20px`). 안의 `.ant-btn`·`.ant-select`는 40h 알약.

### 5.7 버튼(antd 전역)

| 종류 | 모양 |
|---|---|
| 공통 | **라운드 8**, 40h(SM 32, LG 48), 14/20/**400**, 안쪽 16(SM 12), 아이콘 간격 8 |
| 알약 문맥(3.7) | 같은 크기, `border-radius: 999px` |
| 주(primary) | 브랜드 바탕, **600**. 머리마다 하나 |
| 기본(default) | 흰색 + 1px `--ws-line`. hover `--ws-panel` + control-line 테두리 |
| text | hover `--ws-panel` |
| link | 그대로 |
| 행 주 동작 `.ws-rowact` | 3.6 |
| 행 보조 동작 `.ws-rowact-text` | 3.6 |
| 아이콘만 | 알약 문맥에서는 `shape="circle"` |

`.ws-disabled-action` 감싸개: 라운드 8, 알약 문맥 안에서는 999.

### 5.8 입력·선택(폼)
- 입력칸·숫자칸·날짜칸·선택 상자: 40h, **라운드 8**, 테두리 control-line(흰 바탕·캔버스 대비 3:1). hover 테두리 ink-2. 초점은 기존 2px 브랜드 선(바깥 라운드 8).
- 폼 라벨: 14/22/600(`.ws-t-label`), 필드 위 8.
- 알약은 툴바 문맥(3.7)에서만. 서랍·모달·폼 안 입력과 버튼은 모두 8로 맞춥니다.
- 알약 선택 상자의 초점 선은 알약 모양(8장 '알약 선택 초점').

### 5.9 SectionCard와 카드 머리 컨트롤

- **카드 `.ws-card`**: 흰색, **1px `--ws-sunken`**, 라운드 12, 안쪽 `--ws-card-pad`, 그림자 없음.
- **머리 `.ws-card__head`**: 최소 32h, 아래 16, gap 8. 모든 카드에 `container-type: inline-size`(380px 이하 예시 배지 글자 숨김 유지).
- **제목 `h2.ws-card__title`**: 17/24/600 ink, 말줄임, 자간 0.
- **알약 카드**(3.5): `h2.ws-card__title > span.ws-pill[data-pill]{title}`. `.ws-card__title > .ws-pill`은 글자만(바탕·테두리·높이·안쪽 여백 없음, 글자 상속). `.ws-card--pill` 클래스는 남기되 전용 CSS는 없습니다. 카드 `aria-label`은 그대로.
- **부제 `subtitle?: string`(새 prop)**: `p.ws-card__sub` 13/20 muted, 머리 바로 다음, `margin: -12px 0 16px`.
- **더보기**
  - 머리 안 `.ws-card__actions > .ws-card__more`: 32h 알약, `border: 1px solid var(--ws-line)`, 흰색, 안쪽 0 12px, 13/20/400 ink-2, `RightOutlined` 11. hover `--ws-hover` + ink. `a.ws-card__more` 클래스·태그 유지(초점 테스트).
  - 기본 `.ws-card__more`(머리 밖, 예: 메일함·템플릿·결과물 상세의 행 안 링크): 테두리 없는 13/20/400 ink-2 글자 링크 + 화살표. 행 높이를 바꾸지 않습니다.
- **카드 actions 안 선택 상자**: 32h 알약('이번 주 ⌄' 자리).
- **아래 설명 `.ws-card__caption`**: 13/20 muted, 위 12.
- **히어로 `.ws-card--hero`**: 브랜드 바탕, `border: 1px solid var(--ws-brand)`, 라운드 12, 안쪽 **20px 24px**. 제목 on-brand. 더보기: 투명 + `border: 1px solid var(--ws-hero-line)` + on-brand, hover 바탕 hero-line. 구분선 hero-line. 그리드 안에서 **`align-self: start`**.
- **구분선 `.ws-divider`**: 1px `--ws-sunken`, 위아래 16.
- **그리드**: `.ws-grid`·`.ws-stack` gap `var(--ws-gap)`, 마소너리 `--ws-mgap: var(--ws-gap)`. 알약 자리 비우기 규칙·`.ws-card--pill > .ws-widget-body > .ws-stats:first-child{margin-top:20px}` 규칙은 지웁니다.

### 5.10 KPI: StatTile · StatRow · KpiStrip · DeltaText · BigNumber

**StatTile 마크업**(props는 `icon?`, `iconTone?` 추가, 나머지 그대로)
```
div.ws-stat[.ws-stat--hero][.ws-stat--icon]
  span.ws-iconcircle[data-tone][aria-hidden]          ← icon 있을 때
  div.ws-stat__body
    span.ws-stat__label                                14/20/400 ink-2
    span.ws-stat__value                                display:flex; align-items:center; gap:8px; flex-wrap:wrap
      span.ws-t-figure | ws-t-figure-hero               28/36/600 (hero 36/44/600)
      span.ws-stat__unit                               15/22/600 ink-2 (hero 18/26)
      span.ws-delta__chip[data-tone][aria-hidden]      ← delta 있을 때. 숫자와 같은 줄
      StatusTag                                        ← tone 있을 때
    span.ws-delta__text                                ← delta 있을 때. 13/20 muted, 캡션 자리
      span[aria-hidden] {period} {늘었어요|줄었어요|변화가 없어요}
      span.ws-sr-only  {지금 DeltaText 문장 그대로: "{period} {abs} {verb}" / "{period} 변화가 없어요"}
    span.ws-stat__caption                              ← caption 있을 때. 13/20 muted(증감 문장 다음 줄)
    span.ws-stat__trend                                ← LineSpark, 위 4
```
- 증감 칩 `.ws-delta__chip`: 22h, 안쪽 0 6px, 라운드 6, 12/18/600 **ink 글자**, tabular, 아이콘 12. 바탕: good → good-bg(아이콘 good-fg), critical → critical-bg(아이콘 critical-fg), neutral → panel + `box-shadow: inset 0 0 0 1px var(--ws-line)`(아이콘 muted). 글자에 색을 칠하지 않습니다(숫자 색칠 금지).
- 히어로 안 칩: 바탕 투명, `border: 1px solid var(--ws-hero-line)`(22h 안에서 border-box), 글자·아이콘 on-brand. 문장 on-brand-2. (CRATA 6.09:1, TR 10.75:1)
- `DeltaText` 단독(StatTile 밖, 예: 재료 시세 위젯)은 `span.ws-delta` 안에 칩과 문장을 한 줄로(gap 6) 같은 마크업으로 그립니다. props 그대로.

**아이콘 원 `.ws-iconcircle`**: 40 원, 아이콘 18. `--sm` 32 원, 아이콘 16.

| data-tone | 바탕 / 색 |
|---|---|
| good / warning / serious / critical / info | `--ws-{tone}-bg` / `--ws-{tone}-fg` |
| neutral | panel / ink-2 |
| brand(기본) | brand-weak / brand-text |

- `.ws-stat--icon`: grid `40px 1fr`, 열 간격 12(묶음 KPI 왼쪽 아이콘 꼴).

**StatRow `.ws-stats`**(카드 안 묶음 KPI, 짧은 세로선)
```css
.ws-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px 0; overflow:hidden; margin-left:-20px; }
.ws-stats > * { position:relative; padding:0 20px; min-width:0; }
.ws-stats > *::before { content:""; position:absolute; left:-1px; top:8px; bottom:8px; width:1px; background:var(--ws-sunken); }
.ws-stats > *::after  { content:""; position:absolute; left:20px; right:20px; top:-8px; height:1px; background:var(--ws-sunken); }
@media (min-width:768px){ .ws-stats:has(> :nth-child(3):last-child){ grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:767px){ .ws-stats{ grid-template-columns:minmax(0,1fr); } }
.ws-card--hero .ws-stats > *::before, .ws-card--hero .ws-stats > *::after { background: var(--ws-hero-line); }
```
- 첫 열의 세로선(left -1)과 첫 줄의 가로선(top -8)은 `overflow:hidden`에 잘려 보이지 않습니다. 줄이 꺾이면 줄 사이에 가로선이 생깁니다.
- 390 모바일은 1열입니다(세로선 없음, 칸 사이 가로선).

**KpiStrip · KpiCard(새, `figures.tsx`)**: 페이지 위 지표 줄(Orbix 3~4장 KPI 카드).
```
section.ws-kpis-block[aria-label={title}]
  div.ws-kpis__head                    ← title 또는 demo 있을 때. 아래 12
    h2.ws-kpis__title {title}          15/22/600 ink
    DemoDataBadge inline
  div.ws-kpis                          display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:var(--ws-gap)
    div.ws-card.ws-kpi[data-card]      ← KpiCard = SectionCard as="div" className="ws-kpi"
      (StatTile 또는 Gauge)
```
- `.ws-kpi`: 안쪽 16px 20px, 최소 112h, `position:relative`. 안의 `.ws-iconcircle`은 오른쪽 위(top 16, right 20)의 32 원(`--sm`과 같은 크기)으로 옮기고, `.ws-stat__label`에 오른쪽 여백 40.
- 모바일(≤767): `grid-template-columns: repeat(2, minmax(0,1fr))`, gap 12. 3장이면 마지막 장이 다음 줄 왼쪽.
- 띠는 카드가 아니므로 카드 안에 넣지 않습니다(안에 넣으면 카드 안 카드).

**BigNumber**(히어로 안): 라벨 14/20/400 on-brand-2, 값 `ws-t-figure-hero` 36/44/600, 단위 16/24/600.

### 5.11 상태 태그·칩·배지

| 요소 | 모양 |
|---|---|
| `StatusTag .ws-status` | 24h 알약, 안쪽 0 10, 13/20/600, 아이콘 13 + 글자. `--md` 28h 14. 색 tone bg/fg 그대로. neutral은 panel + `box-shadow: inset 0 0 0 1px var(--ws-line)` |
| `.ws-tag` | 24h 알약, 흰색, `box-shadow: inset 0 0 0 1px var(--ws-line)`, 13/20/**400** ink-2 |
| `.ws-tag--brand` | brand-weak / brand-text, 테두리 없음 |
| `.ws-swatch` | 10, 라운드 3 |
| `.ws-count`(기본) | 20h, ink 바탕, 흰 12/20/700 |
| `.ws-count`(사이드바·탭 안) | `--ws-sunken` 바탕, ink-2, 600 |
| `.ws-avatar` | 28 원, brand-weak / brand-text, 12/600. `--lg` 48 / 18 |
| `.ws-person__name` | 14/22/**400** ink |
| `.ws-unread` | 8 점 brand + 12/18/600 brand-text |
| `.ws-demo-badge`(inline) | 그대로(12 muted, 투명) |
| `.ws-demo-badge--topbar`(**G3 담당**) | 28h 알약, 안쪽 0 10, 바탕 `--ws-sunken`, ink-2, 13/20/**400**. `--compact` 안쪽 0 8 |

### 5.12 ListRows와 행 동작
- 행 사이: 1px `--ws-sunken`.
- 행: 최소 `--ws-row-h`(52), 안쪽 8px 4px, 라운드 8, hover `--ws-hover`.
- 제목 14/22/600 ink 말줄임, 보조 13/20 muted, 앞(leading) ink-2 18, 뒤(trailing) 13 ink-2.
- **행 동작 `.ws-listrow__action`**: 안의 링크는 32h 알약, `border: 1px solid var(--ws-line)`, 13/20/600 brand-text, 안쪽 0 12. hover brand-weak. 모바일 44h.
- 행 안 버튼은 3.6 규칙(`.ws-rowact`, `.ws-rowact-text`). **채운 주 버튼을 쓰지 않습니다.**
- 앞에 쓰는 아이콘 타일 `.ws-icontile`: 40 사각, 라운드 8, panel, ink-2, 아이콘 18.

### 5.13 DataTable과 antd 표 전체

**표 카드 `.ws-table-card`**(카드 밖에 놓인 표)
- 흰색, **1px `--ws-sunken`**, 라운드 12, 안쪽 8px 8px 12px.
- **`overflow: hidden`을 넣지 않습니다**(antd sticky 머리 offset 64가 깨짐).
- 첫·끝 칸 안쪽 16(유지), 마지막 행 선 없음(유지).

**머리 `th`**
- 13/20/**400** ink-2, 바탕 `--ws-panel`(antd headerBg), **아래 선 없음**.
- 네 모서리 둥근 떠 있는 띠: `th:first-child { border-radius: 8px 0 0 8px }`, `th:last-child { border-radius: 0 8px 8px 0 }`(sticky 머리의 `.ant-table-header` 표에도 같은 규칙).
- `.ws-table .ant-table-container`의 라운드는 8(`var(--ws-radius-control)`, 지금 card 반경과 어긋나던 것 정리).
- 정렬 화살표의 켜진 쪽은 brand-text(유지).

**행**
- 14/22/400, 위아래 안쪽 14(compact 8). 칸 글자 ink-2.
- 이름 칸 `.ws-cell-name`: **400 ink**(지금 600).
- 구분선 `--ws-sunken`(Table borderColor), 첫 행 선은 띠 바로 아래에서 시작, hover `--ws-panel`, 줄무늬 없음.
- 클릭 행 초점선(-2 안쪽) 유지.

**카드 안 표(`useInsideCard`)**: 테두리·바탕 없이 머리 띠만.

**쪽 넘김**
- `position: ["bottomRight"]`(지금 가운데 → 오른쪽 아래).
- 항목·이전·다음: 32 원(antd Pagination `itemSize 32`, `borderRadius 999`).
- 현재 쪽: `--ws-sunken` 바탕, ink 600, 테두리 없음, **브랜드 채움 없음**(`html .ant-pagination .ant-pagination-item-active { border-color: transparent; background: var(--ws-sunken) }` + 안 링크 ink 600).

**모바일 `.ws-mobile-list`**: 흰색, 1px `--ws-sunken`, 라운드 12, 안쪽 4 16.

**바꾸지 않는 것**: sticky offset 64, `KIND_WIDTH`, NAME_MIN, WIDE_MIN, 클래스 이름 전부.

### 5.14 Kanban
- `.ws-kanban`: gap 16.
- 레인 `.ws-lane`: `--ws-sunken` 트레이, 라운드 10, 안쪽 8, 레인 안 gap 8.
- 레인 머리 `.ws-lane__head`: 안쪽 6px 6px 4px, 15/22/600 ink. 점 `.ws-lane__dot` 10 라운드 3(인라인 색 그대로). 숫자 `.ws-lane__count` 400 muted.
- 카드 `.ws-kcard`: 흰색, 테두리 없음(트레이 위 흰 면으로 구분), 라운드 8, 안쪽 12px 14px, gap 8.
- 빈 레인 `.ws-lane__empty`: 투명, 13/20 muted, 안쪽 20px 12px, 테두리 없음.
- 레인은 카드 안에 넣지 않습니다. 데스크톱 grid(1280 이상), 태블릿 가로 스크롤 + 페이드, 모바일 레인 하나는 유지합니다.

### 5.15 서랍·모달
- 서랍 `.ws-drawer`: 오른쪽 480, 흰색. 머리 1px `--ws-line` 아래선(antd colorSplit = line), 안쪽 18px 24px, 제목 18/26/600. 본문 24. 꼬리 위 1px line, 왼쪽 닫기, 오른쪽 동작(**라운드 8**, 알약 아님).
- 아래 시트(모바일): 위 라운드 16(`--ws-radius-panel`).
- 모달: 라운드 12, 제목 18/26/600, 버튼 라운드 8.
- 마스크 `rgba(ink,.32)`, 블러 없음, 그림자 shadowModal.

### 5.16 빈 상태 `EmptyState`
- 아이콘 48 원, `--ws-sunken` 바탕, ink-2 22, 테두리 없음.
- 제목 17/24/600(h1 변형 24/32/600). 설명 14/22 muted, 최대 48ch.
- 버튼: 보조(기본) + 주(브랜드), 간격 8. 안쪽 56px 16px(compact 24px 8px).
- 새 카드를 겹쳐 놓지 않습니다.

### 5.17 배너·개인 영역·기타

| 요소 | 모양 |
|---|---|
| `.ws-banner` | 라운드 **8**, 안쪽 12px 16px, tone 바탕, 아래 `--ws-gap`, 제목 600 |
| `.ws-private` | 흰색 + `border: 1px solid var(--ws-line)`, 라운드 8, 아래 `--ws-gap` |
| `.ws-copy__value--box` | 라운드 6, panel, `box-shadow: inset 0 0 0 1px var(--ws-line)` |
| 타임라인 | 선 1px `--ws-sunken`. 점 10 + 3px 흰 고리(`box-shadow: 0 0 0 3px var(--ws-surface)`, components.css). 제목 14/22/600, 시간 12/18 muted |

### 5.18 차트

**공통**
- 격자: 가로 1px `--ws-sunken` 실선.
- **규칙: 격자(sunken) < 회색 막대·기준선(chart-muted) < 목표선(muted)**. 회색 막대는 실제 데이터(지난달 PPM 등)라 격자보다 진해야 합니다.
- 기준선: 1px `--ws-chart-muted`. 목표선: 1px `--ws-muted` 실선. 축 글자 12/16 muted.
- 툴팁 `.ws-tip`: ink 바탕, 흰 12/18, 라운드 8, shadow-pop, 값 600.
- 범례 키 10 사각 라운드 3, 범례 값 600 ink.
- [표로 보기] 표 `.ws-charttable`: 머리 13/20/400 ink-2, 행 선 `--ws-sunken`.

**막대 `SimpleBarChart`**
- 강조 하나: `highlightKey` 막대 `--ws-chart-accent`, 나머지 **`--ws-chart-muted`**(그대로). 강조 막대 위 값 라벨 13/18/600 ink.
- 데이터 끝 라운드 **6**, 기준선 쪽 직각, 두께 ≤24(짝 막대 ≤16).
- 비교형: 이전 chart-muted, 이번 accent(유지).

**StackedShareBar**: 높이 기본 10, 양끝 알약(첫 조각 `999px 0 0 999px`, 끝 조각 `0 999px 999px 0`), 조각 사이 2px. 데이터 0이면 트랙 `--ws-sunken`.

**Meter**: 8h 알약. 트랙: 강조색이면 **`--ws-sunken`**, tone이면 tone-bg. 라벨 14/22/400 ink-2, 값 14/22/600 ink.

**DonutChart(새, `src/components/ringCharts.tsx`)** — 시그니처는 8장.
- 지름 `size`(기본 160), 두께 `thickness`(기본 20), 12시에서 시계 방향.
- 조각은 SVG `<path>` 고리 조각(바깥 호 + 안쪽 호)으로 그리고 사이에 2px 틈. 한 조각뿐이면 `<circle>` 고리.
- 색: `color` > `tone`(good은 `--ws-good-fill`, 나머지 `--ws-{tone}-mark`) > `slot`(other는 chart-muted) — StackedShareBar와 같은 규칙(`segmentColor()`로 공유).
- 가운데: `centerValue` 24/32/600 ink, `centerLabel` 13/20 muted.
- 범례 `ul.ws-legend`(1열): 키 + 이름 + "%·값".
- 6조각 이상이면 앞 4조각 + "기타"로 접습니다.
- hover하면 `.ws-tip`(마우스만, Tab 자리 없음). 묶음 `role="img"` + `aria-label`(항목별 값·%). `ChartFrame` [표로 보기](항목·비중(%)·값) 포함.
- 배치: `div.ws-donut`(`container-type: inline-size`) 안에 flex row(도넛 + 범례, gap 24). **안쪽 폭 360px 미만이면 세로**(범례가 도넛 아래, 도넛 가운데 정렬). 범례 이름은 말줄임 → 390 모바일에서도 가로 넘침 없음.

**Gauge(새, 같은 파일)** — 시그니처는 8장.
```
div.ws-gauge
  span.ws-gauge__label            {label} 14/20/400 ink-2 (KPI 라벨 자리)
  div.ws-gauge__dial[role=progressbar][aria-label={label}][aria-valuemin=0][aria-valuemax={max}][aria-valuenow={value}][aria-valuetext]
    svg viewBox="0 0 160 86"     (CSS width:100%; max-width:{width}px; height:auto)
      트랙 호(--ws-sunken) + 값 호(tone mark 또는 --ws-chart-accent), 두께 12, 양끝 round cap
    span.ws-gauge__value         {valueText} 24/32/600 ink, 호 안 아래 가운데(absolute)
  span.ws-gauge__caption          {caption} 13/20 muted (있을 때)
```
- 반원 180°, 기본 폭 160, 다이얼 높이 96 이하.
- `aria-valuetext` = `caption ? "{valueText}, {caption}" : valueText`(목표 포함).
- 표 쌍둥이는 두지 않습니다(값 글자가 곧 데이터).

**히트맵**: 새 컴포넌트를 만들지 않습니다. 설비 보드 `.in-cells`를 히트맵 칸처럼 다듬습니다(라운드 8, tone 바탕, 아이콘 + 글자).

### 5.19 홈: '오늘 할 일' 히어로, 위젯 두 줄기, 오른쪽 레일

**머리**: 5.4 인사말 변형. 기간 세그먼트는 오른쪽.

**배치(바뀜)**: 첫 줄 `CardGrid.wh-home`을 없애고 위젯 전체를 한 `MasonryGrid`로 그립니다.
```
MasonryGrid.ws-masonry.wh-home.wh-flow  balance
  items = [
    { key: "hero",  node: <HeroCard title="오늘 할 일" pill demo>…</HeroCard>, est: 340 },     full 아님
    { key: second,  node: <WidgetSlot id={second} pill period/>, est: estOf(second) },           full 아님(L이어도 반 폭)
    ...("today" 카드, 1440 미만일 때) , ...below(지금처럼 L은 full)
  ]
```
- `.wh-flow`는 1024 이상에서 `grid-template-columns: minmax(0,5fr) minmax(0,7fr)`(home.css). 1024 미만은 지금처럼 한 줄기.
- 히어로는 왼쪽 첫 칸, 두 번째 위젯은 오른쪽 첫 칸입니다. 그다음 카드부터 MasonryGrid가 더 짧은 줄기 아래에 놓습니다(히어로 아래 = 다음 위젯).
- 위젯이 없으면 히어로 혼자 전체 폭입니다(드문 경우).
- `.wh-flow`의 위 여백은 0(위에 CardGrid가 없음). `.ws-grid.wh-home > .ws-card--pill` 늘리기 규칙은 지웁니다. 알약은 히어로와 두 번째 위젯 2개 그대로.
- DOM 순서 = 보이는 순서(히어로 → 두 번째 → 나머지).

**히어로 본문 `.wh-hero`**(목표: 1440에서 줄 2개일 때 360px 이하)
- 카드 안쪽 20px 24px, 머리 아래 12.
- `BigNumber` 36/44/600(라벨 14/20/400 on-brand-2, 단위 16/24/600).
- 줄 `.wh-hero__row`: 44h, 라벨 14/22/400 on-brand-2, 값 18/26/600 on-brand + `small` 13/600 on-brand-2, 줄 사이 hero-line, hover 바탕 hero-line(라운드 8). 위 여백 12.
- 꼬리 `div.wh-hero__foot`(새, TodayHero.tsx): 위 1px hero-line, 위 안쪽 12, flex space-between wrap gap 8 12. 왼쪽 참고 링크 `ul.wh-hero__aside`(13/20 on-brand-2, `strong` 600 on-brand), 오른쪽 CTA.
- CTA `.wh-hero-btn`: **36h 흰 알약**, 안쪽 0 16, 브랜드 글자 14/20/600.
- 빈 문장 `.wh-hero__empty`: 17/24/600 on-brand.

**아래 위젯**
- 위젯 카드는 SectionCard 규칙. 목록 위젯 숫자 머리 `.wh-head`: 28/36/600 숫자 + 14/20/600 단위 + 14/20/400 라벨 ink-2. 소제목 `.wh-sub`: 13/20/600 muted.
- 현장 등록 큰 버튼 `.wh-action`: 88h, 라운드 8, 흰색 + `border: 1px solid var(--ws-line)`(장식 outline 대신), 아이콘 40 원 brand-weak.
- 위젯 링크 버튼 `.wh-linkbtn`: 36h 알약, 흰색 + `border: 1px solid var(--ws-line)`, 14/20/400 ink-2. `.wh-linkbtn--primary`(AI 연결·ARA 카드)는 **채우지 않고** `.ws-rowact`와 같은 모양(흰 알약, `--ws-brand-text` 600).
- '설비 상태' 위젯: StackedShareBar 대신 **DonutChart**(호출 식은 8장).
- 숫자 위젯(figureWidget)은 StatTile 새 모양을 그대로 받습니다(아이콘 원은 쓰지 않음, JS 예산).

**'승인 대기' 위젯 행(approval-inbox, 비평 반영)**
```
ul.ws-list.wa-list (container-type: inline-size)
  li.wa-row   grid: [main] [acts];  grid-template-columns: minmax(0,1fr) auto; column-gap 12; padding 10px 0; min-height 64
    div.wa-row__main
      span.wa-row__line: span.ws-tag{kindLabel} + Link.wa-row__title 14/22/600 ink 말줄임
      span.wa-row__sub 13/20 muted 한 줄 말줄임(지금 2줄 → 1줄)
    div.wa-row__acts  flex column, align-items:flex-end, gap 2
      div.wa-row__primary: Button.ws-rowact {primary.label} [+ Button type="text".ws-rowact-text {secondary.label}]
      div.wa-row__minor:   Link.wa-link.ws-rowact-text {editLabel} + Button type="text".ws-rowact-text "나중에"
```
- **`type="primary"`를 지웁니다**(채운 버튼 0개). 주 동작은 `.ws-rowact`(흰 알약, 브랜드 글자 600). 보조 RPC(규칙 후보의 '이번만')와 '고치기·수정 요청·다른 담당', '나중에'는 글자 버튼 `.ws-rowact-text`(14/20/400 ink-2).
- 버튼 순서(DOM·Tab)는 지금과 같습니다: 주 → 보조 → 고치기 → 나중에. `aria-label`·로딩·비활성 로직은 그대로.
- 카드 안쪽 폭 400px 미만(`@container`)이면 한 열: 동작 묶음이 제목 아래 한 줄(왼쪽 정렬, 줄바꿈 허용).
- 모바일(≤767)은 지금 규칙 유지(동작 전체 폭, 44h, 주 동작 flex 1).
- 종류 칩 `.wa-count`: 28h 알약, `border: 1px solid var(--ws-line)`, 13/20/400 ink-2, 숫자 `b` 600 ink. hover brand-weak.
- 목표: 1440 TR 공장장 홈에서 카드 높이 **640px 이하**(지금 약 780). `WIDGET_LAYOUT["approval-inbox"].est`를 620으로.

**오른쪽 레일**(1440 이상): 흰 블록 3개(필독 공지, 오늘 일정, 다가오는 회의). 블록 제목 15/22/600, 행 48h.

**1440 미만**: '오늘' SectionCard(M)가 그대로 나옵니다(MasonryGrid 셋째 칸).

### 5.20 모바일 탭 바·모바일 배치

**탭 바 `.ws-tabbar`**: 흰색, 위 1px line, 64 + 안전 영역. 아이콘 22를 56×32 알약 안에. 켜짐: 알약 brand-weak, 글자 brand-text 600, 위 2px 브랜드 막대(유지). 꺼짐: muted 400, 13.

**모바일 배치**
- 상단 바 56, 흰색, 아래 선. 아이콘 버튼 테두리 없음.
- 캔버스 `--ws-panel`, 가장자리 16, 카드 간격 12, 카드 안쪽 20.
- StatRow는 1열(칸 사이 가로선). KpiStrip은 2열.
- FilterBar는 가로 스크롤 한 줄(유지).
- 표는 ListRows(흰 상자, 1px sunken, 라운드 12).
- 서랍은 아래 시트(위 라운드 16).

---

## 6. 화면 묶음별 메모

**home 그룹(G4)**: home, login, more, notifications, notification-settings, search(+CommandMenu), not-found
- `home.css` 전체에 위 값을 적용합니다(5.19).
- 로그인: 테넌트 고르기 `button.wh-tenant` 타일(카드 밖)은 흰색, 1px line, **라운드 12**, 고른 것은 브랜드 2px 테두리. 사람 고르기 `.wh-persona`(SectionCard 안)는 **라운드 `var(--ws-radius-control)`(8)**, 고른 것은 brand-weak 바탕. 지금 448×56(1440)·318×56(390)이라 nestedLook 높이 기준(64)에 8px 여유뿐이므로 안쪽 여백을 늘리지 않고 이름은 한 줄 말줄임.
- CommandMenu: 모달 라운드 12, 입력줄 52h + 아래 선, 항목 44h 라운드 8, 켜진 항목 brand-weak.
- 알림 종류 아이콘: 36 원, brand-weak.
- 검색 화면 `Input.Search enterButton="검색"`: 전역 버튼·입력이 모두 라운드 8이라 이어 붙인 모양이 맞습니다. 알약 문맥 안에 두지 않습니다.

**industry 그룹(G5)**: `industry.css`
- 히어로(I-06 '오늘 라인', I-18 '가장 가까운 법정 일정'): `align-self: start`(components.css)라 늘어나지 않습니다. 히어로 링크 `.in-hero-link` 32h 알약 + `border: 1px solid var(--ws-hero-line)`, CTA `.in-hero-cta a` 36h 흰 알약 브랜드 글자 600. 숫자는 BigNumber 36/44.
- 설비 칸 `.in-cells`: 라운드 8, tone 바탕, 아이콘 + 글자.
- 로트 사슬 `.in-node`: 흰색 + 1px line, 라운드 8.
- 현장 등록 종류 버튼 `.in-kind`: 88h, 라운드 12, 흰색 + 1px line. 눌림은 brand-weak + 브랜드 2px 테두리.
- 아래 고정 바 `.in-bar`: 흰색 + 위 1px line.
- 품질 현황: '공정 지표' 카드를 `KpiStrip`(카드 3장)으로 바꾸고 '초중종물 실시율' Meter를 **Gauge**로(호출 식은 8장).

**collab·work·admin 그룹(G6)**: `collab.css`, `work.css`, `as.css`
- 달력: 오늘 날짜 28 원(브랜드 바탕, on-brand 글자), 칸 선 `--ws-sunken`.
- 조직도 노드 `.cb-node`: 흰색 + 1px line, 라운드 8.
- 결재 단계 표시 `.cb-step__mark`: 24 원, tone bg + fg.
- 공지 확인 바 `.cb-stickybar`: 흰색 + 1px line 테두리, 라운드 12.
- ARA 말풍선 `.as-bubble`: 라운드 12, 한 모서리 4.
- 테마 미리보기 `.as-preview*`: 새 카드·버튼 모양(미리보기는 `themeCssVars`를 인라인으로 받으므로 새 변수 `--ws-sunken`·`--ws-shadow-raise`도 자동으로 들어감).
- 행 안 `.ws-card__more` 링크(메일함 179행, 템플릿 123행, 결과물 상세 185행)는 G3 규칙에 따라 테두리 없는 13/20/400 글자 링크로 남습니다(5.9). 이 세 파일은 고칠 필요가 없습니다.

**모든 페이지 CSS 공통 규칙(G4·G5·G6)**

| 바꿀 것 | 규칙 |
|---|---|
| 라운드 | 28·20 → `var(--ws-radius-card)`(12). 16 → 페이지 최상위 상자 12, 카드 안 8. 12·10 → `var(--ws-radius-control)`(8) |
| 굵기 | 3.1 표. 제목·숫자의 700 → 600. 라벨·메타·칩·표 글자의 600 → 400 |
| 카드 안 옅은 상자 | 라운드 ≤8 |
| 선 | 캔버스 위 상자 테두리 `--ws-sunken`. 카드 안 구분선 `--ws-sunken`. 버튼·칩·흰 면 위 경계 `--ws-line` |
| 포커스 받는 요소의 1px 테두리 | `border`(또는 theme 파일 안 `box-shadow: inset`). 장식 `outline`을 쓰면 같은 파일에 `html <선택자>:focus-visible { outline: 2px solid var(--ws-brand); outline-offset: 2px; }`(히어로 안이면 `--ws-on-brand`) |
| hover | 흰 면 위 `--ws-hover`, 캔버스 위 `--ws-sunken`. 선택·눌림만 brand-weak |
| 행 안 버튼 | 3.6(`.ws-rowact`·`.ws-rowact-text`, 채운 버튼 없음) |
| `type="primary"` 점검 | 지금 페이지에 94곳. **남기는 곳**: PageHeader `actions`의 주 버튼 1개, 서랍·모달 꼬리의 확인 버튼 1개, 폼(입력 + 제출) 안 제출 버튼 1개. **바꾸는 곳**: 표 칸·목록 행·칸반 카드·카드마다 반복되는 버튼 → `type` 지우고 `className="ws-rowact"`(동작·aria·loading 그대로) |
| 간격 | `var(--ws-gap)`, `var(--ws-card-pad)` |
| 금지 | 9장 '글자로도 쓰면 안 되는 것' |

---

## 7. 병렬 구현 그룹(같은 작업 트리, 파일 소유가 겹치지 않음)

| 그룹 | 소유 파일 |
|---|---|
| G1 theme | `src/theme/{tokens.ts, tenants.ts, derive.ts, cssVars.ts, antdTheme.ts, global.css}`, `src/tenants/types.ts`, `README.md`, `tests/unit/rules.test.ts` |
| G2 shell | `src/layout/**`, `src/theme/layout.css` |
| G3 components | `src/components/**`(새 `ringCharts.tsx` 포함), `src/theme/components.css`, `src/app/Kit.tsx` |
| G4 home | `src/pages/{home,login,more,notifications,notification-settings,search,not-found}/**` |
| G5 industry | `src/pages/{ops-home,partners,partner-detail,contacts,sales-pipeline,quotes,field-report,orders,production,equipment-board,quality,claims,claim-detail,equipment,materials,lot-trace,master-data,safety,safety-risk,safety-review}/**` |
| G6 collab·work·admin | `src/pages/{docs,artifact-detail,templates,correction-rules,knowledge,glossary,mail-inbox,notices,notice-detail,calendar,approvals,people,org-chart,company-about,projects,project-detail,work-list,work-board,work-review,task-detail,meetings,meeting-detail,meeting-inbox,decisions,ara-home,ara-coach,ara-privacy,my-profile,my-ai,admin-company,admin-modules,admin-theme,admin-ai,admin-data,admin-members,admin-audit}/**` |

**아무도 바꾸지 않는 파일**: `scripts/check-rules.ts`(굵기 500 불채택), `src/app/{App,routes,pageReady,TenantBoundary,resolvePersona,routeContext}.tsx/ts`, `src/lib/**`, `src/modules/**`, `src/data/**`, `src/types/**`, `tests/e2e/**`, `tests/unit/{widget-layout,hero}.test.ts`, `vite.config.ts`, `index.html`, `src/theme/{color.ts,font.css,font-public.css}`.

## 8. 그룹 사이 약속(만드는 쪽 → 쓰는 쪽)

| 이름 | 만드는 그룹 | 값·모양 | 쓰는 그룹 |
|---|---|---|---|
| `--ws-sunken` | G1 | TR #EEEFF4, CRATA #EBF1F0 | 모두 |
| `--ws-panel`, `--ws-line` 새 값 | G1 | 4.1 표 | 모두 |
| `--ws-shadow-raise` | G1 | `0 0 0 1px rgba(ink,.06), 0 1px 2px rgba(ink,.06)` | G2·G3(theme 파일 안에서만) |
| `--ws-hover` | G1 | = panel | 모두 |
| `--ws-gap` | G1(global.css) | 20 / 16(≤1279) / 12(≤767) | 모두 |
| `--ws-card-pad` | G1(global.css) | 24 / 20(≤767) | 모두 |
| `--ws-row-h` | G1(global.css) | 52 / compact 40 | G3 |
| `--ws-radius-*` | G1 | **4.3 표**(panel 16, card 12, bubble 12, control 8, input 8, chip 6, pill 999, bar-end 6) | 모두 |
| `--ws-w-content-max` | G1 | 1320 | G2 |
| `.ws-t-title-page.ws-t-greeting`, `.ws-t-subhead`, `.ws-t-eyebrow` | G1(global.css) | 4.5 표 | G3·G4·G5·G6 |
| 알약 선택 초점 | G1(global.css) | 기존 `html .ant-select:has(input:focus-visible){…border-radius:8px}` 다음 줄에 `html :is(.ws-topbar,.ws-filterbar,.ws-card__actions,.ws-page-header__side,.ws-toolbar,.ws-card--hero) .ant-select:has(input:focus-visible) { border-radius: 999px; }`(특이도 0,3,2 > 0,2,2) | G2·G3가 그 문맥에 Select를 둠 |
| 알약 문맥의 `.ant-btn`·`.ant-select` 999 | G2(`.ws-topbar`), G3(나머지 문맥) | 3.7 | G4·G5·G6(문맥 안에 두기만) |
| `.ws-demo-badge--topbar` 모양 | **G3**(components.css) | 5.11 | G2(TopBar가 렌더) |
| `StatTile` `icon?: ReactNode`, `iconTone?: Tone \| "brand"` | G3 | 5.10 | G5·G6(선택) |
| `.ws-iconcircle[data-tone]`, `.ws-iconcircle--sm`, `.ws-icontile` | G3 | 5.10·5.12 | G4·G5·G6 |
| `KpiStrip`, `KpiCard`(+`KpiStripProps`, `KpiCardProps`) | G3, `@/components`에서 내보냄 | 아래 시그니처 | G5(품질), G6(선택) |
| `SectionCard` `subtitle?: string` → `p.ws-card__sub` | G3 | 5.9 | G4·G5·G6 |
| `DonutChart`, `Gauge`(+`DonutChartProps`, `GaugeProps`) | G3, `ringCharts.tsx` → `@/components` | 아래 시그니처 | G4(설비 상태), G5(품질) |
| `segmentColor()` | G3 `charts.tsx` export | StackedShareBar 색 규칙 | G3 내부(ringCharts) |
| `.ws-rowact`, `.ws-rowact-text` | G3(components.css) | 3.6 | G4(승인 대기), G6(행 안 버튼, 선택) |
| `.ws-toolbar` | G3 | 5.6 | G5·G6(선택) |
| `.ws-tray` | G3 | `--ws-sunken`, 라운드 10, 안쪽 8. **카드 안 금지** | G5·G6(선택) |
| `.ws-card__more` 두 모양 | G3 | 머리 안 = 알약, 머리 밖 = 글자 링크 | G6(행 안 링크 그대로) |
| `.ws-page-header__eyebrow`, `.ws-page-header--greeting` | G3 | 5.4 | G4(읽기만) |
| `.ws-rail__block`, `.ws-rail__title` | G2 | 5.1 | G2 내부(RightRail) |

**정확한 시그니처**(G3가 그대로 만들고, G4·G5가 그대로 부릅니다)
```ts
// src/components/ringCharts.tsx
import type { StackedShareBarProps } from "./charts";
import type { Tone } from "@/theme/tokens";

export interface DonutChartProps {
  segments: StackedShareBarProps["segments"];
  unit: string;
  ariaLabel: string;
  centerValue?: string;
  centerLabel?: string;
  /** 지름 px, 기본 160 */
  size?: number;
  /** 고리 두께 px, 기본 20 */
  thickness?: number;
}
export function DonutChart(props: DonutChartProps): JSX.Element;

export interface GaugeProps {
  value: number;
  max: number;
  /** 위 라벨(보이는 글자) + 접근성 이름 */
  label: string;
  /** 호 안 값 글자. 기본 `${formatNumber(value)} / ${formatNumber(max)}` */
  valueText?: string;
  /** 아래 13/20 muted 한 줄. aria-valuetext 뒤에도 붙음 */
  caption?: string;
  /** 채움 = tone mark. 없으면 chart-accent */
  tone?: Tone;
  /** 최대 폭 px, 기본 160 */
  width?: number;
}
export function Gauge(props: GaugeProps): JSX.Element;

// src/components/figures.tsx (추가)
export interface KpiStripProps { title?: string; demo?: boolean; ariaLabel?: string; children: ReactNode }
export function KpiStrip(props: KpiStripProps): JSX.Element;
export interface KpiCardProps { children: ReactNode }
export function KpiCard(props: KpiCardProps): JSX.Element;  // = SectionCard as="div" className="ws-kpi"(aria-label 없음: 안의 라벨 글자가 이름)
// StatTileProps에 추가
//   icon?: ReactNode;  iconTone?: Tone | "brand";   (기본 "brand")

// src/components/index.ts (추가)
export { DonutChart, Gauge, type DonutChartProps, type GaugeProps } from "./ringCharts";
export { KpiStrip, KpiCard, type KpiStripProps, type KpiCardProps } from "./figures";  // 기존 figures 줄에 합침
```

**호출 식**
```tsx
// G4: src/pages/home/widgets/mfg-equipment-status.tsx (StackedShareBar 자리)
<DonutChart
  segments={d.segments}
  unit="대"
  ariaLabel={`오늘 ${d.shiftLabel} 설비 ${formatNumber(d.total)}대 상태`}
  centerValue={`${formatNumber(d.total)}대`}
  centerLabel="전체 설비"
/>

// G5: src/pages/quality/index.tsx ('공정 지표' SectionCard + StatRow 자리)
<KpiStrip title="공정 지표" demo>
  <KpiCard>
    <StatTile label="공정 불량률" value={…지금 식 그대로} unit="%" delta={…지금 식 그대로} />
  </KpiCard>
  <KpiCard>
    <Gauge
      label="초중종물 실시율"
      value={last(k04)?.value ?? 0}
      max={100}
      valueText={`${formatNumber(last(k04)?.value ?? 0)}%`}
      caption={`목표 100% · 지난달 ${formatNumber(last(k04, 2)?.value ?? 0)}%`}
    />
  </KpiCard>
  <KpiCard>
    <StatTile label="미결 시정조치" value={cas.rows.length} unit="건" caption="8D와 간이 시정조치를 합쳤어요" />
  </KpiCard>
</KpiStrip>
```
`KpiStrip`은 `CardGrid`의 자식으로 둬도 됩니다(카드가 아니라 `--span-d` 기본 12로 한 줄 전체).

**순서**: G3은 새 타입·내보내기(위 시그니처, StatTile props, SectionCard `subtitle`)를 **가장 먼저** 넣습니다. G4·G5가 먼저 끝나서 `tsc`가 이 이름을 못 찾으면 G3 쪽 오류이므로 임시 대체물을 만들지 말고 G3 반영 뒤 다시 돌립니다.

## 9. 수용 기준 체크리스트

**글자로도 쓰면 안 되는 것(`check-rules.ts`가 주석·문자열까지 검사)**: `src/` 안 어디에도 `gradient(`, `dashed`, `stroke-dasharray`/`strokeDasharray`, `backdrop-filter`, `filter: blur`, 이모지를 쓰지 않습니다. `src/theme/` 밖에서는 `box-shadow`/`boxShadow`와 hex처럼 보이는 `#` + 3~8자 16진 글자(예: `#add`, `#bad`, `#fff`, SVG id·URL 조각 포함)를 쓰지 않습니다. "점선 안 씀" 같은 메모 주석도 걸리니 쓰지 않습니다. 굵기는 400·600·700만, 아이콘은 Outlined만.

**자동 검사(각 그룹)**
- [ ] `npx tsc -b --pretty false` 통과.
- [ ] `npm run check` 통과.
- [ ] `npm test` 통과(테마 대비·sunken 대비·derive near ±2, 위젯 크기, hero 문장).

**스모크(검증 단계)**: 두 테넌트 × 1440·390 × 모든 경로
- [ ] console.error 0, h1 정확히 1, `[data-demo-badge]` 있음, 가로 넘침 없음, `[data-card] [data-card]` 0, `nestedLook` 0, 히어로 ≤1, 알약 ≤3.
- [ ] 초점: 홈 `a.ws-nav__link`·`a.ws-card__more` 초점선이 보임. `/work`·`/docs` 45번 Tab 안에 정렬 머리, 모든 초점에 선.
- [ ] JS 예산(gzip): 홈 ≤455KB(직전 451.8 — 이번 TSX 증가는 합쳐 1.5KB 이하), `/work`·`/docs` ≤560, `/ops/quality` ≤560. `ringCharts.tsx`는 1단계 홈 경로(home/index, TodayHero, widgetKit, approval-inbox, mfg-field-feed, mfg-claims-8d)에서 import하지 않음.
- [ ] **전체 단계 홈**(도넛을 실제로 그리는 유일한 화면): 새 브라우저 컨텍스트(저장 켬)에서 TR `R_CEO`로 `#/admin/modules`를 열어 도입 단계를 '전체'로 바꾸고, `?tenant=tr-technology&as=R_PLANT_MGR&latency=0#/`를 1440·390에서 열어 위 스모크와 같은 평가(console.error, nestedLook, 가로 넘침, 카드 안 카드)를 돌립니다. '설비 상태' 도넛이 보이고 390에서 범례가 도넛 아래로 내려갑니다.
- [ ] 개발 서버 `#/__kit`에 DonutChart·Gauge·KpiStrip 예시가 있고 콘솔 오류가 없습니다.

**눈으로 확인(1440 와이드, TR 공장장·CRATA 대표, 그리고 1280·1101·768 폭)**
- [ ] 흰 사이드바(오른쪽 선)와 흰 상단 바(아래 선)가 회색 캔버스를 'ㄱ'자로 감쌉니다. 라운드 28 패널이 없습니다.
- [ ] 카드는 흰색 + 거의 안 보이는 선 + 라운드 12, 그림자 없음입니다. 진한 선으로 둘린 카드가 없습니다.
- [ ] **히어로 높이 ≤ 360px(1440, 줄 2개), 브랜드 면 아래 빈칸 없음**(히어로 아래에 바로 다음 위젯 카드).
- [ ] **'승인 대기' 카드에 채운(남색·청록) 버튼이 0개**이고 높이 ≤ 640px(1440 TR 공장장).
- [ ] 화면의 짙은 면은 히어로 1장 + 머리 주 버튼 1개뿐입니다. 알약 카드 위에 검정 칩이 없습니다.
- [ ] 제목·숫자만 600이고 메뉴·탭·칩·표 머리·표 이름 칸은 보통 굵기입니다. 본문 15px.
- [ ] 툴바·머리·카드 머리의 버튼·선택 상자·검색은 알약, 서랍·모달·폼의 버튼·입력은 라운드 8로 서로 맞습니다.
- [ ] 켜진 메뉴는 brand-weak, 3px 막대, 600. hover는 무채색.
- [ ] 표 머리는 네 모서리 둥근 회색 띠(아래 선 없음), 행 선은 옅고 줄무늬 없음, 쪽 넘김은 오른쪽 아래 원형이고 현재 쪽은 회색(브랜드 채움 없음).
- [ ] 칸반은 회색 트레이 레인 안에 흰 카드.
- [ ] KPI는 숫자 옆 같은 줄에 증감 칩, 아래 흐린 문장. 묶음 KPI는 짧은 세로선. 품질 현황 '공정 지표'는 KPI 카드 3장 띠이고 높이가 같습니다(게이지 카드 포함, 위 정렬).
- [ ] 막대 차트: 강조 막대 하나 + 회색 막대가 격자보다 분명히 진합니다. 목표선은 진한 실선.
- [ ] 오른쪽 레일은 흰 블록 3개.
- [ ] **상단 바 겹침 없음**: 1280·1101·768에서 `.ws-topbar__left`의 오른쪽 끝이 `.ws-topbar__right`의 왼쪽 끝보다 왼쪽에 있습니다. 1279 이하에서 검색은 원형 아이콘입니다.
- [ ] 390 모바일: 흰 상단 바·탭 바, 회색 캔버스, 카드 간격 12, StatRow 1열, 가로 넘침 없음.
- [ ] 두 테넌트(남색·청록) 모두 강조색이 하나만 보입니다. 상태색은 상태 표시에만 씁니다.
