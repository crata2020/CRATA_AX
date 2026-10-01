# CRATA AX — 회의 자동 분류 & 고객사 스타일·패턴 추출 리서치

> 기준일 2026-10-01 · 국내외 16개 관점, 서비스·기술 374건 조사, 1차 출처 재검증(확인 338 · 인수 12 · 리브랜딩 11 · 종료(예정) 3 · 정정 5 · 불확실 5)
> 두 가지 질문에 답합니다.
> - **GOAL A**: Plaud 회의 녹음을 들으면 어느 파트(사업부·프로젝트)의 어떤 회의인지 자동으로 분류하고, 한 회의에 여러 파트 이야기가 섞이면 구간별로 나눠 분류할 수 있는가?
> - **GOAL B**: 고객사에 들어갔을 때 그 회사의 스타일과 패턴을 어떻게 뽑아내고, 그걸로 회사 맞춤 업무사이트를 어떻게 만들 것인가?

---

## 1. 한눈에 보는 결론

### GOAL A — 회의 자동 분류·라우팅

1. **"회의 하나를 구간으로 나눠 구간마다 다른 사업부·프로젝트로 보내는" 완제품은 국내외 조사 범위에서 확인되지 않았습니다.** 챕터 분할(Teams, Read AI, 통의청오, Feishu 妙记)과 회의 단위 자동 분류(Circleback 태그, Plaud Intelligence Events, 콜라보 AI 레이블)는 각각 있지만, 둘을 이은 제품은 확인되지 않았습니다. 이 부분이 CRATA가 만들 차별점입니다.
2. **권고: 녹음·전사는 그대로 Plaud(Buy), 분할·분류·라우팅만 얇게 직접 구축(Build).** Plaud는 공식 MCP·CLI(읽기 전용, 2026-05 GA, `@plaud-ai/mcp@0.3.13`·`@plaud-ai/cli@0.3.14`로 고정)와 Zapier 트리거("Transcript & Summary Ready")를 제공합니다. 반면 일반 공개 API, 폴더 쓰기, 웹훅은 없습니다. 그래서 분류 결과의 정본은 Plaud 밖에 둡니다. L0~L1은 Notion/Drive(이후 업무사이트)에, L2는 국내 저장소에 두고 Notion에는 링크만 둡니다.
3. **분류 방식(업계에서 검증된 패턴):**
   - 설명·별칭·예시를 붙인 닫힌 분류표(사업부 > 프로젝트/고객 > 업무유형) 안에서만 고르게 합니다(Circleback 방식).
   - 구간마다 근거 발화와 타임스탬프를 붙입니다.
   - 신뢰도 게이트: 0.85 이상이면서 규칙 힌트와 일치하면 자동, 0.60~0.84(또는 0.85 이상이지만 규칙 불일치)면 확인 제안, 0.60 미만·NEW면 미분류. 운영 첫 2주는 전부 사람이 확인합니다.
   - 사람이 1클릭으로 승인하고(Otolio·Rimo 방식), 고친 결과는 few-shot 예시로 쌓습니다(Linear Triage처럼 수정 이력으로 개선).
4. **로드맵:**
   - 1주 MVP: Zapier → Claude Sonnet 5.5 → Notion/Drive. 대상은 `[강의][아라][AX][공통]` 회의만이고, 전부 사람이 확인합니다. 고객 진단·견적·계약 등 L2가 예상되는 회의는 Zap에 연결된 Plaud 계정으로 녹음하지 않습니다.
   - 1개월: Plaud CLI·MCP로 전환하고, 타임스탬프 기반 구간 분할과 프로젝트 메모리를 붙입니다. 국내 L2 경로(Bedrock 서울)가 생기면 학맞통 회의를 투입합니다.
   - 3개월: 학습 루프를 붙이고 아라(ARA) 모듈로 제품화합니다.
5. **비용은 걸림돌이 아닙니다.**
   - LLM 비용은 60분 회의 1건에 약 $0.12(≈175원)입니다(thinking 설정에 따라 1.5~2배 가능).
   - 월 총 운영비(Plaud 구독 포함, Notion 좌석료 제외)는 3인 4~7만 원, 10인 12~19만 원입니다(Plaud Team 플랜이면 약 33~38만 원).
   - 성패는 분류 체계 설계와 검수 루프가 가릅니다.
6. **전제 조건은 "녹음 자체를 통제"하는 것입니다.**
   - Plaud AutoFlow는 동기화 즉시 Plaud 클라우드(국외)와 미국 LLM으로 요약하므로, CRATA 파이프라인으로는 그 단계를 막을 수 없습니다.
   - 학생 식별 정보와 상담·사례 내용(L3)은 녹음하지 않습니다.
   - 해외 LLM을 부르기 전에 로컬에서 먼저 민감정보를 탐지합니다.

### GOAL B — 고객사 스타일·패턴 추출 → 맞춤 업무사이트

1. **스타일과 패턴은 출처가 다릅니다.**
   - 스타일(어떻게 보이고 말하나: 비주얼, 톤, 용어, 문서 서식)은 홈페이지, 문서, 공지에서 대부분 자동 추출됩니다.
   - 패턴(어떻게 일하고 결정하나: 조직, 업무 객체, 프로세스, 결재, 리듬, 도구, 페인포인트)은 위임전결규정, 결재 양식, 완결 문서, 업무분장, 회의, 폴더 구조 같은 내부 흔적에만 남아 있습니다.
2. **10-레이어 모델로 쪼개서 추출하고, 결과는 문서가 아니라 데이터로 남깁니다.**
   - 레이어: L1 정체성·비주얼 / L2 보이스·톤 / L3 용어집 / L4 문서 원형 / L5 조직·의사결정권 / L6 업무 객체 온톨로지 / L7 프로세스·판단 규칙 / L8 리듬·문화 / L9 도구·시스템 / L10 페인포인트·KPI·AI 기회.
   - 결과물: `clients/{slug}/company_profile.yaml` + `style-pack/`. 업무사이트 생성기와 아라가 이 데이터를 그대로 읽습니다.
3. **원칙은 "흔적 먼저, 인터뷰는 검증용"입니다.**
   - 흔적: 문서·결재·회의·폴더. 근거는 Glean의 context graph 정의(엔티티와 그 사이의 시간순 행동·이벤트 흔적을 잇는 모델)입니다.
   - 인터뷰: 판단 기준과 예외를 캐묻고, 말과 행동이 어긋나는 곳을 확인합니다.
4. **진단 2~4주 + 구축 2~4주.** 사전조사 → 사전 인터뷰·설문 → 킥오프 워크샵(EventStorming, 업무 쪼개기, 문화지도) → 2주 수집·셰도잉 → AI 분석 → 검증 워크샵(포털 시안 즉석 시연) → 프로파일 v1.0 → 포털 구축.
5. **생성은 단계마다 승인을 받습니다(Power Apps Plans 방식).**
   - 순서는 요구사항 → 데이터 → 솔루션입니다.
   - 인증·권한·개인정보는 고정 베이스에 둡니다(Retool 방식).
   - AI는 화면, 워크플로, 테마, 카피만 생성합니다.
   - 매핑: 온톨로지 → DB, 프로세스 → 워크플로·페이지, 스타일 토큰 → 디자인 시스템, 용어집 → UI 카피, 역할 → 권한.
6. **CRATA만의 무기:**
   - 강의·워크샵 실습 자체가 구조화된 진단 데이터 수집 채널이 됩니다.
   - 행동방식검사가 사람·문화 레이어(L8)를 채웁니다(개인 결과는 본인에게만, 회사에는 5명 이상 팀 단위 분포만).
   - 학교·학맞통 도메인(HWP, NEIS, KRDS)을 알고 있습니다.
   - GOAL A 회의 분류가 고객 프로파일을 계속 갱신합니다(고객 진단 회의는 L2라 GOAL A의 L2 경로가 생긴 뒤부터).

### 꼭 깊게 볼 레퍼런스 (상세는 [01 문서 3장](docs/research/01_market-map.md), [03 문서 7장](docs/research/03_company-dna-playbook.md))

| 레퍼런스 | 국가 | 가져올 것 |
|---|---|---|
| Plaud MCP·CLI + Plaud Intelligence | 미국 | 입력원 자동 수집. Events·Skills·Routines(2026-10 배포 예정)는 병행 실험 |
| Circleback | 미국 | 닫힌 태그 목록 + 태그 설명 기반 AI 분류, 태그 조건 자동화 |
| 티로(Tiro) Wiki + API/MCP | 한국 | 회의록에서 사람·주제·결정 관계 추출("조직 언어 지도"). 단, 처리는 미국 수탁자 경유 |
| Feishu 妙记 + 통의청오 | 중국 | 분할 세밀도 파라미터, 차원 사전 기반 추출, 문장 ID 근거(설계만 차용) |
| Otolio(→kintone), Rimo Actions | 일본 | "근거 타임스탬프 + 제안 카드 + 1클릭 승인" 검수 UX |
| Sembly 3.0 (+ Supernormal) | 미국 등(Sembly 국가 미검증) | 고객사별 컨텍스트 컨테이너 + 브랜드 패키지 → 산출물 |
| Sierra Ghostwriter, Relevance Invent, Decagon AOP | 미국·호주 | SOP·녹취·인터뷰 → 에이전트 초안 → 검토 → 배포, 자연어 SOP 단일 원천 |
| Palantir Ontology + AIP Bootcamp + FDE | 미국 | 객체·링크·액션 모델링, 5일 부트캠프형 워크샵 상품 |
| Power Apps Plans (+ Feishu 전문가 모드) | 미국·중국 | 요구사항 → 데이터 → 솔루션 단계별 승인 생성 |
| Firecrawl branding + Dembrandt + DTCG 토큰 | 미국·오픈소스 | URL에서 시각 스타일 자동 추출 → 디자인 토큰 |
| WRITER 보이스 프로필 | 미국 | 보이스 + 용어 + 스타일 가이드 데이터 모델 |
| kintone 파트너 모델(伴走, JOYZO) | 일본 | 무료 첫 세션 → 정액 구축 → 월정액 동행 상품 구조 |

---

## 2. 저장소 구성

| 경로 | 내용 |
|---|---|
| [docs/research/01_market-map.md](docs/research/01_market-map.md) | 국내외 유사 서비스 리서치 맵(카테고리별 표), Top 10 레퍼런스, 한국 시장 특수성, CRATA 포지셔닝·상품화·가격, 다음 액션 |
| [docs/research/02_meeting-auto-classification.md](docs/research/02_meeting-auto-classification.md) | **GOAL A 설계 정본**: 기존 서비스 비교, 아키텍처, 입력 경로 4가지, 분류 체계, 구간 분할·멀티라벨 프롬프트, 출력 스키마, 검수 루프, 산출물 템플릿, 비용 |
| [docs/research/03_company-dna-playbook.md](docs/research/03_company-dna-playbook.md) | **GOAL B 플레이북 정본**: 10-레이어 모델, 진단 프로세스(2~4주), 질문 뱅크, Company DNA Profile, 업무사이트 생성 파이프라인, 스택 옵션 |
| [docs/research/04_data-governance.md](docs/research/04_data-governance.md) | **공통 부록 정본**: 데이터 등급 L0~L3, 녹음 원칙(통신비밀보호법), 수탁자·국외이전 표, L3 사전 탐지, 정보주체 권리, 고객 진단 특칙, CSAP |
| [docs/research/05_service-catalog.md](docs/research/05_service-catalog.md) | 조사한 서비스·기술 374건 전체 카탈로그(관점별 표, 검증 상태, 출처) |
| [docs/research/06_verification-log.md](docs/research/06_verification-log.md) | 팩트체크 로그(핵심 주장 판정, 인수·종료·정정 내역) |
| [config/meeting_taxonomy.yaml](config/meeting_taxonomy.yaml) | 회의 분류 체계 초안 v0.2 (EDU 강의·워크샵 / SSI 학맞통 / ARA 아라 / CORE 공통, DX·AXC는 후보) |
| [prompts/meeting_segment_classify.md](prompts/meeting_segment_classify.md) | 구간 분할 + 멀티라벨 분류 프롬프트 |
| [schemas/meeting_segments.schema.json](schemas/meeting_segments.schema.json) | 분류 결과 JSON Schema (구조화 출력용) |
| [templates/company_profile.template.yaml](templates/company_profile.template.yaml) | Company DNA Profile 템플릿 (주석 포함) |
| [data/research_dataset.json](data/research_dataset.json) | 리서치 원자료(관점별 서비스·방법론·검증 결과) |
| [scripts/build_research_appendix.py](scripts/build_research_appendix.py) | 원자료에서 05·06 문서를 다시 만드는 스크립트 (`python3 scripts/build_research_appendix.py`) |

문서끼리 내용이 다르면 정본 문서를 따릅니다. GOAL A는 02, GOAL B는 03, 데이터 등급·개인정보는 04가 정본입니다.

---

## 3. 이번 주에 할 일 (요약)

1. **분류 체계 확정(1~2시간):** [config/meeting_taxonomy.yaml](config/meeting_taxonomy.yaml)의 사업부·프로젝트·업무유형을 실제 업무에 맞게 고치고, 진행 중인 고객·과정·기관·아라 과제를 등록합니다. DX(검사·코칭·강사양성)와 AXC(AX 컨설팅·업무사이트)를 별도 사업부로 둘지도 정합니다.
2. **녹음 제목 규칙:** 녹음 직후 `[강의] [학맞통] [아라] [AX] [공통] [혼합]` 중 하나를 붙입니다.
3. **골든셋:** `[강의][아라][AX][공통]` 과거 회의를 수동으로 구간·라벨링해서 정답 세트를 만듭니다(학맞통·학생이 언급된 회의와 견적·계약 조건·고객 진단처럼 L2인 회의는 제외, 애매하면 제외). 목표는 구간 100개 이상입니다.
4. **1주 MVP:** Zapier 경로로 붙이고, 2주 동안 전부 사람이 확인합니다. 자세한 단계는 [02 문서 3.5절](docs/research/02_meeting-auto-classification.md)에 있습니다.
5. **GOAL B 내부 파일럿:** [템플릿](templates/company_profile.template.yaml)으로 CRATA 자신의 Company DNA Profile을 먼저 만들어 봅니다.

## 4. CRATA가 확인해 줘야 할 것 (TODO)

- 지금 쓰는 협업 도구(Notion인지, 사내 메신저는 무엇인지)와 Plaud 플랜·계정 수(여러 사람 계정 처리 방식이 달라짐)
- 사업부·하위 업무의 실제 구조(초안의 EDU/SSI/ARA/CORE와 후보 DX/AXC)
- 학맞통 관련 회의에서 녹음할 수 있는 범위(기관 보안 규정, 동의)
- ChatGPT 대화(공유 링크)의 마지막 메시지 원문. 공유 링크가 Cloudflare 봇 확인에 막혀 직접 읽지 못했습니다.

> 이 리서치는 법률 자문이 아닙니다. 녹음·개인정보·조달 관련 내용은 계약·런칭 전에 전문가 검토를 받으세요([04 문서](docs/research/04_data-governance.md)).
