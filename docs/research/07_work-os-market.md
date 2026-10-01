# 회사별 업무사이트 시장 조사: 통합 플랫폼·구축 대행·"이미 있는데 무슨 의미가 있나"

> 기준일 2026-10-01 · [00 방향 정리](./00_direction.md)의 판단 근거
> **표기**
> - ●: 공식 출처로 확인
> - ◐: 일부만 됨, 추가 설정이나 외부 도구 필요
> - ○: 확인 못 함(미검증)
> - [n]: 맨 아래 출처 번호
>
> 웹 검색 한도에 걸려, 마지막 몇 항목은 이미 알고 있던 URL을 직접 열어 확인했습니다.

---

## 1. 핵심 결론

1. **원하는 기능은 대부분 이미 있습니다.** Notion, Microsoft 365 Copilot, Lark는 각각 7개 항목(구조·회의·업무 배정·메일·지식·템플릿·외부 AI 연결) 중 5~6개를 공식 기능으로 갖추고 있습니다 [1-4][11-19][23-24]. 국내 제품도 빠르게 따라오고 있습니다.
   - 플로우: ChatGPT·Claude 공식 앱 등록, 기능 39개 연결 [55]
   - 두레이: 프로젝트 에이전트 [56]
   - 티로: 한국어 회의록에서 지식그래프를 자동으로 만들고 MCP로 연결 [49]
2. **"회사마다 규칙을 정하고, 설정하고, 계속 고쳐주는 일"은 어떤 제품도 대신해 주지 않습니다.** 그래서 Notion, Microsoft, Lark, kintone 모두 파트너 생태계가 있고, 파트너는 구축과 운영 동행(伴走)으로 돈을 받습니다 [9][20][25][64].
3. **비어 있는 곳은 세 군데입니다.**
   - 한국 중소기업이 실제로 쓰는 도구(네이버웍스·하이웍스·다음 메일, 결재)와 글로벌 AI 기능 사이의 연결
   - 업무 배정 규칙(역할·업무량·검토자)을 회사 정책으로 문서화하고, 수정 이력을 반영해 운영하는 일
   - 교육·복지 같은 도메인 특화
4. **팔아야 할 것은 소프트웨어가 아니라 "회사 운영모델 설계 + 월 운영"입니다.** 단건 구축만 팔면 크몽의 5~30만 원대 저가 시장과 경쟁하게 됩니다 [62].
5. **만들지 말 것:** 메일 클라이언트, 에디터·위키, 지식그래프 엔진, STT 회의록, 범용 프로젝트 관리 화면, PPT 생성기.
6. **"이미 있는데 무슨 의미가 있나"에 대한 답:** 이미 있다는 것은 시장이 검증됐다는 뜻입니다. kintone 파트너는 이미 있는 제품을 회사에 맞게 굴러가게 하는 일로 월 8.5만~34만 엔을 받습니다 [64].

---

## 2. 커버리지 매트릭스

"구조"(사업 > 프로젝트 > 파트 계층) 열은 대부분 제품의 기본 기능이라 따로 출처를 확인하지 않았습니다(일반 지식).

| 제품 | 구조 | 회의 → 결정·업무 | 배정(업무량·역할) | 메일 맥락 연결 | 연결된 지식 | 회사 템플릿 | 외부 AI(MCP) | 한국 특화(결재 등) |
|---|---|---|---|---|---|---|---|---|
| Notion | ● | ● AI Meeting Notes가 Custom Agents를 실행 [2][3] | ◐ 에이전트로 규칙 구현 가능, 업무량 기반 자동 배정은 ○ | ◐ Notion Mail(출시 때 Gmail 전용) [5], 에이전트 메일·캘린더 연동 [1] | ● 위키·검증 페이지·Enterprise Search [3][7] | ◐ 페이지 템플릿(PPT 브랜드 없음) | ● 공식 원격 MCP [4] | ◐ 한국 데이터 레지던시 2026년 가을 [8] |
| MS 365 Copilot | ◐ Planner·SharePoint | ● Facilitator: Loop 노트 + Planner 작업 [12] | ◐ 작업 생성·할당만, 업무량 기반은 ○ | ● Outlook 우선순위·요약 [13] | ● Work IQ [11] | ● Brand kit(PPT + 작성 가이드) [14][15] | ● Copilot Studio MCP, Work IQ API [19][11] | ○ |
| Google Workspace + Gemini | ◐ | ◐ Meet 메모, Workspace Studio [21] | ○ | ● 메일 에이전트(라벨·추출) [21] | ◐ Drive | ○ | ◐ Asana·Jira 커넥터, MCP 언급 없음 [21] | ○ |
| Lark/Feishu | ● Base·Wiki | ● Minutes 요약·할 일 [23] | ◐ | ● Lark Mail [23] | ● Wiki [23] | ○ | ● 공식 MCP(베타), CLI 스킬 26개 [24][23] | ● Approval(결재) [23] |
| ClickUp | ● | ◐ | ● 위임 에이전트(전문성·업무량) [26] | ◐ Super Agents가 메일 처리한다는 주장 [26] | ◐ Docs | ○ | ○ | ○ |
| monday.com | ● | ○ | ● Team Scheduler(용량 초과 시 재배정) [27] | ○ | ○ | ○ | ○ | ○ |
| Asana | ● | ◐ Fireflies 연동 [36] | ● AI Studio + Universal Workload [28] | ○ | ◐ Work Graph [29] | ○ | ○ | ○ |
| Atlassian Rovo | ● Jira | ◐ | ◐ | ○ | ● Confluence + Teamwork Graph [33][54] | ○ | ● Atlassian 호스팅 MCP [34] | ○ |
| Glean | – | – | – | ◐ | ● 사내 통합검색(최소 100석, 추정·미검증) [35] | – | ◐ 미검증 | ○ |
| 네이버웍스 | ◐ | ● 클로바노트 [61] | ○ | ● 하이퍼클로바X 메일 요약 + Mail API [42][40] | ○ | ○ | ◐ 커뮤니티 MCP만 있음 [67] | ● 결재·근태 모듈 [42] |
| 플로우 | ● | ○ | ◐ AI가 담당자 구조 설계 [55] | ○ | ◐ 위키 | ○ | ● ChatGPT·Claude 공식 앱 [55] | ○ |
| 두레이 | ● | ○ | ◐ 프로젝트 에이전트가 업무 생성 [56] | ● 메일·캘린더·위키 통합 에이전트 [56] | ● 위키 | ○ | ◐ Python SDK(MCP는 ○) [56] | ● 공공기관 전자결재 확산 [56] |
| 잔디 | ◐ 잔디 프로젝트(월 약 $20 추가) [57] | ○ | ○ | ○ | ◐ 지식베이스 Q&A [57] | ○ | ○ | ○ |
| 스윗 | ● | ○ | ○ | ○ | ○ | ○ | ○ | ◐ 결재 플러그인 [58] |
| 다우오피스 | ◐ | ○ | ○ | ● AI 메일 작성 [59] | ◐ 문서관리 | ○ | ○ | ◐ 결재(미검증) |
| 하이웍스 | ○ | ○ | ○ | ◐ POP3/SMTP(IMAP·API는 미검증) [44] | ○ | ○ | ○ | ◐ 결재(미검증) |
| 더존 Amaranth/ONE AI | ◐ | ◐ 회의 결과 정리 자동화 [60] | ○ | ○ | ◐ ONECHAMBER | ● ONEFFICE AI 템플릿 [60] | ○ | ● 행정문서 자동 작성 [60] |
| 티로(국내) | – | ● 한국어 특화 회의록 [49] | ○ | ○ | ● 사람·주제·결정 자동 지식그래프 [49] | ◐ 목적별 템플릿 | ● MCP·REST API [49] | ◐ |

- 카카오워크: 2025~26년 업무용 AI 업데이트를 확인하지 못했습니다(미검증).
- 대부분 제품의 한국어 품질과 지원 여부는 미검증입니다. Outlook "받은편지함 우선순위"는 Tier 1 언어만 지원하는데, 한국어가 들어가는지는 확인하지 못했습니다 [13].

---

## 3. 기능별 상세

### (a) 업무 배정

**글로벌 제품에서는 업무량 기반 자동 배정이 이미 상품화돼 있습니다.**
- **Asana:** AI Studio가 Universal Workload 데이터와 팀 커스텀 필드를 읽어 "용량 + 스킬" 기준으로 담당자를 정합니다. 출처는 Asana AI Studio 팀 리드가 쓴 공식 포럼 글입니다 [28].
  - HubSpot은 AI가 공수를 추정해 Workload에 넣는 방식으로 연 250시간을 절감했습니다 [28].
  - 2025년 9월 발표한 AI Teammates는 Work Graph를 맥락으로 쓰고, 사람의 피드백으로 개선된다고 설명합니다 [29].
- **monday.com:** Team Scheduler 에이전트가 과부하를 감지하면 재배정을 제안하고, 승인 후 양쪽 담당자에게 알립니다 [27].
- **ClickUp:** 위임 에이전트가 전문성과 업무량을 기준으로 배정합니다 [26].
- **Linear:** Triage Intelligence가 과거 패턴으로 담당자를 제안하거나 자동 적용합니다. Business 이상 플랜입니다 [30].
- **Motion:** SOP 문서를 읽고 역할·팀·용량 기준으로 자동 배정합니다 [31].
- **Reclaim:** 개인 일정 최적화 도구이고(2024년 Dropbox 인수) 팀 배정 도구는 아닙니다 [32].

**국내 제품은 프로젝트 시작 시점의 설계에 머뭅니다.**
- 플로우 AI 에이전트(2026년 2월)는 처음에 업무·일정·담당자 구조를 설계해 줍니다 [55].
- 진행 중 업무량을 보고 동적으로 재배정하는 기능은 국내 제품에서 확인하지 못했습니다(미검증).

**시사점:** 업무량 기반 배정 알고리즘 자체는 차별점이 될 수 없습니다. 차별점은 "검토자 지정, 직급·결재선" 같은 한국식 규칙을 회사 정책 문서로 만들고 운영하는 데 있습니다.

### (b) 메일을 업무 맥락에 연결

**글로벌 제품**
- **Notion Mail:** 2025년 4월 출시, Gmail 전용 [5]. 2026년 현재 Outlook을 지원하는지는 미검증입니다.
  - Notion Agent에 메일·캘린더 연동이 추가됐습니다 [1].
  - Custom Agents로 받은편지함 분류·초안 작성이 가능하다는 내용은 2차 출처입니다 [6].
- **Outlook Copilot:** 메일마다 우선순위와 그 이유를 표시하고, 요약과 초안의 톤 조절을 지원합니다 [13].
- **Google Workspace Studio**(2025년 12월 정식 출시): 질문이 담긴 메일을 감지해 라벨을 붙이고 Chat으로 알리며, 첨부파일에서 액션 아이템과 송장 번호를 뽑아냅니다 [21].
- **Superhuman:** 2025년 7월 Grammarly가 인수했고, 2025년 10월 회사 이름을 Superhuman으로 바꾸며 AI 비서 Go를 출시했습니다 [37].
- **Shortwave:** Gmail 기반 AI 메일 앱으로, 팀 스레드 공유와 메일 배정을 지원합니다. 출처는 3자 리뷰입니다 [38].
- **Fyxer:** Gmail·Outlook에서 사용자 말투를 학습해 답장 초안을 쓰고 회의 노트도 만듭니다 [39].

**국내 메일 연결 가능성**
- **네이버웍스:** 공식 Mail API가 있습니다 [40].
  - 발송, 메일함·메일 조회, 검색, 이동, 필터 생성이 가능합니다.
  - scope는 `mail`, `mail.read`이고, 서비스 계정은 쓸 수 없어 구성원 본인의 OAuth만 됩니다.
  - POP3/IMAP은 Standard 플랜 이상이라는 내용은 검색 요약 기준입니다 [41].
- **다음·카카오메일:** IMAP 연결이 되지만 2단계 인증과 앱 비밀번호가 필요합니다. 2차 블로그 출처라 공식 문서 확인이 필요합니다 [43].
- **하이웍스:** POP3/SMTP로 쓰는 사례만 확인했습니다 [44]. IMAP과 공식 API는 미검증입니다.

**시사점:** 메일 앱은 이미 포화 상태입니다. 한국 메일을 프로젝트 맥락으로 끌어오는 "커넥터 + 분류 규칙"만 만들 가치가 있습니다. 메일은 가장 민감한 데이터이므로 사용자 본인 OAuth와 읽기 우선 권한으로 시작합니다([04 문서](./04_data-governance.md)).

### (c) Obsidian처럼 연결된 회사 지식

**Obsidian**
- 업무용으로도 무료이고, 상업 라이선스($50/사용자/년)는 선택입니다. Sync는 사용자당 월 $4, Publish는 사이트당 월 $8(연간 결제 기준)입니다 [47].
- 팀 사용 제약 [45][46]
  - 공유 보관소(vault)는 최대 20명
  - 세분화된 권한 없음
  - 실시간 공동 편집 없음
  - 협업자 전원이 Sync를 따로 구독해야 함
  - 온프레미스 설치 없음
- MCP는 공식 제품이 없고, 커뮤니티의 Local REST API 플러그인과 mcp-obsidian 조합만 있습니다 [48].

**다른 제품**
- **Notion:** 검증 페이지는 검색과 AI 답변에서 우선 노출되고, 검증 기간이 끝나면 소유자에게 알림이 갑니다 [7]. Enterprise Search [3], AI Autofill [1]도 있습니다.
- **Confluence/Rovo:** 유료 Cloud 플랜에 Rovo가 포함되고 크레딧 방식으로 과금합니다 [33].
- **Guru:** Knowledge Agents가 지식의 검증·검증 해제를 자동으로 하고, MCP로 다른 AI 도구에 공급합니다 [50].
- **Slite**(2026년 6월): "스스로 유지되는 지식베이스"를 내놨습니다 [51].
  - 연결된 도구 20여 개를 보고 문서가 현실과 어긋난 곳을 찾아 수정안을 제안합니다.
  - 모든 수정은 사람이 승인해야 반영됩니다.
  - Pro 플랜 사용자당 월 $20입니다.
- **Tana:** 슈퍼태그와 회의 에이전트가 있습니다 [52].
- **Logseq:** DB 버전은 베타, 실시간 협업은 알파 단계입니다. 포럼 출처, 미검증입니다 [53].
- **티로(더플레이토, 국내):** 한국어 특화 회의록에서 위키가 사람·주제·결정을 자동으로 추출해 지식그래프를 만들고, MCP와 API를 제공합니다 [49].
  - 팀 플랜 계정당 월 $29이고, 별도로 AX 도입 견적·상담 페이지를 운영합니다 [49].
  - CRATA가 구상하는 기능과 가장 가까운 국내 경쟁자이자, 협력 후보입니다. 처리가 미국 수탁자를 거친다는 점은 [01 문서](./01_market-map.md)를 참고하세요.

**시사점:** "AI가 관리하는 위키"는 이미 Slite, Guru, 티로가 상품으로 팔고 있습니다. 지식그래프 엔진을 직접 만들면 안 됩니다. "연결된 지식"이라는 Obsidian식 개념은 맞지만, 회사 전체 시스템으로 Obsidian을 쓰기는 어렵습니다(권한·동시 편집·20명 제한).

---

## 4. 구축·운영 대행 시장: 돈을 내는 근거

**Notion**
- 공식 Consulting Partner의 역할로 구현, 연동, 교육, 지속 관리 지원을 명시합니다. 파트너는 라이선스 재판매 마진, 리퍼럴 수수료, 마케팅 지원금(MDF)을 받습니다 [9].
- 넥슨과 AX 파트너십을 맺었고(2026년 4월) [10], 한국 데이터 레지던시를 2026년 가을 도입합니다 [8]. 국내에서 보안 문제로 생기던 도입 장벽이 줄어듭니다.

**국내 노션 컨설팅**
- 슈크림마을(노션 글로벌 앰배서더) [63]
  - 2023년 이후 기업 컨설팅 30건 이상, 재계약률 50% 이상
  - 월 구독형 "케어컨설팅"으로 한 고객과 4년째 계약 중
  - 가격은 비공개
- 크몽 노션 구축은 5~30만 원대로, 저가 단건 시장입니다 [62].

**kintone 伴走(운영 동행)**
- hatenabase 공개 가격 [64]
  - 월 ¥85,000(10시간) / ¥170,000(20시간) / ¥340,000(40시간)
  - 초기 구축 ¥2.5M 이상, 온보딩 ¥650,000
- 50명 규모 중소기업 시세는 초기 300~1,500만 엔, 월 10~50만 엔입니다. 3자 비교 블로그 출처입니다 [65].

**Microsoft**
- Copilot 도입 가속 패키지(준비도 진단 → 배포 → 정착 계획)가 있습니다.
- Marketplace에 고정가 상품이 올라와 있습니다. 예: Covenant 3주 패키지, Ultima 2시간 무료 진단 [20].

**Lark**
- 동남아 공식 파트너(Incentro 등)가 Base 트래커 구축과 기존 시스템 연동을 판매합니다 [25].

**Glean**
- 구현 서비스 $20K~80K. 경쟁사 블로그의 추정치라 미검증입니다 [35].

**국내 재원**
- 2026 AI 바우처: 소상공인 분과 기업당 최대 3,000만 원, 자부담 20% [66]
- 스마트서비스 지원사업: 최대 5,000만 원 [66]
- 둘 다 2차 출처라 공고문 원문 확인이 필요합니다. AI와 무관한 웹 개발비는 인정되지 않을 수 있습니다([01 문서](./01_market-map.md) 4.6절).

---

## 5. 이전 대화(Codex) 주장 검증

**1. "Fireflies가 회의 내용으로 Asana 작업을 만들고 담당자를 연결한다" → 사실**
- 액션 아이템을 Asana 작업으로 자동 생성합니다.
- 담당자 자동 배정은 "작업 담당자의 이메일"이 Asana 프로젝트 멤버와 일치할 때만 되고, 끌 수 있습니다.
- 어떤 회의에서 작업을 만들지 정하는 통합 규칙은 Business 플랜 이상입니다 [36].
- Asana 앱 디렉터리는 음성 명령으로 작업을 만드는 기능 중심으로 설명합니다 [36].

**2. "Microsoft가 Copilot에 회사 PPT 템플릿과 작성 지침을 적용한다" → 대체로 사실, 단서 있음**
- PowerPoint의 Copilot은 Brand kit의 템플릿·색·글꼴로 슬라이드를 만듭니다 [14].
- 공식 Brand kit에는 "브랜드 보이스·톤·용어·작성 가이드"가 들어가고, 지정된 브랜드 매니저만 게시할 수 있습니다 [15][17].
- PowerPoint 백스테이지에서 브랜드 템플릿에 접근하는 기능은 Copilot(Premium) 라이선스 대상이며, 2026년 8월 말~9월 중순 배포됩니다 [16].
- 조직 프롬프트 게시는 2026년 7월부터입니다 [18]. 개인 맞춤 지침(Custom Instructions)은 3자 출처입니다 [68].
- 단서: 작성 지침을 Word·Outlook까지 전사적으로 강제 적용한다는 부분은 미검증입니다. 확인된 적용 범위는 PowerPoint와 Copilot 앱 디자인 편집기 중심입니다.

**3. "Obsidian 공유 보관소는 세밀한 권한과 동시 편집에 한계가 있다" → 사실**
- "세분화된 권한은 아직 미지원"입니다. 협업자 초대는 소유자만 할 수 있고, 그 외에는 모두 같은 권한을 가집니다.
- 실시간 공동 편집이 없고, 동시에 고친 내용은 동기화할 때 병합됩니다.
- 최대 20명이며, 협업자 전원이 Sync를 구독해야 합니다 [45][46].

---

## 6. 차별점과 "만들지 말 것"

### 차별점 후보

1. **회사 운영모델 설계 + 월 운영 (핵심)**
   - 고객사가 이미 쓰는 도구(Notion, M365, Google, 네이버웍스, 플로우) 위에 다음을 설정합니다.
     - 구조(사업 > 프로젝트 > 파트)
     - 회의 템플릿(결정·지시·보고 구분)
     - 배정 규칙(역할·업무량·검토자)
     - 메일 분류 규칙
     - 지식 검증 주기
     - 브랜드 템플릿
     - AI 스킬과 프롬프트
   - 설정 후 매달 고쳐 줍니다.
   - 근거: 파트너 생태계와 kintone 伴走 가격 [9][64].
2. **한국 업무 환경과의 연결**
   - 네이버웍스 Mail API [40], 다음·카카오 IMAP [43], 하이웍스(POP3) [44] 메일을 프로젝트 맥락으로 연결합니다.
   - 네이버웍스는 공식 MCP가 확인되지 않았고 커뮤니티 버전만 있습니다 [67]. 공식 MCP가 없다는 것 자체가 작은 기회입니다.
   - HWP·결재선 처리에서 글로벌 도구가 약한지는 미검증이라 고객 인터뷰로 확인해야 합니다.
3. **한국어 회의 구조**
   - STT는 직접 만들지 않습니다. 클로바노트·티로·Plaud의 결과물을 받아 회사 규칙대로 "결정 → 업무 → 담당자·검토자"로 후처리하는 데 집중합니다 [49][61]([02 문서](./02_meeting-auto-classification.md)).
4. **수정 이력 학습**
   - 기술 자체는 차별점이 아닙니다. Asana [29]와 Slite [51]도 사람의 피드백·승인 루프를 갖고 있습니다.
   - 차별점은 수정 로그를 회사 규칙 문서로 승격시키는 운영 프로세스를 CRATA가 맡는 데 있습니다([08 문서](./08_correction-learning.md)).
5. **도메인 특화(학생맞춤통합지원·복지 에이전트)**
   - 범용 플랫폼에서 이 영역 기능은 확인하지 못했습니다(미검증).
   - ARA를 MCP 서버나 스킬로 제공하면, 고객사 직원이 쓰는 Claude·ChatGPT·Copilot에서 바로 호출할 수 있습니다([09 문서](./09_ara-mcp-remote.md)). Notion [4], Lark [24], 플로우 [55], MS [19]는 모두 MCP를 지원합니다.

### 만들지 말 것 (이미 있는 제품)

- 메일 클라이언트: Notion Mail, Superhuman, Shortwave, Fyxer
- 문서 에디터·위키·지식그래프 엔진: Notion, Obsidian, Tana, Slite, Guru, 티로
- STT 회의록: 클로바노트, 티로, Fireflies, Plaud
- 범용 프로젝트 관리·업무량 화면: Asana, monday, ClickUp, Motion
- PPT 생성 엔진: MS Brand kit, Gamma 등
- 사내 통합검색: Glean, Notion, Rovo

### 얇게 만들 것

- 회사 규칙 스키마(Company DNA Profile, [03 문서](./03_company-dna-playbook.md))
- 세팅 플레이북과 템플릿 팩
- 한국 메일·결재 MCP 커넥터
- 수정 로그 → 규칙 업데이트 루틴
- 운영 리포트

### 리스크

플랫폼이 빠르게 기능을 흡수하고 있습니다. 예: 플로우의 담당자 설계 [55], 두레이의 프로젝트 에이전트 [56]. 그래서 해자는 소프트웨어가 아니라 고객 관계, 운영 역량, 도메인 지식이어야 합니다.

---

## 출처

1. https://www.notion.com/releases/2026-04-14
2. https://www.notion.com/releases/2026-07-31
3. https://www.notion.com/product/ai
4. https://developers.notion.com/docs/get-started-with-mcp · https://docs.stacklok.com/toolhive/guides-mcp/notion-remote
5. https://jopr.org/news/detail/notion-releases-an-ai-email-client-for-gmail · https://www.eesel.ai/blog/notion-mail-overview
6. https://www.createwith.com/tool/notion/updates/notion-enhances-custom-agents-with-mail-and-calendar-integration (2차)
7. https://www.notion.com/help/guides/verify-knowledge-your-teammates-can-trust-with-page-verification
8. https://ditoday.com/?p=142174
9. https://www.notion.com/consulting-partner-program
10. https://www.hellot.net/mobile/article.html?no=112390
11. https://www.microsoft.com/en-us/microsoft-365/blog/?p=281502
12. https://support.microsoft.com/en-us/teams/copilot/facilitator-in-microsoft-teams-meetings
13. https://support.microsoft.com/outlook/frequently-asked-questions-about-copilot-in-outlook
14. https://support.microsoft.com/office/use-your-organization-s-branding-with-copilot-in-powerpoint-c8bc6df5-37ed-4398-8b90-f78a8fdcf9bb
15. https://support.microsoft.com/en-us/Microsoft-365-Copilot/create-and-manage-official-brand-kits-in-the-microsoft-365-copilot-app
16. https://mc.merill.net/message/MC1442612
17. https://learn.microsoft.com/en-us/microsoft-365/copilot/enterprise-brand-manager
18. https://mc.merill.net/message/MC1396361
19. https://www.microsoft.com/en-us/copilot/blog/copilot-studio/model-context-protocol-mcp-is-now-generally-available-in-microsoft-copilot-studio/
20. https://appsource.microsoft.com/en-mt/marketplace/consulting-services/ctp.copilotdeploymentandadoption · https://marketplace.microsoft.com/de-de/product/ultima.microsoft_365_copilot_readiness_assessment?country=GB
21. https://workspace.google.com/blog/product-announcements/introducing-google-workspace-studio-agents-for-everyday-work
22. (미사용)
23. https://pkg.go.dev/github.com/larksuite/cli
24. https://glama.ai/mcp/servers/larksuite/lark-openapi-mcp
25. https://www.incentro.com/en-ID/partners/lark-partner
26. https://clickup.com/p/ai-agents/intelligent-task-delegation · https://feedback.clickup.com/changelog/introducing-super-agents-the-worlds-first-human-like-ai-agents
27. https://monday.com/w/ai-templates/ai-agents/team-scheduler
28. https://forum.asana.com/t/automatic-resource-management-with-ai-studio-the-complete-implementation-guide/1093403 · https://asana.com/de/case-study/hubspot
29. https://www.businesswire.com/news/home/20250925695672/en
30. https://linear.app/docs/triage-intelligence
31. https://www.usemotion.com/features/ai-workflows
32. https://techcrunch.com/2024/08/22/dropbox-acquires-index-ventures-backed-ai-scheduling-tool-reclaim-ai
33. https://www.atlassian.com/licensing/rovo
34. https://blog.isostech.com/rovo-mcp-a-partners-guardedly-optimistic-view
35. https://gosearch.ai/blog/glean-pricing (경쟁사 추정치, 미검증)
36. https://guide.fireflies.ai/articles/1901313269-how-to-integrate-asana-with-fireflies · https://asana.com/apps/fireflies
37. https://siliconangle.com/2025/07/01/grammarly-acquires-email-client-developer-superhuman/ · https://techeconomy.ng/grammarly-rebrands-superhuman-launches-ai-assistant
38. https://woodpecker.co/blog/shortwave/ (3자)
39. https://support.fyxer.com/en/articles/10968437-what-is-fyxer-ai
40. https://developers.worksmobile.com/kr/docs/mail
41. https://help.worksmobile.com/en/use-guides/mail/settings/pop3-imap-smtp/
42. https://navercorp.com/media/pressReleasesDetail?seq=31838
43. https://yellowit.co.kr/it-review/%ea%b5%ac%ea%b8%80-%ec%a7%80%eb%a9%94%ec%9d%bc%ec%97%90%ec%84%9c-%eb%84%a4%ec%9d%b4%eb%b2%84%eb%a9%94%ec%9d%bc-%eb%84%a4%ec%9d%b4%ed%8a%b8-%eb%8b%a4%ec%9d%8c-%ec%97%b0%eb%8f%99-%ec%99%b8%eb%b6%80/ (2차)
44. https://learn.microsoft.com/ko-kr/answers/questions/5583953/outlook
45. https://obsidian.md/help/sync/collaborate
46. https://obsidian.md/help/teams/sync
47. https://obsidian.md/pricing
48. https://mcp.directory/blog/obsidian-mcp-complete-guide-2026 · https://glama.ai/mcp/servers/zt4ta9saiy
49. https://docs.tiro.ooo/en/guide/start/ai-connect · https://ax.tiro.ooo/ko/roi · https://www.unicornfactory.co.kr/article/2025030610191997023
50. https://www.getguru.com/solutions/km-automation
51. https://slite.com/changelog/the-self-maintaining-knowledge-base
52. https://tana.inc/docs/meeting-agent
53. https://discuss.logseq.com/t/one-year-of-progress/33915 (미검증)
54. https://www.atlassian.com/software/confluence/ai
55. https://ditoday.com/?p=140661 · https://byline.network/2026/09/17-600/
56. https://byline.network/2026/04/429-2/
57. https://byline.network/2025/11/17-509/ · https://byline.network/2025/08/22-458/
58. https://www.unicornfactory.co.kr/article/2024032109535479832
59. https://daouoffice.com/down/2025_daou_ai_1.pdf
60. https://www.smarttoday.co.kr/ko-kr/articles/92902 · https://www.smarttoday.co.kr/ko-kr/articles/96017
61. https://help.worksmobile.com/ko/use-guides/clovanote/view/ai-summary/
62. https://kmong.com/category/660
63. https://brunch.co.kr/@shooni/13 · https://brunch.co.kr/@shooni/15
64. https://hatenabase.jp/blog/%e3%81%af%e3%81%a6%e3%81%aa%e3%83%99%e3%83%bc%e3%82%b9%e3%81%aekintone%e4%bc%b4%e8%b5%b0%e6%94%af%e6%8f%b4%e3%82%b5%e3%83%bc%e3%83%93%e3%82%b9/
65. https://www.shopowner-support.net/?p=141254 (3자)
66. https://wikidocs.net/blog/@insightbridge/25692/ · https://www.heraldk.com/article/2026032919000040750 (2차, 공고문 확인 필요)
67. https://glama.ai/mcp/servers/yjcho9317/nworks/tools/nworks_mail_send (커뮤니티)
68. https://nboldapp.com/?p=13869 (3자)
