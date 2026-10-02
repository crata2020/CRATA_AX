# CRATA 업무사이트 공통 뼈대 (`apps/worksite`)

모든 회사가 같이 쓰는 업무사이트 뼈대입니다. 회사별 차이는 코드가 아니라 `TenantConfig` 데이터로만 줍니다.
지금 빌드는 **백엔드 없는 정적 데모**(해시 라우팅 + 메모리 데이터 공급자)이고, 두 테넌트를 오갑니다.

| 테넌트 | 성격 | 브랜드 | 업종 팩 |
|---|---|---|---|
| `tr-technology` (기본) | 첫 고객 (주)티알테크놀러지. 공개 자료만 사실로 씀 | 네이비 `#2D3C67` | 제조(생산·품질) |
| `crata-demo` | CRATA 내부 적용 가안 | 딥 틸 `#0B6E69`(가안) | 교육·컨설팅(영업·교육) |

정본 문서: [`docs/worksite/00_build-spec.md`](../../docs/worksite/00_build-spec.md)(화면·데이터·규칙) · [`05_tech-stack.md`](../../docs/worksite/05_tech-stack.md)(버전·구조).
**모든 숫자와 사람은 예시입니다.** 실존 인물 이름, 지어낸 실존 회사 사실, 제3자 이미지(레퍼런스 캡처·TR 로고)를 넣지 않습니다.

---

## 1. 실행

Node 22.12 이상. 패키지 버전은 모두 고정(`.npmrc` save-exact)이고 **새 패키지는 추가하지 않습니다**(필요하면 notes에 요청).

```bash
cd apps/worksite
npm ci              # 설치(package-lock.json 그대로)
npm run dev         # 개발 서버 http://localhost:5173/  (레지스트리 생성 → vite)
npm run typecheck   # tsc -b (strict)
npm test            # vitest(node 환경): 공급자·권한·홈 위젯 규칙·테마 대비
npm run build       # 레지스트리 생성 → tsc -b → vite build (dist/, 상대 경로라 어느 하위 경로에 올려도 동작)
npm run preview     # 빌드 결과 보기 http://localhost:4173/
npm run smoke       # Playwright: 2 테넌트 × 63 경로 × 데스크톱·모바일 (AS=R_OPERATOR npm run smoke 로 다른 인물)
npm run check       # 'AI 티' 정적 검사 + 바뀐 파일 소유자 표시
node scripts/check-ownership.ts --group work   # 내 그룹 소유 밖 변경이 있으면 실패
npm run gen         # config/worksite_modules.yaml → src/modules/registry.generated.ts
```

개발 모드에서만 열리는 **`#/__kit`** 화면에 공통 컴포넌트를 예시 props로 모두 모아 두었습니다. 쓰는 법은 여기서 먼저 보세요.
개발 모드 콘솔에서는 `__ws.data.getList({ resource: "tasks" })`, `__ws.store.rows("tasks")`, `__ws.seeds.groupsWithData`로 데이터를 볼 수 있습니다.

### URL 매개변수(해시 앞)

예: `index.html?tenant=tr-technology&as=R_PLANT_MGR&latency=0#/ops`

| 매개변수 | 값 | 뜻 |
|---|---|---|
| `tenant` | `tr-technology` · `crata-demo` | 테넌트(없으면 마지막 선택 → `tr-technology`) |
| `as` | 역할코드(예: `R_PLANT_MGR`, `R_EDU_STAFF`) | 누구로 보기(없으면 마지막 선택 → 테넌트 기본 인물) |
| `today` | `YYYY-MM-DD` | 데모 기준일(기본 2026-09-30) |
| `latency` | `0` | 가짜 지연(150~300ms) 끄기 — 스크린샷·테스트 |
| `persist` | `0` | 변경 내용 저장 끄기 |
| `empty` | `1` | 빈 상태 확인 모드(기준 리소스 몇 개 말고 0행) |

인물(역할코드): TR `R_CEO`(owner) · `R_PLANT_MGR`(reviewer, 기본) · `R_QA` · `R_SALES_PROD` · `R_ADMIN_PUR_ACC`(admin) · `R_DEV`(member) · `R_OPERATOR`(member, 생산 작업자 A)
CRATA `R_CEO` 홍길동(owner) · `R_OPS_ADMIN` 심청(admin) · `R_EDU_LEAD` 성춘향(reviewer, 기본) · `R_EDU_STAFF` 이몽룡 · `R_SSI_LEAD` 박흥부 · `R_ARA_LEAD` 전우치 · `R_ARA_DEV` 김선달

---

## 2. 구조

```
apps/worksite/
├─ scripts/  gen-registry.ts · check-rules.ts · check-ownership.ts
├─ src/
│  ├─ main.tsx · app/(App, TenantBoundary, routes, pageReady, routeContext, Kit)
│  ├─ routes/manifest.ts          63개 페이지 표 → 라우트 자동 연결(import.meta.glob)
│  ├─ layout/                     AppShell · SideNav · NavRail · TopBar · MobileTabBar · RightRail · PageGuard
│  ├─ components/                 공통 컴포넌트(index.ts에서 가져다 씀)
│  ├─ theme/                      토큰 · 테넌트 색 · deriveTenantTheme · antd 테마 · CSS (색 hex·그림자는 여기에만)
│  ├─ tenants/                    TenantConfig 타입 + crata-demo.ts · tr-technology.ts
│  ├─ modules/                    registry.generated.ts(생성) + resolveModules · buildNav · homeLayout · t()
│  ├─ providers/                  mockDataProvider(메모리) · araProvider(P 영역) · policy(행 범위) · store(변경분 저장) · resources(리소스 카탈로그)
│  ├─ data/seed/                  index(파이프라인) · types(계약) · anchors · reference(Foundation)
│  │                              + home.ts · work.ts · collab.ts · industry.ts · ara_settings.ts (그룹 소유)
│  ├─ lib/                        status · format · clock · rng · storage · url · refine(목록·동작 훅) · refineAntd(표·폼 훅) · safety · crisisWords · useBreakpoint
│  ├─ types/                      entities.ts(모든 리소스 행 타입) · relations.ts(meta.expand)
│  └─ pages/<dir>/index.tsx       63개 화면(그룹 소유) · pages/home/widgets/<id>.tsx 홈 위젯 38개(home 소유)
├─ notes/<group>.md               그룹 → 통합 담당 메모
└─ tests/ unit/(vitest) · e2e/smoke.spec.ts(Playwright)
```

---

## 3. 소유 규칙 (병렬 작업)

**페이지 개발자는 아래 두 곳만 고칩니다.**

1. `src/pages/<내 그룹의 dir>/**` — 화면, 화면 전용 하위 컴포넌트, 같은 그룹 안에서 함께 쓰는 코드
2. `src/data/seed/<내 그룹>.ts` — 시드 행 + 이름 있는 동작(rpc) + 셀렉터(sel) (+ ara_settings는 ARA 시드)

**그 밖의 모든 파일은 Foundation(통합 담당) 소유입니다.** 공통 컴포넌트·타입·토큰·공급자·라우트·테넌트 설정을 바꿔야 하면
**`notes/<내 그룹>.md`에 요청을 적고**, 필요하면 `src/pages/<내 dir>/_local/`에 임시로 만들어 "공통 승격 후보"라고 적습니다.
패키지는 추가하지 않습니다. 다른 그룹의 페이지 폴더는 import하지 않습니다(예외: TopBar가 부르는 `pages/search/CommandMenu.tsx`는 home 소유).

| 그룹 | 페이지 dir |
|---|---|
| home | home(+`home/widgets/*`), notifications, notification-settings, search(+`CommandMenu.tsx`), more, login, not-found |
| work | projects, project-detail, work-list, work-board, work-review, task-detail, meetings, meeting-detail, meeting-inbox, decisions |
| collab | docs, artifact-detail, templates, correction-rules, knowledge, glossary, mail-inbox, notices, notice-detail, calendar, approvals, people, org-chart, company-about |
| industry | partners, partner-detail, contacts, sales-pipeline, quotes, ops-home, field-report, orders, production, equipment-board, quality, claims, claim-detail, equipment, materials, lot-trace, master-data, safety, safety-risk, safety-review |
| ara_settings | ara-home, ara-coach, ara-privacy, my-profile, my-ai, admin-company, admin-modules, admin-theme, admin-ai, admin-data, admin-members, admin-audit |

PR 전에: `npm run typecheck && npm test && npm run build && npm run check && node scripts/check-ownership.ts --group <내 그룹> && npm run smoke`

---

## 4. 페이지 만드는 법

```tsx
// src/pages/work-list/index.tsx
import { Button } from "antd";
import { PageHeader, DataTable, FilterBar, useFilterBarState, DdayBadge } from "@/components";
import { optionsOf } from "@/lib/status";
import { useWorksite } from "@/app/TenantBoundary";
import type { Task } from "@/types/entities";

export default function Page() {
  const { persona, can } = useWorksite();
  const fbProps = { search: { placeholder: "업무 검색", fields: ["title"] }, chips: [{ param: "status", field: "status", options: optionsOf("tasks.status"), multiple: true }] };
  const fb = useFilterBarState(fbProps);
  return (
    <>
      <PageHeader title="내 업무" actions={can("tasks", "create").can && <Button type="primary">업무 만들기</Button>} />
      <FilterBar {...fbProps} />
      <DataTable<Task>
        resource="tasks" filters={fb.filters} isFiltered={fb.active} onClearFilters={fb.clear}
        sorters={[{ field: "due_at", order: "asc" }]} rowHref={(t) => `/work/tasks/${t.id}`}
        columns={[{ key: "title", title: "업무명", kind: "name" }, { key: "status", title: "상태", kind: "status", statusDomain: "tasks.status" }, { key: "due_at", title: "마감", kind: "dday" }]}
        mobileRow={(t) => ({ title: t.title, trailing: <DdayBadge date={t.due_at} /> })}
        empty={{ kind: "empty", title: "맡은 업무가 없어요", description: "프로젝트에서 할 일을 찾아볼까요?", action: { label: "프로젝트 보기", to: "/projects" } }}
      />
    </>
  );
}
```

- **라우트·권한은 이미 감싸져 있습니다.** `RouteFrame`이 `PageGuard`(모듈 꺼짐 → `module_off`, 권한 없음 → `forbidden`, 관리 화면은 owner·admin만, 검토함·분류 확인은 `approve`)와 문서 제목(`{페이지} · {회사}`)을 처리합니다. 더 엄격한 조건만 페이지에서 `<PageGuard action="approve">`로.
- **첫 요소는 `PageHeader`(h1 하나).** 홈만 `greeting`이 h1을 대신합니다. 상세 화면은 `back`, 하위 화면은 `tabs`(`to: "?tab=x"` 또는 경로).
- **준비 신호:** 데이터를 직접 불러오면 `usePageReady(!query.isLoading)`(`@/app/pageReady`). `DataTable`·`WidgetSlot`은 알아서 합니다.
- **데이터는 Refine 훅만:** 목록·한 건·바꾸기·이름 있는 동작은 `@/lib/refine`(`useList` · `useOne` · `useCreate` · `useUpdate` · `useDelete` · `useRpc` · `useSelector` …),
  antd 표·폼 훅은 `@/lib/refineAntd`(`useTable` · `useForm` · `useDrawerForm` · `useModalForm` · `useSelect`). 표는 보통 `DataTable`이 알아서 `useTable`을 써요.
  - 여러 행을 바꾸는 업무 동작: `const { run } = useRpc("submit_task", { successMessage: "제출했어요" }); await run({ taskId })`
  - 집계·검색: `const { data } = useSelector<T>("home.today", { period })`
  - 관계 붙이기: `useList({ resource: "tasks", meta: { expand: ["project", "assignee"] } })` → `row._rel.project`
  - `@/lib/refine`의 `useList`는 `pagination`을 안 주면 **전부**(`mode: "off"`)를 읽어요. 쪽을 나누려면 `pagination: { currentPage, pageSize }`를 직접 주세요(표는 `DataTable`이 20행씩).
  - 상세에서 404면 `EmptyState kind="not_found"`를 그리세요(404 토스트는 뜨지 않습니다).
- **권한:** `useWorksite().can(resourceOrModule, action, row?)` → `{ can, reason }`. 끈 버튼에는 `reason`을 툴팁으로. 목록 범위(본인·참여 프로젝트·L2·금액 지우기)는 **공급자가 이미 거릅니다.** 화면에서 다시 거르지 않습니다.
- **URL 상태:** 필터·탭·보기·서랍·기간은 URL에(`useUrlParam`, `useSelectedParam` from `@/lib/url`). 서랍은 `?selected=<id>`(만들기 `new`).
- **문구:** 해요체(안내·빈 상태·토스트), 명사형(라벨·표 머리), 동사형 버튼("승인하기"). 영어 UI 문구 금지. 상태 글자는 `statusOf`/`labelOf`(`@/lib/status`)만.
- **표기:** 숫자·날짜는 `@/lib/format`(`formatDate` "9월 30일(수)", `formatRelative` "3분 전", `formatWonKorean` "4,200만 원" …). '오늘'은 `useWorksite().today`, 지금은 `clock.now()`.
- **예시 데이터 표시:** 수치가 있는 카드는 `SectionCard demo`. 상단 바 배지는 늘 있습니다.

### 'AI 티' 금지(검사됨: `npm run check`, 스모크)
그라데이션·글로·블러 없음 · 카드 안 카드 없음(`SectionCard` 안에 `SectionCard` 금지, 구분선은 `<Divider />`) · 평상시 카드 그림자·테두리 없음 ·
색 hex·그림자는 `src/theme/`에만(컴포넌트는 `var(--ws-*)`) · 히어로(`HeroCard`)는 화면당 1장(H-01·I-06·I-18만) · 검정 알약(`pill`)은 화면당 3개 이하 ·
숫자를 색으로 칠하지 않음(증감은 `DeltaText`) · 상태는 늘 아이콘 + 글자(`StatusTag`) · 파이·도넛·이중 축·점선 없음 · 이모지 없음 · 굵기 400·600·700만 · 아이콘은 `@ant-design/icons`의 Outlined만.

---

## 5. 공통 컴포넌트(`@/components`)

| 컴포넌트 | 핵심 props |
|---|---|
| `PageHeader` | `title`, `description?`, `greeting?{name,dateText,summary?}`, `period?: SegmentedPillsProps`, `tabs?{key,label,to,badge?}[]`, `actions?`, `back?{label,to}`, `meta?` |
| `SectionCard` / `HeroCard` | `title?`, `pill?`, `demo?`, `actions?`, `more?{label,to}`, `size?: "S"\|"M"\|"L"`, `span?`, `variant?: "default"\|"hero"`, `caption?`, `as?` — 그리드는 `CardGrid`, 카드 아닌 칸은 `GridCell`, 구분선 `Divider` |
| `PillLabel` | `children: string` |
| `StatTile` / `StatRow` | `label`, `value`, `unit?`, `delta?: DeltaTextProps`, `trend?: number[]`, `hero?`, `caption?`, `tone?`+`toneLabel?` |
| `BigNumber` | `value`, `unit?`, `label` (히어로 안 흰 숫자) |
| `DeltaText` | `value`(부호 포함), `unit?`, `period`("지난주보다"), `goodWhen: "up"\|"down"\|"none"` |
| `SegmentedPills` | `options{value,label}[]`, `value`, `onChange`, `ariaLabel`, `urlParam?` |
| `SimpleBarChart` | `data{key,label,value,previous?}[]`, `unit`, `highlightKey?`, `compare?{currentLabel,previousLabel}`, `target?{value,label}`, `height?`, `ariaLabel`, `tableCaption` |
| `StackedShareBar` | `segments{key,label,value,slot?,tone?}[]`, `unit`, `height?`, `legend?: "list"\|"none"`, `ariaLabel` |
| `LineSpark` · `Meter` · `ChartFrame` | `values, ariaLabel` · `value, max, label, tone?, valueText?` · `title?, table, children`(모든 차트에 [표로 보기]) |
| `StatusTag` | `tone`, `label`, `icon?`, `size?` — `<StatusTag {...statusOf("tasks.status", v)} />` |
| `PersonChip` | `memberId?`, `kind?: "member"\|"ai"\|"system"`, `clientName?`, `size?`, `showUnit?` |
| `EmptyState` | `kind: empty\|filtered\|error\|forbidden\|module_off\|not_found`, `title?`, `description?`, `action?{label,to?,onClick?}`, `compact?`, `headingLevel?` |
| `DemoDataBadge` | `variant: "topbar"\|"inline"` |
| `KanbanBoard<T>` | `columns{key,label,tone?,collapsed?}[]`, `items`, `getColumn`, `getId`, `renderCard`, `canMove?`, `onMove?`, `emptyColumnText?`, `ariaLabel`, `getTitle?` |
| `Timeline` | `items{id,at,title,description?,actor?,tone?,icon?}[]`, `order?`, `dense?`, `relative?` |
| `FilterBar` + `useFilterBarState` | `search?{placeholder,param?,fields?}`, `chips?{param,options,multiple?,field?,operator?}[]`, `selects?{param,label,options,field?}[]`, `view?`, `right?` |
| `DataTable<T>` | `resource`, `columns: ColumnDef[]`(kind: name·text·number·date·datetime·status·person·dday·tag·price), `filters?`, `sorters?`, `meta?`, `onRowClick?`/`rowHref?`, `mobileRow`, `empty`, `pageSize?`(20), `isFiltered?`, `onClearFilters?`, `syncWithLocation?` |
| `ListRow` / `ListRows` | `leading?`, `title`, `subtitle?`, `trailing?`, `to?`/`onClick?`, `unread?` |
| `DetailDrawer` · `useConfirm` | `open, title, onClose, footer?, extra?` · `await confirm({ title, content, okText, danger })` |
| `DdayBadge` · `SensitivityTag` · `AiTag` · `PriceGate` · `MaterialGradeTag` · `CopyField` · `Banner` · `PrivateZone` | `date` · `level` · `kind` · `children` · `code` · `value,label` · `tone,title` · `children` |
| `WidgetSlot` | `id`, `pill?`, `span?`, `size?`, `period?` — 위젯 파일 `pages/home/widgets/<id>.tsx`가 `WidgetDef`를 내보냄 |
| `RightRail` | `blocks{title,items: ListRowProps[]}[]` — 홈만, 1440 이상(`useRailVisible()`) |
| `PageGuard` | `moduleId?`, `action?`, `roles?`, `title?` |

---

## 6. 시드 파일 계약(`src/data/seed/<group>.ts`)

```ts
import { defineGroup, type SeedContext, type SeedOutput, type RpcHandler, type SelectorHandler } from "./types";

function seed(ctx: SeedContext): SeedOutput {
  const rng = ctx.rng("tasks");               // 테넌트 + 이름으로 고정된 난수(늘 같은 데이터)
  if (ctx.tenant.slug === "tr-technology") { /* … */ }
  return {
    tasks: [{ id: ctx.anchors.tr.task, title: "CL-2026-03 8D D4 근거 정리", due_at: ctx.at(2, "18:00"), /* RowOf<"tasks">의 나머지 필드 */ }],
    production_results: () => makeResults(ctx),  // 수천 행은 함수로(처음 읽을 때 만듦)
  };
}
const rpc: Record<string, RpcHandler> = {
  submit_task: (ctx, { taskId, summary }) => {
    const task = ctx.get("tasks", taskId) ?? ctx.fail(404, "찾는 항목이 없어요");
    if (task.assignee_id !== ctx.persona.memberId) ctx.fail(403, "담당자만 제출할 수 있어요");
    const sub = ctx.insert("submissions", { task_id: taskId, version: 2, summary, via: "web", status: "submitted", submitted_by: ctx.persona.memberId, submitted_at: ctx.clock.now() });
    ctx.update("tasks", taskId, { status: "submitted" });
    ctx.notify({ recipientId: task.reviewer_id, kind: "review_requested", title: `"${task.title}" 검토 요청`, link: `/work/review?selected=${sub.id}` });
    ctx.audit({ action: "rpc:submit_task", resource: "tasks", resourceId: taskId });
    return { ok: true, submissionId: sub.id };
  },
};
const sel: Record<string, SelectorHandler> = { /* "home.today": (ctx, query) => ({ … }) */ };
export default defineGroup({ group: "work", seed, rpc, sel });
```

- **SeedContext:** `tenant`, `today`("2026-09-30"), `rng(stream)`, `get(resource)`(앞 단계 행 읽기), `anchors`(6.3절 고정 id), `people`, `memberOf(roleCode)`, `d(n)`(오늘+n일 날짜), `at(n, "HH:mm")`(KST → UTC ISO).
- **순서:** reference(Foundation: 조직·사람·사업 구조·거래처·회사 정보·설정·용어·배분 규칙) → work → collab → industry → ara_settings → home(알림 등 파생).
- **만들 수 있는 리소스는 그룹마다 정해져 있습니다**(`GROUP_RESOURCES`, 스펙 5.6절). 다른 그룹 리소스를 내보내면 시작할 때 오류. `kpis`·`kpi_values`만 work(`CR_*`)·collab(`AX_*`)·industry(`K*`)가 나눠 씁니다. id가 겹치면 오류.
- **행 타입은 `src/types/entities.ts`**(`RowOf<"tasks">`)를 따릅니다. `id`는 접두어 규칙(스펙 5.6절), 공통 필드(`tenant_id`·`is_demo`·`created_at`·`updated_at`)는 파이프라인이 채웁니다. 날짜 `YYYY-MM-DD`, 시각 UTC ISO.
- **rpc 처리기는 동기 함수로**(한 트랜잭션으로 저장·알림). `ActionContext`: `list/get`(현재 인물 권한 경로) · `raw.list/get`(정책 없이) · `insert/update/remove` · `notify` · `audit` · `can` · `fail` · `newId` · `persona` · `clock`. 쓰기는 정책을 거치지 않으니 권한은 `ctx.can()`으로 직접 확인합니다.
- **셀렉터**는 `SelectorContext`(읽기 전용, 권한 경로를 거친 행만)를 받습니다. 홈 위젯 셀렉터 이름은 `widget.<id>`.
- 그룹별 구현할 이름: work `submit_task · approve_submission · request_changes · accept_action_proposal · confirm_segment` / collab `mark_notice_read · approve_rule · reject_rule`, `sel:calendar.range` / industry `create_field_report · set_equipment_status · confirm_semiannual_review`, `sel:ops.today` / ara_settings `revoke_mcp_connection · revoke_all_mcp` / home `mark_all_notifications_read`, `sel:home.today · search · widget.<id>`. Foundation 구현: `rpc:reset_demo`, `sel:nav.badges`, `sel:me.ai`.
- **ARA(P 영역):** `ara_settings`의 `ara(ctx)`가 현재 인물 **본인 것만** 만듭니다(`ara_profile` id `"profile"`, `ara_card_sentences`, `ara_messages`). 화면은 `useList({ resource: "ara_card_sentences", dataProviderName: "ara" })`. `rpc:clear_messages`·`rpc:wipe`(ara 공급자).
- **저장:** 사용자가 만든 변경만 `localStorage["ws:v1:{tenantId}:ops"]`에 변경분으로 남고, 시드 규칙을 바꿔 예전 저장분이 안 맞으면 `TenantConfig.seedVersion`을 올립니다(통합 담당에게 요청). 화면에서 바꾼 뒤 처음 상태로 돌리려면 사용자 메뉴 → 데모 초기화.

## 7. 공급자가 보장하는 것

- 필터 `eq ne lt gt lte gte in nin contains ncontains startswith between null nnull` + `or/and`. 배열 필드에서 `eq`는 "포함", `in`은 "하나라도 겹침". `contains`는 대소문자·정규화 무시. 정렬 여러 개(문자열 `ko`, null 맨 뒤). 공급자에 쪽 정보가 오면 기본 20행(Refine 훅을 바로 쓰면 Refine 기본 10행이 오니, 화면은 `@/lib/refine`의 `useList`(쪽 정보 없으면 전부)·`DataTable`(20행)을 써요).
- 테넌트·권한 범위 밖 `getOne`은 404(존재를 드러내지 않음). 쓰기 권한 없음 403("권한이 없어요"). 감사 로그는 고칠 수 없음, 진행 기록은 추가만.
- 범위: member는 참여 프로젝트·본인 업무만, L2 행은 참여자·owner·admin만, 알림·메일·알림 설정·복지 동의는 모두 본인 것만, 금액 필드는 `view_prices`가 없으면 `null`(원재료 가격은 0행), member에게 고객 품번 `null`. 가린 칸은 고치기(`update`)에서도 빠져요: 받은 행을 그대로 저장해도 실제 금액·고객 품번이 `null`로 덮이지 않아요(`policy.unmaskPatch`).
- 쓰기(create·update·delete·rpc)는 `audit_events`에 남습니다(알림·읽음 확인·감사·ARA 제외). 데이터가 바뀌면 메뉴 배지·셀렉터가 다시 불러와집니다.
