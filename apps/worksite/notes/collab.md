# collab 그룹 → 통합 담당 메모

공통 변경 요청·공통 승격 후보·필드 추가 요청을 적어 주세요(형식은 notes/README.md).

## [알림] collab 그룹이 더한 이름 있는 동작(rpc)·셀렉터
- 5.8절 3개(`mark_notice_read` · `approve_rule` · `reject_rule`)와 `sel:calendar.range` 외에 아래를 더했습니다(이름 겹침 없음, 모두 동기 함수, `ctx.can()`으로 권한 확인, 감사 기록 1건 이상).
  - `rpc:register_artifact` — C-01 산출물 등록: `artifacts` + 첫 `artifact_versions`(AI 초안이면 `ai_draft`). 파일은 `https://` 링크만.
  - `rpc:finalize_artifact` — C-02 [최종본으로 확정]: 상태 `final` + 마지막 버전 `kind=final` + 담당에게 알림(`submission_approved` 종류를 빌려 씀). 검토자(approve) 이상.
  - `rpc:set_correction_reason` — C-02 [사유 남기기]: 산출물 담당 또는 검토자. (corrections는 member가 view라 일반 update로는 담당이 못 고침)
  - `rpc:publish_template` — C-03 [게시하기]: 같은 문서 유형의 이전 `active`는 `retired`. 파일 링크가 없으면 409(TR 양식은 모두 수집 전이라 꺼짐).
  - `rpc:verify_knowledge` — C-05 [검증됨으로 확정]: `verified`, 검증일 오늘, 재검토 +180일.
  - `rpc:create_notice` — C-08 공지 쓰기: 공지 + 대상에게 알림(필독이면 `notice_must_read`, 아니면 `system` "새 공지: …"). 검토자는 본인 조직·참여 프로젝트만, 전체 공지·고정은 owner·admin.
  - `rpc:create_task_from_mail` — C-07 [업무로 만들기]: `tasks`(source=mail, source_ref=메일 분류 id, 담당=나, 검토자=프로젝트 검토자) + `mail_links.suggested_task_id`. 메일 본문은 넣지 않음.
  - `rpc:set_glossary_label` — C-06 화면 표기 고치기(owner·admin): `glossary_terms.ui_label` 또는 플랫폼 키면 `tenant_settings.overrides.glossary[key]` → 메뉴 이름이 바로 바뀜.
- `mark_notice_read`는 그 공지의 내 필독 알림(`notifications.source_id = 공지 id`)도 읽음으로 바꿉니다.
- 5.8절 표에 위 8줄 추가를 부탁드립니다.

## [요청] DataTable `syncWithLocation` 첫 화면 콘솔 오류(work 그룹 메모와 같은 건)
- 무엇을: `src/components/DataTable.tsx` — `useTable`이 만든 검색 폼(`searchFormProps`)이 어떤 `<Form>`에도 연결되지 않아 새로 고친 첫 화면에서 antd `useForm is not connected` 오류가 납니다.
- 임시로 한 것: collab 화면의 DataTable은 모두 `syncWithLocation={false}`(필터·탭·서랍은 그대로 URL에 남고, 표 쪽 번호·정렬만 안 남음). 고쳐지면 그 줄만 지우면 됩니다.
- 급한 정도: 막힘(스모크 console.error 0)

## [요청] 결재선 필드
- 무엇을: `ApprovalLink`에 `approval_line: { member_id: string; role: "draft" | "review" | "approve"; status: "done" | "current" | "waiting" | "rejected" | "skipped"; at: IsoTime | null }[] | null`
- 왜: C-11 결재 서랍의 결재선 시각화(작업 지시 "approval line visualization"). 지금 필드가 없어요.
- 임시로 한 것: `pages/approvals/index.tsx`의 `approvalLine()`이 조직도(기안자 조직 → 상위 조직 책임자)와 `current_approver_id`·`status`로 예시 결재선을 만들고 "데모는 조직도를 따라 만든 예시예요" 캡션을 붙임. 필드가 생기면 이 함수만 바꾸면 됩니다.
- 급한 정도: 있으면 좋음

## [요청] 산출물 버전에 AI 클라이언트 이름
- 무엇을: `ArtifactVersion`에 `via_client: string | null`(submissions와 같은 값)
- 왜: C-02 버전 타임라인의 AI 초안을 "AI 연결 · Claude"처럼 보여 주려면 필요(4.9 PersonChip `kind="ai"` + `clientName`).
- 임시로 한 것: `author_kind="ai"`면 클라이언트 없이 "AI 연결"로만 표시.
- 급한 정도: 있으면 좋음

## [알림] industry 그룹과 맞춘 산출물 id
- 견적서 산출물 id를 industry 시드의 `quotes.artifact_id`에 맞췄어요: `art-cr-quote-01`(q-cr-01 예시재단 워크숍) · `art-cr-quote-02`(q-cr-02 예시기업 팀장 과정, AI 초안 포함) · `art-cr-quote-03`(q-cr-05 예시기업 임원 특강). 모두 L2·최종.
- (있으면 좋음) industry `corrective_actions`의 `ca-tr-2026-01`·`ca-tr-2026-02`는 `artifact_id: null`인데, collab에 `art-tr-8d-01`(CL-2026-01 8D 보고서)·`art-tr-8d-02`(CL-2026-02 8D 보고서)가 있어요. 연결하면 클레임 상세에서 지난 8D도 열 수 있어요.

## [알림] 시드 메모(home·industry·work 그룹이 참고)
- 양: CRATA 산출물 18(제안서 5·교안 6·결과보고서 3·견적서 3·회의록 1, AI 초안 12) · 버전 46 · 양식 5(사용 중) · 수정 기록 36 · 규칙 12(적용 중 8·승인 대기 3·멈춤 1) · 지식 20/연결 30 · 공지 8(필독 2·고정 1)/읽음 확인 28 · 일정 25 · 결재 10 · 메일 연결 2(성춘향·홍길동)/메일 30/규칙 3 · KPI `AX_*` 4 × 8주.
  TR 산출물 14(8D 3·출하 검사성적서 4·생산일보 4·4M 2·월 품질 리포트 1) · 버전 31 · 양식 5(초안, `to_collect`) · 수정 기록 14 · 규칙 4(승인 대기 2·적용 중 2) · 지식 14(작업표준·검사기준은 이름만)/연결 20 · 공지 8(필독 2·안전 3·고정 1)/읽음 확인 58 · 일정 30 · 결재 8 · 메일 연결 2(영업·생산 A·품질보증 A)/메일 26/규칙 3 · KPI `AX_*` 4 × 8주.
- 앵커: `art-cr-001`(버전 3: AI 초안 9/24 → 수정본 9/26 → 수정본 9/30 08:30, 수정 기록 `cor-cr-001~004`), `rule-cr-01`(승인 대기, 근거 cor-cr-001~004), `ntc-cr-01`(9/28 필독, 성춘향은 아직 안 읽음), `art-tr-8d-03`(L2, 버전 3, 수정 기록 5), `rule-tr-01`·`rule-tr-02`(승인 대기), `ntc-tr-01`(9/25 필독·안전, 작성 공장장, 품질보증 A·생산 작업자 A는 안 읽음).
- 규칙 후보의 `approver_id`는 CRATA 성춘향, TR 공장장 → home의 `rule_candidate` 알림이 기본 페르소나에게 갑니다.
- `sel:calendar.range`는 일정 + 내 업무 마감 + 회의 + (TR) `sales_order_lines`(같은 날·같은 거래처는 "납기 N건" 한 줄) + `legal_calendar_items`(완료 제외) + `legal_inspections`(미완료)를 합칩니다. industry 시드가 들어오면 자동으로 보여요.
- 공지 대상(`audience`)의 `role` ids는 역할코드(예: `R_QA`)입니다(home 시드와 같은 해석).

## [알림] 스펙과 다르게 한 것(작은 것)
- C-04 효과 탭 기간은 [4주|8주]로 했어요. 시드가 8주(6.5절)라 12주를 고르면 같은 8주만 보이게 돼서요.
- C-05 요약 링크 "이번 달 재검토"는 기준일이 9/30(달의 마지막 날)이라 "30일 안 재검토"로 바꿨어요.
- C-06은 탭 두 개(회사 용어 · 화면 이름)로 나눴어요. 기준 데이터의 `glossary_terms`에는 `platform_key`가 있는 행이 없어서, 화면 이름(용어 8개 + 메뉴 9개)은 `DEFAULT_TERMS`·`NAV_GROUPS`에서 만들고 고치면 `tenant_settings.overrides.glossary`에 씁니다.
- C-07·C-11의 연동 미리보기 배너는 PageHeader 바로 아래에 둡니다(첫 요소 h1 규칙).
- C-14 CRATA의 빈 칸은 'TODO' 글자 대신 "작성 전" 태그로 표시해요(영어 문구 검사).
- C-10 월 보기는 antd `Calendar` 대신 직접 만든 월요일 시작 표(`MonthGrid`)를 써요. antd Calendar 요일 머리가 "Su Mo Tu…" 영어로 나와서요(아래 요청 참고).

## [요청] antd 날짜 선택기 요일·달 이름이 영어로 나옴(확인 부탁)
- 무엇을: `src/app/App.tsx`의 dayjs 로케일 연결(`dayjs.locale("ko")` + `ConfigProvider locale={koKR}`)
- 왜: 개발 서버에서 antd `Calendar`(fullscreen) 요일 머리가 "Su Mo Tu We…"로 나왔어요. DatePicker 팝업도 같을 수 있어요(8.6절 영어 문구). rc-picker dayjs 설정이 `weekday`·`localeData` 플러그인과 `ko` 로케일을 함께 쓰는지 확인이 필요해요.
- 임시로 한 것: C-10은 직접 만든 월 표를 씀. 다른 화면의 DatePicker는 그대로예요.
- 급한 정도: 있으면 좋음

## [공통 승격 후보]
- `pages/docs/shared/lib.tsx`: `KeyValue`(정보 표 dl) · `SummaryLinks`(글자 링크 요약) · `ExternalLink`(바깥 링크 + 새 창 표시) — work 그룹의 `.wk-kv`·`.wk-summary-links`와 같은 모양이에요. 공통 컴포넌트로 올리면 두 그룹 CSS를 지울 수 있어요.
- `pages/docs/shared/collab.css` `.cb-steps`(단계 줄: 결재선·8D 단계에도 쓸 수 있음).

## [알림] 폼 상호작용 중 antd 경고(라이브러리)
- 폼에서 선택칸 값을 바꾸면 개발 콘솔에 `Warning: There may be circular references`가 한 번 나와요. `rc-field-form` Field의 `isEqual(metaCache, meta)`가 같은 빈 배열(errors·warnings)을 두 번 만나서 내는 경고로 보여요(우리 코드의 순환 참조 아님). 페이지를 여는 스모크에는 걸리지 않고, 흐름 테스트에서 console.error를 셀 때만 걸릴 수 있어요. 필요하면 흐름 테스트에서 이 문구만 거르는 것을 제안해요.
