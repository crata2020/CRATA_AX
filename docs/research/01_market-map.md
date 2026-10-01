# 국내외 유사 서비스·기업 리서치 맵 및 포지셔닝 제언

> **기준일** 2026-10-01 · **대상** CRATA(크라타)
> **범위**
> - GOAL A: Plaud 회의 녹음을 자동으로 분류하고, 한 회의를 구간별로 나눠 각각 알맞은 곳으로 보내기
> - GOAL B: 고객사의 스타일과 일하는 패턴을 추출해 맞춤 업무사이트 만들기
>
> **검증 상태 표기**
> - 확인: 1차 출처로 다시 확인함
> - 미검증: 조사만 하고 재확인하지 않음. 신중하게 볼 것
> - 정정: 원래 주장의 일부가 틀려서 바로잡은 사실을 반영함
> - 인수 / 종료예정 / 리브랜딩: 회사·서비스 상태가 바뀜
> - 불확실: 확인을 시도했으나 실패함
>
> **도입 방식 표기**
> - 직접사용: 그대로 가져다 씀
> - 부품통합: CRATA 파이프라인의 한 부품으로 붙임
> - 벤치마크: 아이디어만 참고함
> - 파트너 타깃: 협업·파트너십을 노릴 대상
> - 비추천

> **문서 안내**: [02 회의 자동 분류·라우팅 설계](./02_meeting-auto-classification.md)(분류 스키마·분류 체계·임계값·MVP의 정본) · [03 Company DNA 플레이북](./03_company-dna-playbook.md)(GOAL B 10-레이어·`company_profile.yaml`의 정본) · [04 데이터 거버넌스](./04_data-governance.md)(데이터 등급·수탁자·국외이전·정보주체 권리의 정본) · [05 서비스 카탈로그](./05_service-catalog.md)(조사한 서비스 전체 목록) · [06 검증 로그](./06_verification-log.md). 이 문서는 시장 지도와 포지셔닝을 다루며, 내용이 정본 문서와 다르면 정본 문서를 따릅니다.

---

## 1. 결론 요약 (핵심 인사이트 8개)

**1. 한 회의를 구간별로 나눠 서로 다른 사업부·프로젝트로 보내는 완제품은 이번 조사에서 확인되지 않았습니다.**
- 회의를 챕터나 주제로 나누는 기능은 이미 흔합니다.
  - [Teams recap](https://support.microsoft.com/en-us/teams/meetings/recap-in-microsoft-teams), [Read AI](https://www.read.ai/post/korean-polish-catalan-and-ukrainian-now-added-to-read-ai), [통의청오 API](https://help.aliyun.com/zh/tingwu/chapter-quick-view), [Feishu 妙记](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/minutes-v1/minute/artifacts)
- 회의 한 건 전체를 자동으로 분류하는 기능도 있습니다.
  - [Circleback](https://circleback.ai/docs/support/meetings/automatic-meeting-tagging): 미리 만든 태그 안에서만 고름
  - [Plaud Events](https://www.plaud.ai/blogs/news/plaud-knowledge-base): 2026년 10월 배포 예정
  - [콜라보 AI 레이블](https://callabo.ai/pricing)
- 하지만 구간 단위로 나눠 각각 다른 곳에 보내는 기능을 완제품으로 제공하는 사례는 확인되지 않았습니다. Feishu Open API나 n8n·Zapier 같은 자동화 도구로 부품을 조립해 만드는 수준입니다([02 문서](./02_meeting-auto-classification.md) 3장).
- 따라서 CRATA의 차별점은 네 가지가 됩니다: 구간 분할, 사업부·프로젝트 라우팅, 한국어 도메인 용어, 한국 규제 대응.

**2. 지금처럼 복사해서 붙여넣는 작업은 이번 주 안에 없앨 수 있습니다.**
- Plaud는 공식 [MCP·CLI](https://docs.plaud.ai/plaud-mcp-cli/mcp)를 제공합니다. 읽기 전용 도구 7개이고 활성 계정이면 무료입니다. 버전은 `@plaud-ai/mcp@0.3.13`, `@plaud-ai/cli@0.3.14`로 정확히 고정합니다.
- [Zapier 트리거](https://zapier.com/apps/plaud/integrations) 'Transcript & Summary Ready'도 있습니다.
- 다만 Plaud는 폴더에 쓰기, 웹훅, 폴더 필터를 지원하지 않습니다. 그래서 분류 결과의 원본은 Plaud 밖(Notion, Drive, 업무사이트 DB)에 둬야 합니다. L2 자료의 정본은 국내 저장소에 둡니다([04 문서](./04_data-governance.md)).
- 1주 MVP는 Zapier 경로 + Claude Sonnet 5.5로, `[강의]` `[아라]` `[AX]` `[공통]` **회의만** 대상으로 합니다. 이 중에서도 견적·계약 조건, 고객 진단처럼 L2인 회의는 MVP 기간에 수동 처리합니다. 학맞통 회의는 L2 경로가 생긴 1개월 차 이후에 넣습니다([02 문서](./02_meeting-auto-classification.md) 로드맵).

**3. 분류 정확도를 높이는 방법은 업계에서 이미 정해져 있습니다.**
- 순서는 다음과 같습니다.
  1. 설명, 별칭, 예시가 붙은 분류표를 만든다.
  2. AI가 그 목록 안에서만 고르게 한다.
  3. 근거가 된 발언과 타임스탬프를 붙인다.
  4. 확신이 낮으면 '미분류'로 돌린다(CRATA 기준: 0.85 이상 + 규칙 일치면 자동, 0.60~0.84는 확인 제안, 0.60 미만이나 NEW는 미분류. 처음 2주는 전부 사람 확인).
  5. 사람이 1클릭으로 승인한다.
  6. 사람이 고친 결과를 다시 예시로 쌓는다.
- 참고 사례: Circleback, [Otolio→kintone](https://www.smartshoki.com/news/post-9933/), [Rimo Actions](https://rimo.app/about/actions), [Tingwu ContentExtraction](https://help.aliyun.com/zh/tingwu/content-extraction), [Linear Triage](https://linear.app/docs/triage-intelligence)

**4. GOAL B의 '회사 스타일과 패턴'은 도구 하나로 뽑히지 않습니다. 레이어별로 나눠 추출하고, 결과를 데이터로 남겨야 합니다.**
- 정본 프레임은 [03 Company DNA 플레이북](./03_company-dna-playbook.md)의 10-레이어(L1 정체성·비주얼 ~ L10 페인포인트·KPI·AI 기회)입니다. 이 문서의 5.3에는 매핑만 둡니다.
- 결과는 문서가 아니라 데이터(**Company DNA Profile**: `clients/{slug}/company_profile.yaml` + `style-pack/`)로 남깁니다. 그래야 업무사이트와 아라(ARA)가 자동으로 읽을 수 있습니다.
- 한국 조직에서 가장 중요한 자료는 웹사이트가 아닙니다. 위임전결규정, 결재선, 결재 양식, 완결 문서, 업무 단톡방, 공유폴더 구조입니다.
- CRATA의 행동방식검사(조직유형 체계)는 조사한 경쟁사에서는 확인되지 않은 자산으로, 03의 L8(리듬·의례·소통·문화)에 들어갑니다.

**5. 업무사이트 생성은 '설계서 먼저, 고객 승인, 그다음 AI 생성' 순서가 업계 표준입니다.**
- [Power Apps Plans](https://learn.microsoft.com/en-us/power-apps/maker/plan-designer/plan-designer): 요구사항 → 데이터 → 솔루션, 3단계마다 승인
- [Feishu 전문가 모드](https://www.feishu.cn/hc/zh-CN/articles/882125125335): 설계문서를 먼저 확인받음
- [Sierra Ghostwriter](https://sierra.ai/product/ghostwriter): SOP, 녹취, 전문가 인터뷰 음성으로 에이전트 초안을 만들고 검토 후 배포

**6. 사업모델은 '교육으로 들어가서 같이 만드는' 방식이 검증된 길입니다.**
- Palantir: [5일 부트캠프](https://www.palantir.com/platforms/aip/bootcamp/)와 현장 상주 엔지니어(FDE)
- 빅테크도 FDE 조직을 새로 만들었습니다. AWS 10억 달러, Microsoft 25억 달러 규모입니다([Wikipedia](https://en.wikipedia.org/wiki/Forward_deployed_engineer), **2차 출처**. 원 보도는 About Amazon·Reuters 2026-06-30, Microsoft 관련 보도 2026-07-02로 확인했으나 1차 URL은 TODO).
- 일본 kintone 파트너 모델: [伴走(동행형 월정액)](https://kintone.cybozu.co.jp/support/menu/partner/banso/), [JOYZO 정액 개발(¥39만, 2시간×3회)](https://service.joyzo.co.jp/system39/)
- Workday가 교육과 에이전트를 결합한 [Sana를 약 11억 달러에 인수](https://newsroom.workday.com/2025-09-16-Workday-Signs-Definitive-Agreement-to-Acquire-Sana)했습니다.
- CRATA의 강의·워크샵은 그대로 진단 데이터를 모으는 통로가 됩니다.

**7. 한국에서 팔리려면 규제와 데이터 경로 설계가 제품의 일부여야 합니다.**
- 녹음: 대화에 참여한 사람의 녹음만 적법하다는 '참여자 원칙'([대법원 2013도16404](https://casenote.kr/대법원/2013도16404))
- 국외 처리: Plaud, 티로, 다글로 모두 처리 단계에서 미국을 거칩니다.
- 학맞통: 학생정보 처리에 동의를 받아야 합니다([학맞통법 제11조③](https://casenote.kr/%EB%B2%95%EB%A0%B9/%ED%95%99%EC%83%9D%EB%A7%9E%EC%B6%A4%ED%86%B5%ED%95%A9%EC%A7%80%EC%9B%90%EB%B2%95)).
- AI 기본법 생성형 AI 고지 의무(2026-01-22 시행)
- 학교 도입: 학습지원SW 선정기준과 학교운영위원회 심의
- 따라서 회의와 데이터를 L0~L3 등급으로 나누고, 등급마다 처리 경로를 고정하는 구조를 기본값으로 둬야 합니다(정의는 [04 데이터 거버넌스](./04_data-governance.md)가 정본).
  - L3(학생 식별 정보, 상담·사례 내용)는 **녹음 자체를 하지 않는 것**이 원칙입니다.
  - L3 탐지는 해외 LLM을 부르기 **전에** 로컬에서 먼저 합니다. LLM 프롬프트의 L3 규칙은 2차 안전망일 뿐입니다.
  - Plaud AutoFlow는 동기화 즉시 Plaud 클라우드와 미국 LLM으로 요약하므로, 이 단계의 노출은 파이프라인으로 막을 수 없습니다. 그래서 **녹음 자체를 통제**합니다.

**8. 플랫폼이 자주 바뀝니다. 특정 기기나 빌더에 묶이지 않게 설계해야 합니다.**
- 종료·인수 사례
  - [Limitless](https://9to5mac.com/2025/12/05/rewind-limitless-meta-acquisition/): Meta 인수(2025-12-05) 후 한국 서비스 즉시 종료
  - [OpenAI Agent Builder](https://developers.openai.com/api/docs/deprecations): deprecated, 2026-11-30 종료 예정
  - [Firebase Studio](https://firebase.google.com/docs/studio): 2027-03-22 종료 예정
  - Fathom: 2026-09-14 Superhuman 인수 발표(종결 미확인)
  - Sana: Workday 인수 완료, 지금은 'Sana from Workday'
  - Apromore: Salesforce와 2025-10-09 계약, 2025-11-03 종결
  - Moveworks: ServiceNow 인수
  - 더존비즈온: EQT 인수(상장폐지 수순)
  - [AI GIJIROKU](https://www.alt.ai/crp) 운영사: 민사재생
- 원문 전사본은 CRATA 저장소에 따로 보관하고, SOP와 스킬은 마크다운이나 MCP 같은 옮겨 쓸 수 있는 형식으로 관리하세요.

---

## 2. 카테고리별 리서치 맵

### 2.1 글로벌 회의 AI (노트테이커)

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Circleback](https://circleback.ai/releases) | 미국 | 미리 만든 태그 안에서만 AI가 자동 태깅(태그 설명과 과거 태깅 참고). 태그를 조건으로 Notion·Linear·웹훅 자동화. 공개 API(2026-08), API로 회의 가져오기(2026-09) | '사업부>프로젝트' 태그와 설명이 분류 설계의 원형. Plaud 전사본을 넣어 실험할 수 있음 | 벤치마크(+실험) | 확인. 한국어 지원, 언어 목록은 약 130개로 '150+' 표기는 없음 |
| [Fireflies.ai](https://guide.fireflies.ai/articles/4608292950-learn-about-the-rules-engine-feature) | 미국 | Rules Engine(Enterprise 관리자 전용: 제목·호스트·참석자·내부/외부 조건으로 라우팅). AI Skills(구 AI Apps, 여러 회의 정기 분석). 원격 MCP | 규칙은 LLM 분류 앞단 필터로만 쓸 것. '사업부별 주간 리포트' 아이디어 | 벤치마크 | 확인 |
| [Granola](https://docs.granola.ai/help-center/sharing/folders/spaces-and-folders) | 영국 | 봇 없이 기록하는 노트. Recipes(회의 1건 또는 여러 건 범위), 반복 회의를 폴더에 자동 추가(선택 시), 폴더·Space 단위 채팅, API·MCP. [2026-03 기업가치 $1.5B](https://techcrunch.com/2026/03/25/granola-raises-125m-hits-1-5b-valuation-as-it-expands-from-meeting-notetaker-to-enterprise-ai-app/) | 폴더 = 프로젝트, Recipe = 산출물 템플릿, 폴더 채팅 = 프로젝트 기억 | 벤치마크 | 확인. 일부 MCP 도구는 유료 |
| [Otter.ai](https://otter.ai/blog/otter-ai-evolves-from-ai-notetaker-to-create-100b-enterprise-conversational-knowledge-engine-market) | 미국 | 고객별 채널, Conversational Knowledge Engine(2026-04, 지식그래프·MCP) | 한국어 미지원이라 개념만 참고 | 비추천 | 확인 |
| [Read AI](https://www.read.ai/post/new-features-read-introduces-meeting-tags-and-advanced-search) | 미국 | 회의 유형 7종 자동 분류 + 커스텀 프로젝트 태그. 한국어로 챕터·토픽 생성(2025-02). MCP·API 오픈베타(2026-03) | '사업부 × 회의유형' 2축 분류. 한국어 구간 분할을 비교할 기준점 | 벤치마크 | 확인 |
| [Avoma](https://help.avoma.com/purposes-and-outcomes) | 미국 | 제목 명명 규칙 → 회의 목적 → 템플릿 자동 적용. Smart Topics(구 Smart Categories)로 CRM 필드 추출, Smart Chapters | Plaud 녹음 제목에 `[강의]` `[학맞통]` `[아라]` `[AX]` `[공통]` `[혼합]` 접두어(5.4)를 붙이는 규칙이 가장 싼 1차 분류법. 프로젝트 카드 필드 자동 채우기 | 벤치마크 | 정정(기능명 변경) |
| [MeetGeek](https://meetgeek.ai/meeting-skills) | 루마니아(미검증) | 제목·참석자·어휘·대화 흐름으로 회의 유형을 판별해 템플릿 적용. Meeting Skills 트리거 4종(회의 후/정기/신호/수동). API·MCP | 제목이 없는 Plaud 대면 녹음에는 내용 기반 판별이 맞음. 트리거 설계의 틀 | 벤치마크 | 확인. MCP는 Node 14+ 필요, 한국어 미확인 |
| [tl;dv](https://intercom.help/tldv/en/articles/11583137-api-and-webhooks) | 독일 | 토픽별 노트, 여러 회의 정기 리포트, URL로 회의 가져오기 API(Pro/Business), 웹훅, 읽기 전용 MCP | 외부 오디오를 처리하는 부품 후보 | 부품통합 | 확인 |
| [Fathom](https://techcrunch.com/2026/09/14/superhuman-acquires-yc-backed-notetaker-fathom-as-productivity-platforms-push-for-agentic-work/) | 미국 | 무료 노트테이커, API·MCP. **2026-09-14 Superhuman이 인수 발표** | 노트테이커가 메일·문서 플랫폼의 기능으로 흡수되는 흐름. 아라(ARA) 전략에 시사점 | 비추천 | 인수 발표(종결 미확인) |
| [Fellow](https://fellow.ai/features/ai-recording-library) | 캐나다 | 자동 게시 규칙으로 채널 채움. Ask Fellow. 액션아이템을 Asana·Jira·Linear 등으로 보냄. MCP | 프로젝트 페이지에 회의가 자동으로 쌓이는 화면. 사업부별로 다른 도구로 라우팅 | 벤치마크 | 확인 |
| [Supernormal](https://www.supernormal.com/product-updates) | 미국 | '에이전시용 AI 에이전트'로 방향 전환. Projects 단위 채팅, 회의로 덱·문서·시트·제안서 생성(2.0, 2026-03), MCP | 회의 → 고객 산출물 흐름이 CRATA와 같음. 한국어 미지원 | 벤치마크 | 확인 |
| [Sembly AI 3.0](https://www.sembly.ai/) | 미검증 | 고객별 '살아있는 컨텍스트 환경'과 브랜드 패키지로 브랜드 서식 제안서·덱(PPTX/DOCX) 생성(2026-09). [Basic $10/월, 고객 25곳](https://www.sembly.ai/pricing/) | GOAL B '고객사 컨텍스트 컨테이너'의 원형. 고객 수 기준 요금제 | 벤치마크 | 확인 |
| [Notta / Notta Brain](https://www.issoh.co.jp/tech/details/12631/) | 일본 | 58개 언어 전사. Notta Brain(2026-01)은 회의와 문서를 함께 분석해 PPT·인포그래픽 생성. 녹음기 Notta Memo | 한국어 사용자 사전을 지원하지 않는 점이 CRATA의 차별 지점 | 벤치마크 | 확인. Word 출력은 미확인 |
| [Jamie](https://www.meetjamie.ai/blog/ai-meeting-assistant) | 독일 | 봇 없는 대면·온라인 캡처, EU 내 저장, 전사 후 오디오 삭제, ISO 27001 | '원본은 즉시 삭제, 전사본만 보관' 정책. 학맞통 제안에 활용 | 벤치마크 | 확인 |
| [Grain](https://grain.com/) | 미국 | 참석자를 CRM 레코드에 자동 연결, API·MCP | '참석자 소속 → 고객사 프로젝트' 1차 규칙 | 벤치마크 | 확인. Smart Tags는 미확인 |
| [Krisp](https://krisp.ai/pricing/) / [Bluedot](https://www.bluedothq.com/) / [Tactiq](https://tactiq.io/) | 미국 / 미검증 / 호주 | 봇 없는 캡처, 용도별 템플릿, 프롬프트 워크플로 | 분류 기능이 약함. Tactiq의 '프롬프트 키트' UX 정도만 참고 | 비추천 | 확인 |
| [Meetily](https://github.com/Zackriya-Solutions/meetily) / Hyprnote | 인도(미검증) / 미국 | 오픈소스 로컬 노트(Whisper + 로컬 LLM) | 학교·기관 내부망 설치형을 검토할 때의 참고 코드 | 부품통합 | 미검증 |

### 2.2 회의 → 산출물·업무 연결 (플랫폼 내장형 포함)

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Notion AI Meeting Notes + Custom Agents](https://www.notion.com/releases/2026-07-31) | 미국 | 한국어 전사(화자 라벨은 영어만). 기본 DB에 적재. 'AI 회의록 완료' 트리거(2026-07-31)로 에이전트 실행. Business/Enterprise 전용. 에이전트는 [1,000크레딧당 $10](https://www.notion.com/help/custom-agents) | 분류 → 사업부 DB 연결 → 업무 생성을 노코드에 가깝게 구현 | 직접사용 | 정정: 에이전트가 전사·요약을 직접 받는지는 문서에 없음 |
| [ZoomMate(구 AI Companion)](https://www.zoom.com/en/products/ai-assistant/) | 미국 | 유료 플랜의 맞춤 요약 템플릿 무제한, 커스텀 에이전트, 문서·슬라이드 생성. Basic 무료(제한), Standard 월 2,200크레딧. 여러 회의 교차 분석·커스텀 사전·지식베이스는 (미검증) | 사업부별 요약 템플릿을 회의 유형마다 고정하는 방식 | 벤치마크 | 리브랜딩 |
| [Microsoft Teams recap / Facilitator](https://learn.microsoft.com/en-us/microsoftteams/facilitator-teams) | 미국 | 챕터·토픽 분할(라이선스 불필요). AI 노트는 단일 언어만. Graph aiInsights API는 베타 | 챕터 분할은 GOAL A 핵심 단계와 같지만 라우팅은 없음. M365 쓰는 고객사 연동 후보 | 벤치마크 | 확인 |
| [Google Meet 'Take notes for me'](https://support.google.com/meet/answer/14754931?hl=en) | 미국 | 회의록을 Docs로 Drive에 저장. 한국어 지원. 대면 모드 발표(2026-04) | Workspace를 쓰는 학교·교육청의 기본 옵션. Drive를 감시해 분류 | 부품통합 | 미검증 |
| [Gemini Notebook(구 NotebookLM)](https://support.google.com/notebooklm/answer/16179559) | 미국 | 소스에 근거한 문서·슬라이드·퀴즈·오디오 요약 | 강의 사전자료, 교사 연수자료 제작 | 직접사용 | 리브랜딩. API는 확인 안 됨 |
| [Claude Projects](https://support.claude.com/en/articles/9517075-what-are-projects) | 미국 | 프로젝트별 지식·지침·메모리 분리 | 지금 습관을 가장 적게 바꾸는 0단계. L0~L1 회의만 넣음(학맞통·견적·고객 진단 녹음 제외, [04 문서](./04_data-governance.md) 2.3절) | 직접사용 | 미검증 |
| [Gamma API](https://developers.gamma.app/) | 미국 | 텍스트나 템플릿으로 덱·문서·웹 생성, PDF/PPTX, MCP(Pro 이상) | 강의안·제안서 렌더링 엔진 | 부품통합 | 확인 |
| [Gong](https://www.gong.io/) | 미국/이스라엘 | Revenue Graph, 실제 대화로 교육 콘텐츠 생성(Gong Enable) | '고객사–담당자–회의–결정' 관계 그래프 모델 | 벤치마크 | 미검증 |
| [Linear Triage Intelligence + MCP](https://linear.app/docs/triage-intelligence) | 미국 | 과거 이력으로 팀·프로젝트·라벨 추천(Business+), MCP로 이슈 생성 | 사람이 고친 이력으로 분류기 개선. 아라 개발 티켓 | 부품통합 | 미검증 |
| [Asana AI Studio](https://asana.com/product/ai/ai-studio) | 미국 | 접수 → 분류 → 라우팅 → 초안을 노코드로 | 파이프라인 3단 골격 | 벤치마크 | 확인 |
| [Manus](https://manus.im/blog) | 싱가포르(중국 기원) | 범용 에이전트(슬라이드·웹사이트). Meta 인수가 중국 당국에 막힌 뒤 2026-09-01 독립 운영 재개, 9-28 Manus 2.0 발표 | GOAL B 시제품 실험 정도. 데이터 처리 위치 확인 필수 | 벤치마크 | 확인(소유 구조 변동) |

### 2.3 AI 녹음기 (Plaud 및 경쟁)

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Plaud Note / NotePin / Plaud One + 앱](https://www.plaud.ai/pages/plaud-ai-plan-pricing) | 미국(Plaud Inc.) | 112개 언어 전사, 템플릿 1만 개 이상, AutoFlow 자동 처리. Starter 무료(월 300분), Pro $17.99/월, Unlimited $29.99/월, Team 1인당 월 $20(연간 결제, 2026-11-30까지 가입 시 첫해 론칭가, 이후 $25) | 현재 입력원. 'CRATA 분류용' 커스텀 템플릿(사업부 후보, 주제 전환 시점, 언급된 기관명)을 만들 것. AutoFlow는 동기화 즉시 Plaud 클라우드·미국 LLM으로 요약하므로 학맞통 기관 협의 녹음을 AutoFlow 대상에서 빼는 방법(별도 계정·기기, 수동 동기화)은 TODO | 직접사용 | 미검증(요금은 확인) |
| [Plaud MCP·CLI](https://docs.plaud.ai/plaud-mcp-cli/mcp) | 미국 | 읽기 전용 도구 7개(list_files, get_file, get_note, get_transcript 등). 폴더·태그 필터, 쓰기, 웹훅 없음. 활성 계정 무료. 오디오는 24시간 유효 URL | GOAL A 1개월 차(경로 B)의 핵심 부품. '처리 완료 ID 로그'로 주기적으로 확인(폴링)하는 구조. 로그인한 계정의 녹음만 보이므로 여러 사람 계정 처리는 TODO | 부품통합 | 정정: 문서상 GA는 2026-05-12이지만 npm 최신판은 `@plaud-ai/mcp@0.3.13`, `@plaud-ai/cli@0.3.14`. 이 버전으로 정확히 고정하고, 올릴 때 골든셋 회귀 테스트 |
| [Plaud Intelligence(Events·Skills·Routines·Artifacts·Connectors)](https://www.plaud.ai/blogs/news/introducing-plaud-intelligence) | 미국 | 2026-09-22 발표, 10월 배포 예정('Oct 12'). Agent가 녹음을 맥락에 맞는 Event에 배정. 외부로 보내기 전 확인 요청 | 사업부별 Event를 만들어 시험(L0~L1 회의만. 학맞통·고객 진단 녹음 제외, [04 문서](./04_data-governance.md) 6.4절). 회의 단위 배정만 되고 구간 분할은 없음 | 직접사용 | 미검증(배포 후 확인) |
| [Plaud × Zapier](https://zapier.com/apps/plaud/integrations) | 미국 | 트리거 1개(재요약할 때도 다시 발동), 액션 없음 | 노코드 1단계. 파일 ID로 중복 제거 필수. Zapier MCP로 Plaud 데이터를 조회하는 것은 불가 | 직접사용 | 확인 |
| [Plaud Embedded](https://dev.plaud.ai/device-sdk/) | 미국 | 자사 앱에서 기기를 BLE로 직접 연결하고 전사 API 사용. 무료 구간은 전사 300시간, 기기 50대 | 아라를 제품화할 때 기기 직접 연동 | 부품통합 | 확인 |
| [Omi](https://github.com/BasedHardware/omi) | 미국 | MIT 오픈소스. 폴더 설명을 보고 대화를 폴더에 자동 배정(2026-01). REST·웹훅·MCP | 공개 코드로 볼 수 있는 분류기 레퍼런스(정확도 문제 이슈 #4043 참고) | 벤치마크 | 미검증(주장은 확인) |
| [TicNote](https://ticnote.com/ko/userguide) | 중국(Mobvoi) | 내용을 보고 AI가 프로젝트를 자동 구성. 한국어 가이드 있음 | GOAL A UX 벤치마크. API가 약함 | 벤치마크 | 미검증 |
| [Limitless Pendant](https://9to5mac.com/2025/12/05/rewind-limitless-meta-acquisition/) | 미국 | **2025-12-05 Meta 인수.** 신규 판매 중단, 한국 등 7개 지역 서비스 즉시 종료(2025-12-19까지 데이터 내보내기) | 특정 기기에 묶이지 말고 원문을 자체 보관해야 한다는 교훈 | 비추천 | 인수(한국 서비스 종료) |
| [Bee](https://techcrunch.com/2025/07/22/amazon-acquires-bee-the-ai-wearable-that-records-everything-you-say/) | 미국 | Amazon 인수(2025-07 발표). 대화에서 사실(facts)을 자동 추출 | '이 회사는 구두 합의 후 메일로 남긴다' 같은 패턴을 fact로 누적 | 벤치마크 | 미검증 |
| [viaim OpenNote](https://www.etnews.com/20260812000328) | 중국 | 녹음 이어버드, 2026-08 한국 출시(379,000원), API 없음 | 통화와 온라인 회의가 많은 업무용 | 비추천 | 미검증 |
| [iFLYTEK 녹음기](https://www.iflytek.com/en/support/faq/smart-recorder.html) | 중국 | 한국어 포함 5개 언어 오프라인 전사 | 클라우드를 쓸 수 없는 기관용 대안의 선례 | 벤치마크 | 미검증 |
| [Soundcore Work](https://techcrunch.com/2026/03/20/ai-notetaker-hardware-devices-pins-pendants-record-transcribe/) | 중국(Anker) | 초소형 녹음기, 녹음 중 하이라이트 표시 | 하이라이트 표시를 구간 분할 힌트로 활용 | 벤치마크 | 확인 |
| [HiDock P1 + HiNotes 3.0](https://channellife.com.au/story/hidock-launches-p1-ai-voice-recorder-with-hinotes-3-0) | 중국/글로벌 | Smart Labels 자동 분류, 여러 녹음을 하나의 문서로 합성 | '같은 프로젝트의 회의 여러 건 → 제안서 1건' | 벤치마크 | 확인 |
| [DingTalk A1](https://page.dingtalk.com/wow/dingtalk/default/dingtalk/ENSdJDWVpi1L44lqSr3Zz) | 중국 | 녹음이 AI 표에 자동 적재되고 할 일 생성 | 녹음기가 업무 DB에 바로 꽂히는 최종 형태 | 벤치마크 | 미검증 |
| [Genspark SecondBrain Note](https://aitoolsreview.co.uk/insights/genspark-secondbrain-note) | 미국 | 녹음 카드와 에이전트, 프로젝트 대시보드 생성, $179(2026-08) | 아라의 '회의 → 산출물' 포지셔닝 비교 대상 | 벤치마크 | 확인(2차 출처) |
| [Stream Ring](https://www.engadget.com/wearables/the-ai-powered-stream-ring-is-designed-for-on-the-fly-voice-notes-143530840.html) / [riffado](https://github.com/riffado/riffado/issues/223) | 미국 / 오픈소스 | 누를 때만 녹음하는 반지 / 비공식 Plaud 폴더 쓰기 | riffado는 폴더 쓰기가 기술적으로 가능하다는 증거일 뿐 운영 사용 금지 | 비추천 | 미검증 |

### 2.4 국내 회의·음성 AI (STT 포함)

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [네이버웍스 클로바노트](https://naver.worksmobile.com/pricing/clovanote/) | 한국 | 회사(도메인) 단위 과금, Lite 월 2만 원(1,000분). 사전 2,000개(공용 1,000 + 개인 1,000). 화자 식별과 맞춤 템플릿은 Business 이상, 외부 연동 API는 Team 이상. AI 학습에 쓰지 않음 | 학교·공공 고객의 국내 처리 기본 옵션. 학맞통·아라 같은 사내 용어 등록 | 부품통합 | 확인 |
| [CLOVA Speech](https://guide.ncloud-docs.com/docs/clovaspeech-spec) | 한국 | 장문 인식에서만 화자 분리(스트리밍 불가), 부스팅 키워드 1,000개, 한영 혼합(enko), 완료 콜백. [15초당 5원](https://www.ncloud.com/product/aiService/clovaSpeech) | 영어 용어가 섞인 AI 강의 회의를 재전사할 국내 1순위 후보 | 부품통합 | 확인 |
| [RTZR STT API](https://developers.rtzr.ai/docs/pricing/) | 한국(리턴제로) | 시간당 1,000원, 600분 무료, 화자 수 자동 추정, 키워드 부스팅. 결과는 3일 보관. 온프레미스 공급 이력 | 가장 저렴한 한국어 재전사. 결과를 바로 자체 저장소로 옮길 것 | 부품통합 | 확인 |
| [다글로](https://daglo.ai/pricing) | 한국(액션파워) | 전사·요약·슬라이드, 한컴 애드온(2026-08), 온프레미스 private LLM, Slack/Notion MCP, 개발자 API. Pro 월 11,900원. 2026년 랜섬웨어 피해(KISA: 유출 없음). [처리방침상 미국으로 국외이전](https://daglo.ai/d/ko/legal/privacy) | 국외이전 고지표를 쓰는 모범 사례. 설치형 대안 | 부품통합 | 확인 |
| [콜라보](https://callabo.ai/pricing) | 한국(리턴제로) | 'AI 레이블 자동 추천/설정', ISO 27001(~2027-12), 웹훅은 '제공 예정' | 국내 서비스 중 GOAL A에 가장 가까움. 기준점 PoC 대상 | 벤치마크 | 확인 |
| [티로(Tiro)](https://docs.tiro.ooo/en/guide/notes/api-mcp-cli.md) | 한국(운영사 ThePlato, 주소 샌프란시스코) | 모든 요금제에 API·MCP·CLI·웹훅 포함. 노트를 폴더에 넣는 쓰기 API. [Wiki](https://docs.tiro.ooo/en/guide/notes/wiki.md)(사람·주제·결정 관계 지도, Pro 이상). 폴더 자동화는 AI 분류가 아님. 개인 요금은 월 $7~29대(출처마다 다름) | Plaud에 없는 쓰기 API와 웹훅이 있음. Wiki는 GOAL B '조직 언어 지도'의 완성형 레퍼런스 | 부품통합 | 정정: 저장만 서울이고 [음성·전사 처리는 미국 수탁자 경유](https://tiro.ooo/privacy-policy) |
| [에이닷 노트](https://news.sktelecom.com/218051) | 한국(SKT) | 녹음 전후 템플릿 선택, 강의노트 복습문제 생성 | 강의·워크샵 산출물 UX | 벤치마크 | 미검증 |
| 갤럭시 녹음 텍스트 변환 | 한국(삼성) | 화자 라벨, 타임코드 요약 | API가 없어 파이프라인 부품으로 약함 | 비추천 | 미검증 |
| [셀비노트](https://m.ddaily.co.kr/page/view/2026022608415070571) | 한국(셀바스AI) | 인터넷 없이 단말에서 전사. 경찰·지자체·소방·군 등 약 70개 고객, GS 1등급 | 기관이 자체적으로 기록을 남길 때 권할 수 있는 온디바이스 옵션(CRATA는 녹음·보관하지 않음) | 벤치마크 | 정정: 법무부 KICS 연동과 아동학대 현장조사 사례는 미확인 |
| [AI레포토](https://www.airepoto.com/ko/) | 한국(알서포트) | 회사 템플릿과 사전, 결정·할 일 추출, SaaS/온프레미스, ISO 27001/27017, 나라장터 등록 | 고객사 양식을 템플릿 자산으로 만드는 방식 | 벤치마크 | 확인 |
| [MoAI 노트](https://moai-note.ai/) | 한국(퓨렌스) | 여러 회의를 RAG로 비교하는 봇, 폐쇄망 구축 | 프로젝트별 누적 지식 | 벤치마크 | 미검증 |
| [릴리스AI](https://lilys.ai/ko) | 한국 | 리포트 템플릿 30종 이상, 타임스탬프 인용, 실시간 회의록 | 교육형 산출물과 근거 연결 방식 | 벤치마크 | 확인 |
| [뤼튼](https://help.wrtn.ai/tool_work) | 한국 | 강의 녹음 노트 | 개인용 | 비추천 | 확인 |
| [웍스AI](https://docs.wrks.ai/release-notes) | 한국(AI3) | 회의록 작성 Pro, HWPX 내보내기, MCP Hub(방화벽 인바운드를 열지 않고 사내 시스템 연결), 국산 오픈웨이트 모델 | 고객사 시스템 안전 연결, HWPX 납품물 | 벤치마크 | 확인 |

### 2.5 국내 협업툴·그룹웨어 (포털 배포·연동 대상이자 패턴 데이터의 원천)

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [NAVER WORKS (+AI Studio)](https://help.worksmobile.com/ko/admin-guides/audit/message/) | 한국 | 그룹웨어. [AI Studio 월 9,000원/인](https://naver.worksmobile.com/products/aistudio/). 감사로그(메시지 송수신 메타데이터, 결재 조회·삭제) 180일 보관, Audit API. CSAP·ISMS-P | 본문 없이 '누가 누구에게 언제'만으로 소통 네트워크 분석. 포털은 봇이나 링크로 내장 | 부품통합 | 확인 |
| [두레이](https://www.econovill.com/news/articleView.html?idxno=752387) | 한국(NHN) | CSAP, 공공기관 약 150곳, 프롬프트 DLP, 3계층 보호, 결재 서식 직접 생성. [25인 이하 무료](https://dooray.com/main/pricing/) | 학맞통용 아라의 보안 아키텍처 레퍼런스 | 벤치마크·부품 | 확인 |
| [플로우](https://www.venturesquare.net/1114673/) | 한국(마드라스체크) | WBS를 넣으면 프로젝트 구조를 설계하는 에이전트. MCP 39개 기능. 기업 고객 5,500곳 이상. [AI 크레딧 포함 좌석 요금](https://flow.team/ko/pricing) | 분류 후 업무를 보낼 목적지. 아라 요금 구조의 벤치마크 | 부품통합 | 정정: 2026-06-25은 MCP 공개일이고, ChatGPT·Claude 공식 앱 등록은 2026-09-17 보도 |
| [다우오피스](https://daouoffice.com/features_approval.jsp) | 한국(다우기술) | 사내 위임 규정을 넣으면 결재선 자동 생성. 양식 100여 종. API는 엔터프라이즈형 무료. 부서별 AI 에이전트(2026-08) | 위임규정이 곧 의사결정 경로의 기준 데이터 | 부품통합 | 확인 |
| [하이웍스](https://developers.hiworks.com/) | 한국(가비아) | 전자결재 기안·상태 조회, 지출결의 조회·수정, 회계코드(코스트센터·거래처·계정과목) CRUD, 조직·구성원·직위·직무 CRUD | 직위 체계는 API로 자동 수집. 결재선은 문서 샘플로 보완 | 부품통합 | 정정: 결재 이력·결재선 대량 조회 엔드포인트만 없음. 개발자센터 공지가 2019년 이후 갱신 없음 → API 유지 여부 확인 |
| [카카오워크 2.0](https://kakaowork.gitbook.io/kakao-work/2.0-beta/2.0-ai/ai_add) | 한국 | 2026-07-14 출시. 카카오워크AI: 사내 규정 AI 검색, 회의·결재·메일·할 일 브리핑. 조직·봇 API | 봇 메시지를 포털 알림 채널로, 조직 API로 조직도 수집 | 부품통합 | 정정: 운영사는 ㈜디케이테크인 |
| [더존 ONE AI / Amaranth 10](https://www.douzone.com/product/oneai.jsp) | 한국 | 대화방 내용으로 프로젝트 보고서 생성, 결재 요약, 사내 규정 RAG | 더존 고객사에는 이미 있는 기능이라 다시 만들지 말고 그 위 레이어를 맡을 것 | 벤치마크 | 인수: 더존비즈온은 EQT가 약 95% 확보, 상장폐지 수순 |
| [잔디](https://byline.network/2025/08/22-458/) | 한국(토스랩) | 잔디홈: 안 읽은 메시지를 주제별로 요약 | 포털 홈 화면 설계 | 벤치마크 | 확인 |
| [스윗](https://swit.io/ko-kr/snap) | 한국/미국 | 텍스트를 바로 태스크로 변환, Solar 등 여러 LLM 선택 | 분류 결과를 사람이 확정하는 UX | 벤치마크 | 확인 |
| [브리티웍스](https://view.asiae.co.kr/article/2026081309530904795) | 한국(삼성SDS) | 9개 부처 도입, 국정원 '상'등급 PPP 클라우드, AI 회의록 요약 | 공공 협업툴 3강(네이버웍스·두레이·브리티웍스) 연동을 전제로 설계 | 벤치마크 | 확인 |

### 2.6 동아시아(일본·중국) — 보완 조사

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Feishu 妙记 + Open API](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/minutes-v1/minute/artifacts) | 중국 | 장(章)별 회의록. 오디오 업로드로 妙记 생성하는 API, 생성 완료 이벤트, AI 산출물(총결·장·할 일·키워드·축어록) 조회 API | '업로드 → 이벤트 → 장 조회 → 장마다 레코드 1건 → 분류'의 레퍼런스 파이프라인 | 벤치마크 | 확인 |
| [Feishu 다차원표 AI](https://www.feishu.cn/hc/zh-CN/articles/843535382074) | 중국 | AI 분류 노드(2~10개 분기 + '기타'), 분류 필드, 자연어로 업무시스템 생성(전문가 모드는 설계문서 먼저), 맞춤 페이지 생성(2026-08), 앱에 에이전트 탑재(2026-09) | 분류 노드 스키마를 그대로 차용. '설계문서 → 포털 생성' 흐름 | 벤치마크 | 미검증(분류 노드는 확인) |
| [豆包工作伙伴(구 Feishu aily)](https://www.feishu.cn/hc/zh-CN/articles/790732948604) | 중국 | 2026-08-14 개명. 에이전트 팀, 프로젝트(지시문+자료+공유 맥락), 회의를 가로지르는 지식 Q&A | 아라에 '프로젝트 컨텍스트' 단위 도입 | 벤치마크 | 미검증(개명은 확인) |
| [Lark](https://www.larksuite.com/en_us/product/ai-meeting-notes) | 싱가포르 | Feishu 국제판. 검색 가능한 챕터, Base, 한국어 도움말 | 한국에서 PoC 가능. 다만 회의록 API가 Feishu보다 좁음 | 부품통합 | 미검증 |
| [텐센트회의 AI 纪要](https://cloud.tencent.com/document/product/1095/47064) | 중국 | 장·주제·발언자별 요약(V3.35.0), 장면별 템플릿 5종, AI 대리 참석 | '장/주제/발언자' 3축 요약을 후처리 프롬프트에 반영 | 벤치마크 | 미검증 |
| [통의청오(Tongyi Tingwu) API](https://help.aliyun.com/zh/tingwu/content-extraction) | 중국 | 주제별로 장 분할(세밀도: 시간당 약 4개 ~ 12~15개), ContentExtraction(정의문이 붙은 차원 최대 100개), 문장 ID를 반환하는 CustomPrompt. 베이징 리전만, 장 요약 출력은 중국어·영어만 | 분류 API 스키마의 교과서. 학생정보 데이터는 절대 보내지 말 것 | 벤치마크 | 미검증(주장은 확인) |
| [DingTalk AI 听记](https://page.dingtalk.com/wow/dingtalk/default/dingtalk/6fgfgRdrjAFXuPAf5ymIF?dd_mini_app_id=5000000004997171) | 중국 | 화제 단락으로 장 구성, 장면 자동 판별 후 템플릿 적용 | 2단 구조(회의 유형 판별 → 유형별 템플릿) | 벤치마크 | 미검증 |
| [DingTalk AI 表格 / 宜搭 / 千问办公](https://table.dingtalk.com/) | 중국 | 표 기반 앱, 포털 진입점 + 공간별 AI 비서, 에이전트가 표를 조작하는 스킬 | 업무포털 구성 패턴 | 벤치마크 | 미검증 |
| [讯飞听见](https://www.iflyrec.com/) / [WeCom + 微搭](https://work.weixin.qq.com/) | 중국 | 구조화 회의록과 온프레미스 / 메신저+표+저코드+회의를 단일 ID로 | 온프레미스 선례, 업무포털 기본형 | 벤치마크 | 미검증 |
| [Rimo(구 Rimo Voice)](https://rimo.app/about/company/news/cli-mcp) | 일본 | 2026-10-01 개명. Rimo Actions(태스크 제안 → 승인 후 산출물 생성), 권한을 지키는 CLI·MCP(2026-06), 일본 내 데이터 저장 | 회의 저장소를 MCP로 열고 '제안 → 승인 → 산출물'을 표준 흐름으로 | 벤치마크 | 리브랜딩 |
| [Otolio(구 스마트書記)](https://www.smartshoki.com/news/post-9933/) | 일본 | 통화 음성으로 kintone 필드 갱신을 제안. 근거 발언 타임스탬프와 함께 1클릭 반영 | GOAL A 라우팅 UX의 정답에 가까움 | 벤치마크 | 미검증 |
| [toruno](https://toruno.biz/) | 일본(리코) | 목적별 프롬프트 템플릿, 회사 자체 포맷 회의록, kintone·드라이브 동기화 | 고객사 양식 템플릿화 | 벤치마크 | 확인 |
| [ACES Meet](https://meet.acesinc.co.jp/) | 일본 | 사내 용어 사전 학습, 화자 음성 축적(특허), CRM API | 고객사별 용어 사전을 컨설팅 산출물로. 화자 음성 프로필은 생체인식정보(민감정보)이므로 고객사 산출물로 만들지 않음 | 벤치마크 | 확인 |
| [LINE WORKS AiNote](https://line-works.com/ainote/) | 일본 | 맞춤 헤딩 템플릿, 사용자 무제한 조직 요금(월 ¥19,800~) | 사업부별 회의록 표준 양식, 조직 단위 요금 구조 | 벤치마크 | 확인 |
| [AI GIJIROKU(운영사 alt)](https://www.alt.ai/crp) | 일본 | 판매 파트너 경유 매출 과대계상 → 2025-07-30 민사재생. 도메인은 지금 무관한 콘텐츠 | 계정 수가 아니라 실제 사용 지표로 성과를 보고할 것 | 비추천 | 사실상 종료 |
| [kintone + kintone AI + 파트너](https://kintone.cybozu.co.jp/support/menu/partner/banso/) | 일본(사이보즈) | 앱 작성 AI·MCP. 파트너 伴走는 월 수만~수십만 엔 + 초기 구축 수백만 엔~. [東急은 요건을 들으며 그 자리에서 AI로 앱 골격 시연](https://kintone-sol.cybozu.co.jp/cases/tokyu2.html) | GOAL B 사업모델의 원형 | 벤치마크 | 미검증 |
| [JOYZO 'システム39'](https://service.joyzo.co.jp/system39/) | 일본 | ¥39만(세금 별도) 정액, 2시간×3회 대면 개발, 첫 2시간 무료, 최단 2주 | CRATA 입문 상품 구조 | 벤치마크 | 미검증 |
| [R3 Institute](https://www.r3it.com/) | 일본 | AI가 kintone을 안전하게 참조하는 관리형 게이트웨이, MCP | 아라를 고객사 데이터 게이트웨이로 포지셔닝 | 벤치마크 | 미검증 |
| [Teachme Biz](https://biz.teachme.jp/) / [tebiki](https://tebiki.jp/) / [NotePM](https://notepm.jp/) | 일본 | 영상·엑셀로 매뉴얼 자동 생성, 숙련자와 신입 비교 / 사내 위키 AI | SOP 추출 방법, 포털 지식 모듈의 최소 기준 | 벤치마크 | 미검증 |

### 2.7 프로세스·태스크 마이닝·업무 캡처

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Celonis](https://www.celonis.com/news/press/celonis-unveils-platform-innovations-to-power-the-ai-driven-composable-enterprise) | 독일/미국 | 객체 중심 프로세스 마이닝, Process Intelligence Graph, MCP 서버(2025-11). Gartner 2026 MQ 리더. LG CNS와 제휴(2026-06) | '객체·이벤트·규칙·KPI' 그래프를 고객사 컨텍스트 그래프의 데이터 모델로 | 벤치마크 | 확인 |
| [SAP Signavio](https://news.sap.com/2026/02/process-conversation-joule-sap-signavio-solutions-generally-available/) | 독일 | 모범 프로세스 라이브러리와 비교 진단, Joule 정식 출시(2026-02) | 업종별 레퍼런스 업무 템플릿으로 갭 분석 | 벤치마크 | 확인 |
| [UiPath Process/Task Mining](https://docs.uipath.com/task-mining/automation-suite/2024.10/user-guide/unassisted-task-minining-introduction) | 미국 | 자동 관찰형과 직원 녹화형 태스크 마이닝, 개인정보 마스킹 | 국내에서는 직원이 직접 녹화하는 방식만 현실적 | 벤치마크 | 미검증 |
| [UiPath Communications Mining(IXP)](https://docs.uipath.com/ixp/automation-cloud/latest/cm-user-guide/communications-mining-overview) | 미국 | 메일·티켓·전사본에서 라벨 없이 계층형 주제를 발견, 액티브러닝으로 정교화 | GOAL A 분류체계를 발견하고 키우는 방법론 | 벤치마크 | 미검증(주장은 확인) |
| [Power Automate Process Mining](https://learn.microsoft.com/en-us/power-automate/process-advisor-overview) | 미국 | 90일 체험, CSV 이벤트 로그로 흐름도 | M365 고객사 대상 진단 데모 | 직접사용 | 확인 |
| [Apromore](https://www.salesforce.com/news/stories/salesforce-signs-definitive-agreement-to-acquire-apromore/) | 호주 | **Salesforce 인수: 2025-10-09 계약, 2025-11-03 종결** | what-if 시뮬레이션을 산출물로 쓰는 개념 | 벤치마크 | 인수 |
| [Fluxicon Disco](https://fluxicon.com/disco/) | 네덜란드 | CSV·엑셀로 몇 분 만에 흐름도, 변형 경로, 병목 시각화 | ERP가 없는 고객사 진단 도구 | 직접사용 | 확인 |
| [ARIS](https://aris.com/newsroom/) | 독일 | 조직-역할-프로세스-시스템-문서 메타모델, 객체 중심 마이닝(2026-04), 'ARIS Task Mining by ProcessMaker'. 무료 CSV판은 사라진 것으로 보임 | 포털 정보구조(IA)의 메타모델 | 벤치마크 | 확인 |
| [Skan AI](https://www.skan.ai/skan-ai-raises-series-c) | 미국/인도 | 화면 관찰로 'Context Graph of Work' 생성, 6주 이내 에이전트 배포, 개인이 아닌 집계로만 분석, $63M 시리즈C(2026-08) | 집계·허용목록·익명화를 고객사(노조, 개인정보 담당자) 설득 논리로 | 벤치마크 | 확인 |
| [KYP.ai](https://kyp.ai/) | 유럽(미검증) | 데스크톱 활동으로 시간 배분과 ROI 계산 | ROI 보고서 형식 정도만 참고 | 벤치마크 | 불확실(사이트 접근 실패) |
| [Mimica](https://www.mimica.ai/) | 영국 | '단계 → 작업 → 프로세스' 3단 업무 지도, '없애기·표준화·자동화' 추천 | 고객사 업무 정리 틀 | 벤치마크 | 확인 |
| [Soroco Scout](https://soroco.com/) | 미국/인도 | Work Graph, 작업 전환·인계 지표, API 공개 | 업무사이트를 워크그래프 위의 앱으로 설계 | 벤치마크 | 확인(전체 파악까지 2~4주) |
| [Workfellow](https://www.workfellow.ai/) | 핀란드 | **2024-04 ProcessMaker 인수**, ProcessMaker는 이후 Decisions와 합병. 태스크 마이닝은 지금 'ARIS Task Mining by ProcessMaker'로 제공 | 경량 수집기 설계 참고. '브라우저 확장 기반 수집' 주장은 현재 페이지에 없음(미검증) | 벤치마크 | 인수 |
| [Viva Insights + Work IQ](https://learn.microsoft.com/en-us/viva/insights/advanced/analyst/network-collaboration-insights) | 미국 | 조직 네트워크 분석(고립된 팀, 중심 인물), Work IQ(데이터 + 기억 + 추론) | 아라의 '회사 이해' 층 3단 구조 | 벤치마크 | 확인 |
| [Worklytics](https://www.worklytics.co/pricing) | 미국 | 메타데이터만 쓰는 네트워크 분석. 무료(캘린더만, 100명, 30일), Business 월 $2,500 | 사전진단 패키지. 고객 직접 계약(CRATA는 5인 이상 집계 결과만 수령, [04 문서](./04_data-governance.md) 5.1절). 그룹웨어 메타데이터(L2)는 CRATA 계정에 넣지 않음 | 벤치마크/고객 직접 계약 | 확인 |
| [Polinode](https://www.polinode.com/) | 호주 | 설문형과 메타데이터형 네트워크 분석 | 로그가 없는 학교는 설문형으로. **TODO: [04 문서](./04_data-governance.md) 수탁자 표(5.1절) 등록 전 고객 데이터 투입 금지**(처리 국가 확인 필요) | 직접사용(04 등록 후) | 확인 |
| [ProcessMind](https://processmind.com/pricing) | 네덜란드 | 업로드형 마이닝과 시뮬레이션, BPMN·MCP | 마이닝·시뮬레이션은 €299/좌석/월 등급에만 있어 고객 월 유지비 기준(그룹웨어 내장형 10~30만 원)과 맞지 않음. 고객사 자체 운영용이 아니라 CRATA 진단용 1좌석 단기 사용 | 벤치마크 | 정정: €29/€99/€299, 마이닝·시뮬레이션은 €299 등급에만 있음 |
| [퍼즐데이터 ProDiscovery](https://www.aitimes.kr/news/articleView.html?idxno=39878) | 한국 | 국산 프로세스 마이닝, GS 1등급(조달 가능), PiDi 챗봇, what-if 시뮬레이션 | 공공 대형 마이닝이 필요할 때의 파트너 | 부품통합 | 확인 |
| [유엔진 Process-GPT](https://bpm-intro.uengine.io/process-gpt/) | 한국 | 대화로 BPMN·양식·조직도 생성, 멀티에이전트 실행 | 포털 자동 생성기의 직접 벤치마크이자 협업 후보 | 벤치마크 | 확인 |
| [Scribe](https://scribe.com/optimize) | 미국 | 동의한 사용자의 허용 도메인 업무로 SOP 자동 생성, 프로세스 맵과 ROI, API·MCP | 포털 '업무 가이드' 콘텐츠 | 직접사용 | 확인 |
| [Tango](https://www.tango.ai/) / [Guidde](https://www.guidde.com/) | 미국 | 클릭 기록으로 단계 가이드 / 녹화로 내레이션 영상 매뉴얼 | 강의 후속 자료, 학맞통 매뉴얼 영상 | 직접사용 | 확인 |
| [Sola](https://www.sola.ai/) | 미국 | 화면 녹화로 자동화 봇 생성(a16z $17M) | 아라 장기 로드맵 | 벤치마크 | 확인 |
| [Trainual](https://trainual.com/) | 미국 | 조직도-역할-책임-SOP-교육-회의 결정-KPI를 한 포털에 | **업무사이트 정보구조 템플릿으로 가장 적합** | 벤치마크 | 확인 |
| [Process Street](https://www.process.st/) | 미국 | 규정을 체크리스트 워크플로로, 준수 에이전트 Cora | 학맞통 운영 체크리스트 | 벤치마크 | 확인 |
| [Zapier Canvas](https://zapier.com/canvas) | 미국 | AI 프로세스 맵(담당자·메모 포함)을 자동화로 전환 | '프로세스 맵 합의'를 계약 마일스톤으로 | 벤치마크 | 확인 |

### 2.8 기업 컨텍스트·지식그래프·에이전트 플랫폼

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Palantir AIP + Ontology](https://www.palantir.com/docs/foundry/ontology/why-ontology/) | 미국 | 명사(객체·관계)와 동사(액션)로 조직을 모델링, Ontology MCP, 5일 부트캠프, 현장 상주 엔지니어. 서울에서도 채용 | 고객사 이해의 틀이자 영업 진입 방식(GTM) | 벤치마크 | 확인 |
| [Glean](https://www.glean.com/blog/how-do-you-build-a-context-graph) | 미국 | 엔티티와 시간순 행동 흔적(trace)을 잇는 컨텍스트 그래프, Skills(2026-05 베타, 오픈 Agent Skills 가져오기), 커넥터 275개 이상 | "왜는 못 잡아도 어떻게는 잡는다". 흔적을 먼저 분석하는 패턴 추출의 정의 | 벤치마크 | 미검증(주장은 확인) |
| [Atlassian Rovo + Teamwork Graph](https://www.atlassian.com/platform/teamwork-graph) | 호주/미국 | 사람-업무-목표-지식 그래프, GraphQL, MCP. 크레딧 기반으로 포함 | 4축 관계 모델. Jira를 쓰는 고객사는 그 위에 얹기 | 부품통합 | 확인 |
| [Microsoft 365 Copilot / Work IQ](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/) | 미국 | Work IQ MCP(범용 도구 10개). 커넥터를 '색인형'과 '실시간 조회형(MCP)'으로 구분 | 자주 쓰는 정적 문서만 색인하고 민감 데이터는 실시간 조회하는 보안 설계 | 부품통합 | 미검증 |
| [Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-language-support) | 미국 | 커넥터 1,500개 이상, 한국어 지원, 크레딧 25,000개에 월 $200 | M365 쓰는 고객사에 납품하는 경로 | 부품통합 | 확인 |
| [Dust](https://dust.tt/home/pricing) | 프랑스 | Spaces 권한, 버전 관리되는 Skills, 사용자별 메모리. Pro €24~30 | '사업부별 공간 + 공통 공간 + 스킬' 3단 구조 | 직접사용 | 확인 |
| [WRITER](https://writer.com/blog/enterprise-brain/) | 미국 | 그래프 RAG, 보이스 프로필에 용어·스타일가이드 연결(2026-05). Enterprise Brain(2026-09-09) | 보이스 프로필 데이터 모델 | 벤치마크 | 정정: WRITER Meet 대화가 그래프로 들어가는 것만 명시. Slack·Teams가 그래프에 들어간다는 근거 없음 |
| [Sana](https://newsroom.workday.com/2025-09-16-Workday-Signs-Definitive-Agreement-to-Acquire-Sana) | 스웨덴 | **Workday가 약 11억 달러에 인수(2025-09 발표, 완료).** 지금은 'Sana from Workday' | 교육과 에이전트를 결합한 모델이 검증된 사례 | 벤치마크 | 인수 |
| [Claude Agent Skills / Agent SDK](https://claude.com/blog/skills) | 미국 | SKILL.md를 필요할 때만 불러오는 구조, 조직 단위 배포. SDK는 서브에이전트·훅·MCP 지원 | 고객사별 '스킬 묶음' 납품 포맷이자 생성기 엔진 | 직접사용 | 미검증 |
| [ChatGPT company knowledge / AgentKit](https://developers.openai.com/api/docs/deprecations) | 미국 | **Agent Builder는 deprecated(2026-06-03 공지), 2026-11-30 종료 예정.** ChatKit은 유지 | 새로 의존하지 말 것. 이식 가능한 포맷 원칙 | 부품통합(ChatKit만) | 종료예정 |
| [Gemini Enterprise](https://cloud.google.com/gemini-enterprise) | 미국 | Agentspace 후속(2025-10), 노코드 Agent Designer, Business 에디션(1~500명) | Workspace 쓰는 학교·고객사용 | 부품통합 | 확인 |
| [Moveworks](https://www.moveworks.com/) | 미국 | **ServiceNow가 인수.** 직원 지원 에이전트 | 대기업용. '8주 안에 가치 실현' 같은 기간 약속 패키징만 참고 | 비추천 | 인수 |
| [Guru](https://www.getguru.com/pricing) | 미국 | 지식마다 검증 담당자 지정, 오래되거나 충돌하는 콘텐츠 감지, MCP로 Claude에 제공 | 온톨로지·스킬에 담당자·검증일 필드를 두는 근거. 유지보수 구독의 실체 | 벤치마크 | 확인 |
| [올거나이즈 Alli](https://www.ddaily.co.kr/page/view/2026100116552066232) | 한국/일본/미국 | 노코드 에이전트, Alli Works, 온프레미스·망분리, 월간 AX 리포트. 2026-09-30 도쿄증시 상장 승인 | 월간 AX 리포트 아이디어, 폐쇄망 고객 파트너 | 부품통합 | 미검증 |
| [Upstage Document Parse·Solar](https://www.upstage.ai/products/document-parse) | 한국 | HWP/HWPX 포함 문서 파싱(쪽당 $0.01), Solar 모델, 온프레미스 | 고객사 양식 문서를 대량 파싱하는 엔진 | 부품통합 | 확인 |
| [솔트룩스 LUXIA](https://www.saltlux.com/) | 한국 | 온톨로지 특허 39건, Agent Studio | 공공 제안서에서 쓰는 온톨로지 영업 언어 | 벤치마크 | 확인 |
| [삼성SDS FabriX](https://www.samsungsds.com/kr/ai-fabrix/fabrix.html) | 한국 | 노코드·로코드·프로코드 에이전트, MCP, 개인정보 비식별화, 에이전트 스토어 | 포털에 '스킬 갤러리' 메뉴 | 벤치마크 | 확인 |
| [SK AX AXgenticWire](https://skax.co.kr/axgenticwire) | 한국 | 컨설팅 → 구축 → 인재 육성 3단, AiPMO(제안요청서 분석부터 원가 산정까지) | 3단 패키지 표현을 중소기업용으로 축소 차용 | 벤치마크 | 확인 |
| [LG CNS AX](https://www.lgcns.com/us/the-future/ax) / [42Maru](https://www.42maru.ai/) | 한국 | '기존 업무 이해가 먼저' / 기업 QA | 진단을 별도 유료 상품으로 떼어낼 근거 / 42Maru는 우선순위 낮음 | 벤치마크·비추천 | 확인 / 미검증 |
| [Zep / Graphiti](https://github.com/getzep/graphiti) | 미국 | 시간축 컨텍스트 그래프(Apache-2.0), 바뀐 사실은 지우지 않고 무효 처리, Pydantic으로 커스텀 온톨로지, MCP | (선택) GOAL A와 B를 같은 구조로 다룰 수 있는 그래프 메모리. 첫 2~3개 고객은 Postgres/YAML로 충분하고, 고객 기억이 커질 때 도입 검토 | 부품통합(선택) | 확인 |
| [Mem0](https://docs.mem0.ai/platform/features/graph-memory) | 미국 | 앱·에이전트·사용자 단위로 범위를 나눈 메모리 + 그래프 | '고객사별 기억'을 빠르게 구현 | 부품통합 | 확인 |
| [Letta](https://www.letta.com/blog/sleep-time-compute) | 미국 | 사용하지 않는 시간에 메모리를 재정리('슬립타임') | 하루치 회의로 고객사 프로필을 밤사이 갱신 | 벤치마크 | 확인 |
| [Interloom](https://www.interloom.com/) | 독일(뮌헨) | 사례·결정 컨텍스트 그래프, MemoryRank(과거 선례로 라우팅), 현장 상주 엔지니어 | 과거 분류 결과를 선례로 삼아 새 회의 분류 | 벤치마크 | 확인 |
| [LightRAG](https://github.com/HKUDS/LightRAG) / [MS GraphRAG](https://github.com/microsoft/graphrag) / [Neo4j KG Builder](https://github.com/neo4j-labs/llm-graph-builder) | 홍콩 / 미국 / 미국 | 그래프 RAG. GraphRAG는 유지보수 모드 | 영업용 지식지도 시연, 엔티티 유형 자동 발견 방법론 | 부품통합·벤치마크 | 확인 |

### 2.9 스타일·브랜드 추출, 문서 템플릿

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Firecrawl branding](https://docs.firecrawl.dev/features/scrape) | 미국 | URL 하나로 색·폰트·간격·컴포넌트·로고·브랜드 성격(톤·에너지·대상)을 JSON으로 | 시각 스타일 1차 수집기. 같은 크롤링 본문은 말투 분석 자료로 재사용 | 부품통합 | 확인 |
| [Dembrandt](https://github.com/thevangelist/dembrandt) | 오픈소스(MIT) | 실제 렌더링으로 디자인 토큰 추출 → DTCG·Tailwind·shadcn·브랜드가이드 PDF, MCP, 디자인 이탈 검사(npm 0.37.0) | **핵심 부품.** 브랜드가이드 PDF는 고객 검증 미팅 자료 | 직접사용 | 확인 |
| [context.dev(구 brand.dev)](https://docs.context.dev/llms.txt) / [Brandfetch](https://brandfetch.com/developers) | 미국 / 미검증 | 도메인으로 로고·색·스타일가이드 추출 / 브랜드 컨텍스트 API | 이메일 도메인으로 온보딩 자동화. 국내 중소기업은 DB에 없을 가능성이 큼 | 부품통합 | 미검증 / 확인 |
| [Project Wallace](https://www.projectwallace.com/) | 오픈소스 | CSS 토큰 감사 | 홈페이지 일관성이 떨어진다는 컨설팅 근거 | 직접사용 | 미검증 |
| [W3C DTCG 2025.10](https://www.designtokens.org/) + [Style Dictionary](https://styledictionary.com/info/dtcg/) / [Tokens Studio](https://tokens.studio/) | 표준 / 오픈소스 | 디자인 토큰 표준(첫 안정판)과 변환 도구, Figma 동기화 | 고객사 토큰의 공식 저장 형식 | 부품통합 | 미검증 / 확인 |
| [Jasper Brand IQ](https://www.jasper.ai/brand-iq) | 미국 | 보이스·스타일가이드·비주얼·지식·청중의 5분할, 브랜드 위반 표시 | 고객사 스타일 카드의 목차 | 벤치마크 | 미검증 |
| [Markup AI(구 Acrolinx)](https://docs.markup.ai/) | 독일/미국 | 생성과 분리된 검수 에이전트(스타일·용어·보이스), CSV 용어 가져오기, MCP | '생성 AI'와 '검수 AI'를 분리. 아라에 style-check 도구 | 벤치마크 | 미검증(리브랜딩은 확인) |
| [Grammarly(Superhuman)](https://www.grammarly.com/business) / [Copy.ai](https://www.copy.ai/) / [Typeface](https://www.typeface.ai/product/brand-hub) | 미국 | 타이핑 중 톤 교정 / Brand Voice와 Infobase 분리 / Brand Graph로 자동 검증 | 작성 화면 인라인 교정. 스타일(어떻게)과 사실(무엇을) 분리. 브랜드를 그래프로 | 벤치마크 | 미검증 / 미검증 / 확인 |
| [Figma(Variables API, Make kits, 에이전트 스킬)](https://www.figma.com/blog/got-skills-make-the-figma-agent-a-better-collaborator/) | 미국 | 디자인시스템 + 작성 규칙 스킬. Variables API는 Enterprise 전용 | '토큰 + 스킬' 이원화 | 벤치마크 | 미검증 |
| [Google Stitch(+stitch-skills)](https://github.com/google-labs-code/stitch-skills) | 미국 | 스크린샷을 UI로, AI가 읽는 디자인 문서 DESIGN.md 생성 | `style-pack/`의 DESIGN.md 형식만 차용 | 벤치마크(DESIGN.md 형식만 차용) | 불확실(2026년 Labs 상태 미확인) |
| [M365 Copilot Brand Kit + Brand Center](https://support.microsoft.com/en-us/topic/c8bc6df5-37ed-4398-8b90-f78a8fdcf9bb) | 미국 | 템플릿·테마·보이스로 Copilot이 브랜드에 맞는 슬라이드 생성 | '슬라이드 마스터를 정비한 .potx 등록'을 서비스 메뉴로 | 직접사용 | 확인 |
| [Templafy](https://www.templafy.com/mcp/) | 덴마크 | 템플릿 엔진 + 문서 에이전트. MCP로 Claude·ChatGPT 결과물을 브랜드 Office 문서로 변환 | 'AI가 내용을 쓰고, 템플릿 엔진이 양식을 입힌다' | 벤치마크 | 확인 |
| [Frontify](https://www.frontify.com/en/) / [Canva Connect](https://www.canva.dev/docs/connect/api-reference/brand-templates/) | 스위스 / 호주 | 사람과 AI가 같이 읽는 가이드 포털·MCP / 브랜드 템플릿 자동 채우기 | 포털 안에 스타일가이드 페이지 / 강의 홍보물 자동 생성 | 벤치마크·부품 | 미검증 |
| [Anthropic brand-guidelines 스킬](https://github.com/anthropics/skills/tree/main/skills/brand-guidelines) | 미국 | 색·폰트·적용 규칙을 담은 SKILL.md 예시 | 고객사별 'brand-회사명' 스킬. 한글 폰트 대체 규칙 추가 | 직접사용 | 미검증 |
| [한컴 hwpx-owpml-model](https://github.com/hancom-io/hwpx-owpml-model) / [python-hwpx](https://pypi.org/project/python-hwpx/) | 한국 | HWPX 읽기·쓰기·템플릿 채우기 | 고객사 원본 양식 그대로 HWPX 납품. 국내 경쟁우위 | 부품통합 | 미검증 |
| [KRDS](https://github.com/KRDS-uiux/krds-uiux) | 한국(정부) | 범정부 디자인 시스템 토큰과 컴포넌트 | 학교·교육청 포털의 기본 베이스 | 직접사용 | 미검증 |
| [미리캔버스](https://www.miricanvas.com/ko) | 한국 | 템플릿, AI 프레젠테이션. 브랜드 키트 자동 추출 기능은 확인 안 됨 | 국내에서 브랜드 스타일 자동 추출을 제공하는 서비스는 이번 조사에서 확인되지 않음 = 기회 | 벤치마크 | 미검증 |

### 2.10 AI 앱·사이트 빌더

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Power Apps Plans / vibe](https://learn.microsoft.com/en-us/power-apps/maker/plan-designer/create-plan) | 미국 | 요구사항 → 데이터 → 솔루션 3개 에이전트, 단계마다 승인, 이미지·다이어그램 입력, PDF 출력. vibe는 프리뷰·영어만 | **생성기 설계의 원형.** 단계별 승인 기록이 그대로 컨설팅 보고서 | 벤치마크 | 미검증(주장은 확인) |
| [Retool](https://retool.com/blog/retool-launches-react-ai-app-builder) | 미국 | 실제 스키마로 앱 생성, React/TS 출력(2026-06), 인증·권한 계층은 앱 코드 밖에 고정, Claude Code 앱 가져오기, MCP | '공통 거버넌스는 고정, 화면만 생성' 구조 | 부품통합 | 미검증(주장은 확인) |
| [Lovable](https://docs.lovable.dev/features/design-systems) | 스웨덴 | 디자인시스템 프로젝트(생성 결과 위반 자동 검사), URL로 시작하기, Supabase 기반 Cloud(리전 변경 불가) | **1순위 시안 엔진.** 해외 빌더이므로 L0 토큰과 더미 데이터만 투입(고객 기밀·프로파일 원문 금지). 수탁자 목록에 포함. 보안 고객은 처음부터 자체 Supabase 서울 리전 | 직접사용 | 확인 |
| [v0](https://v0.app/docs/design-systems-2) | 미국 | Design Systems 2.0(스킬 + 스타터 앱), Platform API | 고객사별 shadcn 레지스트리. Lovable과 같이 L0 토큰과 더미 데이터만 투입, Vercel과 함께 수탁자 목록에 포함 | 부품통합 | 확인 |
| [Claude Code / Agent SDK / Claude Design](https://code.claude.com/docs/en/agent-sdk/overview) | 미국 | 서브에이전트, 스킬, 디자인시스템 동기화 | 생성기 엔진 | 직접사용 | 미검증 |
| [OpenAI Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | 미국 | 저장소 규칙 파일 AGENTS.md | 규칙 파일을 표준화하면 특정 엔진에 묶이지 않음 | 부품통합 | 확인 |
| [Airtable Omni](https://www.airtable.com/newsroom/airtable-joins-bending-spoons) | 미국 | 브리프를 넣으면 테이블·인터페이스·자동화 생성. Airtable 뉴스룸 기준 2026-09-04 Bending Spoons 인수 완료 | 핵심 포털의 장기 기반으로 쓰는 것은 신중히 | 벤치마크 | 인수(다른 검증에서는 근거를 찾지 못해 재확인 필요) |
| [Softr](https://www.softr.io/ai-app-generator) | 독일 | 프롬프트로 페이지·DB·권한·워크플로 생성, 에이전트(2026-08)·MCP(2026-09), [월 $19~329](https://www.softr.io/pricing) | 노코드 납품 경로 | 부품통합 | 미검증 |
| [Zoho Creator](https://www.zoho.com/creator/) | 인도 | 요구사항서(BRD) 작성 → 빌드 → 테스트 에이전트 | 요구사항서 승인 후 빌드 | 벤치마크 | 미검증 |
| [Bolt.new](https://bolt.new/pricing) / [Replit Agent](https://docs.replit.com/replitai/agent) | 미국 | 패키지별 디자인 프롬프트 / 자체 테스트와 체크포인트 롤백 | 품질관리 아이디어 | 벤치마크 | 미검증 / 확인 |
| [Figma Make](https://www.figma.com/make/) | 미국 | 디자인시스템을 담은 Make kits, 브랜드 자료 첨부 | 디자인시스템이 있는 고객사에만 해당 | 부품통합 | 미검증 |
| [Firebase Studio](https://firebase.google.com/docs/studio) | 미국 | **2026-06-22 신규 생성 중단, 2027-03-22 종료** | 도입 금지 | 비추천 | 종료예정 |
| [Relume](https://www.relume.ai/) / [Framer AI](https://www.framer.com/ai/) | 미검증 / 네덜란드 | 브리프 → 사이트맵 → 와이어프레임 → 스타일가이드 / 마케팅 사이트 | Relume의 단계 분리를 정보구조 설계에 적용. Framer는 업무포털에 부적합 | 벤치마크·비추천 | 확인 |
| [Glide(GlideOS)](https://www.glideapps.com/pricing) / [Bubble](https://bubble.io/ai-app-generator) | 미국 | 엑셀로 앱(Pro $125, MCP) / 코드 내보내기 없음 | 엑셀로 일하는 고객 PoC / Bubble은 고객 자산이 남지 않아 부적합 | 부품통합·비추천 | 리브랜딩 / 미검증 |
| [Appsmith](https://www.appsmith.com/) / [Budibase](https://budibase.com/) / [Refine](https://refine.dev/) | 미국·인도 / 영국 / 미검증 | 오픈소스 셀프호스팅(에어갭 가능), 결재·라우팅, 스키마 기반 CRUD 화면 | 망분리 학교·공공의 운영 기반. Refine은 베이스 템플릿 후보 | 부품통합 | 확인 / 확인 / 미검증 |
| [Zite](https://zite.com/) / [Noloco](https://noloco.io/) | 미국 / 아일랜드 | 사용자당 요금 없음 / 필드 단위 권한 | 학생정보는 담임·상담교사만 열람하는 필드 권한 패턴 | 벤치마크 | 확인 |
| [Notion Sites + Custom Agents](https://www.notion.com/product/sites) | 미국 | DB + 사이트 공개 + 에이전트 | 소규모 고객사 MVP | 부품통합 | 미검증 |
| [screenshot-to-code](https://github.com/abi/screenshot-to-code) | 오픈소스 | 스크린샷을 코드로 | 고객사가 쓰는 그룹웨어 화면 패턴을 이어받아 도입 저항 감소 | 직접사용 | 미검증 |
| [n8n](https://n8n.io/ai-agents/) / [Lindy](https://www.lindy.ai/) | 독일 / 미국 | 셀프호스팅 자동화(Starter €20) / 한 번 해본 일을 스킬로 저장 | n8n은 GOAL A 자동화의 셀프호스팅 대안(MVP는 Zapier 경로 A, [02 문서](./02_meeting-auto-classification.md) 3.4절 '대안·나중')이자 고객사 백엔드. Lindy는 스킬 라이브러리 UX | 부품통합·벤치마크 | 확인 |
| [BI매트릭스 AUD](https://www.bimatrix.co.kr/aud-platform) | 한국 | 업무 화면 UI 자동 개발 | 대기업 레퍼런스. CRATA는 중소기업·학교용 경량판으로 | 벤치마크 | 확인(TRINITY는 미확인) |

### 2.11 AX 컨설팅·교육·진단 방법론

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Anthropic Applied AI / FDE](https://www.anthropic.com/careers/jobs) | 미국 | FDE를 6개 도시에서 채용, 서울 Applied AI Architect(파트너 담당 포함) 채용 | 서울 조직이 파트너 생태계를 만드는 중. 중소기업·교육 파트너 자리 노리기 | 벤치마크/파트너 타깃 | 정정: [2026-09 Accenture 발표](https://www.anthropic.com/news/accenture-embedded-evaluation)는 '임베디드 평가'(레드팀·안전 평가)이며 구현 협업이 아님. 구현은 Ode(Anthropic 구현 합작사, $1.5B JV, 2026-07 보도) |
| [빅테크 FDE 물결](https://en.wikipedia.org/wiki/Forward_deployed_engineer) | 미국 | AWS $1B(2026-06), Microsoft $2.5B·6,000명(2026-07), OpenAI Deployment Company(2026-05), Google 수백 명 채용 | '들어가서 같이 만드는' 회사가 표준. 이들이 닿지 않는 중소기업·학교가 CRATA 영역 | 벤치마크 | 확인(2차 출처: Wikipedia. 원 보도는 About Amazon·Reuters 2026-06-30, Microsoft 2026-07-02로 확인했으나 1차 URL 정리는 TODO) |
| [BCG X / 10-20-70](https://www.bcg.com/press/24october2024-ai-adoption-in-2024-74-of-companies-struggle-to-achieve-and-scale-value) | 미국 | AI 성과 요인의 70%가 사람·프로세스 | 진단 항목과 시간의 70%를 사람·프로세스에 배정 | 벤치마크 | 미검증(수치는 확인) |
| [McKinsey Rewired](https://www.mckinsey.com/featured-insights/mckinsey-on-books/rewired) | 미국 | 6대 역량(로드맵·인재·운영모델·기술·데이터·확산) | 중소기업용 30문항 체크리스트로 축약 | 벤치마크 | 불확실(페이지 접속 실패) |
| [Section](https://www.sectionai.com/) | 미국 | 직원 AI 숙련도 측정·인증 + 코칭 + 8주 업무 자동화 | 교육 → 측정 → 자동화 → ROI 대시보드 흐름 | 벤치마크 | 확인 |
| [Erin Meyer Culture Map 도구](https://erinmeyer.com/tools/) | 프랑스/미국 | 조직을 8개 척도에 소그룹 토론으로 배치(Netflix가 쓴 방식) | 워크숍 15분 활동. 결과를 포털 설계 규칙으로 번역 | 직접사용 | 미검증(주장은 확인) |
| [The Culture Factor(구 Hofstede Insights)](https://www.theculturefactor.com/) | 핀란드 | 현재 문화와 원하는 문화의 차이 분석 | 진단 설문 구조 | 벤치마크 | 확인 |
| [Miro AI + MCP](https://miro.com/ai/) | 미국/네덜란드 | 워크숍 보드를 MCP로 LLM이 읽음 | 워크숍 산출물을 `company_profile.yaml`에 자동 적재 | 직접사용 | 미검증 |
| [Listen Labs](https://listenlabs.ai/) / [Outset](https://outset.ai/) | 미국 | AI 인터뷰어가 수백 건을 병렬 진행, 원 인터뷰 인용, '말과 행동의 차이' 분석 | 워크샵 전 직원 대상 AI 사전 인터뷰(아라에 직접 구현 권장) | 벤치마크 | 확인 |
| [엘리스](https://elice.io/ko/ax/ai-adoption) | 한국 | 직급별 AX 교육, 고객사 데이터로 하는 실습(PBL), AI 과제 발굴, HelpyContext(온톨로지 구축 에이전트) | 가장 직접적인 국내 경쟁자. PBL 원칙은 차용 | 벤치마크 | 미검증(주장은 확인) |
| [모두의연구소](https://b2b.modulabs.co.kr/) / [휴넷](https://hrd.hunet.co.kr/) | 한국 | 진단 → 맞춤 제안 → 전담 PM, 5단계 아이디어톤 / 직무별 AX 칼리지 | 영업 프로세스의 틀. 교육 이수가 아닌 '결과물' 중심으로 차별화 | 벤치마크 | 미검증 |
| [패스트캠퍼스·에이블런·뤼튼AX·업스테이지 교육](http://v.daum.net/v/20260422173610894) | 한국 | 기업 출강의 56.7%가 AI 교육. 에이블런 1분기 문의 2.6배, 70%가 현업 밀착형 | 수요가 '개념'에서 '현업 즉시 적용'으로 이동. 교육 앞에 사전진단 | 벤치마크 | 확인 |
| [코드코리아](http://v.daum.net/v/20260724113708894) | 한국(부산) | 부산교육청 교원·전문직 250명 대상 MCP·Skills 연수(2026-07, 사전 보도) | 부산 공동 연수 파트너 후보(기술은 코드코리아, 학맞통·관계는 CRATA) | 벤치마크 | 확인 |
| [정부 AX 인력·교원 연수 사업](https://www.korea.kr/news/policyNewsView.do?newsId=148971274) | 한국 | 제조AI 교육센터(연 1만 명), 교원 AI 연수 확대 | 바우처·위탁 공급 채널 | 직접사용 | 미검증 |

### 2.12 신흥 AI-native 스타트업

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [Sierra Ghostwriter](https://sierra.ai/product/ghostwriter) | 미국 | SOP, 원본 녹취, 전문가 인터뷰 음성으로 에이전트와 테스트 시뮬레이션 생성, 배포 전 사람 검토. 성과 기반 가격 | 아라 '빌더 모드'의 직접 원형(Plaud 녹음 + 인터뷰 → 사이트·에이전트 초안) | 벤치마크 | 확인 |
| [Decagon AOP](https://decagon.ai/product/aop) | 미국 | 자연어로 쓴 운영 절차(AOP) + 코드 수준 제어(Git 버전 관리) | 'AOP식 마크다운 SOP'를 단일 원천으로 | 벤치마크 | 정정: '컴파일된다'는 표현은 Decagon 공식 표현이 아님 |
| [Relevance AI Invent 2.0](https://relevanceai.com/invent) | 호주/미국 | SOP를 읽고 판단 기준을 되묻는 대화형 디스커버리, 전문 에이전트 조립, 임베디드 배포팀 | "이럴 땐 누가 어떻게 판단하나요?"를 사전 인터뷰 스크립트에 | 벤치마크 | 확인 |
| [Distyl AI](https://distyl.ai/) | 미국 | 대기업용 에이전틱 인프라, 재사용 가능한 루틴, 상주 팀 | 'AI 운영 회사' 포지셔닝 + 루틴 라이브러리 | 벤치마크 | 확인 |
| [Ode with Anthropic(구 Fractional AI)](https://www.ode.com/) | 미국 | Anthropic 구현 합작사(구 Fractional AI, $1.5B JV, 2026-07 보도). Anthropic Applied AI 팀과 직접 일하며 PoC가 아닌 운영 시스템 구축을 내세움 | 모델사 파트너십을 신뢰 장치로 | 벤치마크 | 리브랜딩 |
| [Invisible Technologies](https://invisibletech.ai/) | 미국 | 업무를 먼저 문서화(Atomic)하고 그대로 따라 하는 에이전트(Axon) 생성 | '진단 → SOP → 사이트·에이전트' 설명 논리 | 벤치마크 | 확인 |
| [Viven](https://www.viven.ai/) | 미국 | 전문가·팀의 디지털 트윈(판단 로직, 예외 처리) | 업무사이트에 '○○팀장에게 묻기(AI)' 메뉴 | 벤치마크 | 확인 |
| [채널톡 ALF](https://channel.io/ko) | 한국 | 규칙 / 구조화된 지식 / 실행의 3층 에이전트 | 에이전트 설계서 목차로 차용 | 벤치마크 | 확인 |
| [원티드 LaaS](https://laas.wanted.co.kr/) | 한국 | 프롬프트로 웹앱 생성, 서버 재배포 없이 프롬프트 변경 | 포털 안 개별 AI 기능 부품 | 부품통합 | 확인 |

### 2.13 교육·학맞통 관련

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [CRATA 자체 자산](https://crata.co.kr/about) | 한국 | 행동방식검사 4종, 검사 결과와 연동한 AI 상담 아라, 조직행동유형 768가지 체계([보도](http://v.daum.net/v/20250304083600879)), 크라타협회 강사 네트워크 | GOAL B '사람·관계 층'의 독자 자산 | — | 확인 |
| [서울 쎈GPT 학생맞춤통합지원 에이전트](http://v.daum.net/v/20261001111514949) | 한국(공공) | 학맞통 계획안 초안 작성, 데이터 무보존(ZDR) 모델, 기관·이용자·에이전트별 데이터 분리, 민감정보 필터, 누적 64.9만 건 | 데이터 분리와 민감정보 필터를 CRATA 학맞통 파이프라인에 차용. 교사 대상 '활용 연수'로 포지셔닝 | 벤치마크 | 확인 |
| [부산교육청 학맞통 AI 비서·알리도·표준서식](http://v.daum.net/v/20260304091404905) | 한국(공공) | 정책 해석·절차 자동응답, 표준 서식, 센터 직접 접수 | CRATA 본사 지역(부산, [crata.co.kr](https://crata.co.kr) 회사 정보 기준)이므로 첫 공공 파트너 후보 | 벤치마크 | 확인 |
| [경기 G-ONE '지원이'](http://v.daum.net/v/20260227195955586) | 한국(공공) | 학맞통 의뢰 절차 디지털화(2026-02). 도의회의 보안·실효성 지적 | 케이스 관리 SaaS를 만들지 말아야 할 근거 | 벤치마크 | 확인 |
| [KEDI 학생맞춤통합지원 플랫폼](http://v.daum.net/v/20240502120035992) | 한국(공공) | 지역 지원기관 검색(로그인 필요), 건강·학습·돌봄안전·경제·심리정서·기타 6개 영역 | 학맞통 구간의 하위 태그 | 직접사용 | 확인 |
| [구미 '다품'](http://v.daum.net/v/20260906170442429) / [교육부 학맞통 정보시스템(2028)](http://v.daum.net/v/20260212164044766) | 한국(공공) | 50여 기관 지역 네트워크 / 법 제17조에 근거한 국가 시스템(2028 구축 목표) | 지역별 체계를 프로젝트 메타데이터로 관리. 학생 식별정보는 보관하지 않는 구조로 | 벤치마크 | 확인 |
| [이스트소프트 AI-CODI](http://v.daum.net/v/20260309104503154) | 한국 | 대학판 '학생 맞춤 통합지원'(한남대 약 20억 원) | 초중등 학맞통법과 이름이 비슷하니 제안서에서 구분 | 벤치마크 | 확인 |
| [테크빌교육 마이클](https://www.tekville.com/?c=business/mycl) | 한국 | 학교 양식 40종 이상을 HWP로 생성, NEIS를 MCP로 연동(나이스 커넥트 2026-09-29), 약 2,700개교 | HWP 출력과 NEIS 연동 수준은 맞춰야 함. 학교별 업무 패턴 대시보드는 이번 조사에서 확인되지 않음 | 벤치마크 | 확인 |
| [엘리스 헬피챗](http://v.daum.net/v/20260916095949317) / [U+슈퍼스쿨](http://v.daum.net/v/20260918153113546) / [아이스크림 아이쌤GPT](http://v.daum.net/v/20260917135709271) | 한국 | HWP 수정·강원교육청 / 출결·상담·문서(제주 10개교 시범) / GS 1등급, 교사가 모니터링하는 학생 AI 챗 | 대기업이 학교 업무사이트를 상품화하는 중. CRATA는 학교 문화·패턴 맞춤으로 차별화 | 벤치마크 | 확인 |
| [인텔리콘 'AI 나눔이'](http://v.daum.net/v/20250815080149491) | 한국 | 학교폭력 지원 법률 LLM(2025 전시) | 학폭 이슈는 별도 태그('법령 검토 필요') | 벤치마크 | 불확실(2026년 운영 현황 미확인) |
| [Branching Minds Meeting Assistant](https://www.branchingminds.com/meeting-assistant) | 미국 | 학생지원 다층체계(MTSS) 회의 전 학생정보 취합 → 아젠다 → 실시간 전사 → 요약·액션 | 회의 전 준비 → 아젠다 → 요약·액션 흐름만 참고. 학생정보를 취합하는 구조이므로 CRATA는 사례회의를 녹음·지원하지 않고, 기관 협의·연수 자료 설계에만 참고 | 벤치마크 | 확인('5분'은 마케팅 문구) |
| [Panorama](https://www.panoramaed.com/) / [CPOMS](https://www.cpoms.co.uk/) | 미국 / 영국(Raptor 소속) | 학군 데이터에 근거한 AI / 카테고리 태그 + 시간순 기록 + 권한 분리 | 조직 자체 데이터에 근거한 AI. 학맞통 기록의 최소 구조 | 벤치마크 | 확인 |
| [GoGuardian Beacon](https://www.goguardian.com/beacon) | 미국 | 학생 온라인 활동을 감시해 위기 탐지 | 한국 도입 금지(동의 의무, 낙인 우려). 위기 신호 에스컬레이션 설계만 참고 | 비추천 | 확인 |
| [MagicSchool](https://www.magicschool.ai/) / [Claude for Teachers](http://v.daum.net/v/20260721171202365) | 미국 | 업무별 교사용 템플릿 도구 80개 이상 / 미국 K-12 교사 무료 | 업무 유형별 산출물 템플릿 연결, 강의 소재 | 벤치마크 | 확인 / 미검증 |

### 2.14 기술 부품 (STT·분할·분류·그래프·개인정보·인프라)

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [ElevenLabs Scribe v2](https://elevenlabs.io/docs/capabilities/speech-to-text) | 미국/영국 | 한국어는 'Good' 등급(오류율 10~20%), 엔티티 탐지, 최대 10시간 파일 | 엔티티 탐지 방식 참고. 해외 STT이므로 L3 1차 탐지용으로는 쓰지 않음(1차 탐지는 로컬). 한국어는 국내 엔진과 비교 필요 | 벤치마크 | 확인 |
| [OpenAI gpt-4o-transcribe-diarize / gpt-transcribe](https://developers.openai.com/api/docs/guides/speech-to-text) | 미국 | 미리 등록한 화자 최대 4명을 이름으로 매핑, 분당 $0.0045 | '누가 맡았나' 추출 정확도 향상 후보. 단 음성 등록(목소리 프로필)은 생체인식정보=민감정보(개인정보 보호법 제23조, 시행령 제18조)이고 미국으로 국외이전도 겹치므로, **내부 직원만 별도 서면 동의 후** 사용. 외부 참석자·고객사 화자는 등록하지 않음 | 부품통합(조건부) | 확인 |
| [pyannote](https://github.com/pyannote/pyannote-audio) / [WhisperX](https://github.com/m-bain/whisperX) / [Qwen3-ASR](https://github.com/QwenLM/Qwen3-ASR) | 프랑스 / 영국 / 중국 | 화자 분리 / 한국어 정렬 포함 자체 호스팅 STT / Apache-2.0 한국어 지원(화자 분리 없음). Parakeet v3는 한국어 미지원 | 로컬 STT 경로(내부망 설치형 고객, 국내 처리가 필요한 녹음). L3는 녹음하지 않는 것이 원칙이므로 L3 처리용이 아님 | 부품통합 | 미검증 / 확인 / 확인 |
| [TreeSeg](https://github.com/AugmendTech/treeseg) / [BERTopic](https://github.com/MaartenGr/BERTopic) | 미국 / 네덜란드 | 계층형 주제 분할 / 미리 정한 주제로 분류 + 새 주제 발견 | LLM 분할 결과 교차검증, 분류표 초안 만들기와 신규 사업 후보 발견 | 부품통합 | 미검증 / 확인 |
| [KURE-v1](https://huggingface.co/nlpai-lab/KURE-v1) / [Kiwi](https://github.com/bab2min/Kiwi) | 한국 | 한국어 검색 임베딩 / 형태소 분석 | 비슷한 과거 사례 검색(few-shot), 고객사 문체(종결어미·존댓말) 정량화. Kiwi 고유명사 추출은 해외 LLM 호출 전 L3 로컬 탐지에 사용 | 부품통합 | 미검증 |
| [LangExtract](https://github.com/google/langextract) / [GLiNER](https://github.com/urchade/GLiNER) | 미국 / 프랑스 | 추출 결과마다 원문 위치 기록 / CPU에서 도는 제로샷 개체 인식 | 고객사·학교·인물·날짜를 근거와 함께 추출. GLiNER는 해외 LLM 호출 **전** 학생 이름 로컬 탐지(L3 1차 탐지) | 부품통합 | 미검증 |
| [SetFit](https://github.com/huggingface/setfit) / [Label Studio](https://github.com/HumanSignal/label-studio) | 미국·프랑스 / 미국 | 클래스당 약 8개 예시로 분류기 학습 / 라벨링 도구(Argilla는 유지보수 상태) | 확정 라벨이 쌓이면 값싼 1차 분류기. 정답 세트 200~300건 | 부품통합 | 확인 / 미검증 |
| [Presidio](https://presidio.dataprivacystack.org/supported_entities/) | 미국(오픈소스) | 한국 주민등록번호 등 한국 신분증 인식기 | LLM에 보내기 전 필수 마스킹 단계(학생명·학교명은 직접 추가) | 부품통합 | 확인 |
| [ProMoAI](https://github.com/humam-kourani/ProMoAI) / [PM4Py](https://github.com/process-intelligence-solutions/pm4py) | 독일 | 텍스트로 BPMN 생성 / 객체 중심 이벤트 로그(OCEL 2.0)·조직 마이닝·LLM 요약 (둘 다 AGPL) | 인터뷰로 현재 업무(AS-IS) 흐름 자동 작성. 상용 SaaS에 넣으려면 라이선스 검토 | 벤치마크·부품 | 확인 / 미검증 |
| [Claude 구조화 출력](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) + [가격](https://platform.claude.com/docs/en/about-claude/pricing) | 미국 | 스키마에 맞는 JSON 보장, 동적 enum. Sonnet 5.5 $2/$10, Haiku 4.5 $1/$5, Opus 5.5 $4/$20(MTok), 배치 50% 할인(Claude API 기준) | 분류 출력 스키마. 1건 처리 비용은 작음. 다만 L2용 Bedrock 서울 경로는 Message Batches 할인이 없고 요금은 Bedrock 요금(확인 필요) | 부품통합 | 확인 |
| [OpenAI API](https://developers.openai.com/api/docs/pricing) / [Zapier](https://zapier.com/pricing) / [Supabase](https://supabase.com/pricing) / [Vercel](https://vercel.com/pricing) | 미국 | gpt-6-luna $0.10/$0.50 / Pro 750 task $19.99 / Pro $25 / Pro $20/개발자 | 1차 필터 대안(L0~L1만) / 노코드 파이프라인 / 포털 운영 원가. 모두 수탁자 목록에 포함 | 부품통합 | 확인 |
| [Plaud 신뢰센터](https://www.plaud.ai/pages/trust-center) / [Claude 데이터 보존](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) | 미국 | Plaud: EU 외 사용자는 미국 LLM 사용, 무학습·무보존 계약(DPA), 한국 리전 없음 / Claude: 상용 데이터 학습 안 함, 30일 보존, 무보존 계약 가능, 위반 표시 데이터는 2년 | 처리방침의 국외이전 표에 반영([04 문서](./04_data-governance.md)). Claude는 Team/Enterprise 또는 API(학습 미사용)로 쓰고, 개인 플랜이면 학습 허용 설정이 꺼져 있는지 확인 | 부품통합 | 확인 |
| [Amazon Bedrock 서울](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html) / [Azure OpenAI Korea Central](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/deployment-types) / [CLOVA Studio](https://guide.ncloud-docs.com/docs/clovastudio-overview) | 미국 / 미국 / 한국 | 국내에서 처리되는 LLM 경로 후보 | CRATA의 L2 LLM 경로는 Bedrock 서울 In-Region의 Claude Sonnet 5 / Opus 5만 씀. '서울 리전이니 국내 처리'라고 영업하지 말 것 | 부품통합 | 정정: Bedrock 서울은 최신 모델(Haiku 4.5, Sonnet 5.5, Opus 5.5 등)이 Global 교차 리전 전용이라 L2에 사용 금지. Opus 5·Sonnet 5만 서울 내 처리 가능. Message Batches 할인 없음, 요금 확인 필요. Azure는 Standard·Regional 배포여야 국내 처리. CLOVA Studio 조건은 미확인 |
| [개인정보위 공공 AX 혁신지원 헬프데스크](https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=11869) | 한국 | 공공 AX 사업의 개인정보 흐름을 기획 단계부터 함께 검토(2026-03-11 가동) | 교육청 사업은 발주기관이 신청하도록 제안. 'PIPC 검토를 거친 구조' 자체가 영업 포인트 | 직접사용 | 미검증 |

### 2.15 조직 데이터 원천·OSINT·HR 진단 (보완 조사)

| 서비스 | 국가 | 무엇을 하나 | CRATA가 참고할 점 | 도입 방식 | 검증 상태 |
|---|---|---|---|---|---|
| [카톡 대화 내보내기 분석 도구(오픈소스)](https://github.com/1kko/kakaotalkparse) | 한국 | 내보낸 txt를 파싱해 화자별·시간대 통계 내기, 결정·할 일 추출(LLM 스킬) | 조직 분석용 상용 서비스는 이번 조사에서 확인되지 않아 CRATA가 차지할 수 있는 영역. 고객 PC에서 실명을 가명으로 바꾸는 도구와 함께 | 부품통합 | 미검증 |
| [flex](https://flex.team/) / [레몬베이스](https://lemonbase.com/) | 한국 | '관계와 맥락을 아는 AI'(조직·결재·미팅 데이터) / 조직진단 6개 축, 1on1 AI 노트 | 국내 조직에서 검증된 진단 축. 고객사가 쓰면 데이터 연동 | 벤치마크 | 확인 / 미검증 |
| [Culture Amp MCP](https://www.cultureamp.com/mcp) / [CultureX](https://www.culturex.com/) / [Revelio Labs](https://www.reveliolabs.com/) | 호주 / 미국 / 미국 | 진단 결과를 MCP로 AI에 공개 / 리뷰 400만 건을 7개 문화 요인 코드로 매핑 / 채용공고·인력 이동 데이터 | 진단 결과를 아라가 조회할 수 있는 구조로. 한국어 문화 코드북 만들기 | 벤치마크 | 확인 |
| [blind Insight](https://www.blindhub.net/kr/) | 한국/미국 | 블라인드 게시글·리뷰를 LLM으로 분석해 회사 단위로만 제공, 경쟁사 비교 | 300인 이상 고객사의 사전진단 자료. 리뷰 크롤링은 금지 | 직접사용 | 미검증 |
| [원티드 OpenAPI](https://openapi.wanted.jobs/) / [사람인 API](https://oapi.saramin.co.kr/guide/job-search) | 한국 | 채용공고(직무 설명·스킬·기업 정보) | 고객사가 쓰는 툴, 직무 체계, 문화 키워드 자동 추출 | 부품통합 | 확인 |
| [국민연금 사업장 데이터](https://www.data.go.kr/data/15083277/fileData.do) / [OpenDART](https://opendart.fss.or.kr/intro/main.do) / [나라장터 API](https://www.data.go.kr/data/15129397/openapi.do) | 한국(공공) | 월별 가입자·취득·상실 / 공시·직원 현황 / 입찰·낙찰 이력 | 비상장 중소기업도 규모, 입퇴사 추이, 성장세를 첫 미팅 전에 파악 | 부품통합 | 미검증 |
| [NEIS 학사일정 API](https://open.neis.go.kr/portal/data/service/selectServicePage.do?infId=OPEN17220190722175038389180&infSeq=1) / [학교알리미](https://www.schoolinfo.go.kr/ng/go/pnnggo_a01_l2.do) / [정보공개포털 원문](https://www.open.go.kr/othicInfo/infoList/orginlInfoList.do) | 한국(공공) | 학사일정, 공시 항목(교직원·특색사업·상담계획), 교육청 결재문서 원문, 단위과제 고시 | 외부에서 학교 연간 업무 캘린더 초안 작성 | 부품통합·직접사용 | 미검증 |
| [교사 자작 업무분장 대시보드](https://github.com/kittycong/eopmu-bunjang) | 한국 | 엑셀 업무분장표로 업무·인수인계·마감 웹앱 생성 | 현장이 원하는 학교 포털의 데이터 구조. 그대로 채택 | 벤치마크 | 미검증 |
| [Google Drive API + Activity API](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) | 미국 | 본문 없이 폴더 트리, 작성자·수정자, 활동 이력 | 분류 기준, 파일 이름 규칙, 작업 리듬 → 포털 메뉴 | 부품통합 | 확인 |

---

## 3. 반드시 깊게 볼 레퍼런스 Top 10

**1. [Plaud MCP·CLI](https://docs.plaud.ai/plaud-mcp-cli/mcp) + [Plaud Intelligence](https://www.plaud.ai/blogs/news/introducing-plaud-intelligence)**
- 이유: 입력원은 이미 Plaud입니다. 전사본(화자·타임스탬프 포함)과 요약을 공식 경로로 가져오는 것이 자동화의 출발점입니다. Events·Skills·Routines는 10월 배포 예정입니다(기준일 현재 미배포).
- 가져올 것
  - MCP로 '최근 녹음 → 전사본' 자동 수집(`@plaud-ai/mcp@0.3.13`, `@plaud-ai/cli@0.3.14`로 고정)
  - Shared Team Skills로 제안서·강의계획서·과업 리스트 양식 고정(배포 후 확인. Skills·Routines 실행 시 Plaud Credits 차감)
- 한계
  - 읽기 전용이고 웹훅이 없음
  - 회의 단위로만 배정됨
  - 로그인한 계정의 녹음만 보임(여러 사람 계정 처리는 TODO: 계정별 인증, Zap 복제, Team 공유 공간 검토)
  - 웹 클라이언트로 쓸 때 데이터가 미국 서버를 거침

**2. [Circleback](https://circleback.ai/docs/support/meetings/automatic-meeting-tagging)**
- 이유: '기존 태그 안에서만 고르고, 태그 설명과 과거 태깅을 참고하는' 원칙이 GOAL A 분류기 설계와 가장 같습니다. [API로 회의를 가져오는 기능](https://circleback.ai/releases)으로 Plaud 전사본을 넣어 비교 실험할 수 있습니다.
- 가져올 것: 태그 설명 쓰는 법, 태그 기반 자동화 조건(이름·참석자·도메인을 AND/OR로 조합)

**3. [티로 Wiki + API/MCP](https://docs.tiro.ooo/en/guide/notes/wiki.md)**
- 이유
  - 확인한 국내 서비스 중 노트를 폴더에 넣는 쓰기 API와 웹훅을 모두 공개한 곳입니다(다글로도 API·MCP는 있음).
  - Wiki는 회의록에서 사람·주제·결정과 그 관계를 자동으로 뽑아 '조직 고유의 언어 지도'를 만듭니다. GOAL B의 L3 조직 언어·용어집, L5 조직·역할·의사결정권 레이어와 많이 겹칩니다([03 문서](./03_company-dna-playbook.md)).
- 주의: 저장만 서울이고 처리는 미국 수탁자를 거칩니다([처리방침](https://tiro.ooo/privacy-policy)).

**4. [Feishu 妙记 Open API](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/minutes-v1/minute/artifacts) + [다차원표 AI 분류 노드](https://www.feishu.cn/hc/zh-CN/articles/843535382074) + [통의청오 ContentExtraction](https://help.aliyun.com/zh/tingwu/content-extraction)**
- 이유: '구간별 라우팅'에 가장 가까운 부품이 공식 문서로 공개돼 있습니다.
- 가져올 것
  - 분할 세밀도를 파라미터로 둠(라우팅은 굵게, 산출물은 잘게)
  - '장면 설명 + 차원(이름·정의·발화자)' 형식의 분류 사전
  - 근거로 문장 ID 반환
  - 분류 노드 2~10개 + '기타'
- 주의: 중국 리전이므로 직접 도입하지 말고 설계만 차용하세요.

**5. [Otolio(→kintone)](https://www.smartshoki.com/news/post-9933/) + [Rimo Actions·MCP](https://rimo.app/about/company/news/cli-mcp)**
- 이유: 완전 자동 대신 '제안 카드 + 근거 타임스탬프 + 1클릭 승인'으로 오분류 위험을 줄입니다. Rimo는 회의 저장소를 권한을 지키는 MCP로 열어, 복붙을 제품 기능으로 바꿨습니다.
- 가져올 것: 승인 UI, '태스크 제안 → 승인 → 산출물 생성' 표준 흐름

**6. [Sembly 3.0](https://www.sembly.ai/) (+ [Supernormal](https://www.supernormal.com/product-updates))**
- 이유: '고객사별 살아있는 컨텍스트 환경(정체성·이력·계약·회의·납품 기준) + 브랜드 패키지 → 브랜드 서식 제안서·덱'. 컨설팅사 시점의 GOAL A와 B 연결 구조입니다.
- 가져올 것: 고객사 컨텍스트 컨테이너 스키마, '고객 수' 기준 요금제([Basic 고객 25곳 $10/월](https://www.sembly.ai/pricing/))

**7. [Sierra Ghostwriter](https://sierra.ai/product/ghostwriter) (+ [Relevance Invent](https://relevanceai.com/invent), [Decagon AOP](https://decagon.ai/product/aop))**
- 이유: 'SOP·녹취·전문가 인터뷰 음성 → 에이전트·워크플로·테스트 초안 → 사람 검토 → 배포'가 CRATA GOAL B의 흐름과 같습니다.
- 가져올 것
  - 아라 '빌더 모드'
  - 판단 기준을 캐묻는 사전 인터뷰
  - 자연어 SOP(AOP)를 단일 원천으로

**8. [Palantir Ontology + 5일 부트캠프 + FDE](https://www.palantir.com/platforms/aip/bootcamp/)**
- 이유
  - 고객을 '명사(객체·관계) / 동사(결재·보고·발주 같은 액션) / 보안'으로 모델링하는 틀은 업무사이트의 데이터 구조로 바로 이어집니다.
  - 5일 안에 고객 데이터로 유스케이스를 만드는 부트캠프는 CRATA 워크샵 상품의 직접 벤치마크입니다.

**9. [Microsoft Power Apps Plans](https://learn.microsoft.com/en-us/power-apps/maker/plan-designer/create-plan) (+ [Feishu 전문가 모드](https://www.feishu.cn/hc/zh-CN/articles/882125125335))**
- 이유: '요구사항(역할·니즈) → 데이터(테이블·관계) → 솔루션(앱·플로우·에이전트)'을 단계마다 승인하고 PDF로 출력합니다. 업무사이트 생성기의 공정 설계로 그대로 따라 할 수 있고, 단계별 승인 기록이 곧 컨설팅 보고서가 됩니다.

**10. [kintone 파트너 생태계](https://kintone.cybozu.co.jp/support/menu/partner/banso/) ([JOYZO 39](https://service.joyzo.co.jp/system39/), [東急 즉석 시연](https://kintone-sol.cybozu.co.jp/cases/tokyu2.html))**
- 이유: '무료 첫 세션 → 정액 대면 구축 → 월정액 동행'은 중소기업 대상 맞춤 업무사이트 사업의 가장 오래 검증된 상품 구조입니다. 요건을 들으며 그 자리에서 AI로 앱 골격을 보여주는 장면이 영업 무기입니다.

**차순위로 꼭 볼 것**
- [Graphiti](https://github.com/getzep/graphiti): 고객사 컨텍스트 그래프 엔진(선택. 첫 2~3개 고객은 Postgres/YAML로 충분)
- [Firecrawl branding](https://docs.firecrawl.dev/features/scrape) + [Dembrandt](https://github.com/thevangelist/dembrandt): 시각 토큰
- [Lovable 디자인시스템](https://docs.lovable.dev/features/design-systems): 시안 엔진(L0 토큰과 더미 데이터만 투입)
- [Glean 컨텍스트 그래프 정의](https://www.glean.com/blog/how-do-you-build-a-context-graph)
- [Branching Minds](https://www.branchingminds.com/meeting-assistant): 회의 준비 → 아젠다 → 요약 흐름(학생 사례는 다루지 않음)
- [다우오피스 위임규정 → 결재선](https://daouoffice.com/features_approval.jsp)
- [UiPath Communications Mining](https://docs.uipath.com/ixp/automation-cloud/latest/cm-user-guide/communications-mining-overview): 분류체계 발견
- [Trainual](https://trainual.com/): 포털 정보구조
- [Skan](https://www.skan.ai/skan-ai-raises-series-c): 개인정보 보호형 관찰

---

## 4. 한국 시장 특수성

### 4.1 녹음 (통신비밀보호법)

- **대화에 참여한 사람의 녹음은 형사상 위법이 아닙니다.** 3인 대화도 같습니다([대법원 2013도16404](https://casenote.kr/대법원/2013도16404)).
- **CRATA가 빠진 회의를 녹음하면 처벌 대상입니다.** 녹음기를 두고 자리를 뜨는 경우도 포함되며, 1~10년 징역입니다([제16조](https://casenote.kr/법령/통신비밀보호법/제16조)).
- 학부모가 교실 수업을 녹음한 사건은 위법이고 증거능력도 없다고 봤습니다([2020도1538](https://casenote.kr/대법원/2020도1538)).
- 참석자 전원 동의를 의무화하려던 개정안(윤상현 의원 안, 2022-08-18 의안 2116905)은 2022-09-29 철회됐습니다([의안정보시스템](https://likms.assembly.go.kr/bill/billDetail.do?billId=PRC_Q2J2Y0J1G1Y9R1O4V2Y5J3Z8Y7N0U5)). 22대 국회 김예지 의원 안(2025-11-18 의안 2214349)은 학대 취약계층 보호 목적의 비밀녹음 예외를 허용하는 방향이며 계류 중입니다.
- 다만 개인정보 보호법과 민사상 음성권 위험은 남습니다. **고객 회의에서는 시작할 때 고지하는 것을 기본으로 하세요.**
  > "오늘 회의는 정확한 기록과 후속 자료 작성을 위해 녹음하고 AI로 전사·요약합니다. 녹음은 해외(미국 등)에 있는 Plaud 클라우드에서 처리·보관되고, AI 요약은 미국에 있는 AI 제공사를 거칩니다. CRATA가 보관하는 원본 녹음은 30일 뒤 삭제하며, 외부 처리사의 보관 기간은 각 사 정책을 따릅니다. 원치 않으시면 말씀해 주세요. 녹음을 끄거나 그 부분을 빼겠습니다."
  - (정본: [04 문서](./04_data-governance.md) 4.4절. 문구를 바꿀 때는 04를 먼저 고칩니다.)
  - 삭제 문구는 Plaud 자동 삭제 설정을 확인한 뒤 확정합니다(TODO).
- **CRATA 녹음 원칙**
  - CRATA 진행자가 당사자로 참여한 대화만 녹음합니다.
  - 워크샵 소그룹 토론은 녹음하지 않습니다. 꼭 필요하면 그룹 전원 동의를 받고 진행자가 동석합니다.
  - 셰도잉 중에는 Plaud로 녹음하지 않고 메모만 합니다. NEIS·에듀파인·학생 업무 화면은 캡처하지 않습니다.
  - 학교·교육청에서는 녹음 전에 기관 보안담당에게 녹음기 사용과 해외 클라우드 업로드가 기관 규정상 허용되는지 확인합니다.
  - 학맞통 사례회의, 상담, 수업 참관은 **녹음하지 않습니다(L3).** 실수로 녹음되면 자동 처리를 멈추고 격리한 뒤 즉시 삭제합니다.

### 4.2 개인정보·국외이전

- **처리위탁과 제3자 제공을 구분해야 합니다.**
  - 학습에 쓰지 않는 기업용 계약이면 처리위탁(제26조)입니다.
  - 벤더가 자기 목적(학습 등)에 쓰면 제3자 제공입니다.
- **해외를 거치면 무보존(ZDR) 계약이 있어도 국외이전입니다**([제28조의8](https://casenote.kr/법령/개인정보_보호법/제28조의8)). 처리방침에 이전 항목·국가·수령자·목적·보유기간을 공개해야 합니다.
- 주요 벤더 현황
  - **Plaud**: EU 외 사용자는 미국 LLM으로 처리
  - **티로**: 저장만 서울, 음성·전사 처리는 미국 수탁자
  - **다글로**: 미국 이전을 처리방침에 공개
  - **Bedrock 서울**: 최신 Claude는 해외 경유만 가능. Opus 5·Sonnet 5는 서울 안에서 처리 가능
  - **Azure**: Standard·Regional 배포여야 국내 처리
- 집행 사례: 테무 과징금 13.69억 원, 딥시크 시정권고, 빗썸 2.1억 원
- CRATA가 쓰는 수탁자·국외이전 목록(Plaud, Anthropic, Zapier, Notion, Gmail·Apps Script, Gamma, Lovable·v0·Vercel, Firecrawl, Worklytics, Scribe, Miro, Listen Labs, OpenAI 등)과 처리 국가·허용 등급은 [04 데이터 거버넌스](./04_data-governance.md)에 정리합니다.
- GOAL B에서는 CRATA가 수탁자, Plaud와 LLM은 재수탁자가 됩니다.
  - 고객 서면 동의가 필요합니다(제26조⑥).
  - 다른 고객에게 패턴을 재사용하려면 익명·집계 수준으로 일반화하고, 계약에 허용 조항을 넣어야 합니다.

### 4.3 학교·공공 (학맞통 직결)

- **학맞통법**([조문](https://casenote.kr/%EB%B2%95%EB%A0%B9/%ED%95%99%EC%83%9D%EB%A7%9E%EC%B6%A4%ED%86%B5%ED%95%A9%EC%A7%80%EC%9B%90%EB%B2%95), 2026-03-01 시행)
  - 제11조③: 학생·보호자 동의
  - 제17조: 정보시스템은 국가가 2028년까지 구축하고, 승인된 사람만 취급
  - 따라서 CRATA는 **학생 식별정보를 보관하지 않는 구조**로 설계해야 합니다.
- **현장 수요**: 서울 상반기 지원 [869건(528명)](http://v.daum.net/v/20260819120217432) 중 심리·정서 41%, 가정 28%, 기초학력 10%, 학업중단 8%, 경제 7%입니다. 비율은 학생 수가 아니라 지원 건수 기준입니다. CRATA의 검사·코칭은 심리·정서와 관계 영역에 맞물립니다.
- **학교 도입 SW 기준**: [초·중등교육법 제29조의2와 학습지원SW 선정기준](http://v.daum.net/v/20251229142323534)
  - 필수 개인정보 기준 5개: 최소수집, 안전조치, 열람·삭제, 만 14세 미만 동의, 보호책임자
  - 학교운영위원회 심의
  - 학생이 쓰는 아라는 이 기준을 통과해야 합니다.
- **공공 클라우드**: CSAP 인증 필요. CRATA가 학교·교육청에 멀티테넌트 SaaS를 제공하려면 CSAP SaaS 등급 인증을 받아야 합니다. 그 전까지 공공 고객에게는 **내부망 설치형** 또는 **인증 그룹웨어 내장형**만 제안합니다(5.6 3단계). 공공 협업툴은 네이버웍스·두레이·브리티웍스 3강 구도이므로 결과물을 이 3개에 넣는 연동을 전제로 설계합니다. 국정원 N2SF 세부 내용은 미확인입니다.
- **기관 보안 규정**: 교육청·학교 협의를 녹음하거나 해외 클라우드에 올리기 전에 해당 기관 보안담당에게 허용 여부를 확인합니다.
- 교육청 사업은 [개인정보위 공공 AX 헬프데스크](https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=11869) 사전검토를 제안하세요.

### 4.4 AI 기본법 · 근로자 감시

- **AI 기본법**([제31조](https://casenote.kr/법령/인공지능_발전과_신뢰_기반_조성_등에_관한_기본법/제31조), 2026-01-22 시행)
  - 생성형 AI를 쓴다는 사전 고지와 결과물 표시 의무가 있습니다.
  - 고지 위반 등은 과태료 3천만 원 이하입니다(제43조). 계도기간 종료일은 미확인입니다.
  - '초·중등 학생 평가'는 고영향 AI에 해당합니다. 아라가 학생 선별이나 판단에 관여하면 사람이 최종 결정하는 구조로 만들어야 합니다.
  - CRATA 내부용 회의 분류기는 이 조항의 대상이 아닙니다.
- **근로자 감시**: 화면 캡처·태스크 마이닝·메신저 분석은 '근로자 감시 설비'로 볼 여지가 있습니다([근로자참여법 제20조①14호](https://casenote.kr/법령/근로자참여_및_협력증진에_관한_법률/제20조)). 상시 30인 이상 사업장은 노사협의회 협의를 먼저 거치세요. 기본 원칙은 메타데이터 우선, 5인 이상 단위 집계, 인사평가에 쓰지 않기입니다.

### 4.5 한국어 STT 품질

- **해외 도구 현황**
  - 한국어 미지원: Otter, Supernormal
  - 요약 번역 제한: Fathom
  - 한국어 사용자 사전 미지원: Notta
  - 한국어 지원: Read AI, Circleback, Granola, tl;dv, Fireflies. 다만 국내 비교 글에서는 업무 용어 정확도가 떨어진다는 평가가 있습니다.
- **국내 엔진의 강점**
  - [CLOVA Speech](https://guide.ncloud-docs.com/docs/clovaspeech-spec): 한영 혼합(enko)
  - [RTZR](https://developers.rtzr.ai/docs/stt-file/): 키워드 부스팅, 시간당 1,000원
  - 클로바노트: 사전 2,000개
- **실행**: CRATA 회의 5건(`[강의]` `[아라]` `[AX]` `[공통]` 회의 중에서)을 골라 Plaud 기본 전사, RTZR, CLOVA enko를 비교하세요.
  - 측정: 문자 오류율, 화자 혼동, 고유명사(학맞통·아라·고객사·학교명) 정답률
  - Plaud로 충분하면 그대로 쓰고, 부족한 회의만 재전사합니다.

### 4.6 조달·지원사업

- **[AI바우처](https://www.nipa.kr/home/2-2/16592)**
  - 과제당 최대 2억 원, 약 130개 과제
  - [공급기업 POOL](https://www.nipa.kr/home/2-2/16544) 등록 필수(자체 AI 솔루션이 있는 법인)
  - 교육비·자문비·AI와 무관한 웹 개발비는 인정되지 않음
  - **소상공인분과가 CRATA에 가장 잘 맞습니다**: 공급기업이 주관해 소상공인 10곳 이상을 모으고, 소상공인은 자부담이 면제됩니다.
  - 2026 회차는 마감됐습니다. 2027년 POOL은 1~3월로 예상됩니다(미검증).
- **[클라우드 바우처](https://www.nipa.kr/home/2-2/16664)**: 수요기업당 최대 6,910만 원, 이용료 최대 75% 지원. 아라 SaaS를 공급하는 경로입니다.
- **[데이터바우처](https://www.kdata.or.kr/kr/contents/voucher_01/view.do)**: 일반 4,500만 원 / 공개·활용 7,500만 원. 공급기업 등록은 11월 전후로 예상됩니다.
- **[AX 원스톱](https://www.nipa.kr/home/2-2/16588)**: 과제당 13억 원, 국산 파운데이션 모델 필수. 협력사로 참여하는 정도가 현실적입니다.
- **[부산정보산업진흥원(BIPA)](https://www.busanit.or.kr/)**: 인공지능 지역확산 4.5억 원 등
- **학교 판매 경로**: 학교장터(S2B) 전자견적, 나라장터, GS 인증, 혁신제품
- 수의계약 한도(통상 2천만 원 이하로 알려짐)는 조문을 확인하지 못했습니다.
- **한 사업을 나눠 수의계약하는 것(분할계약)은 계약법령상 금지입니다.** 한도를 넘으면 협상에 의한 계약·입찰·혁신제품·GS 인증 경로를 씁니다. 나눌 수 있는 것은 독립 산출물이 있는 별개 사업뿐입니다(조문 확인 TODO).
- **같은 비용 항목을 두 사업에 청구하거나, 수요기업의 자부담을 대신 내주면 부정수급**입니다(환수, 최대 5배 제재부가금).

### 4.7 가격 민감도

- **고객 쪽 가격 기준점**
  - 그룹웨어 인당 월 3,000~13,000원([NAVER WORKS](https://naver.worksmobile.com/pricing/))
  - [다우오피스](https://www.daouoffice.com/price.jsp) 서비스형 인당 4,000~5,000원(엔터프라이즈형 5,000~6,000원)
  - 두레이 25인 이하 무료
  - 클로바노트 회사 단위 월 2만 원부터
  - [다글로](https://daglo.ai/pricing) 월 11,900원
  - 소상공인 스마트상점 SW 사용료 연 30만 원 한도
- 따라서 고객사 월 운영비는 **그룹웨어 내장형 월 10~30만 원 / 독립 포털 월 30~100만 원**으로 설계합니다.
- **포털 운영 원가**
  - 코드 생성형(Supabase + Vercel): 고객사 월 약 7~11만 원. CRATA가 멀티테넌트로 운영하면 고객당 $10~20
  - 노코드형: Softr·Power Apps 월 14~58만 원으로 소규모 고객에게 부담

### 4.8 그룹웨어 생태계·HWP

- **결재 이력을 대량으로 꺼내는 API는 사실상 없습니다.**
  - 하이웍스: 결재 이력·결재선 대량 조회 엔드포인트만 없음(기안·상태 조회, 지출결의 조회·수정, 회계코드·조직·구성원·직위·직무 CRUD는 있음). 개발자센터 공지가 2019년 이후 갱신 없음 → API 유지 여부 확인
  - NAVER WORKS: 결재 API 카테고리 없음. 감사로그는 조회·삭제만 기록
  - 카카오워크: 조직·봇 API만
- 그래서 결재 경로는 **위임전결규정 + 완결 문서 샘플 + 감사로그(NAVER WORKS 180일)**를 함께 대조해 재구성합니다.
- [다우오피스](https://daouoffice.com/features_approval.jsp)는 위임 규정이 곧 결재선 설정값이므로 그 설정 화면부터 받으세요.
- **학교·공공은 HWP가 기본입니다.** 다음 도구로 고객사 원본 양식 그대로 납품하는 능력이 국내 경쟁우위입니다.
  - [Upstage Document Parse](https://www.upstage.ai/products/document-parse): HWP 파싱
  - [python-hwpx](https://pypi.org/project/python-hwpx/): HWPX 생성
  - [KRDS](https://github.com/KRDS-uiux/krds-uiux): 정부 디자인 토큰

### 4.9 데이터 등급별 처리 경로 (요약)

등급 정의, 수탁자·국외이전 목록, 정보주체 권리 대응은 [04 데이터 거버넌스](./04_data-governance.md)가 정본입니다. 아래는 요약입니다.

| 등급 | 예시 | LLM 경로 | 저장 |
|---|---|---|---|
| L0 | 공개·내부 일반 정보 | 해외 LLM API 허용 | Notion/Drive |
| L1 | 일반 영업·고객 미팅, 성명·연락처 수준의 일반 개인정보. EDU(강의·워크샵) 기본값 | 녹음 고지·동의 후, 학습 미사용 계약(상용 API, Team·Enterprise)으로 해외 LLM | Notion/Drive. 처리방침에 국외이전 공개 |
| L2 | 고객이 NDA·비밀로 지정한 자료(GOAL B 고객 진단 자료 포함), 견적·계약 조건(EDU.proposal 포함), 학맞통 기관 협의(학생 비식별 전제), ARA.pilot·ARA.safety·ARA.feedback | Amazon Bedrock 서울 In-Region의 Claude Sonnet 5 / Opus 5만. Haiku 4.5·Sonnet 5.5·Opus 5.5는 서울에서 Global 교차 리전 전용이라 사용 금지. Message Batches 할인 없음, 요금은 Bedrock 요금(확인 필요) | 정본은 국내(Supabase 서울, NAVER WORKS Drive 등). Notion에는 링크만 |
| L3 | 학생 식별 가능 정보, 상담·사례 내용 | **녹음 자체를 하지 않습니다.** 실수로 들어오면 자동 처리 중단 → 격리 → 즉시 삭제 | 보관하지 않음 |

- **L3 탐지는 해외 LLM을 부르기 전에 로컬에서 먼저 합니다**(키워드·학교/학생 사전, Kiwi 고유명사, GLiNER). LLM 프롬프트의 L3 규칙은 2차 안전망입니다.
- **Plaud 단계의 노출은 파이프라인으로 막을 수 없습니다.** AutoFlow는 동기화 즉시 Plaud 클라우드와 미국 LLM으로 요약하므로 녹음 자체를 통제합니다. TODO: 학맞통 기관 협의 녹음을 AutoFlow 대상에서 빼는 방법 확인(별도 계정·기기, 수동 동기화).
- 회의 한 건에 여러 파트가 섞이면 구간마다 등급을 매기고, **가장 높은 등급의 규칙**을 회의 전체에 적용합니다. L3 구간이 있으면 회의 전체의 자동 처리를 멈춥니다.
- 애매하면 높은 등급으로 봅니다.

---

## 5. CRATA 포지셔닝 제언

### 5.1 한 줄 포지셔닝

> **"교육으로 들어가 그 회사가 일하는 방식을 데이터로 읽고, 그 회사의 말투·양식·결재선대로 움직이는 업무사이트와 아라 에이전트를 진단 2~4주 + 구축 2~4주 만에 세워주는 한국형 FDE-lite"**
> (대기업 SI는 너무 크고, 교육회사는 만들지 않고, 회의록 SaaS는 회사를 모르는 빈자리)

### 5.2 '교육/워크샵 + AX 컨설팅 + 맞춤 업무사이트'를 하나의 상품으로 묶는 방식

| 단계 | 기간 | 고객이 받는 것 | CRATA가 얻는 데이터 | 참고 사례 |
|---|---|---|---|---|
| 0. 무료 진단 세션 + 1일 공개자료 사전진단 | 2시간 + 1일 | 'Org Style Card'(보이스·비주얼·규모·문화 평판·추정 툴·첫 질문 10개), **그 자리에서 AI로 만든 포털 골격** | 홈페이지 토큰, 채용공고, 국민연금 인원 추이(학교·공공은 학교알리미 교직원 현황과 조직도), 공시·조달 이력 | JOYZO 첫 2시간 무료, 東急 즉석 시연 |
| 1. AX 부트캠프(강의·워크샵) | 3~5일 | 직원 AI 실무 역량, 부서별 자동화 프로토타입 | **실습 = 진단 산출물**: 업무 쪼개기(직무 목록), 업무흐름 그리기(EventStorming), 실제 보고서 AI로 다시 쓰기(문체 자료), 문화지도 15분, 사전·사후 AI 준비도 설문. 녹음은 CRATA 진행자가 참여한 전체 세션만(소그룹 토론은 녹음하지 않거나, 그룹 전원 동의 + 진행자 동석) | Palantir 5일 부트캠프, 엘리스 PBL, 모두의연구소 아이디어톤 |
| 2. Company DNA 진단 | 2~4주 | Company DNA Profile(`company_profile.yaml` + `style-pack/`) + 업무 지도 + 개선 우선순위(ROI) 보고서 | 위임전결규정, 결재 양식·완결 문서, 폴더 메타데이터, 단톡방(동의·가명화 후), 감사로그, 행동유형 검사 | Glean 흔적 분석, Relevance 판단기준 질문, Skan 집계 원칙 |
| 3. 맞춤 업무사이트 + 아라 구축 | 2~4주 | 그 회사 메뉴·용어·결재선·양식·테마로 된 포털, 회의 → 업무 자동 연결, 문서 생성 스킬 | 설계서 승인 기록 | Power Apps Plans, Feishu 전문가 모드, Trainual 정보구조 |
| 4. 운영 구독(동행형) | 월 단위 | 월간 AX 리포트, 스킬·온톨로지 재검증, 사내 'AI 운영자' 교육, 신규 업무 추가 | 사용 로그, 회의 누적 → 패턴 갱신 | kintone 伴走, Guru 검증 주기, 올거나이즈 월간 리포트, Dust 'AI Operators' |

### 5.3 GOAL B 핵심: 회사 스타일·패턴 추출 방법 (Company DNA Profile)

정본 프레임, 산출물 파일명, 폴더 구조, 진단 일정, 자료 요청 체크리스트는 [03 Company DNA 플레이북](./03_company-dna-playbook.md)을 따릅니다(10-레이어 L1~L10, `clients/{slug}/company_profile.yaml` + `style-pack/`). 이 절은 시장 조사에서 나온 원칙과 03의 레이어별로 참고할 도구만 정리합니다.

**원칙 다섯 가지**
1. **흔적을 먼저 보고 인터뷰는 나중에 합니다.** 문서·회의·결재의 시간순 흔적에서 '어떻게'를 먼저 뽑고, 인터뷰로 '왜'를 검증합니다([Glean](https://www.glean.com/blog/how-do-you-build-a-context-graph)).
2. **'말한 것과 실제로 한 것'의 차이를 봅니다**([Listen Labs](https://listenlabs.ai/)).
3. **판단 기준과 예외를 캐묻습니다**([Relevance Invent](https://relevanceai.com/invent)).
4. **개인이 아닌 집계로, 본문보다 메타데이터를 먼저 봅니다**([Skan](https://www.skan.ai/), [Worklytics](https://www.worklytics.co/pricing)).
5. **결과는 기계가 읽는 파일로 남깁니다**(Company DNA Profile).

**03의 L1~L10과 이 문서에서 조사한 도구 매핑**

| 03 레이어 | 이 문서 2장에서 참고할 도구·사례 | 업무사이트에 반영되는 곳 |
|---|---|---|
| L1 정체성·비주얼 | [Firecrawl branding](https://docs.firecrawl.dev/features/scrape) + [Dembrandt](https://github.com/thevangelist/dembrandt) → [DTCG](https://www.designtokens.org/), 홈페이지가 낡았으면 로고 색 + [KRDS](https://github.com/KRDS-uiux/krds-uiux), Google Stitch(DESIGN.md 형식만 차용) | 포털 테마, 슬라이드 마스터 |
| L2 보이스·톤 | [Kiwi](https://github.com/bab2min/Kiwi)로 종결어미 분포(하십시오체/해요체/개조식), WRITER 보이스 프로필, Jasper Brand IQ | 화면 문구, AI 답변 톤 |
| L3 조직 언어·용어집 | 클로바노트 사전, [티로 Wiki](https://docs.tiro.ooo/en/guide/notes/wiki.md)식 사람·주제·결정 페이지, Markup AI 용어 검수 | 검색 동의어, 메뉴명, STT 부스팅 |
| L4 문서 원형·서식 | [Upstage Parse](https://www.upstage.ai/products/document-parse)·[python-hwpx](https://pypi.org/project/python-hwpx/)로 문서 원형 추출, Templafy, M365 Brand Kit | 문서 생성 스킬, HWPX·PPTX 납품 양식 |
| L5 조직·역할·의사결정권 | 위임전결규정·결재 양식·감사로그 3각 대조, 다우오피스 위임규정, 메타데이터 네트워크 분석([Polinode](https://www.polinode.com/)는 04 수탁자 표 등록 전 고객 데이터 투입 금지, NAVER WORKS 감사로그) | 결재 라우팅·미리보기, '○○에게 묻기' |
| L6 업무 객체 온톨로지 | Palantir Ontology, Celonis 객체 중심 모델, [Drive API](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) 폴더 구조. 그래프 메모리([Graphiti](https://github.com/getzep/graphiti))는 선택이며 첫 2~3개 고객은 Postgres/YAML로 충분 | 데이터 모델, 결정 로그 페이지 |
| L7 프로세스·판단 규칙 | EventStorming, [ProMoAI](https://github.com/humam-kourani/ProMoAI)로 BPMN, [Disco](https://fluxicon.com/disco/)·[PM4Py](https://github.com/process-intelligence-solutions/pm4py), Decagon AOP식 마크다운 SOP | 메뉴(상위 업무 흐름), 병목 알림 |
| L8 리듬·의례·소통·문화 | CRATA 행동유형 검사(팀 단위 분포), [Erin Meyer Culture Map](https://erinmeyer.com/tools/) 8척도, 캘린더 메타데이터 | 알림 빈도·경로, 승인 버튼 노출 정도, 대시보드 밀도, AI 피드백 톤 |
| L9 도구·시스템 | 도구 사용 현황 설문, 채용공고 API(원티드·사람인), 그룹웨어 API(2.5) | 연동 대상, 이중 입력 제거 |
| L10 페인포인트·KPI·AI 기회 | BCG 10-20-70, Rewired 6역량을 30문항으로 축약, 사전·사후 AI 준비도 설문 | 교육 성과 지표, 다음 분기 과제 |

- 이 문서의 이전 판에 있던 '6개 층'(사람·관계 / 언어·문서 / 프로세스·결재 / 지식·용어 / 시각 / AI 준비도)은 위 매핑으로 대체합니다. 사람·관계는 L5·L8, 언어·문서는 L2·L4, 프로세스·결재는 L5·L7, 지식·용어는 L3·L6, 시각은 L1, AI 준비도는 L9·L10에 해당합니다.
- 시안 엔진(Lovable·v0 등 해외 빌더)에는 L0 토큰과 더미 데이터만 넣습니다. 프로파일 원문과 고객 기밀(L2)은 넣지 않습니다.
- 학교에는 NEIS 학생·성적 데이터, 교내 메신저 본문, 학생 관련 공문 제목을 요청하지 않습니다. 세부 체크리스트는 03 문서 3장을 따릅니다.

### 5.4 GOAL A 구현 설계 요약 (CRATA 내부 도구 = 제품 원형)

분류 체계(YAML), 출력 스키마, 프롬프트, 신뢰도 임계값, 로드맵, 비용의 정본은 [02 회의 자동 분류·라우팅 설계](./02_meeting-auto-classification.md)입니다. 스키마는 구간마다 `labels` 배열(primary/secondary)을 두고, 회의 유형은 영문 id를 쓰며, LLM은 기본 1회 호출로 분할·분류·추출을 함께 합니다. 이 절은 시장 조사에서 나온 설계 근거만 요약합니다.

**합의된 기준(02와 동일)**
- **사업부 코드**: EDU(강의·워크샵), SSI(학맞통), ARA(아라 에이전트), CORE(영업·경영·채용·법무 등 공통). DX(진단·코칭)·AXC(AX 컨설팅·업무사이트)는 (후보, TODO 확인).
- **녹음 제목 접두어**: `[강의]` `[학맞통]` `[아라]` `[AX]` `[공통]` `[혼합]` 6개로 통일합니다(Avoma식 명명 규칙).
- **'사례회의' 회의 유형과 '사례회의 지원' 업무 유형은 두지 않습니다.** 학맞통 사례회의는 녹음하지 않습니다.
- **신뢰도 게이트**: 0.85 이상 + 규칙 일치면 자동, 0.60~0.84는 확인 제안, 0.60 미만이나 `NEW`는 미분류. 처음 2주는 신뢰도와 관계없이 전부 사람이 확인합니다.

**파이프라인 순서와 참고 사례**
1. **수집**: 1주 MVP는 Zapier 트리거(경로 A), 1개월 차부터 Plaud CLI·MCP(경로 B, `@plaud-ai/cli@0.3.14`·`@plaud-ai/mcp@0.3.13` 고정). 처리한 파일 ID를 기록해 중복을 거릅니다. 로그인한 계정의 녹음만 보이므로 여러 사람 계정 처리는 TODO입니다.
2. **1차 규칙**: 제목 접두어, 참석자 도메인, 캘린더, 반복 회의 여부. MVP에서는 Zap 첫 단계 Filter로 접두어가 `[학맞통]`이거나 접두어가 없으면 중단합니다. `[혼합]`도 중단하고, 제목·전사에 L3·L2 키워드(02 문서 4.2절 `pre_llm_gate`)가 있으면 중단 → 수동 처리 큐로 보냅니다(02 문서 4.2절 `mvp_filter`)(Fireflies Rules Engine, Avoma). Zapier는 Filter보다 먼저 녹음을 받으므로, L2가 예상되는 회의는 애초에 Zap에 연결된 Plaud 계정으로 녹음하지 않습니다([04 문서](./04_data-governance.md) 2.4절). Filter는 2차 장치입니다.
3. **L3 로컬 탐지(해외 LLM 호출 전)**: 키워드·학교/학생 사전, Kiwi 고유명사, GLiNER. 걸리면 자동 처리 중단 → 격리 → 즉시 삭제 절차로 갑니다. L2는 Bedrock 서울 경로로 보냅니다(4.9). (1개월 차 경로 B부터. 1주 MVP(Zapier)에서는 Zap Filter의 접두어·키워드 규칙만 쓸 수 있고, Kiwi·GLiNER 로컬 탐지와 Bedrock L2 경로는 아직 없습니다. L2·L3 키워드가 걸리면 LLM 호출 없이 수동 처리하며, MVP 기간 L2 회의는 수동 처리합니다.)
4. **LLM 1회 호출**: 발화 ID 기반 구간 분할 + 닫힌 목록 안에서 분류 + 근거 발화 ID + 추출(Feishu 妙记, 통의청오 ContentExtraction, Circleback). Zapier Claude 액션의 구조화 출력 지원은 확인되지 않았으므로 JSON 파싱이 실패하면 재시도 1회 후 '미분류'로 보냅니다.
5. **승인 카드**: 근거 타임스탬프를 붙여 1클릭 승인(Otolio, Rimo Actions).
6. **적재·산출물·알림**: 원문 링크와 함께 저장하고, 업무 유형별 스킬로 산출물을 만듭니다.
7. **학습**: 사람이 고친 결과를 few-shot 예시로 넣고, 라벨이 쌓이면 [SetFit](https://github.com/huggingface/setfit) 1차 분류기를 만듭니다(Linear Triage, UiPath Communications Mining).

**MVP 범위와 전환 시점**
- 1주 MVP: 경로 A(Zapier) + Claude Sonnet 5.5, 대상은 `[강의]` `[아라]` `[AX]` `[공통]` 회의만. 이 접두어라도 견적·계약 조건, 고객 진단·인터뷰, ARA.pilot·safety·feedback처럼 L2인 회의는 MVP 기간에 수동 처리합니다. 경로 D(AutoFlow 메일 → Gmail → Apps Script)는 Zapier 출력 필드에 결함이 있을 때의 대안입니다.
- 1개월 차: 경로 B(Plaud CLI·MCP)로 전환. 학맞통 회의는 L2 경로(Bedrock 서울 Sonnet 5, 국내 저장)가 생긴 1개월 차 이후에만 넣습니다.
- 3개월 차: Haiku 4.5 분리(L0~L1 전용), SetFit 1차 분류기.
- 골든셋은 `[강의]` `[아라]` `[AX]` `[공통]` 회의만으로 만듭니다. 학맞통·학생이 언급된 회의와 견적·계약 조건(L2)이 중심인 회의도 제외합니다.

**비용 요약**(정가 기준, 상세는 02 문서 9장)
- LLM 처리비(60분 회의 1건): Haiku 4.5 약 $0.055(≈80원), Sonnet 5.5 약 $0.12, Opus 5.5 약 $0.25. Sonnet·Opus는 thinking 토큰이 출력으로 과금되므로 실제로는 1.5~2배가 될 수 있습니다.
- 월 총 운영비는 LLM보다 좌석 요금(Plaud, Notion, Zapier)과 사람 시간이 좌우합니다. 경로별·인원별 총액은 02 문서 9장을 봅니다.
- L2 경로(Bedrock 서울)는 Message Batches 할인이 없고, 요금은 Bedrock 요금(확인 필요)입니다.
- 재전사가 필요한 회의만 RTZR(시간당 1,000원)이나 CLOVA Speech로 다시 돌립니다.

### 5.5 경쟁 대비 차별점

| 경쟁군 | 대표 | 그들의 강점 | 빈자리 | CRATA 차별점 |
|---|---|---|---|---|
| 글로벌 노트테이커 | Circleback, Granola, Read AI, Sembly | 분류·자동화·산출물 | 한국어 업무 용어, 구간 라우팅, 국내 규제, HWP | 구간 분할 라우팅 + 한국어 용어집 + L0~L3 경로 |
| 국내 회의록 | 클로바노트, 다글로, 티로, 콜라보 | 한국어 전사 | 사업부·프로젝트 라우팅, 회사 맞춤 산출물 | 전사 위의 '분류·패턴·포털' 레이어 |
| 교육회사 | 엘리스, 휴넷, 패스트캠퍼스, 모두의연구소 | 콘텐츠와 규모 | 교육 뒤에 남는 구축물이 없거나 대형 위주 | 실습이 곧 진단, 결과물로 포털과 아라가 남음 |
| 대기업 SI | SK AX, LG CNS, 삼성SDS | 대형 구축 | 중소기업·학교에 비용 구조가 안 맞음 | 진단 2~4주 + 구축 2~4주, 정액, 운영비 그룹웨어 내장형 월 10~30만 원 / 독립 포털 월 30~100만 원 |
| 플랫폼 내장 AI | Notion, NAVER WORKS, flow, 더존 ONE AI | 기능 내장 | 회사 맞춤 설계와 진단이 없음 | 그 플랫폼 위에 얹는 Company DNA Profile과 스킬 |
| 교육 AI | 마이클, U+슈퍼스쿨, 교육청 AI 비서 | 교사 업무 경감 | 학교별 패턴 프로파일, 관계·정서 영역 | 학맞통 도메인 + 행동유형 검사 + 학교 업무 캘린더 |
| AI-native | Sierra, Distyl, Sembly | 제품력 | 한국어·한국 규제·교육 결합 | 한국형 FDE-lite |

### 5.6 상품화 단계 (내부 도구 → 패키지 → SaaS)

**1단계. 내부 도구 (2026-10~12)**
- GOAL A 파이프라인을 CRATA 자체에 적용합니다. 1주 MVP는 경로 A(Zapier) + Sonnet 5.5, 1개월 차에 경로 B(Plaud CLI·MCP)로 전환합니다. 경로 D는 Zapier 출력 필드에 결함이 있을 때의 대안입니다(5.4).
- Company DNA Profile을 CRATA 자신에게 먼저 만들어 봅니다.
- 통과 기준([02 문서](./02_meeting-auto-classification.md)와 동일)
  - 1개월: 사업부 정확도 95% 이상, 프로젝트 정확도 85% 이상, 자동 처리 비율 40% 이상
  - 3개월: 프로젝트 정확도 90% 이상, 자동 처리 60% 이상, 회의 1건당 사람 검수 2분 이하
  - 평가 표본은 구간 100개 이상으로 하고, 클래스(사업부·프로젝트)별 최소 표본을 정해 둡니다.
  - 보조 지표(판정에는 쓰지 않음): 미분류 비율, 복사·붙여넣기 0건, 산출물 초안 작성 시간 단축

**2단계. 패키지 (2027-01~06)**
- 고정 패키지 3종
  - 진단: 부트캠프 + Company DNA Profile
  - 포털 MVP
  - 운영 구독
- 레퍼런스 3곳(부산권 학교·교육청 1곳, 중소기업 2곳)을 확보합니다.
- 납품 키트
  - 데이터 요청서
  - 계약 패키지(NDA, 처리위탁, IP·익명 패턴 재사용, AI 조항)
  - 고지 스크립트
  - 베이스 템플릿: Next.js + Supabase 서울 + 고정 인증·권한·감사 계층 + 고객별 shadcn 테마. 망분리 고객은 Appsmith·Budibase 셀프호스팅
- 2027 AI바우처(소상공인분과) POOL과 클라우드 바우처 공급 Pool에 등록합니다.

**3단계. SaaS (2027 하반기~)**
- 아라 모듈화
  - 회의 분류기
  - Company DNA Profile MCP 서버
  - 포털 생성기('profile → generate')
  - style-check 검수 도구
  - 학생용 고지·라벨 컴포넌트
- 멀티테넌트로 운영하고, 국내 처리 옵션(서울 내 처리 모델, 국산 LLM)을 둡니다.
- **CSAP SaaS 등급 인증을 취득합니다**(학교·교육청에 멀티테넌트 SaaS를 제공하려면 필요). 비용·기간은 확인 필요. 취득 전까지 공공 고객에게는 내부망 설치형 또는 인증 그룹웨어 내장형만 제안합니다.
- 학습지원SW 선정기준 대응 자료를 준비합니다.

### 5.7 가격 모델 아이디어

| 상품 | 가격안(추정, 시장 검증 필요) | 근거·기준점 |
|---|---|---|
| 무료 진단 세션 + 1일 공개자료 리포트 | 0원(영업용) | JOYZO 첫 2시간 무료 |
| AX 부트캠프 + Company DNA 진단 | 300~800만 원 | 교육 예산에서 집행 가능. AI바우처는 교육비를 인정하지 않으므로 자부담 또는 교육청 예산 |
| 포털 MVP(정액 대면 구축) | 1,500~4,000만 원. 학교·공공은 수의계약 한도를 넘으면 협상에 의한 계약·입찰·혁신제품·GS 인증 경로(한 사업을 나눠 수의계약하는 분할계약은 금지. 분리는 독립 산출물이 있는 별개 사업만 가능, 조문 확인 TODO) | JOYZO ¥39만, kintone 초기 구축 수백만 엔~. AI바우처는 AI 기능분에만 해당(AI와 무관한 웹 개발비는 인정 안 됨) |
| 운영 구독(동행형) | 그룹웨어 내장형 월 10~30만 원 / 독립 포털 월 30~100만 원 | kintone 伴走 월 수만~수십만 엔, 그룹웨어 인당 3~13천 원 |
| 아라 SaaS | 좌석당 + AI 크레딧 포함, 또는 '고객 프로필 수' 기준 | flow 크레딧 포함 좌석(9,000~22,000원), Sembly 고객 수 요금 |
| 바우처 결합 | AI 솔루션은 AI바우처, SaaS 이용료는 클라우드 바우처(75%), 데이터 정제는 데이터바우처로 비용 항목 분리 | 같은 항목 이중 청구는 부정수급 |

**원가 구조**
- 운영 원가는 매우 낮습니다. LLM은 회의 1건당 수십~수백 원, 포털 호스팅은 고객당 월 $10~20입니다.
- 원가의 대부분은 인건비(포털당 40~120시간)입니다.
- 따라서 마진은 **재사용 가능한 스킬·템플릿 라이브러리 비율**(고객별 맞춤 개발은 20% 이하로)로 지켜야 합니다.

---

## 6. 다음 액션 체크리스트

### 이번 주 (~10/7)
- [ ] Plaud MCP를 Claude Desktop 또는 Code에 연결합니다(`npx @plaud-ai/mcp@0.3.13`, CLI는 `@plaud-ai/cli@0.3.14`. 버전을 올릴 때는 골든셋 회귀 테스트). Claude는 Team/Enterprise 또는 API(학습 미사용)로 쓰고, 개인 플랜이면 학습 허용 설정이 꺼져 있는지 확인합니다. 사업부별 Claude Project를 만들어 복붙을 없앱니다. MCP로 불러오는 녹음은 L0~L1(`[강의]` `[아라]` `[AX]` `[공통]` 중 L2 키워드가 없는 회의)만입니다. 학맞통·견적·고객 진단 녹음은 Claude Desktop·Code로 열지 않습니다([04 문서](./04_data-governance.md) 2.3절). Claude Project는 EDU·ARA·AX·CORE용만 만들고(SSI용은 만들지 않음), AX Project에도 고객 진단·인터뷰 녹음(L2)은 넣지 않습니다.
- [ ] 분류표 v0.2([02 문서](./02_meeting-auto-classification.md) 4.2절, `config/meeting_taxonomy.yaml`)를 기준으로 채웁니다(EDU/SSI/ARA/CORE 각각에 설명·키워드·진행 중 프로젝트·별칭·담당자. DX·AXC는 후보, TODO 확인).
- [ ] `[강의]` `[아라]` `[AX]` `[공통]` 회의만으로 골든셋을 만듭니다(학맞통·학생이 언급된 회의 제외. 견적·계약 조건(L2)이 중심인 회의도 제외). 지난 회의를 직접 구간 분할·분류하되, 평가용 구간은 100개 이상, 클래스별 최소 표본을 채웁니다.
- [ ] Plaud 커스텀 템플릿 'CRATA 분류용'을 만들고, Zap에 연결된 계정(L0~L1 회의 전용)의 AutoFlow 기본값으로 지정합니다.
  - 템플릿 섹션: 사업부 후보, 주제 전환 시점, 언급 기관·고객
  - AutoFlow는 동기화 즉시 Plaud 클라우드·미국 LLM으로 요약합니다. 학맞통 기관 협의 녹음을 AutoFlow 대상에서 빼는 방법을 확인합니다(TODO: 별도 계정·기기, 수동 동기화).
  - AutoFlow 제외 방법이 확인되기 전까지 학맞통 기관 협의 등 L2 회의(견적·계약 협상, `[AX]` 고객 진단·인터뷰, ARA.pilot·safety·feedback 포함)는 Zap·AutoFlow 연결 계정으로 녹음하지 않고 메모 또는 국내 STT로 기록합니다([04 문서](./04_data-governance.md) 2.4·6.4절).
- [ ] 녹음 제목 접두어 규칙(`[강의]` `[학맞통]` `[아라]` `[AX]` `[공통]` `[혼합]`)을 팀에 공지합니다.
- [ ] 녹음 고지 스크립트와 캘린더 초대 문구를 적용합니다. 다음을 함께 공지합니다.
  - **학맞통 사례회의·상담은 녹음하지 않습니다(L3).** 실수로 녹음되면 처리 중단·격리·즉시 삭제
  - CRATA 진행자가 당사자로 참여한 대화만 녹음. 워크샵 소그룹 토론은 녹음하지 않거나 그룹 전원 동의 + 진행자 동석
  - 셰도잉 중 Plaud 녹음 금지(메모만), NEIS·에듀파인·학생 업무 화면 캡처 금지
  - 학교·교육청에서는 녹음 전 기관 보안담당 확인
- [ ] Plaud Team 가입 여부를 결정합니다. Team 1인당 월 $20(연간 결제, 2026-11-30까지 가입 시 첫해 론칭가, 이후 $25)이라 10인이면 Plaud만 월 약 $200입니다([02 문서](./02_meeting-auto-classification.md) 9.2절). 여러 사람 계정의 녹음 수집에 Team이 꼭 필요하다고 확인될 때만 검토합니다.
- [ ] Plaud Intelligence가 배포되면 Event 3개(강의·워크샵 / 아라 / AX)를 만들어 병행 테스트합니다. L0~L1 회의만 넣고 학맞통·고객 진단 녹음(L2)은 넣지 않습니다(아라의 pilot·safety·feedback 회의도 L2라 제외, [04 문서](./04_data-governance.md) 6.4절).

### 이번 달 (10월)
- [ ] 1주 MVP를 구축합니다: 경로 A(Zapier) + Claude Sonnet 5.5, 대상은 `[강의]` `[아라]` `[AX]` `[공통]` 회의만.
  - Zap 첫 단계에 Filter: 제목 접두어가 `[학맞통]`이거나 접두어가 없으면 중단. `[혼합]`도 중단하고, 제목·전사에 L3·L2 키워드(02 문서 `pre_llm_gate`)가 있으면 중단 → 수동 처리 큐(02 문서 4.2절 `mvp_filter`)
  - Zapier는 Filter보다 먼저 녹음을 받으므로 L2가 예상되는 회의는 Zap에 연결된 계정으로 녹음하지 않습니다(Filter는 2차 장치, [04 문서](./04_data-governance.md) 2.4절). MVP 기간 L2 회의는 수동 처리
  - 처음 2주는 신뢰도와 관계없이 전부 사람 확인. 이후 0.85 / 0.60 게이트 적용
  - Zapier Claude 액션의 구조화 출력 지원은 미확인. JSON 파싱이 실패하면 재시도 1회 후 '미분류'
  - 경로 D(AutoFlow 메일)는 Zapier 출력 필드에 결함이 있을 때의 대안
- [ ] 1개월 차: 경로 B(Plaud CLI·MCP)로 전환하고, L2 경로(Bedrock 서울 In-Region Sonnet 5, 정본은 국내 저장)를 만든 뒤에 학맞통 회의를 넣습니다. Bedrock 계정·모델 접근 신청과 요금 확인이 필요합니다.
- [ ] 여러 사람의 Plaud 계정을 어떻게 처리할지 정합니다(TODO: 계정별 인증, Zap 복제, Team 공유 공간 검토).
- [ ] 국내 STT를 비교합니다(Plaud vs RTZR vs CLOVA enko, 회의 5건).
- [ ] (선택) Circleback API로 Plaud 전사본을 넣어 태깅 결과를 비교합니다.
- [ ] CRATA 개인정보 처리방침을 정비합니다(수탁자 표, 국외이전 표 — 다글로 형식 참고, AI 부록). 수탁자 목록은 [04 문서](./04_data-governance.md)를 따릅니다.
- [ ] Company DNA Profile([03 문서](./03_company-dna-playbook.md)의 `company_profile.yaml` + `style-pack/`)을 **CRATA 자신에게 먼저 적용**합니다(L1 비주얼, L2 보이스, L3 용어집, L5 결재 규칙).
- [ ] 고객 후보 1곳의 홈페이지로 시각 토큰을 추출해 Lovable로 포털 시안을 만들어 봅니다(Firecrawl + Dembrandt). 시안 엔진에는 L0 토큰과 더미 데이터만 넣습니다.
- [ ] '1일 공개자료 사전진단' 리포트 템플릿을 만듭니다(원티드·사람인 API, 국민연금 데이터, OpenDART, 나라장터. 학교·공공은 학교알리미).
- [ ] 자료 요청 체크리스트(중소기업용, 학교용)와 가명화 도구(카톡 txt용)를 표준화합니다.
- [ ] 부산교육청, 코드코리아, BIPA에 연락합니다(학맞통 연수, 공동 연수, 지역 사업).

### 분기 (~2026-12, 일부 2027-03)
- [ ] 3개월 차 목표로 고도화합니다: Agent SDK 정기 루틴, 승인 카드, kNN few-shot, SetFit 1차 분류기, Haiku 4.5 분리(L0~L1 전용), 감사 로그. 통과 기준은 프로젝트 정확도 90%, 자동 처리 60%, 검수 2분 이하입니다.
- [ ] 패키지 3종(진단·MVP·운영)과 가격표 v1을 확정하고 파일럿 2~3곳(중소기업 2, 학교·교육청 1)을 계약합니다.
- [ ] 계약 패키지를 만듭니다(NDA + 처리위탁 + 재위탁 목록(Lovable·Vercel 등 시안 엔진 포함) + 익명 패턴 재사용 + AI 조항 + 직원 관찰 조항).
- [ ] 아라에 AI 기본법 고지·결과물 표시 컴포넌트를 넣습니다. 학생용 기능은 학습지원SW 선정기준 5개 항목 대응 자료를 준비합니다.
- [ ] **2026-11 전후** 데이터바우처 공급기업 등록, **2027-01~03** AI바우처 POOL 등록(아라 아키텍처·상세 설명서 준비), 클라우드 바우처 공급 Pool 등록을 진행합니다.
- [ ] 플랫폼 변동 관리
  - OpenAI Agent Builder(deprecated, 2026-11-30 종료 예정)와 Firebase Studio(2027-03-22 종료 예정)는 사용하지 않음을 확인합니다.
  - Airtable 인수 여부를 다시 확인합니다.
  - 원문 전사본은 CRATA 저장소에 따로 보관합니다.
- [ ] 수의계약 한도와 분할계약 금지 조문, AI 기본법 계도기간, N2SF·CSAP 세부(CSAP SaaS 등급 취득 비용·기간), Bedrock 서울 Claude 요금, 학맞통 연수 용역 단가 같은 **미검증 항목을 1차 원문으로 확인**합니다.