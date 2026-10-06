# 통합 기록 (2026-10-02)

다섯 그룹(home · work · collab · industry · ara_settings)의 화면 63개와 시드를 한데 모은 뒤 공통 부분을 고친 기록입니다.

## 결과

| 확인 | 결과 |
|---|---|
| `npm run typecheck` | 오류 0 |
| `npm run build` | 성공, 경고 없음 |
| `npm test` | 20 / 20 통과(실패하던 2개를 고치고 1개를 더함) |
| `npm run check`(check-rules) | 통과(212개 파일) |
| `npm run smoke`(공식 스모크) | 252 / 252 통과 |
| 통합 점검(Playwright, `vite preview`) | 모두 실패 0 (아래) |

통합 점검은 화면마다 새로 불러와서 아래를 봤습니다.
- 오류: `console.error`, `pageerror`, 실패한 요청, HTTP 400 이상
- 화면 규칙: `h1` 1개, 예시 데이터 배지가 보임, 가로 넘침 없음, 카드 중첩 없음, 히어로 1개 이하, 알약 3개 이하
- 내용: 5초 안에 `data-page-ready`, '준비 중' 화면 아님, 내용 글자 60자 이상(권한·모듈 꺼짐·없는 항목 화면은 제외)
- 모양: 글꼴 Pretendard, 그라데이션 배경 없음, 모바일 하단 탭 5개

| 범위 | 화면 수 |
|---|---|
| 두 테넌트 × 페르소나 14명 전부 × 63개 경로 × 1440·390 | 1,764 |
| 기본 페르소나 × 63개 경로 × 1440·390·1024 | 378 |
| `?empty=1` × 63개 경로 × 1440·390 | 252 |

- 경계 확인(8.2절 5번)은 모두 스펙대로예요.
  - 다른 테넌트의 id를 열면 `not_found`.
  - CRATA에서 `/ops/quality`·`/company/safety`, TR에서 `/ops/sales`는 `module_off`. CRATA `/ops`는 `/ops/sales`로 이동.
  - 구성원은 '관리' 메뉴가 안 보이고, `/admin/members`·`/work/review`·`/meetings/inbox`는 `forbidden`.
  - 금액 칸은 이몽룡·생산 작업자 A에게 "—"로 보여요.
- 메뉴는 2.2절 순서와 같아요. 최상위가 owner·admin 9개, 그 밖의 역할은 8개예요.
- 활성 표시: 그룹은 `is-active`, 하위 항목은 `aria-current`. 모바일 하단 탭도 2.3절과 같아요.
- 브랜드 색은 테넌트 설정을 따라요. CRATA는 `#0B6E69`, TR은 `#2D3C67`이고, 히어로 카드 바탕도 같은 색이에요.

## 공통 수정

1. **`lib/refine.ts` `useSelector`**: 로딩 중이나 결과가 null일 때 `{}` 대신 `undefined`/`null`을 돌려줘요. Refine `useCustom`이 이때 `EMPTY_OBJECT`를 주던 문제예요(home 요청). `pages/home/lib/useSel.ts`는 그대로 써도 돼요.
2. **`components/DataTable.tsx`**
   - **검색 폼 연결:** `<Form form={searchFormProps.form} component={false} />`로 검색 폼을 연결해서, `syncWithLocation`이 켜진 첫 화면의 antd "useForm is not connected" 오류를 없앴어요(work·collab·industry 요청).
   - **조건이 바뀌면 옛 조건이 남던 버그(새로 찾음):** Refine 상태가 처음 permanent 조건을 계속 들고 있었어요. 예를 들어 `/work`에서 '진행 중만' 기본값인 채로 '완료'를 고르면 0건이었어요. 지금은 조건이 바뀌면 `setFilters([], "replace")`를 하고 1쪽으로 가요.
   - **정렬하면 행이 사라지던 버그(새로 찾음):** `pagination=false`인 표에서 정렬을 누르면 쪽 크기가 10이 되어 11~20행이 사라졌어요. 이제 쪽 정보를 늘 넘기고, 한 쪽뿐이면 `hideOnSinglePage`로 숨겨요.
   - **URL 동기화 복구:** 표가 하나뿐인 목록 15곳에서 그룹이 임시로 넣은 `syncWithLocation={false}`를 지웠어요. 그래서 쪽 번호·정렬이 다시 URL에 남아요(2.6절).
     - 대상: work-review · projects · meetings · work-list · docs · notices · people · partners · contacts · knowledge · templates · claims · safety-risk · admin-audit · quotes
     - 표가 둘 이상이거나 탭 안의 보조 표인 화면(partner-detail · equipment · materials · master-data · admin-members · quality · project-detail · production · orders · mail-inbox · glossary · field-report 피드 · correction-rules · admin-ai)과 approvals(탭마다 다시 그림)는 `false`를 그대로 뒀어요.
     - 칩 필터, 정렬, 행 열기, 서랍 흐름을 두 너비에서 확인했고 오류는 0이에요.
3. **`app/App.tsx` antd 한국어:** `antd/locale/ko_KR`(CJS)는 `"type": "module"` 패키지에서 `{ default }` 객체로 들어와서, antd 전체가 영어로 돌아가 있었어요. 예를 들어 날짜 선택기가 "Su Mo…", "Now/OK"로 나왔어요. 이제 `antd/es/locale/ko_KR`을 써서 "일 월…", "현재 시각/확인"으로 나와요(collab 요청).
4. **`providers/policy.ts`:** `audit_events`에도 'own' 하한을 줬어요. 그래서 검토자(공장장·성춘향)도 `/me`에서 본인 감사 기록을 봐요. 쓰기는 여전히 막혀 있어요(ara_settings 요청 1, 단위 테스트 추가).
5. **`providers/araProvider.ts`:** `rpc:wipe`가 키를 지우지 않고 빈 상태를 저장해요. 그래서 새로고침해도 ARA 시드가 되살아나지 않아요. 데모 초기화는 지금처럼 키를 지워요(ara_settings 요청 2).
6. **`types/entities.ts`:** `Nonconformance.item_id`를 `string | null`로 바꿨어요. industry 시드의 `null as unknown as string`과 `quality/NcTab.tsx`의 null 처리도 함께 고쳤어요(industry 요청).
7. **`data/seed/types.ts` `GROUP_ACTIONS`:** 그룹이 더한 rpc 30개와 `sel:home.rail`을 넣었어요.
8. **`theme/components.css`:** antd ColorPicker 견본의 투명 체크무늬(`conic-gradient`)를 껐어요. `/admin/theme`에서 그라데이션 검사에 걸렸어요.
9. **`tests/unit/provider.test.ts`:** 빈 시드를 가정하던 2개를 고쳤어요. 배지 0 확인은 `emptyMode`로, 알림은 추가 전후 차이로 봐요. 검토자 본인 감사 기록 테스트를 더했어요.
10. **스펙 `docs/worksite/00_build-spec.md`:** 5.8절에 그룹이 더한 동작 표를 넣었어요. 4.7절 영어 허용 목록에는 키 이름, 재질 코드, Single PPM, `code` 요소 제외를 더했어요. 5.8절과 5.10절이 부딪히던 감사 기록 문제는 5.8절을 따르기로 적었어요.

## 남은 것 (있으면 좋음, 이번에 안 함)

- **첫 화면 JS(gzip, 2026-10-02 리뷰 3차 측정):** 홈 `/` 첫 화면 **449KB**(TR 공장장 449.1KB, TR 대표 449.5KB, CRATA 448.8~449.3KB)로 목표 450KB 안이지만 여유가 1KB 남짓이에요. 목록 화면 깊은 링크: `/work` 549.5KB · `/docs` 550.5KB · `/ops/quality` 552.6KB · `/meetings` 549.0KB(리뷰 3차 전 580·544·593·590KB).
  - 지키는 것: `tests/e2e/smoke.spec.ts` '첫 화면 JS 예산'(홈 450KB · 목록 560KB). 넘으면 스모크가 실패해요.
  - 리뷰 3차에서 고친 것: 업무·프로젝트·공지·회의 추가 서랍과 품질 부적합·4M 탭, 모바일 사용자 시트·메뉴 서랍을 처음 열 때 불러와요(`src/lib/lazyDrawer.tsx`). 날짜 선택(`date-picker-*.js` 33KB)이 목록 첫 화면에서 빠졌어요.
  - 측정: `vite preview` + Playwright로 `/?latency=0` 첫 화면에서 받은 JS 응답 본문을 gzip해서 더함(`[data-page-ready]` 뒤 0.8초까지).
  - 리뷰 1차 뒤 531KB였던 까닭: 홈이 `@/components` 창구에서 카드·차트만 가져와도 창구가 표·필터·보드·서랍(rc-table, `@refinedev/antd` useTable)까지 끌고 와 `components-*.js`(96KB)를 받았어요.
  - 고친 것: `vite.config.ts`의 `treeshake.moduleSideEffects`에서 `src/components/*`를 부작용 없는 모듈로 봐요. 이제 안 쓰는 부품은 창구에서 빠지고, 표 묶음(`table-*.js` 58KB)은 목록 화면에서만 받아요.
  - 해 본 것: `codeSplitting.groups`에 표 전용 그룹을 더하면 rolldown이 그룹의 의존성(antd·refine)까지 끌어와 353KB 한 덩어리가 돼서 뺐어요.
  - Orbix 재설계 검증(2026-10-06): 홈이 455.6~457.7KB로 예산(455)을 넘었어요. 늘어난 것부터 줄였어요 — 승인 대기 '외 N종' 접기를 antd Dropdown → `<details>`(Dropdown을 위젯에서 import하자 rc-overflow가 select 묶음에서 갈라져 나와 +0.6KB), 휴대폰 칩 가로 스크롤·가림 훅을 접기 하나로(+0.5KB), AI 칩 끊긴 플러그 아이콘 → 같은 아이콘 + CSS 사선(+0.5KB, 모든 화면), 클레임 위젯 제목 손질을 시드로(+0.2KB).
    그래도 남는 넘침은 조각 수 때문이었어요(홈 63개, 아이콘·antd 부품마다 0.3~1KB 조각). `vite.config.ts`에 `vendor-shell` 그룹(진입점이 정적으로 받는 의존성 `.js`만 — `$initial`, `includeDependenciesRecursively: false`)을 더해 31개로: 홈 433.2KB · `/work` 531.5 · `/docs` 532.7 · `/ops/quality` 536.1KB. 화면마다 받는 모듈 목록과 CSS는 묶기 전과 같아요(빌드 두 벌의 청크→모듈 목록으로 대조).
    재귀를 켜 두면 홈이 원래 안 받던 폼 코드까지 끌려오고(날것 +29KB), CSS까지 넣으면 antd reset이 앱 테마 CSS 앞으로 옮겨져 순서가 바뀌어서 둘 다 껐어요.
  - 남은 지렛대(다음에 꼭): 시드 묶음(`seed-*.js`, 90KB)은 두 테넌트 데이터를 늘 함께 받아요. 테넌트별로 나누면 40KB쯤 더 줄어 홈 여유가 생겨요(그룹 시드 파일 5개를 데이터 모듈과 동작 모듈로 나눠야 해서 이번엔 안 함).
- **필드 추가 요청:** `Task.done_criteria`, `Submission.link_url`(work), `ApprovalLink.approval_line`, `ArtifactVersion.via_client`(collab). 지금은 그룹이 임시 저장 방식을 쓰고 있어요(각 notes 참고).
- **공통 승격 후보:** 같은 모양의 KeyValue가 세 그룹에 따로 있어요(work `.wk-kv`, collab `KeyValue`, ara `KeyValue`/`.as-kv`). 그 밖에 `SimpleTable`/`ResponsiveTable`, `useFadeOut`, `ListRow` 제목의 ReactNode 허용, industry `kit/labels.ts`의 상태 도메인 9개를 `status.ts`로 옮기는 일이 남았어요.
- **`my-profile`의 `rpc:list_my_activity` 우회:** 리뷰 1차에서 지웠어요(정책의 'own' 바닥 권한으로 목록을 바로 읽어요).
- **antd ColorPicker 팝업의 색상(hue) 막대:** 기능상 그라데이션이라 그대로 뒀어요(팝업을 열 때만 보여요).

## 최종 라우트 (63개, 2.7절)

- **home:** `/` · `/notifications` · `/me/notifications` · `/search` · `/more` · `/login` · `*`
- **work:** `/projects` · `/projects/:projectId` · `/work` · `/work/board` · `/work/review` · `/work/tasks/:taskId` · `/meetings` · `/meetings/:meetingId` · `/meetings/inbox` · `/meetings/decisions`
- **collab:** `/docs` · `/docs/artifacts/:artifactId` · `/docs/templates` · `/docs/rules` · `/docs/knowledge` · `/docs/glossary` · `/work/mail` · `/company/notices` · `/company/notices/:noticeId` · `/company/calendar` · `/company/approvals` · `/company/people` · `/company/org` · `/company/about`
- **industry:** `/projects/partners` · `/projects/partners/:partnerId` · `/projects/contacts` · `/ops/sales` · `/ops/sales/quotes` · `/ops` · `/ops/report` · `/ops/orders` · `/ops/production` · `/ops/production/board` · `/ops/quality` · `/ops/quality/claims` · `/ops/quality/claims/:claimId` · `/ops/equipment` · `/ops/materials` · `/ops/trace` · `/ops/master` · `/company/safety` · `/company/safety/risk` · `/company/safety/review`
- **ara_settings:** `/ara` · `/ara/coach` · `/ara/privacy` · `/me` · `/me/ai` · `/admin/settings` · `/admin/modules` · `/admin/theme` · `/admin/ai-policy` · `/admin/data` · `/admin/members` · `/admin/audit`
