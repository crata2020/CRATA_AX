# ARA 임직원 복지 패키지 조사

> 기준일 2026-10-01 · [00 방향 정리](./00_direction.md)의 모듈 ⑧(직원 복지 ARA)에 대한 보강 조사
>
> **표기**
> - ✅ 원문(1차) 확인
> - 🔎 원문이 차단되어 검색 색인이나 2차 기사로만 확인
> - ⚠️ 미검증이거나 해석(법률 자문 필요)
>
> 이 문서는 법률 자문이 아닙니다.

## 핵심 결론

1. **글로벌 표준은 "개인 데이터는 비공개, 고용주는 임계치 이상 집계만"입니다.**
   - Unmind는 활성 사용자가 6명 미만이면 데이터를 표시하지 않습니다.
   - Viva Insights는 최소 그룹을 5명 아래로 낮출 수 없습니다.
   - BetterUp, CoachHub, Headspace는 AI 대화를 고용주에게 보여주지 않습니다.
2. **가격은 작은 회사엔 인당 연 고정가, 큰 회사엔 PEPM(인당 월) 견적입니다.**
   - 공개된 단가는 Wysa $50/인/년(200명 이하)과 MBTIonline Teams $99.95/인 정도뿐입니다.
   - 국내는 정액 구독(다인 넛지케어)이고 단가를 공개하지 않습니다.
3. **국내 EAP는 상담사 연결, 위기 개입, 기업 리포트가 중심입니다.**
   - AI는 위험군 탐지나 감정 측정을 보조하는 단계에 머뭅니다.
   - 성향 진단에 기반한 협업 코칭과 동료 공유 카드는 아직 아무도 차지하지 않은 자리입니다.
   - 다만 300인 미만 기업은 정부 무료 EAP(연 7회)와 겹칩니다.
4. **법적 핵심은 세 가지입니다.** 그래서 데이터를 분리하는 것 자체가 규제 대응입니다.
   - 상담 대화 속 건강 정보는 민감정보라서 별도 동의가 필요합니다(개인정보 보호법 제23조).
   - 생성형 AI를 쓴다는 사실을 미리 고지해야 합니다(AI 기본법 제31조).
   - 인사평가에 쓰면 고영향 AI가 될 수 있습니다(AI 기본법 제2조 제4호 사목).
5. **권장안**
   - AX 사이트에는 라이트 버전(진단, 카드)을 기본 포함하고, 무제한 코칭과 상담 연결은 유료 애드온으로 둡니다.
   - 집계 리포트는 최소 10명 이상, 주제는 대분류만 보여줍니다.
   - 카드는 문장 단위로 공개 여부를 고르게 합니다.
   - 위기 신호가 보이면 109·119로 바로 안내합니다.

## 1. 글로벌 플레이어

| 서비스 | 국가 | 형태 | 기업 판매 방식 | 고용주가 보는 정보 | 출처 |
|---|---|---|---|---|---|
| Wysa for Teams | 인도 창업·글로벌 ⚠️ | AI 챗봇(CBT 기반) | $50/인/년, 200명 이하, 직원별 코드 구매 ✅. 익명 사내 스크리닝 도구 'Mental Health Barometer' 제공 | 익명 집계 인사이트 🔎 | [wysa](https://www.wysa.com/for-teams), [fitgap](https://us.fitgap.com/products/061204/wysa) |
| Lyra Health (AI guide) | 미국 | EAP, 치료, 코칭, AI guide(2025.10 파일럿, 2026 확대) | PEPM 견적. Lyra Select는 고정 PEPM, 연 6회 또는 12회, 500인 미만 ✅ | HR용 트렌드 분석과 선제 권고(Lyra Connect). 임계치는 미공개 | [Lyra](https://www.lyrahealth.com/announcement/lyra-health-scales-clinically-vetted-ai-guide-to-members-globally/), [Select](https://lyrahealth.com/partners/paretohealth/), [BW](https://www.businesswire.com/news/home/20251014882130/en/Lyra-Health-Introduces-First-Clinical-Grade-AI-for-Mental-Health) |
| Spring Health | 미국 | 정신건강 의료 + EAP | 견적 | 등록, 검사, 세션 여부를 고용주가 알 수 없음. 집계만 제공(예: "15% 이용") 🔎 | [support](https://careteam.springhealth.com/hc/en-us/articles/24232901859860-Protected-Health-Information-PHI-and-Workplace-Confidentiality) |
| Modern Health | 미국 | 코칭·치료 + AI 'Skye' | 견적 | 익명 집계 인사이트 ✅ | [MH](https://www.modernhealth.com/ai-v2-0) |
| Headspace (Ebb) | 미국 | 명상, 코칭·치료, AI 동반자 Ebb | 기업 계약(2,000개사 이상, 800만 명 대상) 🔎 | 대화는 암호화되어 고용주에게 가지 않음. 개인 단위 이용 여부도 비공개 ✅ | [blog](https://organizations.headspace.com/blog/how-hr-leaders-can-support-employees-with-an-ai-powered-mental-health-companion), [BW](https://www.businesswire.com/news/home/20250521958749/en) |
| Calm Health | 미국 | 명상·임상 프로그램 | 견적(가격 미공개) | partner 포털에서 프로그램 성과 확인 ✅ | [calm](https://health.calm.com/) |
| Unmind (Nova) | 영국 | 웰빙 플랫폼 + AI 코치 Nova | 견적 | **활성 6명 미만이면 비표시.** Nova 활성률, 세션 수, 주제 대분류(생활·건강·업무) ✅ | [analytics](https://support.unmind.com/en/articles/680191-a-guide-to-the-unmind-analytics-suite), [employer](https://support.unmind.com/en/articles/680263-what-can-my-employer-see-keeping-your-information-confidential) |
| BetterUp Grow | 미국 | AI 코칭(2025.1 출시), 필요하면 사람 코치로 넘김 | 견적 | 개별 대화 비공개, 임계치를 넘을 때만 집계. 외부 모델 학습 금지 ✅ | [trust](https://www.betterup.com/en-us/trust-and-security), [BW](https://www.businesswire.com/news/home/20250121963707/en/BetterUp-Launches-AICoaching-Bridging-Human-Expertise-and-AI) |
| CoachHub AIMY | 독일 | AI 코치(2024, 애드온) | 기존 코칭 고객에게 애드온 | 대화는 HR에 비공개. 익명 집계(만족도, 반복 주제) ✅ | [AIMY](https://www.coachhub.com/aimy), [SHRM](https://vendordirectory.shrm.org/company/912136/news/3436387/coachhub-launches-pioneering-ai-coaching-companion-to-elevate-employee-experience) |
| Sonder | 호주 | EAP·안전 지원 | 견적 | 숫자와 트렌드만 🔎 | [sonder](https://sonder.io/eap-hub/are-employee-assistance-programs-confidential/) |
| ifeel | 스페인 | 치료 + 셀프케어 | 견적 | 익명 집계 리포트 🔎(2차) | [Nauta](https://www.nautacapital.com/news-insights/ifeel-raises-10meu-to-support-companies-caring-for-their-employees-mental-health) |
| MS Viva Insights | 미국 | 협업 패턴 분석(웰빙 포함) | M365 라이선스 | 개인 인사이트는 본인만 봄. 관리자는 최소 팀·그룹 5명 이상 집계만(5명 아래로 설정 불가) ✅ | [MS Learn](https://learn.microsoft.com/en-us/viva/insights/advanced/setup-maint/manager-settings) |

**2025~2026 규제 이벤트**
- **유타 HB 452 (2025-03-25):** AI라는 사실을 고지해야 하고 데이터 판매를 금지합니다. [Sidley](https://www.sidley.com/-/media/uploads/20250325-utah-hb-452-ai-applications-relating-to-mental-health-enacted.pdf?la=en)
- **네바다 AB 406 (2025-06 서명):** AI가 정신건강 케어를 제공하거나 그렇다고 표방하는 것을 금지합니다. 위반 시 최대 $15,000. 🔎 [WSGR](https://www.wsgrdataadvisor.com/2025/10/legal-framework-for-ai-in-mental-healthcare/)
- **일리노이 WOPR Act (2025-08, PA 104-0054):** AI가 치료적 결정이나 치료적 소통을 하는 것을 금지합니다. 위반 1건당 최대 $10,000. 종교 상담, 동료 지원, 치료를 표방하지 않는 자기계발 자료는 예외입니다. 법안 번호와 서명일은 출처마다 달라 ⚠️. [Nixon Peabody](https://www.nixonpeabody.com/insights/alerts/2025/08/12/illinois-enacts-prohibition-against-ai-therapy)
- **캘리포니아 SB 243 (2025-10-13):** 컴패니언 챗봇은 AI임을 고지하고, 자살·자해 표현이 나오면 위기기관을 안내하는 프로토콜을 공개해야 합니다. 2027-07부터 연례 보고 의무가 생깁니다. 업무·생산성용 봇은 제외됩니다. [leginfo](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB243)
- **FDA 디지털헬스 자문위원회 (2025-11-06):** 생성형 AI 정신건강 기기 중 허가받은 것은 아직 없습니다. 사람에게 넘기는 경로와 라벨링을 권고했습니다. [Orrick](https://www.orrick.com/en/insights/2025/11/fdas-digital-health-advisory-committee-considers-generative-ai-therapy-chatbots-for-depression)
- **EU AI Act 5(1)(f) (2025-02-02 발효):** 직장에서 생체정보로 감정을 추론하는 것을 금지합니다. [FPF](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/)

## 2. 국내 플레이어

| 서비스(운영사) | 형태 | 판매·과금 | 고용주가 보는 정보 | 출처 |
|---|---|---|---|---|
| 넛지EAP·넛지케어 (다인, 넛지헬스케어. 트로스트 통합) | 대면·비대면 상담, 5분 내 '바로상담', 긴급위기개입, 조직진단, 챌린지 | 넛지케어: 임직원 수와 범위에 따른 **정액 구독**, 주 1회까지 회기 제한 없음 | **실시간 이용통계와 위기사례 진행 현황** ✅. 넛지케어 대시보드는 개인을 식별할 수 없는 집계(조직 위험도) | [nudgeeap](https://nudgeeap.com/), [벤처스퀘어](https://www.venturesquare.net/1108850/), [아시아경제](https://core.asiae.co.kr/article/2025082615301889039), [trost](https://www.trost.co.kr/) |
| 마인드카페 + 밝음 (아토머스) | 앱 상담·검사, 오프라인 센터, EAP 500개 이상 기관, AI 감정분석·위험군 탐지, 블라인드 제휴 | 견적 | 조직진단·위험군 리포트. 공개 범위 ⚠️ | [밝음 인수](https://www.unicornfactory.co.kr/article/2025112810353978053), [블라인드](https://www.unicornfactory.co.kr/article/2025061708494415550) |
| 베네피아 EAP (SK엠앤서비스) | 선택적 복지 플랫폼 안의 EAP. 얼굴·목소리 AI 마음측정(FAV), 비대면 상담, MBTI 검사 | 복지 플랫폼 연계. **부산시교육청 도입** | 미공개 ⚠️ | [이코노미스트](https://economist.co.kr/article/view/ecn202608060011) |
| 이지웰마인드 '상담포유' (현대이지웰) | 복지몰 연계 상담 | 복지포인트 ⚠️(2015년 기사, 현행 여부 미확인) | ⚠️ | [이투데이](https://www.etoday.co.kr/news/view/1116952) |
| 근로복지공단 EAP | 300인 미만 기업 근로자, **무료 연 7회 × 50분**, 대면·전화·화상·채팅 | 공공(위탁 운영. 다인이 2025년 약 1.5만 회기 수행) | 비밀보장 | [korea.kr](https://www.korea.kr/news/reporterView.do?newsId=148939638), [아시아경제](https://core.asiae.co.kr/article/2025121809224273028) |
| 정신건강 심리상담 바우처 (보건복지부, 구 전국민 마음투자) | 8회. 회당 1급 상담사 8만 원, 2급 7만 원 기준. 본인부담 0~50% | 공공 | 해당 없음 | [복지부](https://www.mohw.go.kr/menu.es?mid=a10706040800) |

- 시장 규모: EAP를 쓰는 기업은 약 2,900곳입니다. 도입률은 1천인 이상 63.3%, 300~500인 22%입니다. [지디넷/다음](https://v.daum.net/v/20250917090539623)
- 자살예방 상담전화는 2024년 1월 **109**로 통합됐습니다. [더나은미래](https://www.futurechosun.com/archives/81377)

## 3. 업무 성향 공유 기능 사례

| 사례 | 공유 방식 | ARA에 주는 교훈 |
|---|---|---|
| Everything DiSC Catalyst | 'Share with colleagues'를 끄면 동료가 나를 검색하거나 비교할 수 없음. **관리자에게는 계속 보임** 🔎 [DiSC](https://discprofile.com/help/catalyst/privacy) | 관리자가 무엇을 보는지도 직원에게 명시해야 합니다. |
| Insights Discovery for Teams | 프로필 **문장마다 Personal/Public 체크**, 아예 숨기기 가능. 특정인에게만 공개하는 기능은 없음 ✅ [Insights](https://support.insights.com/microsoft-teams) | ARA는 문장 단위 선택에 공개 범위(팀, 특정 동료)를 더하면 차별점이 됩니다. |
| CliftonStrengths (Gallup Access) | 이메일로 공유, 보고서별로 선택, 언제든 철회 🔎 [Gallup](https://support.gallup.com/hc/en-us/articles/40582283580819-I-want-to-share-my-strengths-with-someone-on-Gallup-Access) | 철회 버튼을 기본으로 둡니다. |
| MBTIonline Teams | 3명 이상 팀 포털에서 비교, $99.95/인. 윤리 지침: 자발적 참여, 결과는 본인 소유, 채용·선발 사용 금지 ✅ [MBTI](https://www.mbtionline.com/en-US/For-your-team), [윤리](https://www.myersbriggs.org/unique-features-of-myers-briggs/ethical-use-of-the-mbti/) | 인사 목적 사용 금지를 계약 조항에 넣는 근거가 됩니다. |
| Atlassian 'My User Manual' | 일하는 방식, 소통·피드백 선호를 공유. "원치 않는 것은 공유를 강요받지 않고, 불리하게 쓰이지 않는다" ✅ [Atlassian](https://www.atlassian.com/team-playbook/plays/my-user-manual) | 카드 템플릿을 설계할 때 직접 참고할 만합니다. |
| Birkman | 평소 행동 / **욕구(Underlying Needs)** / 스트레스 행동을 구분. 한국어 지원 🔎 [Birkman](https://birkman.com/llms.txt) | '내게 필요한 지원' 항목의 개념 근거가 됩니다. |
| Crystal Knows | 공개 데이터로 성격을 **추정**, 빼려면 직접 요청해야 함(opt-out) 🔎 [Capterra](https://www.capterra.co.nz/software/159657/crystal) | 추정 프로필은 금지하고, 본인 응답과 본인 선택(opt-in)만 씁니다. |
| 태니지먼트 | 강점 진단, 2022년 퓨처플레이 인수. 팀 공유 기능 세부는 미확인 ⚠️ [MTN](https://news.mtn.co.kr/news-detail/2022022116043249530) | — |

## 4. 국내 법·개인정보 제약

- **민감정보**
  - 건강 정보는 민감정보입니다. "다른 개인정보 처리 동의와 별도로" 동의를 받고 안전성 확보 조치를 해야 합니다(개인정보 보호법 제23조, 2026-09-11 시행본) ✅ [casenote](https://casenote.kr/법령/개인정보_보호법/제23조).
  - 상담 대화에 우울, 수면, 자해 같은 내용이 나오면 민감정보로 다뤄야 합니다.
  - 성향 진단 결과만 있다면 일반 개인정보로 볼 여지가 있습니다 ⚠️.
- **누가 처리 주체인가**
  - 회사가 개인정보처리자이고 CRATA가 수탁자인 구조라면, 회사가 데이터 열람을 요구할 법적 근거가 생길 수 있습니다.
  - 그래서 ARA 개인 영역은 CRATA가 직원에게 직접 동의를 받는 독립 처리자 구조가 맞는지 법률 검토가 필요합니다 ⚠️.
- **감시 우려**
  - 노사협의회 협의 사항에 '근로자의 복지증진'(근로자참여법 제20조 제1항 제13호)과 '근로자 감시 설비의 설치'(같은 항 제14호)가 들어 있습니다 ✅ [casenote](https://casenote.kr/법령/근로자참여및협력증진에관한법률/제20조).
  - 2023년 개인정보위·노동부 가이드라인도 디지털 장치를 도입할 때 목적을 설명하고 의견을 듣도록 했습니다 [바이라인](https://byline.network/2023/01/0131_02/).
- **인사평가 연계 금지**
  - 채용 등 '권리·의무에 중대한 영향을 미치는 판단 또는 평가'는 고영향 AI에 해당합니다(AI 기본법 제2조 제4호 사목). 의료기기도 고영향 AI입니다(같은 호 라목) ✅ [casenote](https://casenote.kr/법령/인공지능_발전과_신뢰_기반_조성_등에_관한_기본법/제2조).
  - 완전히 자동화된 결정에 대해서는 거부권도 있습니다(개인정보 보호법 제37조의2) ✅ [casenote](https://casenote.kr/법령/개인정보_보호법/제37조의2).
- **AI 고지**
  - 생성형 AI 기반이라는 사실을 미리 고지하고 결과물에 표시해야 합니다(AI 기본법 제31조, 2026-01-22 시행) ✅ [casenote](https://casenote.kr/법령/인공지능_발전과_신뢰_기반_조성_등에_관한_기본법/제31조).
  - 과태료는 최대 3천만 원이고, 계도기간이 1년 이상입니다 [세종](https://shinkim.com/kor/media/newsletter/3114).
- **의료 표현**
  - 의료인이 아니면 의료행위를 할 수 없습니다(의료법 제27조) ✅ [casenote](https://casenote.kr/법령/의료법/제27조).
  - 의협은 '심리상담'과 '심리치료'의 경계가 흐려지는 것을 문제 삼아 왔습니다 [메디게이트](https://medigatenews.com/news/1852006198).
  - 식약처 판단기준상 질병의 진단·치료가 목적이면 의료기기, 일상 건강관리가 목적이면 웰니스 제품입니다 [메디팜헬스](https://www.medipharmhealth.co.kr/news/article.html?no=114137).
  - 심리상담사 국가자격 법제화는 통과 여부를 확인하지 못했습니다 ⚠️.

## 5. ARA 복지 패키지 권장안

**1. 패키징**
- **기본 포함 (AX 사이트 전 좌석):** 4유형 진단, 결과 해설, '일하는 방식 카드', ARA 라이트(월 사용량 제한). 협업 도구로도 정당화됩니다.
- **복지 애드온 (좌석 단위, 연 단위):** 무제한 코칭, 고민 정리, 어려운 대화 롤플레이, 사람 상담 연결.
- **가격 앵커:** $50~100/인/년(Wysa, MBTI Teams)을 참고하되, 최종 가격은 CRATA가 정합니다.
- **300인 미만 고객:** 공공 EAP와 바우처를 '다음 단계'로 안내하는 브리지로 설계합니다. 경쟁이 아니라 보완입니다.

**2. 고용주 리포트**
- 보여주는 것: 활성 좌석 수, 진단 완료율, 카드 공유율, 주제 대분류 4~5개(Unmind 방식), 만족도.
- 최소 인원은 **10명**을 권합니다(해석). 해외 사례는 5~6명이지만, 한국 소규모 팀에서는 역추적 위험이 커서 높이는 것이 좋습니다. 월 단위 이상으로만 집계하고, 인원이 적은 칸은 숨깁니다.
- 보여주지 않는 것: 개인별 이용 여부, 원점수, 대화와 요약, 개인 위험 점수나 감정 추정.

**3. 데이터 분리 구조**
- ARA 개인 영역은 회사 업무 데이터(등급 L0~L2)와 **완전히 다른 구역**으로 둡니다. [00 문서](./00_direction.md)의 'P 영역'이고, [04 문서](./04_data-governance.md)의 L3(학생 식별·상담 내용)와 같은 수준의 민감정보로 취급합니다.
  - 별도 DB와 직원별 암호화 키를 씁니다.
  - 회사 지식검색(RAG) 인덱싱과 관리자 계정 접근을 막습니다.
  - CRATA 회의 파이프라인(GOAL A)과 고객 진단(GOAL B)에는 절대 들어가지 않습니다.
- 공유 계층에는 직원이 고른 카드 문장 사본만 복사하고, 원점수는 넘기지 않습니다.
- 집계 계층은 배치로 계산하고 임계치를 적용한 뒤에만 대시보드에 올립니다.
- 모델 학습 금지를 명문화합니다.
- 고객사 계약에 인사평가·채용·배치 사용 금지와 개인 데이터 열람 요구 금지를 넣습니다.

**4. 동의 흐름**
- 순서: AI 고지(제31조) → 개인정보 수집·이용 동의 → 민감정보 별도 동의 → '회사가 보는 것 / 못 보는 것' 화면(Unmind 방식).
- 카드: 기본값은 비공개입니다. 문장을 고르고, 범위를 정하고(팀, 특정 동료, 전사), 미리 본 뒤 공개하며, 언제든 철회할 수 있습니다. 관리자에게 보이는지도 함께 적습니다.
- 도입할 때 노사협의회 안건으로 올리고 직원 설명회를 엽니다.

**5. 위기 대응**
- 자살·자해·타해 신호가 보이면 대화를 끊지 않고 **109(24시간)·119** 안내 카드를 띄우고 사람 상담 연결을 제안합니다. 넛지EAP도 사이트 하단에 109·119를 표기합니다.
- 프로토콜 문서는 공개하고(SB 243 참고) 임상 자문을 받습니다.
- 국내 EAP는 '위기사례 진행 현황'을 기업에 보고합니다. ARA는 이와 달리 **본인 동의 없이 신원을 통보하지 않는 것**을 기본으로 하고, 생명이 위급한 경우의 예외 조건만 약관에 명시합니다 ⚠️ 법률 검토가 필요합니다.

**6. 피할 표현**
- 쓰지 말 것: 치료, 진단(질병 의미), 우울 개선, 심리치료, AI 상담사, 임상 검증(근거 없을 때), "위험 직원을 HR에 알림".
- 대신 쓸 것: 성향 프로파일, 자기이해 코칭, 고민 정리, 협업 가이드, 전문 상담 연결.

**7. 국내 EAP 대비 차별점**
- 별도 앱이 아니라 업무 사이트 안에 늘 있어서 일상 접점이 생깁니다. 기존 EAP 참여율이 5% 수준이라는 업계 주장이 있습니다 [nudgeeap](https://nudgeeap.com/).
- 아픈 사람용이 아니라 전 직원이 쓰는 성향 기반 협업 도구입니다.
- EAP, 공공 EAP, 바우처로 안내하는 '입구' 역할을 하므로 기존 EAP와 제휴할 수 있습니다.
- 주의: 부산 공공 시장에는 이미 베네피아가 들어가 있습니다.

## 조사 한계

- 웹 검색 한도 때문에 다음 항목은 확인하지 못했습니다.
  - 트로스트·마인드카페의 단가와 리포트 세부
  - 16Personalities Teams
  - 태니지먼트 기능
  - Calm 단가
- DiSC·Gallup·Spring Health 원문은 차단되어 🔎로 표시했습니다.
