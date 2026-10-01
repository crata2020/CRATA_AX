# 수정 학습 루프: "고친 내용이 쌓여 다음 결과가 좋아지는" 구조 조사

> 기준일 2026-10-01 · [00 방향 정리](./00_direction.md)의 모듈 ④(산출물·수정 학습)에 대한 보강 조사
> 공개 문서로 확인한 내용만 적었습니다. 확인하지 못한 항목은 (미검증)으로 표시했습니다.

## 1. 핵심 결론

1. 공개 문서로 확인한 범위에서는 "직원 수정 → 범위 분류 → 승인 → 조직 규칙화 → 효과 측정"을 한 흐름으로 제공하는 문서·PPT 서비스를 찾지 못했습니다. 대부분은 둘 중 하나입니다.
   - 관리자가 직접 넣는 규칙: 브랜드킷, 스타일가이드, 템플릿 지시문
   - 개인 단위의 자동 메모리: ChatGPT, Claude, M365 Copilot Memory
2. 템플릿 단위(①)는 이미 상용화돼 있습니다(Copilot Brand Kit의 Strict 모드, Templafy, Beautiful.ai 잠금). 새로 만들기보다 기존 도구와 연결하면 됩니다.
3. **비어 있는 곳은 두 가지이고, 여기가 CRATA의 차별점입니다.**
   - ② 재사용 작성 규칙: 수정 기록에서 규칙 후보를 자동으로 뽑아 승인받는 흐름
   - ③ 고객사별·일회성 수정: 따로 묶어 관리하는 일
4. 연구 근거가 있습니다.
   - CIPHER·PROSE: 미세조정 없이 "수정 → 선호를 문장으로 추론"하는 방식으로 편집거리를 줄였습니다.
   - 규칙 축적: ExpeL·ACE를 참고합니다.
   - 만료 설계: GitHub Copilot Memory(근거 검증, 28일간 안 쓰면 삭제)를 참고합니다.
5. 승인된 규칙은 세 가지 자산으로 바꿔 둡니다.
   - ⓐ 템플릿 파일
   - ⓑ Agent Skill(SKILL.md, Claude와 OpenAI가 함께 쓰는 공개 표준)
   - ⓒ 자동 검사 규칙

   효과는 기준선 대비 "정규화 편집거리, 동일 수정 재발률, 검토시간"으로 증명합니다.

## 2. 이미 하는 곳

| 서비스 | 국가 | 수정 학습 방식 | 범위 구분 | 승인 단계 | 시사점 | 출처 |
|---|---|---|---|---|---|---|
| M365 Copilot in PowerPoint (Brand Kit, Strict, Notes Steering) | 미국 | 수정을 자동 학습한다는 언급 없음. 템플릿 샘플 슬라이드와 발표자 노트의 지시문을 읽어 생성. 2026-09-14 Brand Kit·Skills 발표 | 조직(Brand Kit) | 브랜드 매니저만 변경 가능, 최종 사용자는 무시할 수 없음 | ① 템플릿 단위 자산의 모범 형태 | [설정](https://support.microsoft.com/en-gb/powerpoint/copilot/manage-brand-kit-template-settings-in-powerpoint), [온브랜드](https://support.microsoft.com/en-US/PowerPoint/copilot/keep-your-presentation-on-brand-with-copilot), [RCP](https://rcpmag.com/articles/2026/09/21/copilot-in-powerpoint-gets-new-tools.aspx) |
| M365 Copilot Memory·사용자 지정 지침 | 미국 | 채팅에서 선호를 자동 저장 | 개인. 관리자는 켜기/끄기만 | 없음. Purview 보존 정책이 메모리에 적용되지 않음 | 개인 메모리는 조직 규칙이 아님 | [MS Learn](https://learn.microsoft.com/en-us/microsoft-365/copilot/copilot-personalization-memory) |
| M365 Copilot Tuning | 미국 | 조직 문서 예시로 컨텍스트·도구·모델 튜닝(SFT/RL). 문서작성·스타일편집 템플릿 제공 | 테넌트, 학습 데이터의 접근 권한(ACL) 유지 | 평가 루브릭 결과를 보고 게시 여부 결정 | "루브릭 평가 후 배포" 절차 참고. 얼리 액세스 단계 | [MS Learn](https://learn.microsoft.com/en-us/microsoft-365/copilot/copilot-tuning-overview) |
| GitHub Copilot Memory | 미국 | 에이전트 활동에서 자동 생성. 쓰기 전에 근거(코드 위치)를 검증하고, 28일간 쓰이지 않으면 삭제 | 리포지토리 / 사용자 | 리포 소유자가 검토·삭제 | 만료·검증 설계의 직접 참고 사례 | [Docs](https://docs.github.com/en/copilot/concepts/agents/copilot-memory) |
| Templafy MCP (2026-05-28) | 글로벌 | 수정 학습 언급 없음. ChatGPT·Claude·Copilot 등의 결과물에 승인된 템플릿, 프롬프트, 서식 규칙, 법무 문구를 적용 | 조직 중앙 관리 | 관리자가 중앙에서 관리 | "생성은 아무 AI로, 서식은 회사 자산으로" 구조 | [MCP](https://www.templafy.com/home/platform/mcp/), [발표](https://www.templafy.com/news/templafy-launches-mcp-to-bring-enterprise-control-to-ai-generated-documents/) |
| Gamma | 미국 | 수정 학습 언급 없음. 템플릿·슬라이드 단위 지시문과 슬라이드 잠금(AI 생성에만 적용). Pro/Ultra 전용 | 템플릿, 슬라이드, 워크스페이스 테마 | 없음 | 슬라이드 단위로 규칙을 넣는 위치 참고 | [Help](https://help.gamma.app/en/articles/16056626-what-are-template-instructions-and-how-can-i-use-them) |
| Beautiful.ai | 미국 | 학습 언급 없음. 브랜드킷과 잠금 슬라이드로 강제 | 팀 / 엔터프라이즈 | 역할 기반 권한 | 가드레일을 강제하는 방식 | [페이지](https://beautiful.ai/brand-controls-themes) |
| Pitch | 독일(미검증) | 학습 언급 없음. Agent가 템플릿 디자인 시스템을 따르고, 도메인에서 브랜드 템플릿을 생성 | 워크스페이스 템플릿 | 언급 없음 | 템플릿 자동 추출 | [페이지](https://pitch.com/use-cases/ai-presentation-maker) |
| Canva Brand Kit·Brand voice | 호주 | 명시 규칙만(브랜드 보이스 500자 제한) | 팀 브랜드킷 | 소유자, 관리자, 브랜드 디자이너만 편집 | 규칙은 짧고 명확해야 함 | [Help](https://www.canva.com/help/brand-voice/) |
| WRITER | 미국 | 샘플로 보이스 프로필을 만들고, 스타일가이드·용어는 명시 규칙. 스타일가이드·용어는 보이스 프로필에 연결해야 출력에 적용 | 조직 / 팀 | 관리자 역할만 편집 | 스타일·용어·보이스 3층 구조 | [Support](https://support.writer.com/articles/2086260283-how-to-connect-your-style-guide-and-terms-to-a-voice) |
| Jasper Brand IQ | 미국 | 샘플 기반 Brand Voice와 관리자가 정한 스타일가이드. 위반을 표시하고 대체안 제시 | 워크스페이스 | 관리자 | 검사 기능 포함 | [Brand IQ](https://www.jasper.ai/brand-iq), [Help](https://help.jasper.ai/hc/en-us/articles/18618693085339-Brand-Voice) |
| Grammarly Style rules | 미국 | 규칙은 수동 작성. 규칙별 노출·수락·거절 통계 제공 | 조직 / 그룹 | 관리자, 그룹 매니저 | 규칙 단위 KPI 참고 | [Support](https://support.grammarly.com/hc/en-us/articles/360043832652) |
| Markup AI (Acrolinx 분사) | 미국 | 업로드한 가이드를 스타일가이드로 만들어 에이전트가 검사·재작성 | 조직 콘솔 | 콘솔에서 설정 | 검증 단계 | [Docs](https://docs.markup.ai/overview), [Gilbane](https://gilbane.com/2025/09/introducing-markup-ai-your-enterprise-content-guardian-agent/) |
| Notion Agent | 미국 | 개인 지침 페이지(직접 편집). 자동 갱신 언급 없음. Custom Agent는 팀 공유 가능 | 개인 / 팀 | 없음 | — | [지침](https://www.notion.com/en-gb/help/instructions-for-notion-agent), [Custom](https://www.notion.com/help/custom-agents) |
| ChatGPT 메모리·Projects·Skills | 미국 | 저장 메모리와 채팅 기록 참조(자동), 프로젝트 전용 메모리, Skills(SKILL.md) | 개인 / 프로젝트 / 워크스페이스 | 사용자가 관리 | 스킬을 규칙 배포 형식으로 활용 | [메모리](https://help.openai.com/en/articles/8590148-memory-in-chatgpt), [Projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [Skills](https://help.openai.com/en/articles/20001066-skills-in-chatgpt) |
| Claude 메모리·Projects·Skills | 미국 | 대화 중 주제별로 자동 저장, 프로젝트별 분리, 사용자가 보고 수정 가능. 조직 관리자가 Skills를 일괄 배포(기본 활성) | 개인 / 프로젝트 / 조직 | 관리자 배포 | 승인된 규칙을 스킬로 배포 | [메모리](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context), [Skills](https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization) |
| Copilot Pages | 미국 | 공동 편집 캔버스. 학습 기능 없음 | 공유 페이지 | 없음 | 편집 이력을 모을 수 있는 지점 | [Support](https://support.microsoft.com/en-us/microsoft-365-copilot/how-microsoft-365-copilot-pages-works) |
| 한컴어시스턴트 | 한국 | "사용자 맞춤 AI 서식 문서"(프롬프트 설정). 수정 학습 언급 없음 | 개인(미검증) | 언급 없음 | HWP 시장 대응 | [바이라인](https://byline.network/2025/09/9253/) |
| SK AX Proposal AI | 한국 | 고객사 CI·색상·톤 자동 반영, 과거 제안서 모범 사례 활용, 자동 품질 검토. 수정 학습 언급 없음 | 회사 | 언급 없음 | 국내 제안서 영역의 기준점 | [SK AX](https://www.skax.co.kr/ax-services/proposal-ai) |
| 엘리스 AI 헬피챗 (2026-02) | 한국 | 기존 PPT를 올리면 조직 스타일 템플릿으로 재구성, 대화형 편집. 수정 누적 학습은 언급 없음 | 조직 템플릿 | 언급 없음 | — | [Elice](https://elice.io/resources/newsroom/ai-helpychat-deepresearch) |
| 기타 국내(KT ds 웍스AI, 다글로) | 한국 | 웍스AI: 직원이 만든 플러그인 공유("AI 메이커스"), PPT 템플릿 기능(미검증). 다글로: 기록한 자료로 PPT 생성, 회사 서식 언급 없음 | — | — | 국내에는 직접 경쟁 제품이 보이지 않음 | [웍스AI](https://view.asiae.co.kr/article/2024112909091743125) |

## 3. 연구·기술

**수정에서 선호를 학습하는 연구**
- **PRELUDE/CIPHER** (NeurIPS 2024, MS Research): 수정 이력에서 사용자 선호를 문장으로 추론하고, 비슷한 과거 맥락 k개의 선호를 모아 다음 프롬프트에 넣습니다. 편집거리 비용이 가장 낮았고, 사용자가 학습된 선호를 보고 고칠 수 있습니다. [arXiv 2404.15269](https://arxiv.org/abs/2404.15269)
- **PROSE** (ICML 2025, Apple): 추론한 선호를 반복해서 다듬고, 여러 샘플로 교차 검증합니다. CIPHER 대비 33% 개선. [arXiv 2505.23815](https://arxiv.org/abs/2505.23815)
- **Principled Fine-tuning from User-Edits** (NeurIPS 2025): 수정 데이터를 선호·정답 레이블·비용 세 가지 신호로 함께 쓰는 앙상블을 제안합니다. 나중에 미세조정으로 넘어갈 때의 근거입니다. [arXiv 2601.19055](https://arxiv.org/abs/2601.19055)

**규칙 증류와 컨텍스트 진화**
- **ExpeL**: 경험에서 얻은 통찰 목록을 ADD/UPVOTE/DOWNVOTE/EDIT 연산으로 관리합니다. 규칙 투표·폐기 설계에 그대로 쓸 수 있습니다. [arXiv 2308.10144](https://arxiv.org/abs/2308.10144)
- **ACE** (ICLR 2026): 컨텍스트를 계속 진화하는 "플레이북"으로 다룹니다. 요약하면서 세부가 빠지는 문제(brevity bias)와 반복 재작성으로 내용이 무너지는 문제(context collapse)를 증분 업데이트로 막습니다. 규칙 문서를 통째로 다시 쓰지 말고 항목 단위로 고치라는 근거입니다. [arXiv 2510.04618](https://arxiv.org/abs/2510.04618)

**메모리 인프라**
- [Mem0](https://arxiv.org/abs/2504.19413): 추출, 통합, 검색.
- [Zep/Graphiti](https://arxiv.org/abs/2501.13956): 시간 인식 지식그래프. 모순되는 사실은 지우지 않고 무효 처리.
- [Letta](https://docs.letta.com/guides/core-concepts/memory/memory-blocks): 메모리 블록, 공유 메모리, 유휴 시간(sleep-time)에 통합.
- [LangMem](https://blog.langchain.com/langmem-sdk-launch): 절차 기억을 프롬프트 최적화로 구현.
- [Claude memory tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool): /memories 파일을 클라이언트 쪽에 저장.
- [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview): 필요할 때만 불러오는 지침·스크립트·템플릿 묶음.

**평가 지표**
- 편집거리(PRELUDE).
- HTER: 사람이 고친 양으로 품질을 재는 지표로, 사람 판단과 상관이 높습니다. [Snover 2006](https://aclanthology.org/2006.amta-papers.25)
- 제안 수락률: 체감 생산성을 가장 잘 설명합니다. [Ziegler 2022](https://arxiv.org/abs/2205.06537)
- 규칙별 수락·거절 통계(Grammarly).

## 4. CRATA 권장 설계

**흐름:** ① AI 초안과 최종본을 버전으로 보관 → ② 구조화 diff 생성(서식, 구조, 문체, 사실, 삭제로 분류) → ③ 범위 분류 → ④ 규칙 후보 생성(CIPHER식 선호 문장 + 근거 수정 묶기) → ⑤ 승인 대기열 → ⑥ 자산으로 변환 → ⑦ 적용 로그와 KPI 기록.

**범위 분류 휴리스틱 (규칙 + LLM)**
- 템플릿: 마스터·테마 수준의 속성(글꼴, 여백, 색)이 여러 슬라이드에서 같은 방향으로 바뀜.
- 작성 규칙: 같은 패턴이 3건 이상, 문서 2개 이상, 편집자 2명 이상에서 나오거나, 편집자가 "항상" 표시를 함.
- 일회성/고객사: 고객사명, 금액, 고유명사가 들어 있거나 1회만 발생. 기본값은 승격하지 않음. 서로 다른 고객 2곳 이상에서 반복될 때만 승격 후보로 올림.

```yaml
correction:
  id: cor_0143
  artifact: {type: proposal_pptx, doc_id: d_771, slide: 3, ai_ver: v1, final_ver: v3}
  client_id: cli_042
  editor: {user: u_kim, team: 영업2팀}
  diff:
    kind: style            # format|structure|style|factual|deletion
    before: "당사는 20년 업력의…"
    after: "귀사의 물류 지연 문제는…"
    metrics: {norm_edit_dist: 0.62, ops: 4}
  reason: {text: "제안서는 고객 문제로 시작", source: editor_note}  # editor_note|inferred
  scope_suggested: writing_rule   # template|writing_rule|one_off
  scope_confidence: 0.78
  status: candidate               # raw→candidate→proposed→approved|rejected
  linked_rule: rule_prop_open_01
rule:
  id: rule_prop_open_01
  scope: {level: team, team: 영업본부, doc_types: [proposal]}  # org<team<client<doc
  statement: "제안서 첫 장은 고객 문제 정의로 시작하고, 회사 소개는 부록으로 둔다."
  evidence: [cor_0098, cor_0121, cor_0143]
  examples: [{before: ex/0143_a.md, after: ex/0143_b.md}]
  compiled_to: [skills/proposal/SKILL.md#opening, checks/opening.yaml]
  approver: u_lee
  status: active          # proposed→active→under_review→deprecated
  valid_from: 2026-10-01
  review_by: 2027-01-01
  supersedes: null
  stats: {applied: 41, overridden: 3, last_applied: 2026-11-20}
```

**자산으로 변환**
- 템플릿 → .potx/.dotx 마스터의 버전을 올림. 고객사가 Copilot Brand Kit이나 Templafy를 쓰면 그쪽으로 배포.
- 작성 규칙 → rules.yaml을 원본으로 두고, 문서 유형별 SKILL.md로 변환. references/에 수정 전후 예시 3~5쌍을 넣음. Claude와 OpenAI가 같은 표준이라 이식이 가능하고, 다른 모델에는 시스템 프롬프트 조각으로 넣음.
- 검사 → 결정적 검사(python-pptx로 글꼴, 금칙어 확인) + LLM 루브릭. 생성 후 "적용한 규칙 ID / 위반 여부"를 보고.
- 고객사 규칙 → client_id가 맞을 때만 불러오는 고객 프로필로 분리.

**충돌·만료**
- 우선순위는 문서 > 고객사 > 팀 > 조직입니다. 같은 단계에서는 supersedes로 명시해야만 교체합니다.
- 승인 시점에 같은 문서 유형의 활성 규칙과 LLM으로 쌍별 충돌을 검사합니다. 충돌하면 승인자가 교체할지, 범위를 좁힐지 고릅니다.
- 삭제하지 않고 valid_from/invalid_at으로 이력을 남깁니다(Zep 방식).
- 60일간 적용되지 않으면 재검토로 보냅니다(GitHub의 28일 규칙을 문서 업무에 맞게 늘림).
- 적용 10회 이상에서 override율이 30%를 넘으면 자동으로 재검토로 보냅니다(ExpeL의 DOWNVOTE에 해당).
- 템플릿 규칙은 템플릿 버전과, 고객사 규칙은 계약 종료와 함께 만료됩니다.
- 규칙 문서는 통째로 다시 쓰지 않고 항목 단위로만 수정합니다(ACE).

**KPI와 증명 방법**
- 주 지표:
  - 문서 유형별 정규화 편집거리. 사실·숫자 수정은 따로 집계합니다.
  - 문서당 수정 건수.
  - 검토 시간(열기부터 승인까지).
- 학습 효과 지표:
  - 동일 수정 재발률: 활성 규칙이 다루는 유형의 수정이 다시 나온 비율. 0에 가까워야 합니다.
  - 1차 통과율: 편집 비율 10% 이하로 발송된 문서의 비율.
- 규칙 건강도: 적용 수, override율, 승인 대기 시간.
- 증명 방법: 2~4주 기준선을 잡은 뒤 팀별로 단계적으로 도입하고, 일부 문서는 "규칙 없이 생성한 섀도 초안"과 비교합니다. 규칙 ID별 기여 로그를 남깁니다.

## 5. 남은 불확실성

- 모든 판단은 공개 문서에 근거합니다. 공개되지 않은 기능이 있을 수 있습니다.
- Copilot PowerPoint "Skills"(2026-09)의 세부 내용, 그리고 조직이 직접 스킬을 만들 수 있는지는 확인하지 못했습니다(미검증).
- Prezent의 "조직 선호 학습" 주장과 Grammarly의 수락/거절 기반 강화학습 주장은 제3자 출처뿐이라 표에서 뺐습니다(미검증).
- 국내 서비스는 웍스AI의 PPT 템플릿 기능과 한컴의 범위 구분을 확인하지 못했습니다(미검증). 엘리스의 "조직 스타일 학습"은 업로드한 PPT로 템플릿을 재구성하는 기능이지, 수정을 누적해 학습하는 기능은 아닙니다.
- LLM 범위 분류의 정확도와, 소규모 고객사에서 규칙 후보가 될 데이터가 충분히 쌓일지는 PoC로 확인해야 합니다.
- 수정 diff에 고객사·개인 정보가 들어갑니다. 개인정보보호법에 맞춘 보존·마스킹 정책이 필요합니다([04 문서](./04_data-governance.md)).
- 편집이 줄어든 것이 품질이 좋아져서가 아니라 사용자가 고치기를 포기해서일 수도 있습니다. 표본 블라인드 품질 평가를 병행해야 합니다.
- PPTX에서 서식과 내용을 나눠 diff를 만드는 일, 그리고 HWP/HWPX 도구 지원의 난이도는 확인하지 못했습니다(미검증).
