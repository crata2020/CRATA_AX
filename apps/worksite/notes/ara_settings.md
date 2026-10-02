# ara_settings 그룹 → 통합 담당 메모

공통 변경 요청·공통 승격 후보·필드 추가 요청을 적어 주세요(형식은 notes/README.md).

## [알림] ara_settings 그룹이 구현한 이름 있는 동작(rpc)
- 5.8절 2개: `revoke_mcp_connection`(본인, owner·admin은 남의 연결도 + 끊긴 사람에게 system 알림) · `revoke_all_mcp`(owner·admin, 연결 끊긴 사람에게 알림).
- 화면용으로 더한 것(모두 동기 함수, 권한은 `ctx.can()`·역할로 직접 확인, 이름 겹침 없음):
  - `set_card_share` — A-01 카드 문장 나눌 범위. 팀·회사면 `work_style_cards` 사본(id `wsc-{member 접두어 뺀 id}-{acs id}`) 만들기·갱신, '나만'이면 `revoked_at`. **감사 기록 없음**(개별 이용 시각은 회사가 볼 수 없는 것, A-03).
  - `withdraw_wellbeing_consent` — A-03 동의 철회: `wellbeing_consents.withdrawn_at` + 내 공유 사본 모두 내림. **감사 기록 없음**. ARA 기록 삭제는 화면이 ara 공급자 `rpc:wipe`로.
  - `update_my_profile` — A-04 담당 업무·업무 전화만(구성원 권한이 `view`라 일반 update는 403). 전화는 `000-0000-0000` 모양만.
  - ~~`list_my_activity`~~ — 리뷰 1차에서 지움(정책 수정으로 목록을 바로 읽어요).
  - `request_profile_change` — A-06 변경 요청(감사 기록 `rpc:profile_change_requested`).
  - `set_module_enabled` — A-07(잠금 5개·업종 팩 거절, 켜진 모듈이 쓰는 모듈은 끄기 거절, 필요한 모듈이 꺼져 있으면 켜기 거절) → `tenant_settings.overrides.modules`.
  - `save_theme` — A-08(흰 글자/브랜드 4.5:1 미만 거절, 차트 강조는 `CHART_ACCENT_CHOICES`만, 모노그램 1~2자) → `tenant_settings.overrides.theme`(기본값과 같은 키는 지움).
  - `change_member_role` — A-11(owner 지정·해제는 owner만, 마지막 owner 보호) → `members.role` + `role_assignments` + 감사 2건 + 당사자 알림.
  - `set_member_status` — A-11 비활성화·다시 활성화(삭제 없음, 본인·마지막 owner 보호, 비활성화하면 그 사람 AI 연결도 끊음).
- 5.8절 표와 `GROUP_ACTIONS.ara_settings`에 위 이름을 더해 주세요.

## [요청] 1. 검토자가 `/me`에서 자기 감사 기록을 못 읽음
- 무엇을: `src/providers/policy.ts` `level()` — 레지스트리 `audit-log` 권한이 reviewer `none`이라 `audit_events`가 0행입니다. 5.4절은 "member는 actor_id = 나 또는 내 AI 연결 행만"이고 A-04는 모든 역할에 내 활동을 보여 줘야 해요.
- 제안 패치(work_style_cards와 같은 방식, `visible()`의 `own` 분기가 `actor_id`로 거름):
  ```ts
  // level(resource)
  if (resource === "work_style_cards" || resource === "audit_events") level = atLeast(level, "own");
  ```
  (immutable이라 쓰기는 그대로 막힘. 메뉴 '감사 로그'는 관리 그룹이라 reviewer에게 안 보임.)
- 임시로 한 것: `pages/my-profile` `Activity`가 `can("audit_events","list")`가 거짓이면 `rpc:list_my_activity`(본인 행만)를 `useCustom`으로 읽음. 패치 후 그 분기와 rpc를 지우면 됩니다.
- 급한 정도: 있으면 좋음(기본 페르소나 공장장·성춘향이 reviewer)

## [요청] 2. ARA `rpc:wipe` 뒤 새로고침하면 시드가 다시 생김
- 무엇을: `src/providers/araProvider.ts` `custom("rpc:wipe")` — 저장 키를 지워서(`removeKey`) 다음 부팅에 `fromSeed()`가 다시 돌아요. 동의 철회 후 새로고침하면 ARA 프로필이 '동의함'으로 돌아옵니다(회사 쪽 `wellbeing_consents`는 철회 상태라 화면은 동의 흐름을 보여 주지만, 카드 문장·대화가 되살아남).
- 제안 패치: wipe에서 `removeKey(key)` 대신 `save()`로 빈 상태를 저장(데모 초기화는 지금처럼 키 삭제).
  ```ts
  if (url === "rpc:wipe") { data = { ara_profile: [], ara_card_sentences: [], ara_messages: [] }; if (o.persist) writeJson(key, data); return { data: { ok: true } as unknown as TData }; }
  ```
- 급한 정도: 있으면 좋음

## [알림] 3. 10명 미만 집계 문구
- 공급자가 `wellbeing_aggregates`를 모수 10명 미만이면 돌려주지 않아서(정책상 맞음) A-03은 "이번 달 이용 인원이 10명 미만이라 집계를 보여 주지 않아요"로 씁니다. 스펙 예시처럼 "7명"을 보여 주려면 집계 상태만 주는 셀렉터가 필요하지만, 정확한 인원도 소규모에서 단서가 될 수 있어 지금 문구를 권해요.

## [알림] 4. 영어 단어 검사(8.6절)를 넣을 때
- `/me/ai`의 MCP 도구 이름(`list_my_tasks` 등 6개), 예시 주소(`https://mcp.example.invalid/...`), `/me`·`/admin/settings`·`/admin/members`의 역할코드(`R_PLANT_MGR` 등), 감사 로그 요청 번호는 식별자라 `<code translate="no">`로 감쌌어요. 검사에서 `code` 요소는 빼 주세요.

## [공통 승격 후보]
- `pages/admin-company/shared/lib.tsx`: `KeyValue`(collab `KeyValue`와 같은 모양) · `ResponsiveTable`(리소스가 아닌 목록을 antd 표 ↔ 모바일 줄 블록으로) · `AuditActor`(사람·AI 연결·시스템·CRATA 운영자 칩; `PersonChip`에 `kind="operator"`가 생기면 대체) · 감사 기록 표기(`actionLabel`·`changeSummary`·`fieldLabel`).
- `pages/admin-company/shared/as.css`: `.as-kv`, `.as-perm`(모듈×역할 표), `.as-bubble`(말풍선).

## [알림] 시드 메모
- 양(6.4절): mcp_connections CRATA 6(활성 5·4명, 끊긴 1) / TR 4 · mcp_policies 1 · invitations 1 / 2 · role_assignments 9 / 14(최근 7일 변경 2) · position_role_maps 4 / 6 · work_style_cards 5 / 3 · wellbeing_consents 6 / 7 · wellbeing_aggregates 3개월(모수 6 / 7) · audit_events 200(구성원 141·AI 연결 40·시스템 18·CRATA 운영자 1) / 160(113·32·14·1).
- 감사 이력은 다른 그룹의 실제 행(제출·검토·진행 기록·업무·산출물·공지·현장 등록·회의 구간·AX 지표)에서 지연 생성하므로 이름·시각이 서로 맞습니다. 익명 현장 등록은 넣지 않아요.
- AI 연결의 `last_used_at`은 work 시드의 AI 연결 진행 기록·제출 시각에서 계산(앵커: 이몽룡 Claude 9/30 08:40, 품질보증 A Claude 9/30 07:55).
- ARA 시드: 동의한 페르소나는 카드 문장 3~4개·대화 4개, 김선달·생산 작업자 A는 `consented_at: null`(동의 흐름 확인용). 공유 사본과 카드 문장은 같은 표에서 만들어 서로 맞습니다.
- 역할을 바꿔도 '누구로 보기' 페르소나 권한은 `TenantConfig`를 따릅니다(화면에 캡션으로 안내).
