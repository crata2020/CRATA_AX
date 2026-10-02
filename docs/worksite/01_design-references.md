# 01. 디자인 레퍼런스: 회사 업무사이트·대시보드는 어떻게 설계하나

> 기준일 2026-10-02 · 상위 문서: [00 방향 정리](../research/00_direction.md) · 대상: CRATA 워크사이트 공통 뼈대(첫 고객 (주)티알테크놀러지)
>
> - 공개 자료로 확인한 내용만 적었습니다. 확인하지 못한 항목은 **(미검증)**으로 표시했습니다.
> - 사용자 레퍼런스 이미지(오희컴퍼니 시안, 티알테크놀러지 홈페이지 캡처)는 제3자 저작물이라 **저장소에 넣지 않습니다.** 이 문서는 분석 결과만 남깁니다.
> - 이미지 수치(px)는 1920px 폭 캡처를 직접 잰 **근사치**입니다.

---

## 1. 핵심 결론

1. **뼈대는 "왼쪽 메뉴 + 옅은 색 콘텐츠 패널 + (넓은 화면에서) 오른쪽 레일"로 갑니다.** 사용자가 고른 시안(스마트경리)과 NN/g가 정리한 인트라넷 표준 배치(상단 바, 왼쪽 메뉴, 가운데 소식·위젯, 오른쪽 상자)가 같은 구조입니다. 사람들이 이미 익숙한 배치라 학습 비용이 낮습니다. 회사마다 달라지는 것은 배치가 아니라 **기능, 정보 구조, 문구, 색**입니다([NN/g 2005](https://www.nngroup.com/articles/the-canonical-intranet-homepage/)).
2. **시안에서 가져올 것은 구조와 리듬입니다.** 옅은 틴트 패널, 흰 카드, 넉넉한 여백, 검정 알약 라벨, 큰 숫자와 작은 단위, 알약형 세그먼트, 얇은 막대가 그 대상입니다. 반대로 시안의 **보라 단색(#5B3DF5 근사, OKLCH 채도 0.255), 은은한 보라 그림자, 카드 안의 흰 카드, 40px 넘는 라운드, 이름 한 단어만 색칠한 인사말**은 2025~2026년 "AI 티" 목록에 그대로 올라 있는 항목이라 바꿉니다(5장).
3. **홈은 "오늘 내가 할 일"에서 시작합니다.** 네이버웍스 Today 위젯(필독 1개, 오늘 일정, 오늘 마감 할 일 2개)과 Notion Home(섹션 표시·이동·숨김)처럼, 홈은 내 할 일·검토 대기·오늘 일정을 먼저 보여주고 숫자 분석은 그다음에 둡니다. CRATA의 핵심 흐름인 "AI 제출 → 검토자 승인"을 홈에서 바로 처리하게 합니다.
4. **대시보드 원칙은 출처가 달라도 거의 같습니다.** 한 화면에서 한눈에 보이게, 요약 → 필터 → 상세 순서, 가장 중요한 것은 왼쪽 위, 모듈 5~9개 이하, 장식 금지, 막대·선 위주, 색만으로 의미를 전하지 않기입니다(Few, NN/g, Ant Design, Carbon, KRDS).
5. **Refine CRM 예제는 "화면 묶음"을 그대로 빌려 씁니다.** 대시보드(건수 카드·추이 차트·최근 활동·다가오는 일정), 칸반, 회사·연락처 목록·상세, 견적, 캘린더 구성이 CRATA 모듈(업무·회의·산출물·회사 구조)과 1:1로 대응합니다. 단, `@refinedev/antd` 6.0.3은 **antd 5**를 요구하고, Ant Design Pro 최신판은 Ant Design 6 기준이라 **Pro는 코드가 아닌 화면 패턴 참고용**으로만 씁니다.
6. **테넌트 테마는 "씨앗 색 2개 + 모노그램"만 회사별로 받습니다.** 나머지 색(패널 틴트, 글자, 선)은 같은 색상(hue)에서 자동으로 만들고, 라운드·간격·글자 크기는 플랫폼 고정입니다. 저장할 때 대비(4.5:1)와 차트 팔레트 검사를 통과해야 적용됩니다. 티알테크놀러지는 홈페이지 로고의 네이비 #2D3C67, CRATA 기본값은 딥 틸 #0B6E69(가안)입니다.
7. **글꼴은 Pretendard 하나입니다.** npm `pretendard@1.3.9` 가변 글꼴 파일에 `tnum`(고정폭 숫자) 기능이 있는 것을 직접 확인했습니다. 표·축·금액 열은 고정폭 숫자, 화면당 1개인 큰 숫자는 비례 숫자로 씁니다.
8. **확인이 더 필요한 것:** 인스타그램 게시물 3건(로그인 필요로 열람 불가), 릴스에서 말한 "디자이너가 고른 스킬 3개"의 정확한 이름, CRATA 기존 CI 색 유무, 티알테크놀러지가 실제 쓰는 그룹웨어·현장 기기입니다(7장).

---

## 2. 사용자 레퍼런스 분석

### 2.1 오희컴퍼니 '스마트경리' SaaS 대시보드: 데스크톱

출처: [ohcp.tistory.com/51](https://ohcp.tistory.com/51) (오희컴퍼니, 2024-11-27). 시안 설명은 "심플함과 기능성의 조화"이고, 단조로움을 피하려고 "섹션별 위치와 구성에 변화"를 줬다고 적혀 있습니다.

**레이아웃 그리드 (1920×1600 캔버스 근사치)**

| 영역 | 위치·크기 | 관찰 |
|---|---|---|
| 왼쪽 메뉴 | x 0~290, 로고 50px 여백 | 선 아이콘 + 글자. 항목 간격 50px, 하위 항목 30px(점 불릿). 활성 항목만 브랜드색 |
| 콘텐츠 패널 | x 330~1430(약 1,100px), 위아래 25px 여백 | 아주 옅은 라벤더 틴트, 라운드 약 48px. 패널 자체가 하나의 큰 면 |
| 오른쪽 레일 | x 1510~1870(약 360px) | 프로필, 알림·설정·고정 아이콘, 추천 콘텐츠, 오늘의 공고 |
| 카드 | 2열(각 약 510px) + 하단 가로 전체 1장 | 카드 사이 약 60px. 히어로 카드는 패널 왼쪽 경계를 약 48px 넘어 튀어나옴(의도된 변화) |
| 카드 안쪽 여백 | 약 48px | 매우 넉넉함. 목록 행 높이 50~77px |

**타이포 스케일 (근사치)**

| 역할 | 크기·굵기 | 예 |
|---|---|---|
| 인사말 | 40px, 굵게(이름 줄은 브랜드색) | "안녕하세요. / 세무특공대님!" |
| 카드 제목 | 24px, 굵게 | "은행잔고", "이번달 현황" |
| 큰 숫자 | 28~32px, 굵게 + 단위 14px | "4,500,000원" |
| 본문·목록 | 16px | 은행명, 계정과목 |
| 보조·축 | 12~14px | 증감, 날짜, 축 눈금 |
| 검정 알약 라벨 | 16px, 굵게, 흰 글자 2줄 | "11월 / 현금현황" |

**색 역할**

| 역할 | 값(근사) | 쓰임 |
|---|---|---|
| 브랜드 | 보라 #5B3DF5 (OKLCH L 0.52 · C 0.255 · H 280) | 히어로 카드 채움, 활성 메뉴, 세그먼트 선택, 진한 막대, 배지 |
| 패널 | 라벤더 틴트 #EEF0FF 근사 | 콘텐츠 바탕 |
| 카드 | 흰색 + 넓고 옅은 보라 그림자 | 모든 카드 |
| 글자 | 거의 검정 / 회색 2단계 | 제목·본문 / 보조 |
| 증감 | 주황(+) / 파랑(−) | 금액 옆 증감 숫자 자체를 색칠 |
| 범주 | 분홍·파랑·초록·주황·회색·검정 6색 | 계정과목 누적 막대 |
| 상태 | 보라 알약 "모집중", 회색 알약 "모집마감", "D-1" 글자 | 공고 목록 |

**컴포넌트 목록:** 로고, 세로 메뉴(하위 항목 포함), 기관·사업자 선택 드롭다운 2개, 인사말 헤더, 검정 알약 섹션 라벨, 히어로 잔고 카드(원형 로고 + 이름 + 금액 + 증감), 히어로 안의 흰 상자 2개(나가야 할 비용 / 들어올 금액), 세그먼트(일간·주간·월간), 짝지은 얇은 세로 막대(전기 옅게·당기 진하게, 점선 격자), 손익 예측 요약(불릿 행), 카드사별 금액 목록, 얇은 가로 누적 막대 + 원형 아이콘 범주 2열 그리드(비율·금액), 오른쪽 레일의 태그 알약 + "+더보기" + 썸네일 목록, D-day + 상태 알약 목록, 바닥 저작권 표기.

### 2.2 같은 시안: 모바일 시트

- 화면 5장 + 전체 미리보기 1장입니다. **한 화면에 카드 1장**만 둡니다(현금현황, 이번 달 현황, 계정과목 분석 + 카드별 금액, 입출금 표, 추천 콘텐츠·공고).
- 상단 바: 로고 사각형 + 알림·설정·고정 + 더보기(⋮). 하단 탭 바: **선 아이콘 4개, 글자 라벨 없음**.
- 데스크톱 카드를 폭만 줄여 쌓았고, 라운드·여백·알약 라벨은 그대로입니다.
- 표 화면은 가로 스크롤 + "*좌우로 스크롤 하시면 내역을 확인하실 수 있습니다." 안내 + 숫자 페이지네이션입니다.

### 2.3 가져올 것 / 바꿀 것

| 시안 요소 | 판단 | CRATA에서는 | 근거 |
|---|---|---|---|
| 3단 배치(메뉴·패널·레일) | **가져옴** | 1440px 이상에서 3단, 그 아래는 레일을 본문 아래로 | NN/g 표준 인트라넷 배치 |
| 옅은 틴트 패널 + 흰 카드 | **가져옴** | 패널 틴트를 테넌트 브랜드 색상에서 자동 생성 | 면 대비로 구분, 그림자 불필요 |
| 히어로 카드 1장만 브랜드 단색 | **가져옴** | 화면당 1장. "오늘 할 일" 카드 | dataviz: 화면당 히어로 숫자 1개 |
| 검정 알약 라벨 | **가져옴, 조건부** | 알약이 곧 카드 제목(제목 위에 덧붙이지 않음). 주요 카드 3장 이하 | Impeccable "제목 위 라벨" 경고 |
| 큰 숫자 + 작은 단위 | **가져옴** | 숫자 옆 단위(건·%·분), 비교 기간을 글로 명시 | Few: 맥락 없는 숫자 금지 |
| 알약형 세그먼트 | **가져옴, 위치 변경** | 카드 안이 아니라 페이지 머리 한 줄(모든 카드에 같이 적용) | dataviz: 필터는 한 줄, 카드 안 금지 |
| 얇은 막대 | **가져옴** | 12~16px, 데이터 끝만 4px 라운드, 격자는 실선 1px | dataviz 마크 규격 |
| 보라 브랜드 | **바꿈** | 테넌트 색(티알 네이비, CRATA 틸) | 릴스·Impeccable "AI 색" |
| 넓은 보라 그림자·글로 | **바꿈** | 평상시 그림자 없음. 떠 있는 층에만 | Vercel "장식 그림자 금지" |
| 히어로 안의 흰 상자 2개 | **바꿈** | 히어로 안은 행 + 1px 구분선 | "카드 안 카드" |
| 라운드 40~48px | **바꿈** | 패널 28 / 카드 20 / 컨트롤 12 | Impeccable "과한 라운드" |
| 인사말 이름만 브랜드색, 손글씨 "환영합니다!" | **바꿈** | 인사말은 글자색 하나 | frontend-design "한 단어만 강조" |
| 증감 숫자를 주황·파랑으로 칠함 | **바꿈** | 글자는 검정 계열, 옆에 ▲▼ 아이콘 + "지난주보다 3건 줄었어요" | dataviz "글자는 데이터 색을 입지 않음" |
| 점선 격자 | **바꿈** | 실선 1px, 바탕보다 한 단계 진한 회색 | dataviz 안티패턴 |
| 하단 탭 아이콘만 | **바꿈** | 아이콘 + 글자 라벨 | Material 내비게이션 바, 접근성 |
| 썸네일 추천 콘텐츠 | **바꿈** | 필독 공지·오늘 일정·알림(썸네일 없음) | 업무사이트 목적 |

### 2.4 사용자 다이어그램: Refine CRM 예제 구조

다이어그램은 Refine 공식 CRM 예제의 구조입니다: **Refine → React 컴포넌트 → Ant Design → GraphQL API → TypeScript**, 그리고 React 컴포넌트 아래 **Dashboard / Sales Pipeline(→ Companies·Contacts·Quotes) / Scrum Board / Calendar**.

확인한 내용:
- 공식 템플릿 소개: Dashboard, Calendar, Scrumboard(칸반), Sales Pipeline, Companies, Contacts, Quotes, Administration(설정·역할·권한). Vite + Ant Design + Nestjs-query(GraphQL) + 자체 인증 공급자입니다([Refine 템플릿](https://refine.dev/core/templates/crm-application/)).
- 전체판 `app-crm`은 **Enterprise Edition으로 옮겨졌고**, 커뮤니티판은 `app-crm-minimal`로 남아 있습니다([app-crm README](https://github.com/refinedev/refine/tree/main/examples/app-crm)).
- `app-crm-minimal`의 라우트: `companies`, `dashboard`, `login`, `tasks`. 대시보드 위젯 폴더: `deals-chart`, `latest-activities`, `total-count-card`, `upcoming-events`([소스 트리](https://github.com/refinedev/refine/tree/main/examples/app-crm-minimal/src/routes/dashboard/components)). 기능: 로그인·가입·비밀번호 찾기, 대시보드(차트·실시간 활동·다가오는 일정), 회사 CRUD(검색·페이지), 칸반(마감일·설명·여러 담당자), 계정 설정, 반응형([README](https://github.com/refinedev/refine/tree/main/examples/app-crm-minimal)).

**CRATA로 옮기는 방법**

| Refine CRM | CRATA 워크사이트 | 모듈([00 문서](../research/00_direction.md) 5장) | 메모 |
|---|---|---|---|
| Dashboard: 건수 카드 | 홈: 내 업무·검토 대기·이번 주 회의 건수 | ②③④ | `total-count-card` 구조 재사용 |
| Dashboard: deals 차트 | 홈: 수정 학습 추이(같은 수정 재발률) | ④ | 얇은 막대, 지난 기간 회색 |
| Dashboard: 최근 활동 | 홈: 최근 결정·제출·승인 기록 | ③⑥ | |
| Dashboard: 다가오는 일정 | 홈 오른쪽 레일: 오늘 일정·다가오는 회의 | ② | |
| Sales Pipeline(단계별 칸반) / Scrum Board | 업무 보드: 할 일 → 진행 중 → 검토 대기 → 완료 | ③⑦ | AI는 '검토 대기'(제출)까지만, '완료'는 검토자만 |
| Companies | 회사 구조: 사업 → 프로젝트 → 파트 | ① | 고객사 목록이 아니라 회사 온톨로지 |
| Contacts | 구성원·역할(조직도) | ① | 티알: 대표이사 → 공장장 → 4개 팀(공개 조직도) |
| Quotes | 산출물(문서·양식)과 수정 기록 | ④ | 견적서도 산출물의 한 종류 |
| Calendar | 회의·일정 | ② | 회의 → 분류 → 결정·업무 |
| Administration | 설정: 권한, 연결(ARA MCP·메일), 테마 | ①⑤⑦ | |

**기술 메모(2026-10-02 npm 기준):** `@refinedev/core` 5.0.12, `@refinedev/antd` 6.0.3(peer `antd ^5.23.0`), `@refinedev/react-router` 2.0.4(peer `react-router ^7`). 예제는 GraphQL(nestjs-query)이지만 [00 문서](../research/00_direction.md)의 최소 스택은 Supabase이므로 데이터 공급자만 `@refinedev/supabase` 6.0.2로 바꾸면 됩니다. [Ant Design Pro](https://github.com/ant-design/ant-design-pro)는 README 기준 Ant Design 6 사양이라 코드를 섞지 않고, 대시보드 3종(분석·모니터·워크플레이스)과 목록·상세·결과·예외 페이지 패턴만 참고합니다.

### 2.5 인스타그램 레퍼런스 4건

| 링크 | 상태 | 내용 |
|---|---|---|
| 릴스 Dbsa_kDvH3D (aewon.studio) | 열람함 | "AI 특유의 밤티(싸구려 느낌)… 보라색 그래디언트, 어디서 본 폰트, 카드 안에 카드. AI가 만든 웹사이트가 다 비슷한 데는 이유가 있다. 디자이너가 직접 써보고 고른 스킬 3개." → 5장 체크리스트의 출발점 |
| 게시물 DdqK_j7k8Qt, Dd2-50Qk_qT, DdQhLR3jpdA | **열람 못 함**(로그인 필요) | 캡션이나 화면 캡처를 주시면 반영하겠습니다 |

릴스가 고른 "스킬 3개"의 이름은 영상 안에서만 보여 확인하지 못했습니다(미검증). 같은 문제를 다루는 대표 스킬은 5.1절에 정리했습니다.

### 2.6 첫 고객 홈페이지에서 읽은 시각 단서

출처: [티알테크놀러지 홈페이지](http://trtechnology.co.kr/) 공개 페이지(조직도, 비전, 공정·제품).
- 로고는 네이비(#2D3C67 근사) + 파랑, 사이트는 파랑·청록 계열입니다. 사진 배경, 그라데이션 원형 도식, 2010년대 기업 사이트 문법입니다.
- 워크사이트로 가져올 것은 **색과 어휘**뿐입니다. 네이비는 테넌트 브랜드 색으로, 공개된 조직 이름(총무/구매/경리팀, 개발팀, 영업/생산팀, 품질보증팀)과 품질 어휘(예: 비전의 "Single PPM 실현")는 메뉴·예시 데이터 라벨로 씁니다. 수치는 모두 **예시 데이터**로 표시합니다.
- 로고 이미지는 쓰지 않고 글자 모노그램 "TR"을 씁니다. 사이트의 그라데이션·사진 배경은 가져오지 않습니다.

---

## 3. 대시보드·업무사이트 설계 원칙

### 3.1 대시보드란 무엇인가

| 원칙 | 내용 | 출처 |
|---|---|---|
| 한 화면, 한눈에 | 대시보드는 "일에 필요한 가장 중요한 정보를 한 화면에 모아 즉시 상황을 파악하게 하는 표시"입니다. 스크롤·화면 전환 없이 동시에 봐야 합니다 | Stephen Few, *Information Dashboard Design* ([UXmatters 서평, 2007](https://www.uxmatters.com/mt/archives/2007/04/book-review-information-dashboard-design.php)) |
| 흔한 실수 13가지 | 한 화면 초과, 맥락 부족, 과한 정밀도, 부적절한 지표·차트, 의미 없는 다양성, 부정확한 인코딩, 나쁜 배치, 강조 실패, 쓸모없는 장식, 색 남용, 매력 없는 화면 | Few(2차 요약: [The Data School](https://www.thedataschool.co.uk/anh-vu/are-you-making-these-13-dashboard-design-mistakes/)) |
| 위치가 강조다 | 늘 중요한 정보는 왼쪽 위에 둡니다 | Few(UXmatters 서평) |
| 빨리 읽히는 형태 | 길이·위치(막대·선)가 면적·각도(파이·게이지)보다 정확합니다. 3D 금지, 색은 다른 단서를 보강하는 데만 씁니다. 색각 이상은 남성 약 8% | [NN/g, Laubheimer 2017](https://www.nngroup.com/articles/dashboards-preattentive/) |
| 요약 → 필터 → 상세 | 핵심 지표를 위쪽에, 모듈 합계는 5~9개로 제한합니다. "카드 하나에 주제 하나" 또는 관련 데이터는 한 카드에 두고 구분선으로 나눕니다 | [Ant Design 시각화 페이지](https://5x.ant.design/docs/spec/visualization-page) |
| 위계와 여백 | 중요한 데이터일수록 대비가 높고 면적이 큽니다. 차트끼리 간격·범례 위치를 통일합니다 | [Carbon 대시보드](https://carbondesignsystem.com/data-visualization/dashboards/) |
| 목적에 맞는 밀도 | 전략용은 소수의 장기 추세, 운영용은 넓은 지표 + 이상 변화 강조. 자주 보는 대시보드는 촘촘하게, 가끔 보는 것은 설명을 더합니다. 지표마다 "이번 주·지난주·최고·최저"를 함께 둡니다 | [Linear, 2025-10](https://linear.app/blog/dashboards-best-practices) |
| 개요 먼저, 상세는 천천히 | 탭으로 영역을 나누고 개요 탭으로 시작합니다. 목록 → 상세는 별도 경로와 이동 경로(breadcrumb), 생성·수정은 서랍(drawer)으로 엽니다 | [Stripe 전체 페이지 앱](https://docs.stripe.com/stripe-apps/patterns/full-page-apps) |

### 3.2 업무사이트(인트라넷) 원칙

| 원칙 | 내용 | 출처 |
|---|---|---|
| 배치는 같아도 된다 | 인트라넷은 같은 문제를 풀어서 배치가 수렴합니다(상단 바 + 왼쪽 메뉴 + 가운데 소식·위젯 + 오른쪽 상자). 차이는 업종별 기능, 정보 구조, 콘텐츠 전략, 색에서 납니다 | [NN/g, Nielsen 2005](https://www.nngroup.com/articles/the-canonical-intranet-homepage/) |
| 최근 수상작의 흐름 | AI 기능, 역할별 개인화, 하이브리드 근무 지원, 의도적인 접근성 설계, 자연어 검색, 모바일 앱 + 반응형 웹 | [NN/g Intranet Design Annual 2023](https://www.nngroup.com/reports/intranet-design-annual/) |
| 제품 메뉴는 사이드바, 공통 동작은 상단 | 검색·만들기 같은 전역 동작은 상단에, 제품별 이동은 사이드바에 둡니다. 즐겨찾기·최근 항목·숨기기·접기를 지원합니다. 신규 사용자에게는 점진적으로 보여줍니다 | [Atlassian 새 내비게이션](https://www.atlassian.com/blog/design/designing-atlassians-new-navigation) |
| 홈은 "오늘" | Today 위젯이 오늘 할 중요한 일을 모읍니다: 안 읽은 필독 게시글(최대 1개), 오늘 일정, 오늘 마감인 내 할 일(최대 2개), 오늘 마감 설문(최대 1개). 해당 항목이 있을 때만 보입니다. 위젯 표시·순서는 사용자가 정합니다 | [네이버웍스 위젯 도움말](https://help.worksmobile.com/ko/use-guides/home/mobile/widget/) |
| 홈 섹션은 사용자가 고친다 | 다가오는 일정, 최근, 즐겨찾기 등 섹션의 표시 개수·순서·숨김을 바꿀 수 있습니다 | [Notion Home 도움말](https://www.notion.com/help/home-and-my-tasks) |

### 3.3 목록·상세·빈 상태

| 원칙 | 내용 | 출처 |
|---|---|---|
| 표가 하는 일 4가지 | 조건에 맞는 행 찾기, 비교, 한 행 보기·수정, 여러 행에 동작. 첫 열은 사람이 읽는 이름, 머리 행 고정, 열 숨김·순서 변경, 한 행 수정은 **비모달 옆 패널**, 일괄 동작은 체크박스 + 표 위 버튼 | [NN/g, Laubheimer 2022](https://www.nngroup.com/articles/data-tables/) |
| 빈 상태 3가지 | 시스템 상태 알리기(로딩·없음·오류 구분), 그 자리에서 기능 알려주기, 바로 시작할 버튼 제공 | [NN/g, Kaplan 2021](https://www.nngroup.com/articles/empty-state-interface-design/) |
| 빈 상태 문구 | 제목은 행동 중심, 부담 주지 않기, 주 버튼 1개 | [Shopify Polaris](https://polaris.shopify.com/components/empty-state) |
| 모든 상태를 설계 | 빈·적음·많음·오류 상태를 모두 그립니다. 스피너·스켈레톤은 150~300ms 뒤에 띄우고 300~500ms 이상 유지해 깜빡임을 막습니다. 필터·탭·페이지는 URL에 남깁니다 | [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) |

### 3.4 접근성·한국어

| 원칙 | 내용 | 출처 |
|---|---|---|
| 대비 | 일반 글자 4.5:1, 큰 글자 3:1(AA). 고대비 모드 본문 15:1 | [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html), [KRDS 색상](https://www.krds.go.kr/html/site/style/style_02.html) |
| 색만으로 전달 금지 | 시스템 색(위험·경고·성공·정보)은 아이콘이나 글자와 함께 씁니다. 색 비율은 중립 60 : 보조 30 : 주요 10, 강조색은 5% 이하 | KRDS 색상 |
| 한국어 글꼴·크기 | KRDS 기본 글꼴은 Pretendard GOV. 공공 사이트 본문 최소 17px(그 외 글꼴 16px), 줄 간격 150% 이상, 굵기는 4단계 이하 | KRDS 타이포그래피 |
| 키보드·초점 | 모든 흐름이 키보드로 됩니다. 초점 링은 늘 보이게(`:focus-visible`). 시각 대상이 24px보다 작으면 누르는 영역을 24px 이상, 모바일은 44px 이상 | Vercel Web Interface Guidelines |
| 반응형 내비게이션 | 좁은 창은 하단 내비게이션 바, 중간 이상은 내비게이션 레일로 바꿉니다. 바는 목적지 2~5개, 레일은 3~7개 | [Android 적응형 내비게이션](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation), M3 사용 지침([SAP Fiori M3 요약](https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-bar/usage), 검색 요약) |
| UX 문구 | 모든 문구는 해요체. 능동형(~했어요), 긍정형, 과한 경어(~시겠어요) 빼기, 다이얼로그 왼쪽 버튼은 [닫기]. 탭 바 2~5개. 진입 시 앞을 막는 바텀시트 금지 | [앱인토스 UX 가이드](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.md), [토스 UX 라이터 인터뷰](https://toss.im/tossfeed/article/uxwriter-interview) |

### 3.5 차트 (dataviz 스킬 기준)

차트·숫자 타일은 Claude 내장 dataviz 스킬의 규칙을 따릅니다(참고 문서: components, marks-and-anatomy, anti-patterns, color-formula, palette, interaction).
- **형태 먼저:** 숫자 하나면 차트가 아니라 숫자 타일. 화면당 히어로 숫자 1개(48px 이상 권장, 같은 산세리프). 비교는 막대, 추세는 선, 비중은 누적 막대(도넛은 후순위), 7개 넘는 범주는 표.
- **마크 규격:** 막대 두께 24px 이하, 데이터 끝만 4px 라운드·기준선은 직각, 선 2px, 격자·축은 **실선 1px**(점선 금지), 붙은 막대·누적 조각 사이는 바탕색 2px 틈.
- **글자:** 범례는 계열 2개 이상일 때 항상. 값 라벨은 끝값·극값에만. **글자는 데이터 색을 입지 않습니다**(색은 옆의 점·선·견본이 담당).
- **숫자:** 큰 숫자는 비례 숫자, 열로 정렬되는 숫자(표·축)만 `tabular-nums`.
- **상호작용:** 툴팁은 보조일 뿐 값은 라벨이나 **"표로 보기"**로 항상 읽을 수 있게. 필터는 차트 위 한 줄, 카드 안에 넣지 않음. 다시 불러올 때는 이전 화면을 흐리게 유지(스켈레톤 깜빡임 금지).
- **색:** 범주 팔레트는 `validate_palette.js`로 검사한 값만 씁니다(6.6절에 결과). 상태색은 테마와 무관하게 고정하고 아이콘 + 글자와 함께 씁니다.

---

## 4. 제품별 참고 패턴

조회일 2026-10-02. 화면을 직접 써 보지는 않았고 공개 문서·도움말 기준입니다.

### 4.1 해외

| 제품 | 내비게이션 | 홈·대시보드 | 목록·상세·빈 상태 | 밀도·톤 | CRATA에 가져올 것 |
|---|---|---|---|---|---|
| [Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui) | 사이드바 + 상단의 'ㄱ자' 크롬. 사이드바·탭의 라벨·아이콘 정렬을 다듬어 잡음을 줄임 | 대시보드(Enterprise 플랜): 차트·표·단일 숫자. 운영용·전략용 구분, 지표마다 비교 맥락([모범 사례](https://linear.app/blog/dashboards-best-practices)) | (이번 조사 범위 밖) | 테마를 LCH 색공간의 **변수 3개(바탕·강조·대비)**로 생성, 크롬에 브랜드색을 덜 씀 | 테넌트 테마를 소수 씨앗 값에서 자동 생성. 크롬은 중립, 브랜드는 강조에만 |
| [Notion](https://www.notion.com/help/home-and-my-tasks) | 사이드바의 Home 탭 | Home 섹션: 다가오는 일정, 최근, 즐겨찾기, 팀스페이스 등. 섹션마다 표시 개수·이동·숨김 | My Tasks는 Home 아래 늘 고정 | 조용한 문서형 | 홈 위젯 표시·순서 편집(2단계), "내 업무"를 홈과 분리된 고정 진입점으로 |
| [Attio](https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace) | 사이드바: Home, 검색, 알림, Tasks, 즐겨찾기, Records, Lists. Cmd+K 명령 메뉴, 단축키 30개 이상 | Home: 회의·할 일 개요 | 레코드 페이지: 위쪽에 핵심 속성 최대 6개 위젯, 옆 사이드바에 상세·소속 목록([레코드](https://attio.com/help/reference/managing-your-data/records/create-and-view-records)) | 촘촘, 키보드 중심 | 상세 화면 = 위 핵심 속성 + 옆 정보 패널. 검색·명령 메뉴(Refine `kbar` 2.0.1) |
| [monday.com](https://monday.com/features/dashboards) | 보드 중심 | 대시보드 위젯: Chart, Numbers(합계), Battery(진행률), Gantt. 여러 보드를 한 대시보드로 | (범위 밖) | 색이 많고 활발함 | 진행률은 배터리 대신 얇은 미터(같은 색 단계 트랙). 색 수는 따라 하지 않음 |
| [Stripe 대시보드](https://support.stripe.com/questions/dashboard-home-page-charts-for-business-insights) | 사이드바 + 상단 검색 | Home: 위젯 추가·제거, 기간 선택 + **비교 기간**, 홈 차트는 "추정치"라고 명시 | 앱 패턴: 개요 탭 → DataTable(정렬·상태 열·행 클릭) → 상세(이동 경로 + 2열), 생성·수정은 FocusView 서랍. 빈 목록 메시지 + 동작 1개([패턴](https://docs.stripe.com/stripe-apps/patterns/full-page-apps)) | 정돈된 금융 톤 | 기간 + 비교 기간 한 줄, 개요 → 목록 → 상세 흐름, "예시 데이터"처럼 데이터 성격을 화면에 밝히기 |
| [Vercel 디자인 지침](https://vercel.com/design.md) | (범위 밖) | (범위 밖) | (범위 밖) | 장식 그라데이션·글로·블롭·유리 효과 금지. "선택·상호작용·경고·대비·진짜 묶음을 전할 때만 면이나 테두리를 쓴다." 묶음 안 간격 2~4단계, 묶음 사이 6~8단계. 12/6/4열 | 면·테두리 사용 규칙과 간격 규칙(6.7·6.9절) |
| [Ant Design Pro](https://github.com/ant-design/ant-design-pro) | ProLayout 사이드 메뉴, 테마 설정 서랍, 다국어 | 대시보드 3종: 분석·모니터·워크플레이스 | 목록(검색·표·기본·카드), 상세(기본·고급), 결과(성공·실패), 예외(403·404·500), 계정 | 정보 밀도 높은 관리자 톤 | 페이지 종류 목록을 뼈대 체크리스트로. 코드는 쓰지 않음(antd 6 기준) |

### 4.2 국내

| 제품 | 확인한 것 | CRATA에 가져올 것 | 주의·미검증 |
|---|---|---|---|
| 토스 / [앱인토스 UX 가이드](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.md) | 해요체 통일, 능동·긍정형, 과한 경어 제거, 다이얼로그 왼쪽 [닫기], 탭 바 2~5개, 막는 바텀시트 금지. TDS 핵심 컴포넌트: Top, ListRow(왼쪽·내용·오른쪽 영역), ListHeader, BottomCTA, Badge, Tab([TDS](https://developers-apps-in-toss.toss.im/design/components)). UX 라이팅의 "잡초 뽑기"(예: "이용하실 수 있습니다" → "이용할 수 있어요")([인터뷰](https://toss.im/tossfeed/article/uxwriter-interview)) | 문구 규칙 전체, ListRow 3영역 구조, 화면당 판단 하나 | TDS는 앱인토스 전용 라이선스라 컴포넌트는 쓰지 않고 원칙만 참고 |
| 토스페이먼츠 상점관리자 | 매출관리, 실시간 결제 내역, 현금영수증 등 결제~정산 관리([블로그 2024-08](https://www.tosspayments.com/blog/articles/29669)). 2026-07부터 토스 비즈니스 통합 계정 로그인([안내](https://www.tosspayments.com/blog/articles/49679)) | 여러 서비스를 계정 하나로 묶는 방식(테넌트 전환 UI 참고) | 대시보드 화면 구성은 공개 문서로 확인 못 함(미검증) |
| [flex](https://flex.team/) (HR) | 출퇴근 한 번 터치 기록, 휴가(반차·시간 단위) 신청·승인, 결재 문서·할 일 확인, 모바일에서 전 기능([App Store](https://apps.apple.com/app/id1535757707)). 홈페이지 메시지 "Relations Driven AX"(조회일 기준) | "한 번 터치" 수준의 짧은 행동, 모바일 동등성. flex도 AX를 내세우므로 경쟁 관찰 대상 | 홈 화면 배치는 확인 못 함(미검증) |
| 채널톡 | 오픈소스 디자인 시스템 Bezier([bezier-react](https://github.com/channel-io/bezier-react)). 2차 분석: 흰 바탕 + 아주 옅은 회색, 강조색 1개, 4px 기본 단위, 라운드 4·8·12·20, 테두리 대신 얕은 그림자, 64px 내비 레일([디자인 시스템 갤러리](https://www.oppadu.com/tools/design-systems-site/brand/channel-talk.html)) | 강조색 1개 규율, 라운드 위계 | 갤러리 수치는 2차 출처(미검증) |
| [네이버웍스](https://help.worksmobile.com/ko/use-guides/home/mobile/widget/) | 홈 위젯, Today(필독 1·오늘 일정·오늘 마감 할 일 2·설문 1, 항목 있을 때만 표시), 출퇴근 위젯, 위젯 표시·순서 설정 | **Today 묶음과 개수 상한**, "필독" 어휘, 비어 있으면 숨기기 | 고객이 네이버웍스를 쓰면 메일 API 연결 대상([00 문서](../research/00_direction.md) 4장) |
| 다우오피스 | 메일, 전자결재, 메신저, 캘린더, 게시판, 보고, 자료실, 설문, 예약 + HR(근태·휴가·급여 등)([다우오피스 4.0 앱](https://apps.apple.com/py/app/id6504329757), [기사](https://www.inews24.com/view/808466), 검색 요약) | 한국 직장인이 익숙한 메뉴 어휘(결재·게시판·보고·자료실) | 홈 포틀릿 구성은 확인 못 함(미검증) |
| 플로우 | 프로젝트 중심 협업: 게시물-댓글형 업무 공유, 할 일·일정, 외부 협력사 초대, 파일 보관([App Store](https://apps.apple.com/kr/app/id939143477)). ChatGPT·Claude 공식 앱([07 문서](../research/07_work-os-market.md)) | 프로젝트별 피드(회의·결정·업무가 프로젝트에 붙는 구조) | 화면 밀도·홈 구성 미검증 |

**한국 그룹웨어 사용자가 기대하는 것:** 왼쪽 메뉴, 알림 종, 조직도, 통합 검색, 그리고 "결재·필독·공지·할 일·일정" 같은 익숙한 단어입니다. CRATA는 결재·메일 앱을 만들지 않으므로([00 문서](../research/00_direction.md) 5장 "만들지 말 것"), 이 단어들은 **고객 도구로 가는 연결 진입점**으로만 씁니다.

---

## 5. 'AI 티' 피하기 체크리스트

### 5.1 AI 코딩 에이전트용 디자인 스킬 (2025~2026)

| 스킬 | 만든 곳 | 성격 | 핵심 규칙 | 출처 |
|---|---|---|---|---|
| frontend-design | Anthropic | 생성 전 디자인 방향 잡기 | 주제(업종·소재·어휘)에서 시각 선택을 끌어냄. 글꼴 1~2종을 의도적으로, 줄 길이 80자 미만. **피할 기본값:** 따뜻한 크림 + 세리프 + 테라코타, 검정 + 형광 강조, 신문형, 'SaaS 카드 키트'(똑같은 둥근 카드, 모든 것에 같은 라운드, 카드마다 같은 회색 그림자, 장식용 그라데이션), 모든 제목 위 대문자 라벨, 'A · B · C' 메타 문자열, 링크 끝 '→', 제목에서 한 단어만 강조, 섹션마다 페이드-업, 모든 카드에 호버 전환. "대담함은 한 곳에만", "끝내기 전에 장신구 하나 빼기" | [SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) |
| Impeccable | Paul Bakaus | frontend-design 확장 + 결정적 검출기 | 명령 24개(`audit`, `critique`, `polish`, `quieter` 등), `npx impeccable detect`로 소스·렌더링 검사. **슬롭 목록:** 보라 그라데이션·어두운 바탕 형광 청록, 그라데이션 글자, 한쪽 굵은 색 테두리, 유리 효과, 히어로 지표 템플릿, 똑같은 카드 그리드, 카드 안 카드, 과한 라운드, 제목 위 배지·라벨, 아이콘 타일 + 제목, 색 바탕 위 회색 글자, 크림·베이지 팔레트, 단조로운 간격, 깜빡이는 상태 점, 튀는 이징, 대시(—) 남용, 과장 문구 등 | [GitHub](https://github.com/pbakaus/impeccable), [슬롭 목록](https://impeccable.style/slop) |
| taste-skill | Leonxlnx | 다이얼 3개(디자인 변화폭·모션 강도·시각 밀도)로 조정 | "AI 슬롭은 풀 수 있는 공학 문제", 출력 전 점검 | [GitHub](https://github.com/Leonxlnx/taste-skill) |
| web-design-guidelines | Vercel | 생성기가 아니라 품질 검사 | Web Interface Guidelines(키보드, 초점, 폼, 로딩·빈 상태, URL 상태, 터치 영역, 대비)로 코드를 검사 | [agent-skills](https://github.com/vercel-labs/agent-skills), [가이드라인](https://github.com/vercel-labs/web-interface-guidelines) |

- 인기 지표(별 수·설치 수)는 출처마다 크게 달라서 적지 않았습니다(미검증). 2차 비교 글로는 [ruoqijin 2026-06](https://ruoqijin.com/blog/frontend-design-skills-ai-agents)이 있습니다.
- 릴스의 "스킬 3개"가 이 중 무엇인지는 확인하지 못했습니다(미검증).

### 5.2 체크리스트 (화면을 만들 때마다 확인)

**색**
- [ ] 보라·보라→파랑 그라데이션이 없다. 기본 브랜드색이 보라가 아니다(테넌트 실제 브랜드가 보라일 때만 예외, 그때도 단색).
- [ ] 글자·숫자·배경에 그라데이션이 없다. 글로·후광·스포트라이트가 없다.
- [ ] 브랜드색으로 면을 채우는 것은 히어로 카드 1장뿐이다. 나머지는 활성 메뉴, 주 버튼, 차트 강조 계열 같은 작은 요소에만 쓴다.
- [ ] 중립색은 브랜드 색상(hue)으로 아주 옅게 물들였다(순회색·순검정 대신).
- [ ] 색 바탕 위 글자는 흰색 또는 충분히 진한 색이다(색 바탕 위 회색 글자 금지).
- [ ] 상태색은 아이콘 + 글자와 함께 쓴다. 증감은 ▲▼ + 글로 쓴다.

**타이포**
- [ ] Pretendard 하나, 굵기는 400·600·700만 쓴다.
- [ ] 제목 안에서 한 단어만 색·굵기로 강조하지 않는다.
- [ ] 영문 대문자 라벨, 자간 넓힌 눈썹(eyebrow) 라벨을 쓰지 않는다.
- [ ] 본문 줄 간격 1.5 이상, 최소 글자 13px(보조 글자만).
- [ ] 자간을 -0.02em보다 좁히지 않는다.

**면·카드**
- [ ] 카드 안에 카드가 없다. 카드 안 구분은 1px 선이나 간격으로 한다.
- [ ] 라운드에 위계가 있다(패널 > 카드 > 컨트롤). 모든 것에 같은 라운드를 쓰지 않는다.
- [ ] 평상시 카드에 그림자가 없다. 테두리와 넓은 그림자를 한 카드에 같이 쓰지 않는다.
- [ ] 카드 한쪽에 굵은 색 띠가 없다. 유리 효과(blur)가 없다.
- [ ] 아이콘 타일을 제목 위에 얹지 않는다. 목록 앞 아이콘은 범주를 구분할 때만 쓴다.

**배치**
- [ ] 똑같은 카드 반복 그리드가 아니다. 중요한 것이 더 크고 위·왼쪽에 있다.
- [ ] 간격에 리듬이 있다(묶음 안 8~16px, 묶음 사이 24~32px, 섹션 사이 40px).
- [ ] 화면당 히어로 숫자는 1개다. "큰 숫자 + 작은 라벨 + 보조 숫자 3개" 템플릿을 장식으로 쓰지 않는다.
- [ ] 검정 알약 라벨은 카드 제목 자체이고, 한 화면에 3개 이하다.

**모션**
- [ ] 섹션마다 페이드-업 등장 효과가 없다. 모든 카드에 호버 애니메이션이 없다.
- [ ] 튀는(bounce·elastic) 이징이 없다. 상태 점이 깜빡이지 않는다.
- [ ] `prefers-reduced-motion`을 지킨다. 움직임은 사용자 동작의 결과를 보여줄 때만 쓴다.

**데이터 표시**
- [ ] 격자선은 실선 1px이고, 파이·3D·이중 축이 없다.
- [ ] 데이터 색으로 글자를 칠하지 않는다. 범례(2계열 이상)와 "표로 보기"가 있다.
- [ ] 예시 데이터에는 "예시 데이터" 표시가 늘 보인다.

**글**
- [ ] UI 안내는 해요체, 라벨은 명사형이다. 버튼은 일어날 일을 말한다("승인하기", "반려하기").
- [ ] 과장 문구("혁신적인", "차원이 다른")와 대시(—) 남용이 없다.
- [ ] 빈 상태는 "무엇이 없고, 무엇을 하면 되는지"를 말한다. 오류는 사과하지 않고 원인과 해결을 말한다.
- [ ] 이모지를 아이콘으로 쓰지 않는다(선 아이콘만).

### 5.3 레퍼런스와 규칙이 부딪히는 곳: 결정

| 레퍼런스·요청 | 부딪히는 규칙 | 결정 |
|---|---|---|
| 큰 숫자 + 작은 단위(시안, 사용자 요청) | Impeccable "히어로 지표 템플릿" | 숫자가 그 카드의 일일 때만. 화면당 히어로 1개, 비교 기간을 글로 붙이고 그라데이션 강조 없음 |
| 검정 알약 섹션 라벨 | Impeccable "제목 위 라벨·배지" | 알약 = 카드 제목. 제목을 따로 또 쓰지 않음. 주요 카드 3장 이하 |
| 카드 안 세그먼트(일간·주간·월간) | dataviz "카드 안 필터 금지" | 페이지 머리에 한 줄로 두고 모든 카드에 적용 |
| 라운드 40~48px | Impeccable "과한 라운드" | 패널 28 / 카드 20 / 컨트롤 12 |
| Pretendard(요청) | frontend-design·Impeccable "Inter 같은 흔한 글꼴" | Pretendard 라틴 글자는 Inter 기반이라 영문이 많은 화면은 흔해 보일 수 있음. 한글 라벨을 우선하고, 개성은 글꼴이 아니라 색·숫자 처리·배치로 냄. 한국 업무 도구에서는 익숙함이 장점 |
| 숫자는 고정폭(요청) | dataviz "큰 단독 숫자는 비례 숫자" | 표·축·정렬되는 금액 열은 `tabular-nums`, 히어로·타일 숫자는 비례 |
| 원형 아이콘 목록(시안 계정과목) | Impeccable "아이콘 타일" | 범주를 구분하는 목록 앞 아이콘만 허용. 제목 위 장식 타일 금지 |
| 오른쪽 레일 "추천 콘텐츠" 썸네일 | 업무사이트 목적 | 필독 공지·오늘 일정·알림으로 교체 |

### 5.4 검사 방법

1. 화면 PR마다 5.2 체크리스트를 리뷰 항목으로 붙입니다.
2. 차트 팔레트를 바꾸면 `validate_palette.js`를 다시 돌립니다(6.6절).
3. Playwright로 데스크톱(1440)·태블릿(1024)·모바일(390) 스크린샷을 찍어 리뷰합니다. 접근성은 axe 같은 자동 검사 + 키보드만으로 한 바퀴 돌기.
4. Impeccable `detect` CLI는 보조 검사로 시험해 볼 만합니다. 아직 이 저장소에서 실행해 보지 않았습니다(미검증).

---

## 6. CRATA 워크사이트 디자인 방향

### 6.1 화면 골격

```
데스크톱(1440 이상)
+-----------+---------------------------------------------+------------+
| 왼쪽 메뉴   | 머리: 인사말 / 기간 [이번 주|이번 달] / 예시 데이터 | 알림 · 프로필 |
| 240px     +-----------------------+---------------------+ 320px      |
| [TR] 회사명 | [히어로·브랜드 단색]      | 이번 주 검토 현황        | 필독 공지(1) |
| 홈         | 오늘 할 일              | 숫자 + 얇은 막대         | 오늘 일정    |
| 내 업무     +-----------------------+---------------------+ 다가오는 회의 |
| 회의        | 검토 대기 표 (가로 전체)                        |            |
| 문서·양식   +-----------------------+---------------------+            |
| 지식        | 수정 학습 추이           | 최근 결정·활동          |            |
| 회사        +-----------------------+---------------------+            |
| ---------  |                                              |            |
| ARA(나만)   |                                              |            |
| 연결·설정   |                                              |            |
+-----------+---------------------------------------------+------------+

모바일(767 이하)
+--------------------------+
| [TR] 회사명     알림 더보기  |  상단 바 56px
+--------------------------+
| 인사말 · 예시 데이터         |
| [이번 주|이번 달]           |
| [히어로] 오늘 할 일          |
| 오늘 (필독·일정)             |  ← 데스크톱 오른쪽 레일이 여기로
| 검토 대기 (목록 행)          |
| 수정 학습 추이               |
+--------------------------+
| 홈  내 업무  회의  ARA  전체 |  하단 탭 64px + 안전 영역
+--------------------------+
```

### 6.2 레이아웃 그리드

| 구간 | 폭 | 메뉴 | 콘텐츠 | 오른쪽 레일 |
|---|---|---|---|---|
| 넓은 데스크톱 | 1440 이상 | 펼친 사이드바 240px(접으면 72px) | 패널 안쪽 여백 32, 12열·간격 24 | 320px |
| 데스크톱 | 1280~1439 | 240px | 12열·간격 24 | 본문 아래로 내림 |
| 태블릿 | 768~1279 | 아이콘 + 글자 레일 72~80px | 8열·간격 20, 패널 여백 24 | 본문 아래 |
| 모바일 | 767 이하 | 하단 탭 바(5개) + 상단 바 | 1열, 좌우 여백 16, 카드 간격 16 | 홈 "오늘" 섹션 |

- 패널은 화면에 꽉 차지 않게 위·오른쪽·아래 16px 띄워 둥근 면으로 둡니다(시안의 "패널 위의 카드" 인상 유지).
- 콘텐츠 최대 폭은 패널 안 1,200px. 본문 문단은 한 줄 80자 미만.
- 카드는 12열 기준 6+6, 4+8, 12 조합으로 크기에 위계를 줍니다(똑같은 카드 반복 금지).

### 6.3 내비게이션 구조(공통 메뉴 초안)

| 메뉴 | 내용 | 모듈 | 비고 |
|---|---|---|---|
| 홈 | 오늘 할 일, 검토 대기, 이번 주 회의, 수정 학습 추이 | 공통 | |
| 내 업무 | 내 업무 목록·보드, 검토 요청(검토자) | ③⑦ | Refine 칸반 구조 |
| 회의 | 회의 목록, 분류 확인, 결정·업무 연결 | ② | |
| 문서·양식 | 회사 양식, 산출물, 수정 기록·규칙 | ④ | |
| 지식 | 결정 이력, 용어집, 자료 연결 | ⑥ | 지식 엔진은 만들지 않음, 연결만 |
| 회사 | 사업·프로젝트·파트, 조직·역할, 업무 배분 기준 | ① | Company DNA Profile 화면 |
| ARA | 나만 보는 진단·일하는 방식 카드·코칭 | ⑧ | 구분선 아래, 자물쇠 아이콘 + "나만 보여요". 회사 화면과 섞지 않음 |
| 연결·설정 | ARA 연결(MCP), 메일 연결, 권한, 테마 | ⑤⑦ | 관리자 전용 항목은 권한 따라 숨김 |

- 최상위 7개 이하(내비게이션 레일 3~7개 지침). 상단(데스크톱 오른쪽 위)에는 검색·알림·프로필 같은 전역 동작만 둡니다(Atlassian).
- 회사 전환 셀렉트(시안의 "기관 선택/사업자 선택")는 **CRATA 운영자·여러 회사 소속자에게만** 보입니다.
- 회사마다 메뉴 이름을 바꿀 수 있는 것은 라벨뿐입니다(예: "회의" → "주간회의"). 순서와 구조는 플랫폼 고정입니다. 회사별 공통 항목의 상세 목록은 별도 문서에서 정합니다.

### 6.4 홈 구성 (우선순위 순)

| 순서 | 블록 | 형태 | 데이터 | 빈 상태 문구(예) |
|---|---|---|---|---|
| 1 | 오늘 할 일(히어로) | 브랜드 단색 카드, 히어로 숫자 1개 + 행 3개(내 업무·오늘 마감·검토 요청), 주 버튼 "내 업무 보기" | ③ | "오늘 할 일이 없어요. 이번 주 업무를 미리 볼까요?" |
| 2 | 이번 주 검토 현황 | 숫자 + 지난주 대비 ▲▼ 글 + 얇은 막대(요일별) | ③④ | "아직 검토한 문서가 없어요" |
| 3 | 검토 대기 | 표(문서명·요청자·제출 시각·상태). 행 클릭 → 옆 서랍에서 승인·반려 | ③⑦ | "검토할 문서가 없어요" |
| 4 | 수정 학습 추이 | 지난 8주 "같은 수정 재발률" 막대. 이번 주만 강조색, 나머지 회색 + "표로 보기" | ④ | "수정 기록이 쌓이면 여기에 보여요" |
| 5 | 최근 결정·활동 | 목록 행(누가·무엇을·언제) | ②⑥ | |
| 레일 | 오늘 | 필독 공지(최대 1), 오늘 일정, 다가오는 회의(최대 3). 항목이 없으면 블록 숨김 | ② | |

- 지표 이름은 [08 문서](../research/08_correction-learning.md)의 KPI(같은 수정 재발률, 검토 시간, 1차 통과율)를 씁니다.
- 예시 데이터는 페이지 머리의 고정 배지 + 각 카드 제목 줄의 작은 배지로 표시합니다. 사람 이름은 가상 인물(예: 홍길동, 성춘향)만 씁니다.
- 위젯 표시·순서를 사용자가 바꾸는 기능은 2단계로 미룹니다(Notion·네이버웍스 방식).

### 6.5 타이포 스케일

글꼴: `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif` (npm `pretendard` 1.3.9, 가변·다이내믹 서브셋, SIL OFL).

| 토큰 | 데스크톱 | 모바일 | 굵기 | 쓰임 |
|---|---|---|---|---|
| `figure-hero` | 48/56 | 40/48 | 700 | 화면당 1개 큰 숫자. 비례 숫자. 단위는 20/600 |
| `title-page` | 28/38 | 22/30 | 700 | 인사말, 페이지 제목 |
| `title-card` | 18/26 | 17/24 | 700 | 카드 제목 |
| `figure` | 28/36 | 24/32 | 700 | 카드 숫자. 단위 15/600, `ink-2` |
| `pill` | 14/20 | 14/20 | 700 | 검정 알약 라벨(1줄) |
| `body` | 16/24 | 16/24 | 400 | 본문, 목록 |
| `body-strong` | 16/24 | 16/24 | 600 | 목록 제목, 강조 |
| `label` | 14/22 | 14/22 | 600 | 버튼, 탭, 표 머리 |
| `table` | 14/22 | 14/22 | 400 | 표 본문. `tabular-nums` |
| `caption` | 13/20 | 13/20 | 400 | 보조 설명, 축 눈금(`tabular-nums`), 시각 |

- 자간: 제목 -0.01em, 본문 0. 줄 간격은 본문 150% 이상(KRDS).
- 본문 16px은 업무 도구 밀도를 고려한 값으로, KRDS 공공 기준(Pretendard GOV 17px)보다 1px 작습니다. 공공 고객 테넌트는 `density: public`으로 17px을 씁니다.
- 숫자 표기: 천 단위 쉼표, 단위는 한글(건·회·분·%·원), 날짜는 "10월 2일(목)", 최근 시각은 "3분 전".

### 6.6 색 역할

**테넌트 씨앗 값과 자동 생성 값** (모든 대비는 직접 계산, WCAG 대비비)

| 역할 | 티알테크놀러지 | CRATA 기본(가안) | 규칙·대비 |
|---|---|---|---|
| `brand` (씨앗) | #2D3C67 네이비(로고 색 근사) | #0B6E69 딥 틸 | 흰 글자 대비 10.75 / 6.09 |
| `brand-soft` | #E7EDFB | #DFF1EF | 브랜드 글자 대비 9.16 / 5.21. 활성 메뉴 바탕, 정보 배지 |
| `panel` | #F3F5FB | #EFF7F6 | OKLCH L 0.97, C 0.008, 브랜드 색상 |
| `surface`(카드) | #FFFFFF | #FFFFFF | 패널 대비 1.09(면 구분은 장식, 의미 전달은 안 함) |
| `line` | #E2E6EF | #DEE9E8 | 구분선, 격자 |
| `control-line` | #8A92A5 | #7E9896 | 입력칸 테두리. 흰 바탕 대비 3.12 / 3.08(비텍스트 3:1) |
| `ink` | #1B1E25 | #16201F | 본문. 패널 대비 15.3 |
| `ink-2` | #434853 | #3C4B4A | 보조 글자, 단위. 패널 대비 8.4 |
| `ink-3` | #616776 | #586C6A | 가장 옅은 글자(축·시각). 패널 대비 5.19 / 5.12 |
| `pill` | `ink` 바탕 + 흰 글자 | 같음 | 16.7:1 |
| `focus` | `brand` 2px + 2px 간격. 브랜드 바탕 위에서는 흰색 | 같음 | |
| `chart-accent` (씨앗) | #3A5BA8 | #00897B | 아래 팔레트 검사 통과 값 |
| `chart-muted` | #C6CAD5 | #C0CECC | 지난 기간, 강조하지 않는 계열(OKLCH L 0.84). 강조색과 대비 3.95 / 2.66. 흰 바탕 대비 1.6이라 **이번 기간 값 라벨 + "표로 보기" 필수** |

- 중립색은 `brand`의 색상(hue)을 그대로 두고 OKLCH 밝기·채도만 정해서 만듭니다(패널 L 0.970·C 0.008, 선 L 0.925·C 0.012, 글자 L 0.235·C 0.015 등). Linear가 변수 3개로 테마를 만드는 방식과 같은 생각입니다.
- CRATA 틸은 보라가 아니고, 티알 네이비와 겹치지 않고, 성공 초록(OKLCH 색상 약 143°)과 떨어진 색상(약 189°)이라 골랐습니다. CRATA에 기존 CI 색이 있으면 그 값으로 바꿉니다(7장).

**상태색(고정, 테마와 무관, 늘 아이콘 + 글자와 함께)**

| 상태 | 점·아이콘 | 배지 바탕 / 글자 | 글자 대비 | 예 |
|---|---|---|---|---|
| 성공 | #0CA30C | #E7F5E7 / #0B6B0B | 5.96 | 승인됨 |
| 경고 | #FAB219 | #FEF3D6 / #7A5300 | 6.20 | 마감 임박 |
| 위험 | #D03B3B | #FBE8E8 / #A82727 | 5.97 | 반려됨, 기한 지남 |
| 정보 | `brand` | `brand-soft` / `brand` | 9.16(티알) | 검토 대기 |

점·아이콘 색은 dataviz 고정 상태 팔레트 값입니다. 경고 노랑은 흰 바탕 대비가 낮아 **글자로 쓰지 않습니다.**

**차트 범주 팔레트 검사 결과** (`validate_palette.js`, 라이트 모드, 카드 바탕 #FFFFFF, 2026-10-02 실행)

| 팔레트 | 인접 검사(막대·선·누적) | 전체 쌍 검사(산점·지도·소형 다중, 앞 3개) | 결정 |
|---|---|---|---|
| 티알: #3A5BA8 + 기본 2~8번(#eb6834, #1baf7a, #eda100, #e87ba4, #008300, #4a3aa7, #e34948) | 통과. 밝기 띠·채도·색각 ΔE 9.1·일반 시각 ΔE 19.6 | 통과(ΔE 9.2 / 27.6) | 그대로 사용 |
| CRATA: #00897B + 기본 2~8번 | 통과 | **실패**: 3번 #1baf7a와 일반 시각 ΔE 11.9(기준 15) | 인접형 차트만 1번 슬롯 #00897B. 산점·지도·소형 다중은 기본 1번 #2a78d6 |
| 참고: 브랜드 그대로(#2D3C67, #0B6E69) | 실패: 밝기 띠 밖 / 채도 0.08 미만 | | 브랜드와 차트 강조색을 분리하는 이유 |

- 모든 팔레트에서 #1baf7a·#eda100·#e87ba4는 흰 바탕 대비 3:1 미만(WARN)이라, 이 색을 쓰는 차트는 **값 라벨이나 "표로 보기"가 필수**입니다.
- 기본 형태는 단일 계열(`chart-accent`) + 강조(이번 기간만 강조색, 나머지 `chart-muted`)입니다. 범주 색은 계열이 진짜 주제일 때만 씁니다.

### 6.7 간격

- 기본 단위 4px. 단계: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- 컨트롤 안쪽 8~12, 묶음 안 8~16, 카드 안쪽 여백 24(모바일 20), 카드 사이 24(모바일 16), 섹션 사이 40, 패널 안쪽 32(태블릿 24, 모바일 16).
- 목록 행 높이: 기본 56, 촘촘 44(`density: compact`). 터치 영역은 모바일 44 이상.

### 6.8 라운드

| 대상 | 값 |
|---|---|
| 콘텐츠 패널 | 28 |
| 카드·히어로 카드·바텀시트 위쪽 | 20 |
| 버튼·세그먼트 바깥·드롭다운 | 12 |
| 입력칸 | 10 |
| 작은 칩·툴팁 | 8 |
| 알약(라벨·배지·세그먼트 항목) | 999 |
| 막대 데이터 끝 | 4(기준선 쪽은 0) |

### 6.9 그림자·경계

- 평상시 카드: **그림자 없음, 테두리 없음.** 흰 카드와 틴트 패널의 면 차이로 구분합니다.
- 떠 있는 층만 그림자: 드롭다운·팝오버 `0 8px 24px rgba(ink, 0.12)` + 1px `line`, 모달·바텀시트 `0 16px 48px rgba(ink, 0.18)`.
- 스크롤하면 고정 머리에 아래 1px `line`만 생깁니다.
- 클릭할 수 있는 행·카드만 호버 시 바탕이 `brand-soft`로 바뀝니다(애니메이션 없음 또는 120ms 이하).
- 고대비 모드(2단계, KRDS 참고): 카드에 1px `control-line` 테두리, `ink-3` → `ink-2`.

### 6.10 컴포넌트 목록

| 컴포넌트 | 쓰임 | 기반 | 규칙 |
|---|---|---|---|
| `AppShell` | 메뉴·패널·레일 3단 | antd `Layout` | 구간별 6.2절 규칙 |
| `SideNav` | 왼쪽 메뉴 | antd `Menu` + `@ant-design/icons` Outlined | 선 아이콘 + 글자, `aria-current="page"`, 접기 |
| `NavRail` / `BottomTabBar` | 태블릿 / 모바일 | 직접 구현 | 아이콘 + 글자 라벨, 5개 이하 |
| `TopBar` | 모바일 상단 | 직접 구현 | 모노그램 + 회사명 + 알림 + 더보기 |
| `PageHeader` | 인사말, 기간, 예시 데이터 | 직접 구현 | 기간 세그먼트는 여기 한 곳 |
| `TenantMonogram` | 회사 표시 | 직접 구현 | 글자 2자, `brand` 바탕 흰 글자, 라운드 12 |
| `TenantSwitcher` | 회사 전환 | antd `Select` | 운영자·다중 소속자만 |
| `PillLabel` | 카드 제목 알약 | 직접 구현 | 1줄, 화면당 3개 이하 |
| `Card` / `HeroCard` | 묶음 | antd `Card` 토큰 덮어쓰기 | 안에 카드 금지. 히어로는 화면당 1장 |
| `StatValue` | 숫자 + 단위 + 증감 | 직접 구현 | 증감은 ▲▼ + 글, 비교 기간 명시 |
| `Segmented` | 기간 등 선택 | antd `Segmented` | 알약형, 페이지 머리 |
| `ThinBarChart` / `ShareBar` / `Meter` | 추이 / 비중 / 진행률 | SVG 직접 구현 | dataviz 마크 규격, "표로 보기" 토글 |
| `DataTable` | 목록 | antd `Table` | 첫 열 사람이 읽는 이름, 머리 고정, 숫자 열 `tabular-nums` 오른쪽 정렬, 상태 열 아이콘 + 글자 |
| `DetailDrawer` | 행 상세·검토 | antd `Drawer` | 표가 보이게 옆에서 열기, 승인·반려 버튼 |
| `TaskBoard` | 업무 칸반 | Refine CRM 구조 참고 | 열: 할 일·진행 중·검토 대기·완료. '완료'로 옮기기는 검토자만 |
| `ListRow` | 목록 행 | 직접 구현 | 왼쪽(범주 아이콘, 선택) · 내용 · 오른쪽(값·상태) |
| `StatusBadge` | 상태 | 직접 구현 | 고정 상태색 + 아이콘 + 글자 |
| `DdayBadge` | 마감 | 직접 구현 | "D-1", "오늘 마감" |
| `EmptyState` | 빈 상태 | 직접 구현 | 상태 설명 + 주 버튼 1개, 그림 없음 |
| `DemoBadge` | 예시 데이터 표시 | 직접 구현 | 테두리 알약 "예시 데이터", 설명 "실제 데이터가 아니에요" |
| `PrivateZone` | ARA 개인 영역 틀 | 직접 구현 | 자물쇠 아이콘 + "나만 보여요", 별도 경로 |
| `CommandMenu` | 검색·명령 | `@refinedev/kbar` 2.0.1 | Cmd/Ctrl+K |
| `SkipLink` | 본문 바로가기 | 직접 구현 | 첫 Tab에서 보임 |
| `Toast` / `Dialog` | 알림 / 확인 | antd `message` / `Modal` | 해요체, 왼쪽 버튼 [닫기] |
| `BottomSheet` | 모바일 필터·상세 | antd `Drawer` placement bottom | 진입 시 자동으로 띄우지 않음 |

### 6.11 모바일 패턴

- 데스크톱 카드를 쌓되, 한 화면에 판단 하나가 되도록 홈은 "오늘 할 일 → 오늘 → 검토 대기 → 추이" 순서로 둡니다.
- 하단 탭 5개(홈·내 업무·회의·ARA·전체), 아이콘 + 글자. 나머지 메뉴는 "전체"에 둡니다.
- 표는 모바일에서 `ListRow` 목록으로 바꿉니다. 꼭 표가 필요하면 첫 열 고정 + 가로 스크롤 + 안내 문구를 둡니다.
- 필터·상세·승인은 바텀시트로 엽니다. 검토 승인 같은 확정 동작은 바텀시트 아래 고정 버튼(BottomCTA)으로 둡니다.
- 생산 현장에서 장갑·태블릿을 쓸 수 있으므로 터치 영역 44px 이상, 주요 버튼 48px을 권장합니다(티알 현장 기기는 확인 필요).

### 6.12 테넌트별 테마 방식

**원칙:** 회사별로 받는 것은 씨앗 값뿐입니다. 라운드·간격·글자 크기·컴포넌트 모양은 플랫폼 고정입니다. 회사마다 새로 개발하지 않는다는 [00 문서](../research/00_direction.md)의 원칙을 디자인에도 적용합니다.

```yaml
# clients/tr-technology/company_profile.yaml 의 L1(정체성·비주얼) 일부 — 예시
identity:
  display_name: "티알테크놀러지"
  monogram: "TR"            # 로고 이미지 대신 글자 모노그램
theme:
  brand: "#2D3C67"          # 공개 홈페이지 로고 색(근사)
  chart_accent: "#3A5BA8"   # brand와 같은 색상, 팔레트 검사 통과 값
  density: comfortable      # comfortable | compact | public(본문 17px)
  # 라운드·간격·타이포는 받지 않음(플랫폼 고정)
```

**적용 흐름**
1. 진단 단계에서 공개 홈페이지 색을 뽑아 후보를 만듭니다(Firecrawl branding·Dembrandt, [01 시장 지도](../research/01_market-map.md) 2.9절). 사람이 확인해 확정합니다.
2. 저장할 때 자동 검사를 통과해야 적용됩니다.
   - `brand` 바탕 흰 글자 4.5:1 이상. 안 되면 히어로 카드 글자를 `ink`로 바꾸거나 더 어두운 단계를 씁니다.
   - `brand`를 글자로 쓸 때 흰 바탕 4.5:1 이상. 안 되면 글자용 `brand-text` 단계를 따로 만듭니다.
   - `chart_accent`는 `validate_palette.js` 인접 검사 통과. 전체 쌍 검사에 실패하면 산점·지도형 차트는 기본 1번 색을 씁니다.
   - `brand` 색상이 상태색(성공 초록·위험 빨강·경고 노랑)과 가까우면 경고를 띄웁니다. 상태 표시는 어차피 아이콘 + 글자를 함께 씁니다.
3. 파생 값(`brand-soft`, `panel`, `line`, `ink` 1~3, `chart-muted`)은 OKLCH로 자동 계산해 CSS 변수로 냅니다: `:root[data-tenant="tr-technology"] { --brand: #2D3C67; ... }`.
4. antd에는 `ConfigProvider`의 씨앗 토큰만 넘깁니다: `colorPrimary = brand`, `fontFamily = Pretendard`, `borderRadius = 12`, 컴포넌트별 덮어쓰기(Card 20 등). `cssVar`를 켜서 CSS 변수와 맞춥니다([antd 테마](https://5x.ant.design/docs/react/customize-theme)).
5. 다크 모드는 1단계에서 하지 않습니다. 토큰은 역할 이름으로만 쓰게 해 두어 나중에 값만 바꾸면 되게 합니다.

### 6.13 접근성 기본값

- 대비: 글자 4.5:1, 입력칸 테두리·초점 링·차트 마크 3:1(6.6절 값으로 확인).
- 키보드: `SkipLink` → 메뉴 → 본문 순서, 메뉴는 Tab·화살표로 이동, 서랍·모달은 초점 가두기와 닫으면 원래 자리로 복귀.
- 초점 링: `:focus-visible`에 2px `brand` + 2px 간격. 브랜드 바탕 위에서는 흰색.
- 상태·증감: 색 + 아이콘 + 글자. 차트: 범례 + "표로 보기".
- `lang="ko"`, 200% 확대 시 가로 스크롤 없이 재배치, `prefers-reduced-motion` 존중.

---

## 7. 남은 확인 사항

1. **인스타그램 게시물 3건**(DdqK_j7k8Qt, Dd2-50Qk_qT, DdQhLR3jpdA): 로그인 벽으로 못 봤습니다. 캡션이나 캡처를 주시면 반영하겠습니다.
2. **릴스의 "스킬 3개" 이름**: 영상 안 정보라 확인하지 못했습니다(미검증). 지금은 frontend-design + Impeccable + Vercel 가이드라인 조합을 기준으로 삼았습니다.
3. **CRATA 브랜드 색**: 기존 CI가 있는지 확인이 필요합니다. 없으면 딥 틸 #0B6E69을 가안으로 씁니다.
4. **티알테크놀러지 현장 정보**: 쓰는 그룹웨어·메일, ERP/MES 여부, 현장 직원의 기기(PC·태블릿·휴대폰 비중)는 진단에서 확인합니다. 결과에 따라 모바일 우선 범위와 터치 크기를 조정합니다.
5. **홈 위젯 편집 허용 시점**: 1단계는 고정 배치, 2단계에서 표시·순서 편집을 열지 정합니다.
6. **Pretendard의 라틴 글자(Inter 기반)**: 영문이 많은 화면에서 흔해 보일 수 있습니다. 한글 우선 라벨로 충분한지 시안 단계에서 다시 봅니다.

---

## 8. 출처

**사용자 레퍼런스**
- 오희컴퍼니, 스마트 경리 SaaS 대시보드 UI/UX 디자인(2024-11-27): https://ohcp.tistory.com/51
- Refine CRM 템플릿: https://refine.dev/core/templates/crm-application/
- Refine `app-crm` README(Enterprise Edition 이전 안내): https://github.com/refinedev/refine/tree/main/examples/app-crm
- Refine `app-crm-minimal`(라우트·대시보드 위젯): https://github.com/refinedev/refine/tree/main/examples/app-crm-minimal
- (주)티알테크놀러지 홈페이지: http://trtechnology.co.kr/

**설계 원칙**
- Stephen Few 서평(UXmatters, 2007): https://www.uxmatters.com/mt/archives/2007/04/book-review-information-dashboard-design.php
- Few 13가지 실수 요약(2차): https://www.thedataschool.co.uk/anh-vu/are-you-making-these-13-dashboard-design-mistakes/
- NN/g, Dashboards: Making Charts and Graphs Easier to Understand(2017): https://www.nngroup.com/articles/dashboards-preattentive/
- NN/g, The Canonical Intranet Homepage(2005): https://www.nngroup.com/articles/the-canonical-intranet-homepage/
- NN/g, Intranet Design Annual(2023): https://www.nngroup.com/reports/intranet-design-annual/
- NN/g, Data Tables: Four Major User Tasks(2022): https://www.nngroup.com/articles/data-tables/
- NN/g, Designing Empty States in Complex Applications(2021): https://www.nngroup.com/articles/empty-state-interface-design/
- Ant Design 레이아웃: https://ant.design/docs/spec/layout
- Ant Design 시각화 페이지: https://5x.ant.design/docs/spec/visualization-page
- Ant Design v5 테마: https://5x.ant.design/docs/react/customize-theme
- Ant Design Pro: https://github.com/ant-design/ant-design-pro
- Carbon 대시보드: https://carbondesignsystem.com/data-visualization/dashboards/
- Atlassian 새 내비게이션: https://www.atlassian.com/blog/design/designing-atlassians-new-navigation
- Shopify Polaris Empty state: https://polaris.shopify.com/components/empty-state
- Android 적응형 내비게이션: https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation
- SAP Fiori(M3 내비게이션 바 사용 지침, 검색 요약): https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-bar/usage
- KRDS 타이포그래피: https://www.krds.go.kr/html/site/style/style_03.html
- KRDS 색상: https://www.krds.go.kr/html/site/style/style_02.html
- Vercel Web Interface Guidelines: https://github.com/vercel-labs/web-interface-guidelines
- Vercel 디자인 지침(design.md): https://vercel.com/design.md

**제품**
- Linear UI 재설계: https://linear.app/blog/how-we-redesigned-the-linear-ui
- Linear 대시보드 모범 사례(2025-10-07): https://linear.app/blog/dashboards-best-practices
- Notion Home: https://www.notion.com/help/home-and-my-tasks
- Attio 내비게이션: https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace
- Attio 레코드: https://attio.com/help/reference/managing-your-data/records/create-and-view-records
- monday.com 대시보드: https://monday.com/features/dashboards
- Stripe 홈 차트: https://support.stripe.com/questions/dashboard-home-page-charts-for-business-insights
- Stripe 전체 페이지 앱 패턴: https://docs.stripe.com/stripe-apps/patterns/full-page-apps
- 앱인토스 UX 가이드: https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.md
- 앱인토스 TDS 컴포넌트: https://developers-apps-in-toss.toss.im/design/components
- 토스 UX 라이터 인터뷰: https://toss.im/tossfeed/article/uxwriter-interview
- 토스페이먼츠 상점관리자 이용 시작하기(2024-08-26): https://www.tosspayments.com/blog/articles/29669
- 토스페이먼츠 토스 비즈니스 계정 통합: https://www.tosspayments.com/blog/articles/49679
- flex 홈페이지: https://flex.team/
- flex App Store: https://apps.apple.com/app/id1535757707
- 채널톡 bezier-react: https://github.com/channel-io/bezier-react
- 채널톡 디자인 시스템 분석(2차): https://www.oppadu.com/tools/design-systems-site/brand/channel-talk.html
- 네이버웍스 위젯: https://help.worksmobile.com/ko/use-guides/home/mobile/widget/
- 다우오피스 4.0 App Store: https://apps.apple.com/py/app/id6504329757
- 다우오피스 관련 기사: https://www.inews24.com/view/808466
- 플로우 App Store: https://apps.apple.com/kr/app/id939143477

**'AI 티' 관련 스킬**
- Anthropic frontend-design: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- Impeccable: https://github.com/pbakaus/impeccable
- Impeccable 슬롭 목록: https://impeccable.style/slop
- taste-skill: https://github.com/Leonxlnx/taste-skill
- Vercel agent-skills: https://github.com/vercel-labs/agent-skills
- 스킬 비교(2차, 2026-06): https://ruoqijin.com/blog/frontend-design-skills-ai-agents

**직접 확인**
- Pretendard: https://github.com/orioncactus/pretendard. npm `pretendard@1.3.9`의 `PretendardVariable.ttf` GSUB 기능 목록에서 `tnum`, `pnum`, `zero`, `case`, `ss01`~`ss16` 등을 확인했습니다(2026-10-02).
- 색 대비·OKLCH 값, 차트 팔레트 검사: Claude 내장 dataviz 스킬의 `validate_palette.js`로 계산했습니다(2026-10-02).
