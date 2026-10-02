# home 그룹 → 통합 담당 메모

공통 변경 요청·공통 승격 후보·필드 추가 요청을 적어 주세요(형식은 notes/README.md).

## [알림] home 그룹이 더한 이름 있는 동작·셀렉터
- 무엇을: `rpc:save_notification_preferences`(알림 설정 저장, 본인 또는 회사 기본값 한 번에 upsert) · `sel:home.rail`(오늘 레일: 필독 공지·오늘 일정·다가오는 회의)
- 왜: H-03 [저장하기]가 종류 13개 행을 한 트랜잭션으로 저장해야 해서. H-01 레일·'오늘' 카드가 같은 데이터를 써서.
- 임시로 한 것: `src/data/seed/home.ts`에 구현. `GROUP_ACTIONS.home`(seed/types.ts)과 README 6절 표에 이름만 더해 주세요.
- 급한 정도: 있으면 좋음

## [확인] rpc:mark_all_notifications_read 감사 기록
- 무엇을: 스펙 5.8절은 "모든 rpc는 audit 1건 이상", 5.10절은 "notifications는 기록하지 않음". 지금은 5.8을 따라 읽은 건이 있을 때만 `rpc:mark_all_notifications_read` 1건을 남깁니다.
- 왜: 두 규칙이 부딪힘. 감사 화면(A-12)에 읽음 처리가 쌓이는 게 싫으면 이 줄을 지우면 됩니다(home.ts 한 줄).
- 급한 정도: 있으면 좋음

## [공통 승격 후보] WidgetSlot 준비 신호
- 무엇을: `components/WidgetSlot.tsx`는 지금 `usePageReady`를 부르지 않습니다(빌더 메모와 다름).
- 임시로 한 것: 위젯마다 `pages/home/lib/widgetKit.tsx`의 `useWidgetData`가 `usePageReady`를 부릅니다. 그대로 두셔도 됩니다.
- 급한 정도: 있으면 좋음

## [공통 승격 후보] ListRow 제목에 강조(ReactNode)
- 무엇을: `ListRow.title`이 string이라 검색 일치 글자를 굵게 못 그림.
- 임시로 한 것: 검색·CommandMenu는 `pages/search/Highlight.tsx` + 자체 행 마크업(`wh-result`, ws-listrow와 같은 치수).
- 급한 정도: 있으면 좋음

## [확인] calendar-week 위젯 데이터
- 스펙은 `sel:calendar.range`(collab) 사용. 그룹 간 실행 의존을 피하려고 `widget.calendar-week`가 calendar_events + 내 회의 + 내 마감 업무를 직접 합칩니다(이번 주 남은 것). collab 셀렉터가 생기면 바꿔도 됩니다.

## [industry 그룹과 맞출 것]
- 공정 이름: 오늘 생산 위젯은 `process_steps.name`에 "편조" / "크림핑" / "프레스" / "스파이럴"이 들어 있다고 보고 찾습니다.
- 자재 재고일수: `사용 가능 stock_lots 합 ÷ (최근 28일 stock_movements kind=consume|out 합 ÷ 28)`. 앵커 `sl-tr-321-020`이 4일로 보이려면 이 식에 맞게 소모 이력을 넣어 주세요(또는 계산식을 알려 주시면 맞춥니다).
- 4M 고객 승인 대기 일수 = `오늘 − requested_on`. 앵커(9/21부터 9일째)대로면 `cr4m-tr-2026-04.requested_on = "2026-09-21"`.
- 생산 작업자 히어로 = 오늘 작업지시(완료 전) + 오늘 일상점검(equipment_checks kind 무관, checked_on=오늘) 안 한 active 설비 수. 점검 시드가 비면 50대 가까이 나옵니다. 오늘 아침 점검 행을 대부분 넣어 주세요.
- 현장 피드·고장 알림은 field_reports·breakdown_records의 `reported_at`/`occurred_at`(UTC ISO)로 '오늘'을 판단합니다.

## [알림 시드] 파생 방식
- `notifications`는 지연 함수로, 다른 그룹 행(submissions·tasks·notices·read_receipts·meetings·rules·제조 행)에서 만듭니다. 페르소나당 최신 20건, 안 읽음은 최근 2일 + 안 읽은 필독 위주 6건까지.
- 원본 앵커 행이 아직 없으면(다른 그룹 시드 전) 같은 id로 앵커 대체 알림을 만들고, 원본이 생기면 규칙이 만든 것을 씁니다. id 규칙: `ntf-<규칙>-<원본 id>`.
- 다른 그룹 시드가 들어온 뒤 페르소나별 개수(약 15건)·안 읽음(약 5건)을 한 번 확인해 주세요.

## [확인] 화면 문구의 영어 키 이름
- CommandMenu 안내 "↑↓ 이동 · Enter 열기 · Esc 닫기", 검색 안내 "Ctrl K(맥은 Cmd K)". 8.6절 영어 단어 검사를 만들 때 `Ctrl`·`Cmd`·`Enter`·`Esc`를 허용 목록에 넣어 주세요(TopBar도 "Ctrl K"를 씀).

## [참고] home 그룹 CSS
- `src/pages/home/lib/home.css`(접두어 `wh-`, CSS 변수만)를 home 그룹 화면(알림·알림 설정·검색·전체·데모 시작)이 함께 import합니다.

## [요청 · 모든 그룹에 영향] useSelector가 로딩 중·null 결과에 빈 객체를 돌려줌
- 무엇을: `src/lib/refine.ts`의 `useSelector`는 `result?.data`를 돌려주는데, Refine `useCustom`은 로딩 중과 결과가 `null`일 때 `result.data = EMPTY_OBJECT({})`입니다. 그래서 `data`가 `undefined`가 아니라 `{}`가 되고, `data && data.rows.map(...)` 같은 코드가 첫 렌더에서 터집니다(홈에서 실제로 겪음).
- 고칠 곳(제안 패치): `useSelector` 안에서 `data: (q.data as { data?: T } | undefined)?.data as T | undefined` 로 바꾸면 로딩 중 `undefined`, null 결과는 `null`이 됩니다.
- 임시로 한 것: `src/pages/home/lib/useSel.ts`(공통 승격 후보)로 감싸서 home 그룹은 이것만 씁니다.
- 급한 정도: 막힘에 가까움(다른 그룹 셀렉터 화면도 같은 문제)

## [요청] 단위 테스트가 빈 시드를 가정함
- 무엇을: `tests/unit/provider.test.ts`의 "ActionContext: insert·notify…"는 notify 뒤 내 알림이 **1건**이라고 기대하고, "custom: rpc 내장 동작과 셀렉터"는 `nav.badges`가 모두 0이라고 기대합니다. 그룹 시드(알림 약 15건/인물, 검토 대기 제출)가 들어오면 실패합니다.
- 제안 패치: 호출 전 개수를 세고 `after - before === 1`로 비교, 배지는 `typeof … === "number"`로만 확인.
- 급한 정도: 막힘(npm test)
