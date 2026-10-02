# industry 그룹 → 통합 담당 메모

공통 변경 요청·공통 승격 후보·필드 추가 요청을 적어 주세요(형식은 notes/README.md).

## [알림] industry 그룹이 더한 이름 있는 동작(rpc)
- 5.8절 3개(`create_field_report` · `set_equipment_status` · `confirm_semiannual_review`)와 `sel:ops.today` 외에 7개를 더했습니다(모두 `src/data/seed/industry.ts`, 권한은 처리기 안에서 `ctx.can()`으로 확인).
  - `rpc:assign_field_report` {reportId, assigneeId, task?} — 현장 기록 담당 지정 + (선택) 업무(source=field_report) + 알림. `field_reports` approve 이상.
  - `rpc:create_linked_task` {title, projectId, assigneeId, reviewerId?, dueAt?, source, sourceRef} — 클레임 상세·반기 점검의 후속 업무(source=claim 등). work의 `create_task`는 source가 manual 고정이라 따로 둠.
  - `rpc:create_claim` · `rpc:move_claim_column` · `rpc:complete_d_step` — 클레임 접수(8D 행 함께) · 8D 보드 이동 · 단계 완료. `customer_claims` approve 이상.
  - `rpc:repair_breakdown` — 수리 완료 + 정지 시간 계산 + 현장 등록자 알림. `breakdown_records` approve 이상.
  - `rpc:create_safety_report` — 아차사고·의견(이름 없이 보내기를 지키려고 rpc로. 공급자 create는 own 등급에서 reported_by를 본인으로 채움).
- 이름 없이 보낸 행은 `created_by`를 null로 고치고 감사 기록도 `actor_type=system`(actor_id null)으로 남깁니다. 5.10절과 다르면 알려 주세요.
- `GROUP_ACTIONS.industry`(seed/types.ts)와 5.8절 표에 이름만 더해 주세요.
- 급한 정도: 있으면 좋음

## [요청] status.ts에 도메인 추가
- 무엇을: `src/lib/status.ts`에 `gauges.status`(active 사용·good / calibrating 교정 중·info / retired 폐기·neutral), `worker_opinions.status`(new 접수·warning / answered 답변함·info / closed 완료·good), `equipment_checks.result`(ok 이상 없음·good / issue 이상 있음·serious), `items.status`(active 사용·good / inactive 사용 안 함·neutral), `items.kind`(raw 원자재 / knit 편조망·편조 롤 / part 완제품), `items.form_process`, `items.mesh_grade`(F 파인 · M 미디엄 · S 스탠다드), `nonconformances.source`, `work_orders.shift`(day 주간조 · night 야간조)
- 왜: I-11 계측기 탭, I-14 오늘 점검, I-17 품목, I-18 의견 상태(빌드 스펙 5.7절 표에 없음)
- 임시로 한 것: `pages/ops-home/kit/labels.ts`에 같은 값으로 둠("공통 승격 후보"). 올라가면 이 파일 대신 statusOf/labelOf로 바꾸면 됩니다.
- 급한 정도: 있으면 좋음

## [요청] Nonconformance.item_id를 null 허용으로
- 무엇을: `src/types/entities.ts` `Nonconformance.item_id: string | null`
- 왜: 현장 등록(불량)에서 만든 부적합은 품목을 모를 수 있음(I-07 → nonconformances). 지금은 `null as unknown as string`으로 넣고 화면은 "확인 전"으로 그림
- 급한 정도: 있으면 좋음

## [요청] MaterialGradeTag의 영어 글자
- 무엇을: `components/basics.tsx` `MaterialGradeTag` — `Brass`·`TCu`·`Cu`·`Al`이 그대로 보임
- 왜: 8.6절 영어 단어 검사(허용 목록 밖: Brass). 재질은 코드 글자 + 색 견본이 규칙이라 글자는 유지하되, 허용 목록에 재질 코드(Brass·TCu)를 넣거나 표시를 "황동"으로 바꾸는 것 중 결정이 필요
- 임시로 한 것: 기준정보 화면은 태그 옆에 한국어 이름(황동 등)을 함께 씀
- 급한 정도: 있으면 좋음(같은 이유로 품번·고객 품번 코드 DEMO-EXH-1001·FP-EMI-TCU-001·"Single PPM"도 영어 검사 예외가 필요해요. 모두 빌드 스펙·03 문서가 정한 표기예요)

## [알림] 시드 메모(home·collab·work 그룹이 참고)
- 양(TR): 품목 50(RM 10·KM 12·FP 28) · 공정 6(P10 수입검사·P40 출하검사는 '가설') · 재질 9 · BOM 40 · 설비 52(편조기 36·프레스 5·전용기 4·롤링기 3·절단기 2·스포트기 2) · 수주 45/줄 118/출하 340 · 작업지시 656 · 실적 1,876 · 가동 기록 8,165 · 검사 1,887 · 점검 1,360(앞 4개는 지연 생성) · 부적합 38 · 클레임 3 · 시정조치 4(8D 3 + 간이 1: I-11 '미결 시정조치 2건'에 맞춤) · 4M 4 · 계측기 15 · 현장 등록 85(불량 40·설비 이상 25·아차사고 14·기타 6, 오늘 4·미배정 2) · 고장 11 · 법정 검사 5 · 보전 20 · 입고 48 · 재고 LOT 60 · 입출고 457 · 발주 50 · 안전재고 10 · 가격 지수 4×6 · LOT 연결 302 · 위험성평가 32(기한 지남 3) · 아차사고 14 · 의견 6 · 반기 점검 20 · 법정 일정 8 · KPI K* 13개.
- CRATA: 담당자 8 · 영업 기회 11(진행 중 8, 합계 4,200만 원 · 이번 달 수주 2) · 견적 7. 스펙 I-04 그림의 "진행 중 9건"은 열 합(3+2+2+1=8)과 달라서 8로 둠.
- 앵커는 6.3절 그대로(clm-tr-2026-03 · ca-tr-2026-03 · cr4m-tr-2026-04 · LOT 체인 · fr-tr-0085 → bd-tr-011 · bd-tr-010 · lc-tr-2026h2 · sl-tr-321-020(재고 4일) · po-tr-049 · opp-cr-01 · q-cr-01). 오늘 주간조 편조기 31/36, 프레스 4/5.
- collab에게: 견적 q-cr-01·q-cr-02·q-cr-05가 `art-cr-quote-01`~`03`(doc_type quote)을 가리켜요. 이 id로 견적서 산출물을 만들어 주시면 I-05에서 바로 이어져요(없으면 "연결 전"으로 보임).
- work에게: 고장 bd-tr-011 → `t-tr-028`, bd-tr-010 → `t-tr-036`을 linked_task_id로 씀. 클레임 상세의 연결 업무는 `tasks.source_ref = clm-tr-2026-03`로 찾음(t-tr-001·009·020).
- home에게: 법정 일정 위젯이 legal_inspections와 합쳐져서 프레스 안전검사가 두 번 보이지 않도록, 법정 일정에는 프레스 개별 검사 대신 "프레스 안전검사 신청 서류 준비"를 넣었어요.

## [확인] provider 단위 테스트 2건
- `tests/unit/provider.test.ts`의 nav.badges·알림 1건 테스트가 빈 시드를 가정해 실패해요(work 메모와 같은 원인, industry 시드와 무관). emptyMode로 바꾸거나 전후 차이 비교를 제안해요.

## 공통 승격 후보(지금은 industry 폴더 안)
- `pages/ops-home/kit/ui.tsx`: `Kv`(라벨·값 표), `SimpleTable`(리소스가 아닌 합친 목록 표 + 모바일 ListRow), `ExportButton`(owner·admin, 준비 중)
- `pages/ops-home/kit/data.ts`: `useRows`(페이지 나눔 없는 useList), `usePatchParams`(쿼리 여러 개를 한 번에 — useUrlParam 두 번 연속 호출 시 앞 값이 덮이는 문제 회피), `asRow`(can()에 타입 있는 행 넘기기)
- `pages/ops-home/kit/industry.css`: `.in-cta`(모바일 하단 고정 주 버튼 = BottomCTA), `.in-cells`(상태 칸 그리드), `.in-bar`(하단 확인 바)
