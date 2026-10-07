# CRATA 인사(HR) 앱 화면 만들기 브리프

> **실제로 쓴 브리프(기록)예요.** 인사 앱(`apps/hr`)을 만들 때 화면을 여러 작업자(서브에이전트)에게 나눠 맡기며 그대로 준 원문이에요. 새 브리프를 **얼마나 구체적으로** 써야 하는지 보는 용도예요.
> - `$REFS/`는 Orbix 레퍼런스 폴더예요(`post_*.jpg` → `$REFS/instagram-posts/`, `refs/*.jpg` → `$REFS/orbix-refs/`). 저장소 밖에 있어요(PROMPTS.md 준비 2).
> - '확인' 장의 캡처·서버 명령(`shotdev.js`, `pkill`, `ss`)은 그때 쓰던 임시 도구예요. 지금은 AGENTS.md 2장(`scripts/ui-check.mjs`, `.vite.pid` 방식)을 써요.
> - 숫자·화면 목록·문구 규칙은 그때 기준이에요. 지금은 seed, `AGENTS.md`, `docs/codex/PLAYBOOK.md`가 우선이에요.

사용자(CRATA 대표) 요청: "HR 쪽만 우선 집중하자. ① 직원들의 CRATA 결과를 보고, 채팅으로 '누구를 어디로' 입력하면 옮기고(확정 전까지 깜빡임), 오른쪽에 실시간 조직도, ARA가 잘 맞는지·우려를 말해 주는 인사이동. ② 직원 뽑을 때 CRATA를 접목: 접수 → 2차 CRATA 검사 → 회사가 뽑으려는 사람을 넣으면 검사 등을 통해 누가 좋을지 추려 주고 그 사람들만 면접. 지금 만든 업무사이트는 놔두고 따로. 디자인은 정리해 둔 스타일(Orbix) 기반."

앱 위치: `apps/hr` (React 18 + TS + Vite + react-router 해시 라우팅, lucide-react, Pretendard). 옛 앱 `apps/worksite`, `apps/worksite-next`는 고치지 마세요(참고는 `apps/worksite-next/src/pages/*`의 화면 문법만 OK).

## 1. 디자인 기준(Orbix Studio 밝은 대시보드) — worksite-next와 같은 문법
레퍼런스 이미지: `$REFS/` 아래 `post_1.jpg`~`post_6.jpg`, `refs/*.jpg` (Read로 직접 보기). 특히 refs/orbixcrm-team-members-grid.jpg, refs/hope-hr-analytics.jpg, refs/orbixcrm-add-project-drawer.jpg, refs/winx-add-product-form.jpg, refs/projectflow-grouped-task-table.jpg, refs/orbix-ai-chat-home.jpg, post_1.jpg(칸반).
- 흰 사이드바 + 흰 상단 바 + 옅은 회색 본문. 카드는 흰색, 1px 옅은 테두리, 라운드 16.
- 큰 숫자 굵기 500 + 증감 칩. 카드 머리: 제목 17px 500 + 오른쪽 알약 선택이나 ⋯.
- 버튼: 흰 테두리 버튼. 화면에서 가장 중요한 동작 하나만 짙은 버튼(`variant="dark"`). 짙은 세그먼트, 밑줄 탭(아이콘+글자), 트랙 세그먼트.
- 상태는 옅은 배경 알약(점 + 글자). lucide 선 아이콘. 아바타 겹침. 진행 막대.
- 한국어 해요체, 짧게. 숫자는 `className="num"`. 이모지 금지.
- 잘 만든 예: `apps/worksite-next/src/pages/Home.tsx`, `Tasks.tsx`, `Members.tsx`, `Settings.tsx`, `Docs.tsx` (+ 같은 이름 .css). 이 품질·밀도로.

## 2. 쓸 수 있는 것(읽기만, 고치지 마세요)
- `src/ui/index.tsx`: Button(variant default|dark|brand|soft|ghost, size sm|lg, icon, count), IconButton, MoreButton, Card(title, icon, sub, actions, flush, foot, className="s-6"…), PillSelect, Chip(tone good|bad|warn|info|brand|neutral|dark|outline, dot, sm), Delta, Kpi, KpiCard, Segmented, Track, Tabs, Avatar, AvatarStack, Bar, StackBar, Toggle, Checkbox, Drawer, Menu, Empty, PageHead, cx. (먼저 파일을 읽고 props를 확인하세요)
- `src/ui/charts.tsx`: LineChart, CapsuleBars, Donut + Legend, Gauge, Heatmap, Sparkline, useWidth.
- `src/styles/ui.css` 클래스: g-12 + s-3..s-12, col/row/between, kpigrid/kpirow, table/tablewrap/cellmain, list, chip, tagsq, toolbar/search, phead, muted/faint/small/xs/ellipsis/num, tone-<hue>(coral amber green cyan violet blue orange brand).
- 모델·어휘: `src/lib/model.ts` (CrataProfile 4종 검사, COLOR/MOTIVE/CORE/CENTER/GROWTH/THINK/CONF 라벨, Team, Person, Position, Applicant, STAGE).
  - CRATA 4종 행동방식검사(crata.co.kr/tests 공개 설명): 색채검사(외면=행동적 태도, 내면=심리적 태도, Comfort Zone=지금 필요한 환경, Challenge Zone=지금 필요하지 않은 환경·코칭에서 다룸), 행동동기검사(시작=무엇이 있어야 움직이는가, 지속=무엇이 있어야 오래 가는가, 고유 vs 현재), 문제해결방식검사(중심역량=인지·행동의 중심을 잡아 주는 환경 조건, 핵심역량=문제를 해결하는 행동 패턴, 성장역량=반복을 넘는 다른 행동, 잠재역량=아직 정해지지 않은 가능성. 활용: 면접·직무 배치·팀 구성), 관계성장방식검사(생각을 정리하는 방식: 혼자/함께, 자신감이 자라는 방식: 비슷한 수준/다른 수준, 고유 vs 현재).
  - 색 이름·동기 항목·역량 항목 이름은 **예시**예요. 화면 어딘가(작은 글씨)에 "항목 이름은 예시, 실제 CRATA 결과지로 바뀌어요"를 자연스럽게.
- 엔진: `src/lib/fit.ts` (fit(env, profile, teamName) → {score, parts[]}, adviseMove, suggestTeams, suggestPeople, teamDistribution(5명 이상만), VERDICT, verdictOf), `src/lib/hiring.ts` (screen, recommend(pos, team, members, applicant) → {tier, score, fit, screening, reasons, concerns, questions}, desiredEnv, TIER), `src/lib/text.ts` (josa, q, monthsBetween).
- 데이터: `src/data/seed.ts` (TODAY "2026-10-07", COMPANY 예시정밀산업, TEAMS 9개(대표이사·공장장은 office), PEOPLE 47명, POSITIONS 4개(pos-qa, pos-p2, pos-dev 열림 / pos-sales 마감), APPLICANTS 32명).
- 상태: `import { useApp } from "@/data/store"` → `{ teams, people(확정), world({people,teams,today} 확정 전 이동 반영), pending, log, chat, positions, applicants, today, person(id), team(id), send, propose, undo, confirm, setStage(ids, stage), addApplicant(a), addPosition(p), toast(text) }`.
- 라우트(`src/App.tsx`): `/` Home, `/moves` Moves(오케스트레이터가 직접 만듦), `/people` People, `/hiring` Hiring, `/hiring/:id` Position, `/policy` Policy, `*` NotFound, 그리고 Shell 밖의 `/apply/:id` Apply(지원자 접수), `/test/:id` Test(지원자 CRATA 검사). 지금은 모두 스텁.

## 3. 꼭 지킬 기준(법·신뢰) — 화면 문구와 동작에 반영
- **AI는 추천과 근거만, 결정은 사람이.** 채용 추천에서 빠진 사람도 담당자가 면접에 넣을 수 있어야 해요. 자동 탈락 없음. "AI 추천은 참고예요. 면접 대상·합격은 담당자가 정해요" 같은 문구.
- 채용에 AI를 쓰는 건 인공지능기본법상 고영향 AI(채용)에 해당할 수 있어요 → 지원자에게 **AI가 추천에 쓰인다는 사실을 미리 알리고**, 지원자가 **설명을 요청**할 수 있게(개인정보보호법 자동화된 결정에 대한 권리). 지원자 화면에 고지 + 동의 체크.
- 채용절차법: 지원서에 **사진·키·체중·출신 지역·혼인 여부·재산·가족의 학력·직업**을 받지 않아요. 나이도 받지 않아요(연령차별금지). 채용서류는 반환 청구 기간(회사가 14~180일 중 정함)이 지나면 파기.
- 직원 CRATA 결과: **본인만(self)**이 기본. 회사는 **검사한 사람 5명 이상 팀 분포**만 봐요. **배치 참고(placement)에 따로 동의한 사람만** 개인 결과를 인사이동·추천에 써요. 응하지 않아도 불이익 없음. **ARA 마음 기록·대화는 인사에 쓰지 않아요.**
- 동의 안 한 사람의 개인 CRATA 값은 어떤 화면에도 표시하지 마세요(이름 옆 '동의 안 함' 표시만).

## 4. 규칙
- **내 화면 파일만** 만들고 고칩니다: `src/pages/<Page>.tsx` + `src/pages/<Page>.css`(+ 필요하면 `<Page>.parts.tsx`). 공통 부품이 필요하면 내 화면 파일 안에. `src/ui`, `src/lib`, `src/data`, `src/shell`, `src/styles`는 고치지 마세요(문제는 결과에 적기).
- `export default function …`. 첫 줄 주석에 Orbix의 어떤 레퍼런스에서 무엇을 가져왔는지.
- 첫 줄은 `PageHead`(h1 하나). 짙은 버튼은 화면당 하나.
- 모바일 390px에서 가로 넘침 없이(표는 tablewrap, 격자는 ui.css 반응형). 버튼에 글자 또는 aria-label, 색만으로 상태 구분 금지.
- 새 npm 패키지 금지. 커밋 금지.

## 5. 확인
1. `cd apps/hr && npx tsc -b --pretty false` (다른 화면 오류는 무시, 내 파일 0) 그리고 `npm test`.
2. 개발 서버를 내 포트로: `(cd apps/hr && setsid npx vite --port <포트> --strictPort > /dev/null 2>&1 &)` 후 `curl -s localhost:<포트>/`.
3. 스크린샷: `node <그때 쓴 캡처 스크립트 shotdev.js> <포트> <저장폴더> <이름> <해시경로> tr "" <폭> <높이>` (tenant 인자는 무시돼요. 예: `... 4311 .shots hiring /hiring tr "" 1440 1000`, 모바일 390 844). errors가 비어야 하고(404 favicon 괜찮음) overflow false.
4. 스크린샷을 Read로 보고 Orbix 레퍼런스와 비교해 최소 2번 다듬기. 데스크톱·모바일 모두.
5. 끝나면 서버 끄기: `pkill -f "vite --port <포트>"` (`ss`는 없어요).

## 6. 화면별 명세
### Hiring — 채용 공고 (`/hiring`) · refs/orbixcrm-projects-kanban-light.jpg 툴바, refs/orbixcrm-team-members-grid.jpg 카드, refs/orbixcrm-add-project-drawer.jpg 서랍
- KPI 띠: 열린 공고, 이번 주 지원, CRATA 검사 완료율, 면접 대상(추천) 수.
- 채용 흐름 띠(1차 접수 → 2차 CRATA 검사 → AI 추천 → 면접 → 결과)와 각 단계 사람 수(열린 공고 합).
- 공고 카드 격자: 제목, 팀, 인원, 마감 D-day, 단계별 막대(StackBar), 검사 완료 n/m, 추천 n명, '공고 보기'. 마감 공고는 아래 접힘.
- 짙은 버튼 '새 공고' → 서랍: 직무·팀·인원·마감, **"이런 사람을 뽑고 싶어요"(자유 입력)** + 필수 조건(경력, 교대, 자격) + 기준 방식(팀에 맞는 사람 / 팀에 없는 방식 채우기) + 강조 항목(핵심역량 칩 다중 선택, 생각 정리 방식) → 오른쪽(또는 아래)에 **ARA가 정리한 '찾는 사람' 미리보기**(desiredEnv로 팀 환경 + 강조를 문장으로). 저장하면 addPosition.

### Position — 공고 상세 (`/hiring/:id`) · post_1.jpg 칸반 또는 refs/projectflow-grouped-task-table.jpg 표, refs/hope-hr-analytics.jpg
- 머리: 공고 제목, 팀, 마감, 지원자 수. 회사가 적은 brief와 '찾는 사람' 요약(핵심역량·생각 정리·시작/지속 동기·환경 색) 카드.
- 단계 탭 또는 칸반: 접수/서류 통과 → CRATA 검사(보냄·완료) → 면접 추천 → 면접 → 결과. 
- 표: 체크, 이름, 지원일·경로, 경력, 서류 조건(통과/걸림), 검사 상태, **적합도(점수 + 막대)**, **추천 등급 칩(TIER)**, 다음 동작.
- 일괄 동작: '서류 통과 → 검사 보내기'(setStage testing), **'추천 n명 면접 대상으로'**(짙은 버튼; tier recommend만 미리 체크, 담당자가 바꿀 수 있음 → setStage interview), 보류.
- 지원자 서랍: 요약·경력·자격·서류 조건, CRATA 4종 결과(색 칩: 외면·내면·컴포트·챌린지 / 시작·지속 고유→현재 / 중심·핵심·성장·잠재 / 생각 정리·자신감), **찾는 사람과 비교(fit.parts 막대 7줄)**, ARA 요약(잘 맞는 점, 우려), **면접에서 물어볼 것(questions)**, 동작(면접으로/보류/불합격 — 불합격은 사람이 사유 선택 후). 하단 작은 글씨: "AI 추천은 참고. 지원자가 요청하면 추천 근거를 설명해요."
- 지원자 화면 링크: '지원서 화면 보기' → `#/apply/<id>`.

### Apply — 지원자 접수 (`/apply/:id`, Shell 밖, 모바일 우선) · refs/winx-add-product-form.jpg
- 회사 이름 + 공고 제목·팀·마감, 진행 순서(1 지원서 → 2 CRATA 검사(서류 통과 시 링크) → 3 면접).
- 폼: 이름, 연락처, 이메일, 경력(년), 자격(칩 추가), 교대 가능 여부, 자기소개(짧게), 이력서 파일(선택). **사진·나이·가족 사항은 받지 않아요** 안내.
- 동의: [필수] 채용 목적 개인정보 수집·이용, [필수] CRATA 검사 결과를 이 채용 판단에만 쓰는 것과 AI 추천 고지 확인(요청하면 설명), [선택] 불합격 후 인재풀 보관. 보관·파기 기간 안내.
- 제출 → addApplicant(stage "applied") → 완료 화면(“서류를 확인하면 CRATA 검사 링크를 보내 드려요”). 예시 화면이라 저장은 이 화면 안에서만.
### Test — 지원자 CRATA 검사 (`/test/:id`, Shell 밖) · refs/orbix-ai-chat-home.jpg 느낌의 차분한 화면
- 검사 4종 소개(색채·행동동기·문제해결방식·관계성장방식) + 예시 문항 몇 개(정답 없음 안내), 진행 막대, 완료 화면. "실제 검사는 CRATA 검사 화면에서 진행돼요(이건 흐름 예시)". 결과는 회사에 '이 채용 판단용'으로만 가고 지원자도 자기 결과를 받는다는 안내.
### People — 구성원 · CRATA (`/people`) · refs/orbixcrm-team-members-grid.jpg, refs/hope-hr-analytics.jpg
- KPI: 구성원, 검사 참여, 배치 참고 동의, 동의 안 함/미응시.
- 팀별 분포 카드(teamDistribution: 5명 이상일 때만, 아니면 "5명 미만이라 합쳐서 보여요/숨김").
- 구성원 표/카드: 이름·팀·직책·입사, 동의 상태 칩, (동의한 사람만) CRATA 요약(핵심역량·생각 정리·컴포트 색), 지금 팀 적합도(fit with team env). 클릭 → 서랍(동의한 사람만 4종 결과, 아니면 "본인만 볼 수 있어요"). '인사이동에서 보기' 버튼 → `/moves`.
### Policy — 동의 · 보관 (`/policy`)
- 직원 CRATA: 본인만 기본 / 배치 참고 동의 / 5명 이상 팀 분포 / 불이익 없음 / ARA 마음 기록 미사용 / 철회 방법. 현재 동의 현황 숫자.
- 채용: AI 추천 고지, 사람이 결정, 설명 요청, 받지 않는 정보(채용절차법), 서류 보관·파기(14~180일 중 회사가 정함, 예시 값 180일), 검사 결과는 그 채용에만.
- 표와 체크리스트 형태(Orbix 설정 화면 문법).
### Home — 인사 홈 (`/`)
- 인사 담당 인사말 + 짙은 버튼 '인사이동 열기'. KPI(구성원, 확정 전 이동, 열린 공고, 면접 추천 대기).
- 카드: 확정 전 이동 목록(pending — 판정 칩), 채용 파이프라인 요약(공고별 StackBar), 팀별 인원·최소 인원(막대), 최근 확정(log), CRATA 참여·동의 도넛.
### NotFound — 404
