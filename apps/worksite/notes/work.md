# work 그룹 → 통합 담당 메모

공통 변경 요청·공통 승격 후보·필드 추가 요청을 적어 주세요(형식은 notes/README.md).

## [요청] DataTable의 syncWithLocation이 첫 화면에서 콘솔 오류를 냄
- 무엇을: `src/components/DataTable.tsx`
- 왜: `@refinedev/antd` `useTable`은 검색 폼용 `Form.useForm()`을 만들고, `syncWithLocation`이 켜져 있으면 처음 그릴 때 `form.getFieldsValue()`·`setFieldsValue()`를 부릅니다. 이 폼이 어떤 `<Form>`에도 연결되지 않아 antd가 `console.error("Warning: Instance created by \`useForm\` is not connected to any Form element…")`를 냅니다. 새로고침한 첫 화면에서만 나와서 해시 이동만 하는 기존 스모크에는 안 걸리지만, 8.2절 "console.error 0" 기준을 깹니다(목록 화면이 있는 모든 그룹에 해당).
- 고칠 곳(제안): DataTable 안에서 검색 폼을 연결만 해 두기
  ```tsx
  const { tableProps, tableQuery, currentPage, setCurrentPage, result, searchFormProps } = useTable<T>({ … });
  // return 하는 모든 갈래(로딩·빈·오류·모바일·표) 바깥에 한 번
  <Form {...searchFormProps} component={false} />   // import { Form } from "antd"
  ```
  (또는 DataTable 기본값을 `syncWithLocation = false`로)
- 임시로 한 것: work 그룹 화면의 DataTable은 모두 `syncWithLocation={false}`로 둠(필터·탭·보기·서랍은 원래대로 URL에 남고, 표의 쪽 번호·정렬만 URL에 안 남음). 고쳐지면 work-list·work-review·projects·meetings에서 이 줄을 지우면 됩니다.
- 급한 정도: 막힘(스모크 기준)

## [요청] tasks에 완료 기준 필드
- 무엇을: `src/types/entities.ts` Task에 `done_criteria: string[] | null` (레지스트리 `tasks` 엔티티에도)
- 왜: W-06 업무 상세의 "완료 기준"(빌드 스펙 범위: 담당·검토자·마감·완료 기준·제출). 지금 필드가 없어서
- 임시로 한 것: `description` 마지막 줄을 `완료 기준: a · b · c` 형식으로 저장하고 화면에서 나눠 보여 줌(`pages/task-detail/lib.ts` `splitDescription`/`joinDescription`). 필드가 생기면 이 두 함수만 바꾸면 됩니다.
- 급한 정도: 있으면 좋음

## [요청] submissions에 외부 링크 필드
- 무엇을: Submission에 `link_url: string | null`
- 왜: W-06 제출 서랍 "산출물 선택 또는 외부 링크"(5.8절 `rpc:submit_task` 입력에 `link?`가 있음)
- 임시로 한 것: `summary` 끝에 `외부 링크: https://…` 줄로 붙여 저장
- 급한 정도: 있으면 좋음

## [알림] work 그룹이 더한 이름 있는 동작(rpc)
- 5.8절 5개(`submit_task` · `approve_submission` · `request_changes` · `accept_action_proposal` · `confirm_segment`) 외에 2개를 더했습니다(이름 겹침 없음).
  - `rpc:create_task` — W-03 업무 만들기 서랍. `tasks` 행 생성 + 담당자에게 `task_assigned` 알림 + 감사 기록. 검토자 이상만.
  - `rpc:confirm_decision` — 결정 확정. `supersedes_id`가 있으면 이전 결정을 `superseded`로 함께 바꿈. 검토자 이상만.
- `confirm_segment`는 그 회의에 확인할 구간(pending·unclassified)이 남지 않으면 `meetings.status`를 `confirmed`로 바꿉니다. 미분류(사업 코드 없음) 구간은 [고치기]로만 확인할 수 있어요.
- 5.8절 표에 두 줄 추가를 부탁드립니다.

## [알림] 시드 메모(home·collab 그룹이 참고)
- 양: CRATA 업무 48(할 일 10·진행 중 14·검토 대기 6·수정 요청 3·완료 13·취소 2) · 진행 기록 141(AI 연결 27) · 제출 21(승인 11·수정 요청 4·검토 대기 6, AI 연결 7) · 회의 12(확인 필요 2·예정 2) · 구간 40 · 결정 15 · 액션 제안 20(제안 6) · KPI `CR_*` 3 × 6개월.
  TR 업무 40(8·12·5·2·12·1) · 진행 기록 109(AI 연결 14) · 제출 14(7·2·5, AI 연결 4) · 회의 10(주간 생산 4·주간 품질 4·[AX] 2, 확인 필요 2·예정 1) · 구간 30 · 결정 12 · 액션 제안 16(제안 5).
- 제출 수정 요청이 스펙(3)보다 1건 많은 4건인 것은 앵커 `sub-cr-001`(v1 수정 요청 → v2 검토 대기)과 수정 요청 업무 3건이 각각 수정 요청 제출을 가져야 해서예요. 검토 대기 제출 수 = 검토 대기 업무 수(6 / 5).
- 완료 업무 중 CRATA 2건·TR 5건은 "이전 도구에서 옮겨 온 완료 업무"(제출 없음)로 표시해 두었어요.
- 산출물 연결: 제출 `sub-cr-001`·`sub-cr-002` → `art-cr-001`, `sub-tr-001` → `art-tr-8d-03`(collab 앵커). 그 밖의 제출은 `artifact_id = null`. collab이 `artifacts.task_id`로 업무에 산출물을 붙이면 업무 상세·제출 서랍에 자동으로 보여요.
- 회의 `transcript_ref`는 `https://meetings.example.invalid/...`. 예정 회의(`scheduled`)는 구간·결정·액션 제안이 없어요.

## 공통 승격 후보(지금은 work 폴더 안)
- `pages/task-detail/work.css`의 `.wk-rows`(카드 안 줄 목록 + 1px 구분선), `.wk-kv`(라벨·값 정보 표), `.wk-summary-links`(카드 아닌 글자 링크 요약), `.wk-quote`(근거 발화 인용)
- `pages/meeting-detail/parts.tsx`의 `useFadeOut`(처리한 줄을 0.6 투명도로 1초 남겼다가 빼기, reduced-motion이면 바로) — 다른 '한 줄씩 처리' 화면(작성 규칙·메일 제안)에서도 쓸 수 있어요.

## [요청] provider 단위 테스트 2개가 '빈 시드'를 가정함
- 무엇을: `tests/unit/provider.test.ts` 56행(`nav.badges`가 `reviewWaiting: 0, inboxWaiting: 0`), 68행(내 알림이 정확히 1건)
- 왜: work 시드가 채워지면 기본 페르소나의 검토 대기·분류 확인이 0이 아니에요(CRATA 성춘향: 검토 대기 2건 `sub-cr-002`·`t-cr-002` 제출, 분류 확인 17건 / TR 공장장: 검토 대기 4건, 분류 확인 15건). 68행은 home 그룹의 파생 알림까지 더해져 13건이 돼요.
- 고칠 곳(제안): 두 테스트만 `makeProvider(<테넌트>, undefined, { emptyMode: true })`로 만들거나, 값 비교를 '처음 값 + 1'(전후 차이)로 바꾸기
- 급한 정도: 막힘(`npm test`)
