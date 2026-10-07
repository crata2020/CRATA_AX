# CRATA 대시보드 스타일 가이드 (Orbix 기반)

Orbix Studio(인스타그램 @orbixdashboard)의 밝은 대시보드 문법을 분석해서, CRATA 업무사이트(`apps/worksite-next`)와 인사 앱(`apps/hr`)에 실제로 적용한 디자인 시스템이에요.

이 문서는 **최종 구현값** 기준이에요. `docs/worksite/07_orbix-redesign.md`(스타일 묶음의 `analysis/02_orbix-redesign-spec.md`와 같은 문서)는 옛 앱에 먼저 적용했던 1차 명세라서 숫자 일부(카드 라운드 12 등)가 다를 수 있어요. 둘이 다르면 이 문서와 `apps/worksite-next/src/styles/*.css`가 맞아요.

> **저장소 사본이에요.** 경로는 모두 저장소 루트 기준이에요. 디자인 시스템의 **원본**은 `apps/worksite-next/src/styles/`(tokens·base·ui·shell)와 `apps/worksite-next/src/ui/`(index·charts)예요. `apps/hr/src/styles/`, `apps/hr/src/ui/`는 같은 파일의 복사본이에요. `tokens.css`의 회사별 브랜드 블록과 `shell.css`의 `.navlink__n--live` 한 줄만 달라요. 이 문서와 원본 파일이 다르면 원본 파일이 맞아요. 완성 화면 캡처는 `docs/design/screenshots/{worksite,hr}/`에 있어요.

---

## 1. 한 줄 요약

흰 사이드바와 흰 상단 바가 'ㄱ'자 틀을 이루고, 그 안은 아주 옅은 회색 캔버스예요. 그 위에 1px 옅은 테두리·라운드 16의 흰 카드를 놓아요. 큰 숫자는 굵기 500으로 차분하게 쓰고 옆에 작은 증감 칩을 붙여요. 화면에서 가장 중요한 동작 하나만 짙은 버튼이고, 차트는 파스텔 캡슐 막대·둥근 도넛·부드러운 선이에요.

## 2. 원칙

1. **틀은 흰색, 바탕은 옅은 회색, 카드는 흰색.** 그림자는 떠 있는 것(메뉴·툴팁·서랍·토스트)에만 써요. 카드는 1px `--line` 테두리와 거의 없는 그림자로 구분해요.
2. **짙은 덩어리는 화면당 하나.** 주 동작 하나만 `btn--dark`예요. 화면 전체 동작이면 머리에, 체크한 줄에 대한 일괄 동작이면 일괄 띠 오른쪽 끝에 둬요(공고 상세). 켜진 세그먼트(검정 알약)는 예외로 둬요.
3. **강조색은 브랜드 하나.** 누르는 곳, 켜진 상태, 선택에만 써요. 상태색(good·warn·bad·info)은 강조색이 아니에요.
4. **숫자는 크고 조용하게.** 굵기 500, `letter-spacing -0.02em`, 고정폭 숫자(`.num`)로 쓰고, 단위는 작고 흐리게 붙여요.
5. **상태는 옅은 배경 알약(점 + 글자).** 색만으로 상태를 나타내지 않고 늘 글자를 함께 써요.
6. **컨트롤은 알약이나 라운드 12.** 툴바·카드 머리의 선택은 `pillselect`(“이번 주 ▾”), 보기 전환은 짙은 세그먼트나 트랙, 화면 구역은 밑줄 탭(아이콘 + 글자)으로 해요.
7. **아이콘은 lucide 선 아이콘**(stroke 1.7~1.9)이에요. 이모지는 쓰지 않아요.
8. **글은 해요체로 짧게.** 버튼은 하는 일을 그대로 적어요("업무 만들기" → 토스트 "만들었어요").
9. **모바일 390px에서 가로로 넘치지 않게.** 열이 많은 표는 767px 이하에서 thead를 숨기고 줄을 카드로 쌓아요(`apps/hr/src/pages/Position.css`). 열이 적은 표만 `.tablewrap` 안에서 가로로 스크롤해요. 격자는 12칸에서 1칸으로 접혀요. 터치 영역은 44px 이상이에요.
10. **모양은 같게, 구성은 용도대로.** 이 문서의 값과 부품은 그대로 쓰지만, 화면에 어떤 요소를 어디에 둘지는 그 화면을 쓰는 사람의 질문에서 정해요(`docs/codex/PLAYBOOK.md` 5.0). 레퍼런스와 완성 화면은 부품 모양과 밀도의 기준이지, 베낄 배치가 아니에요.

## 3. 토큰 (`apps/worksite-next/src/styles/tokens.css`)

### 색
| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--canvas` | #f6f6f8 | 본문 바탕 |
| `--surface` | #ffffff | 사이드바·상단 바·카드 |
| `--surface-2` | #fafafb | 표 머리, 호버 |
| `--sunken` | #f3f4f6 | 막대 트랙, 아이콘 원, 칩 바탕 |
| `--line` / `--line-2` | #ececf0 / #e3e4e8 | 카드 테두리 / 버튼·입력 테두리 |
| `--ink` / `--ink-2` | #17171c / #3f3f48 | 제목·숫자 / 본문 |
| `--muted` / `--faint` | #6b6b76 / #9a9aa6 | 보조 글 / 힌트 |
| `--dark` / `--dark-hover` | #1d1e24 / #2c2d35 | 짙은 버튼, 켜진 세그먼트, 토스트, 툴팁 |
| `--brand` / `--brand-ink` / `--brand-soft` / `--brand-line` | #3b4fd8 / #2f40b8 / #eef0fd / #d9ddfa | 강조(회사마다 바꿈) |
| `--good` / `--good-bg` / `--good-ink` | #16a34a / #e8f7ee / #157f3c | 좋음 |
| `--bad` / `--bad-bg` / `--bad-ink` | #e5484d / #fdecec / #b42328 | 나쁨 |
| `--warn` / `--warn-bg` / `--warn-ink` | #f08c2b / #fff1e3 / #b5560c | 주의 |
| `--info` / `--info-bg` / `--info-ink` | #3b82f6 / #eaf2ff / #1d5bd8 | 정보 |
| `--neutral-bg` / `--neutral-ink` | #f2f2f5 / #55555f | 기본 칩 |

**차트 파스텔(진한 / 옅은):**

| 색 | 진한 | 옅은 |
|---|---|---|
| coral | #f47174 | #fde4e4 |
| amber | #f5b83d | #fdf0d2 |
| green | #4cc38a | #d8f3e6 |
| cyan | #2ec5d3 | #d3f4f7 |
| violet | #a07cf0 | #ece4fd |
| blue | #5b8def | #dde8fd |
| orange | #f6924a | #fee6d5 |

옅은 색은 아이콘 원 바탕(`.tone-*`)과 막대 트랙에 써요.

### 모양·크기
| 토큰 | 값 |
|---|---|
| 라운드 | `--r-xs` 6, `--r-sm` 8, `--r-md` 12(버튼·입력), `--r-lg` 16(카드), `--r-xl` 20(서랍), `--r-pill` 999. 부품 안 고정값(색 네모 3, sm 버튼 10, 안쪽 상자 14 등)은 `docs/codex/PLAYBOOK.md` 6.2 허용 목록에 있는 것만 써요 |
| 그림자 | `--shadow-card`(거의 없음), `--shadow-pop`(메뉴·툴팁·서랍), `--shadow-dark`(짙은 버튼 안쪽 빛) |
| 글꼴 | Pretendard Variable(npm `pretendard@1.3.9`). 굵기는 400·500·600만 |
| 틀 | 사이드바 `--side-w` 268px, 상단 바 `--top-h` 68px, 카드 간격 `--gap` 20px(모바일 14px) |
| 본문 영역 | 패딩 28px 32px, 최대 1480px |

### 글자 크기
| 쓰는 곳 | 크기 / 줄높이 · 굵기 |
|---|---|
| 페이지 제목 | 26/34 · 500 (모바일 22/30) |
| 카드 제목 | 17/24 · 500 |
| 본문 | 14/21 |
| 보조 글 | 13 |
| 힌트 | 12 |
| KPI 숫자 | 34/40 · 500 (모바일 28) |
| 단위 | 15 · muted |

### 브랜드 바꾸기
`:root`(또는 `:root[data-tenant="…"]`)에서 `--brand`, `--brand-ink`, `--brand-soft`, `--brand-line` 네 개만 덮어써요.

흰 글자를 올리는 색이라 **대비 4.5:1 이상**이어야 해요. 예를 들어 #3b4fd8은 6.4:1, CRATA 청록 #0a7d70은 5.0:1이에요. #0e9384는 3.8:1이라 탈락했어요.

## 4. 앱 틀 (`apps/worksite-next/src/styles/shell.css`, 예시 `apps/worksite-next/src/shell/Shell.tsx`, `apps/hr/src/shell/Shell.tsx`)

- **사이드바(흰색, 오른쪽 1px 선)**
  - 회사 카드: 모노그램 네모, 이름, 한 줄 설명, ⇅
  - 메뉴 묶음: 회색 소제목 → 메뉴 줄. 높이 42, 아이콘 19px. 켜지면 `--brand-soft` 바탕과 `--brand-ink` 글자. 오른쪽에 개수 배지.
  - 아래쪽 진행 카드(promo): 제목, 한 줄 설명, 막대
  - 화면 높이가 960px 미만이면 메뉴가 촘촘해져요.
- **상단 바(흰색, 아래 1px 선, 높이 68)**
  - 왼쪽: 위치 표시 '묶음 / 화면'
  - 가운데: '물어보기' 알약(✦ 아이콘 + 문구 + ⌘K)
  - 오른쪽: '예시 데이터' 알약, 둥근 알림 버튼(주황 배지), 사람(아바타 + 이름 + 역할 + ▾)
- **반응형**
  - 1100px 이하: ⌘K와 사람 글자를 숨겨요.
  - 900px 이하: 사이드바가 서랍으로 바뀌고, 햄버거 버튼과 하단 탭(4~5개, 개수 배지)이 나와요.
- **페이지 머리(`.phead`)**: 왼쪽에 제목 h1 하나 + 짧은 설명(길면 두 줄로 접혀요. 제목 쪽 `.phead__main`이 먼저 줄어들어 버튼이 오른쪽 위에 남아요), 오른쪽에 동작(흰 버튼들 + 화면 전체 동작이면 짙은 버튼 하나). 767px 이하에서 버튼이 2개면 한 줄에 나란히, 3개 이상이면 짙은 버튼 한 줄 + 나머지 2열이고, 데스크 작업용 버튼(올리기·내보내기·연결)은 숨겨요.

## 5. 부품 (`apps/worksite-next/src/styles/ui.css` + React `apps/worksite-next/src/ui/index.tsx`)

| 부품 | 클래스 / 컴포넌트 | 규칙 |
|---|---|---|
| 버튼 | `.btn` `.btn--dark` `--brand` `--soft` `--ghost` `--sm` `--lg` `--pill` · `<Button variant size icon count>` | 기본은 흰 바탕 테두리 버튼(높이 40, 라운드 12, 아이콘 + 글자). 짙은 버튼은 화면당 하나. `count`는 버튼 안의 작은 숫자 알약 |
| 아이콘 버튼 | `.iconbtn` `--round` `--sm` `--plain` · `<IconButton label>` | 글자가 없으면 `label`이 필수(aria-label). `badge`는 주황 숫자 |
| 카드 | `.card` `.card__head/title/sub/actions/body/foot` · `<Card title icon sub actions flush foot>` | 머리: 제목 17/500 + 아래 설명 13, 오른쪽에 알약 선택이나 ⋯ 네모 버튼. 표·목록은 `flush` |
| 알약 선택 | `.pillselect` · `<PillSelect>` | “이번 주 ▾”. 실제 `<select>`를 투명하게 덮어 접근성을 지켜요 |
| 칩 | `.chip` `--good/bad/warn/info/brand/dark/outline` `--sm`, `.chip__dot` · `<Chip tone dot sm>` | 상태는 점 + 글자 |
| 증감 칩 | `.delta--good/bad/flat` · `<Delta value dir good>` | 숫자 바로 옆 ↗ 4%p. 색은 '좋은 방향'인지로 정해요 |
| KPI | `.kpi` + `.tone-*` 아이콘 원 52px · `<Kpi>` / `.kpicard` · `<KpiCard>` / `.kpigrid` 2×n / `.kpirow` 4칸 | 라벨(13.5 muted) → 큰 숫자 + 단위 + 증감 → 한 줄 설명(faint) |
| 세그먼트 | `.seg` `.seg__btn[aria-pressed]` · `<Segmented>` | 켜진 것만 짙은 알약, 나머지는 흰 테두리 |
| 트랙 | `.track` · `<Track>` | 회색 트랙 안 흰 칸(목록/보드 전환) |
| 밑줄 탭 | `.tabs .tab[aria-selected]` · `<Tabs>` | 아이콘 + 글자 + 흐린 개수, 켜지면 2px 짙은 밑줄 |
| 툴바 | `.toolbar` `.search` `.toolbar__spacer` | 개수 붙은 `Segmented`(또는 바로 위 `Tabs`) + 남는 폭을 채우는 검색 + 알약들(+ 짙은 주 버튼). 오른쪽이 비지 않아요 |
| 표 | `.table` `.tablewrap` `.cellmain` | 머리는 `surface-2` 띠, 줄 높이 넉넉히, 호버 시 옅게 |
| 아바타 | `.ava` `--sm/lg/xl`, `.avastack` · `<Avatar name>` `<AvatarStack>` | 이름 첫 글자와 이름 해시 색, 겹칠 때 -8px |
| 막대 | `.bar` `.bar--lg` `.stack` · `<Bar>` `<StackBar>` | 옅은 트랙 + 둥근 채움. 카드마다 색이 달라도 돼요 |
| 토글·체크 | `.toggle[aria-checked]` `.check` · `<Toggle>` `<Checkbox>` | |
| 입력 | `.field` `.input` `.textarea` `.select` | 포커스 시 브랜드 테두리 + 3px `brand-soft` 링 |
| 메뉴 | `.menu` `.menu__item` `.menu__label` · `<Menu trigger>` | 바깥 클릭·Esc로 닫혀요 |
| 툴팁 | `.tip`(짙은) `.tip--light`(흰) | 막대 차트는 짙은 툴팁, 선 차트는 흰 카드 툴팁 |
| 서랍 | `.drawer` `.scrim` · `<Drawer title foot>` | 오른쪽에서 떠 있는 라운드 20 판. Esc로 닫혀요. 머리·몸·바닥 3단 |
| 토스트 | `.toasts .toast` | 아래 가운데, 짙은 바탕. 900px 이하에서는 하단 탭 위에 떠요(`shell.css`) |
| 페이지 머리 | `.phead` · `<PageHead eyebrow title desc actions>` | 제목 쪽 `.phead__main`(`flex: 1 1 0`, 최소 360px)이 먼저 줄고 버튼은 오른쪽 위. 좁으면 버튼이 다음 줄 |
| 빈 상태 | `.empty` · `<Empty icon title>` | 회색 원 아이콘 + 제목 + 한 줄 안내 |
| 격자 | `.grid.g-12` + `.s-3`~`.s-12`, `.col` `.row` `.between` | 1279px 이하에서 3·4칸 → 6칸, 5~9칸 → 12칸. 767px 이하에서 모두 12칸 |
| 글 도우미 | `.num` `.muted` `.faint` `.small` `.xs` `.ellipsis` | `.num`은 고정폭 숫자 |

## 6. 차트 (`apps/worksite-next/src/ui/charts.tsx`, 외부 라이브러리 없이 SVG)

| 차트 | 모양 | 레퍼런스 |
|---|---|---|
| `LineChart` | 부드러운 선(단조 3차 보간이라 0 아래로 튀지 않음), 세로 격자, 오른쪽 y 라벨, 흰 카드 툴팁. `fill`이면 카드 높이에 맞춰요 | post_5, orbixcrm-growth-stats |
| `CapsuleBars` | 옅은 캡슐 트랙 + 채운 캡슐, 하나만 강조 + 짙은 툴팁 | post_3, ecommerce-ops-kpi |
| `Donut` + `Legend` | 조각 사이에 틈, 끝이 둥근 도넛, 가운데 큰 숫자, 범례는 색 네모 | hope-hr-analytics |
| `Gauge` | 반원 게이지, 구간 색 | post_3 (Compliance pulse) |
| `Heatmap` | 옅은 → 진한 한 색 | fleettrack-analytics |
| `Sparkline` | 작은 선 | — |

규칙:
- 색은 파스텔 팔레트에서 골라요.
- 강조는 하나만 해요.
- 라벨은 실제 값만 적어요.
- 차트 글자색은 토큰에서 가져와요.

## 7. 화면 문법: 레퍼런스 → 패턴

어떤 **부품**을 어느 레퍼런스에서 가져왔는지 적은 표예요. 새 화면의 배치는 이 표가 아니라 그 화면의 용도에서 정해요(원칙 10).

| 레퍼런스(저장소 밖: 스타일 묶음 zip의 `references/`) | 가져온 패턴 | 쓴 화면 |
|---|---|---|
| post_1, orbixcrm-projects-kanban-light | 옅은 회색 레인 4열(색 네모 + 이름 + 개수 + ⋯ +). 흰 카드에 제목·날짜·설명·진행 막대·체크/댓글/파일 수·아바타. 레인 끝 '+ 업무 추가' | 프로젝트 보드 |
| orbixcrm-milestones-calendar | 일정 머리(날짜 + 이전/오늘/다음), 오늘 세로선. 일정 편집기·드래그 같은 캘린더 도구는 버리고 '연결'로 | 프로젝트 일정 |
| projectflow-grouped-task-table | 상태별로 접히는 그룹 머리(▾ 색 네모 이름 개수) + 표 | 내 업무, 채용 지원자 표 |
| orbixcrm-time-tracking-table, fintech-transactions-table | 체크 열, 아이콘 셀, 마지막 열 동작 | 표 전반 |
| orbixcrm-add-project-drawer, add-project-dropdown-detail | 오른쪽 서랍: 알약 줄 → 큰 제목 입력 → 속성 줄 → 점선 파일 올리기 → 바닥 버튼 | 새 업무, 새 공고, 지원자 상세 |
| orbixcrm-growth-stats-kpis-charts | 2×2 KPI 묶음 + 선 차트 | 홈 '한눈에', 문서·학습 |
| post_3 (FinSight) | KPI 4장, 분할 막대, 반원 게이지, Getting started 체크 | 현장·품질, AI 연결 |
| orbixcrm-team-members-grid, mediflex-doctors | 파스텔 머리 + 큰 아바타 카드, 페이지 넘김 | 구성원, 채용 공고 카드 |
| orbixcrm-integrations-grid | 3열 카드: 모노 로고 네모, 이름, 설명, 토글 | 도구 연결 |
| hope-hr-analytics | 도넛 + 분포 막대, 큰 %. 월 달력(날짜 원, 오늘만 brand 채움, 빗금 = 예정)과 날짜 머리 '10월 15일(목)' 아래 일정 카드(제목·장소 · AvatarStack · outline 칩 2~3) 부품. 버림: 짙은 초록 칩(→ neutral/outline), 사진 | 구성원 분포, AI 추천 분포. 일정 카드 부품은 교육 회차 목록에 썼어요(어디에 둘지는 화면마다 정해요) |
| winx-add-product-form, fintech-accounts | 번호 매긴 폼 구역, 둥근 입력, 오른쪽 상태 열 | 설정, 지원서, 동의·보관 |
| orbix-ai-chat-home | 가운데 큰 질문 + 입력 상자 + 제안 칩 + 카드 3장, 은은한 파스텔 바탕 | ARA, 지원자 검사 |
| botrix-ai-command-center, ai-support-inbox-dark(밝게) | 대화 + 결과 카드, 목록 + 상세 받은편지함 | 인사이동 대화, 회의 |
| post_2 (Auralis) | 진행 중/검토 준비 목록 + 처리 단계 노드 | 회의 처리 단계 |

## 8. 접근성 기준

- 화면마다 h1은 하나예요.
- 글자 없는 버튼에는 `aria-label`을 붙여요.
- 포커스 링은 2px 브랜드색이에요.
- `prefers-reduced-motion`이면 애니메이션을 끄되, 깜빡임 같은 신호는 정지 상태(테두리 + '확정 전' 글자)로도 읽혀야 해요.
- 입력에는 라벨을 붙여요.
- 표·차트에는 글자 대안(aria-label, 범례 숫자)을 둬요. 표 칸 안의 숨김 글은 `.sr-only` 대신 `aria-label`로 줘요. base.css의 `.sr-only`는 `position:absolute`라 `.tablewrap` 밖으로 빠져나가 390px에서 넘쳐요.
- 모바일 터치 영역은 44px 이상이에요.

## 9. 다른 프로젝트에 넣는 법

원본은 저장소의 `apps/worksite-next/src/styles/`와 `apps/worksite-next/src/ui/`예요. 공통 부품을 고칠 일이 생기면 원본을 고친 뒤 `apps/hr` 같은 복사본에도 똑같이 옮겨요. 앱마다 따로 고치면 두 앱이 다른 제품처럼 보이기 시작해요.

### React(Vite 등)
1. 패키지를 설치해요: `npm i react@18 react-dom@18 react-router@7 lucide-react pretendard@1.3.9`(새 앱이면 `docs/codex/starter/`에서 시작하는 게 빨라요)
2. `apps/worksite-next/src/styles/`의 네 파일(tokens·base·ui·shell)을 새 앱의 `src/styles/`로 복사하고, 진입 파일(`src/main.tsx`)에서 **이 순서로** 불러와요.
   ```ts
   import "./styles/tokens.css"; // Pretendard @import 포함
   import "./styles/base.css";
   import "./styles/ui.css";
   import "./styles/shell.css";  // 사이드바·상단 바 틀이 필요할 때
   ```
3. `apps/worksite-next/src/ui/index.tsx`와 `charts.tsx`를 새 앱의 `src/ui/`에 복사해요. 외부 의존은 react와 lucide-react뿐이에요. 앱 틀은 `docs/codex/starter/src/shell/Shell.tsx`를 써요(`COMPANY`·`ME`·`NAV`·`PAGE_TITLE`만 바꿔요). `apps/hr/src/shell/Shell.tsx`는 인사 앱 데이터를 불러와서 그대로는 빌드되지 않아요.
4. 화면은 실제 페이지를 본보기로 만들어요(`Card` + `PageHead` + `KpiCard` + `Segmented`…).
   - 업무사이트: `apps/worksite-next/src/pages/`의 `Home`, `Tasks`, `Projects`, `Settings`
   - 인사 앱: `apps/hr/src/pages/`의 `Moves`, `Hiring`, `Position`, `People`, `Apply`
5. 브랜드를 바꾸려면 `tokens.css`의 `--brand` 네 변수만 덮어써요(흰 글자 대비 4.5:1 이상).

### React가 아닐 때
CSS 클래스만으로도 같은 모양이 나와요. 스타일 묶음 zip의 `preview/index.html`(저장소에는 없어요) 마크업을 그대로 쓰거나, 위 페이지들이 만든 DOM의 클래스를 따라 쓰면 돼요. 글꼴은 npm 대신 CDN을 써도 돼요.
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
```

### Tailwind·디자인 도구로 옮길 때
3장의 토큰 표를 그대로 옮기면 돼요(색 30개 + 차트 파스텔 14개, 라운드 6단계, 그림자 3개, 글자 크기 7단계).
