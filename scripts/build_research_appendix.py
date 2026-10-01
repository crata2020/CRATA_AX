"""data/research_dataset.json 에서 서비스 카탈로그(05)와 검증 로그(06) 마크다운을 생성한다."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "research_dataset.json"
OUT_CATALOG = ROOT / "docs" / "research" / "05_service-catalog.md"
OUT_VERIFY = ROOT / "docs" / "research" / "06_verification-log.md"

ANGLE_TITLES = {
    "global-meeting-ai": "글로벌 회의 AI (노트테이커)",
    "plaud-and-ai-recorders": "Plaud 생태계와 AI 녹음기",
    "korea-meeting-voice-ai": "국내 회의·음성 AI",
    "process-task-mining": "프로세스·태스크 마이닝, 업무 패턴 발견",
    "enterprise-context-graph": "기업 컨텍스트·지식그래프 ('회사 두뇌')",
    "brand-style-extraction": "스타일·브랜드 추출",
    "ai-site-app-builders": "AI 업무사이트·앱 생성 도구",
    "consulting-methods-ax": "AX 컨설팅·교육, 진단 방법론",
    "technical-methods": "구현 기술 (STT·분할·분류·그래프)",
    "edu-domain-and-crata": "교육·학맞통 도메인",
    "emerging-ai-native": "신흥 AI-native 스타트업",
    "meeting-to-deliverable": "회의 → 산출물·프로젝트 지식",
    "gap-east-asia-jp-cn-players": "[보완] 일본·중국 플레이어",
    "gap-korea-legal-privacy-compliance": "[보완] 한국 법·개인정보·컴플라이언스",
    "gap-cost-tco-and-funding": "[보완] 비용(TCO)·지원사업",
    "gap-korean-smb-school-data-sources": "[보완] 국내 SMB·학교 데이터 원천",
}
ADOPT = {
    "use-directly": "직접 사용",
    "integrate-as-component": "부품 통합",
    "benchmark-idea": "아이디어 벤치마크",
    "not-recommended": "비권장",
}
STATUS = {
    "ok": "✅ 확인",
    "acquired": "🔁 인수",
    "shutdown": "⛔ 종료(예정)",
    "rebranded": "✏️ 리브랜딩",
    "not_found": "❓ 미발견",
    "feature_claim_wrong": "⚠️ 정정",
    "unclear": "❔ 불확실",
    "not-checked": "— 미검증",
}
VERDICT = {"confirmed": "✅ 확인", "partly": "⚠️ 부분", "refuted": "❌ 반박", "unclear": "❔ 불확실"}


def cell(text):
    return " ".join(str(text or "").split()).replace("|", "\\|")


def links(urls, limit=3):
    urls = [u for u in (urls or []) if u.startswith("http")]
    return " ".join(f"[{i + 1}]({u})" for i, u in enumerate(urls[:limit]))


def build_catalog(dataset):
    total = sum(len(a["services"]) for a in dataset)
    status_count = Counter(s.get("verification", {}).get("status", "not-checked") for a in dataset for s in a["services"])
    lines = [
        "# 부록: 국내외 서비스 전체 카탈로그",
        "",
        f"> 기준일 2026-10-01 · 리서치 {len(dataset)}개 관점 · 서비스·기술 {total}건 · `scripts/build_research_appendix.py`로 `data/research_dataset.json`에서 자동 생성",
        "> '무엇을 하나'는 조사 원문(주로 영문) 요약이고, 'CRATA 시사점'은 한국어로 정리했습니다. 검증 열은 별도 팩트체크 에이전트가 1차 출처로 다시 확인한 결과입니다.",
        "> 각 절의 '핵심 인사이트'는 검증 전 조사 원문입니다. 인수·종료·정정 사항은 표의 검증 열과 [팩트체크 로그](./06_verification-log.md)가 우선합니다.",
        "",
        "검증 상태 집계: " + " · ".join(f"{STATUS.get(k, k)} {v}" for k, v in status_count.most_common()),
        "",
        "## 목차",
        "",
    ]
    for a in dataset:
        title = ANGLE_TITLES.get(a["angle"], a["angle"])
        lines.append(f"- [{title}](#{a['angle']}) ({len(a['services'])}건)")
    for a in dataset:
        title = ANGLE_TITLES.get(a["angle"], a["angle"])
        summary = "\n\n".join(line.strip() for line in a["summary_ko"].splitlines() if line.strip())
        lines += ["", f'<a id="{a["angle"]}"></a>', "", f"## {title}", "", "**핵심 인사이트** (조사 원문 요약, 검증 전)", "", summary, ""]
        lines += [
            "| 서비스 | 국가 | 분류 | 무엇을 하나 | CRATA 시사점 | 도입 방식 | 검증 | 출처 |",
            "|---|---|---|---|---|---|---|---|",
        ]
        for s in a["services"]:
            v = s.get("verification", {"status": "not-checked"})
            status = STATUS.get(v.get("status"), v.get("status"))
            if v.get("status") not in ("ok", "not-checked") and v.get("note"):
                status += f": {cell(v['note'])}"
            lines.append(
                f"| **{cell(s['name'])}** | {cell(s.get('country'))} | {cell(s.get('category'))} | {cell(s.get('what_it_does'))} "
                f"| {cell(s.get('takeaway_for_crata'))} | {ADOPT.get(s.get('adopt_mode'), cell(s.get('adopt_mode')))} | {status} | {links(s.get('sources'))} |"
            )
        if a.get("methods"):
            lines += ["", "**방법론·프레임워크**", ""]
            for m in a["methods"]:
                src = links(m.get("sources"), 2)
                lines.append(f"- **{cell(m['name'])}** — {cell(m['how_to_apply_ko'])} {src}".rstrip())
    return "\n".join(lines) + "\n"


def build_verification(dataset):
    verdicts = Counter(c["verdict"] for a in dataset for c in a["claim_verdicts"])
    lines = [
        "# 부록: 팩트체크 로그",
        "",
        "> 각 리서치 관점마다 독립된 팩트체크 에이전트가 핵심 주장 5~8개와 서비스 존재·상태(인수·종료·리브랜딩)를 공식 자료로 다시 확인했습니다. 본문 문서는 이 정정 사항을 반영했습니다.",
        "",
        "주장 판정 집계: " + " · ".join(f"{VERDICT.get(k, k)} {v}" for k, v in verdicts.most_common()),
        "",
    ]
    for a in dataset:
        title = ANGLE_TITLES.get(a["angle"], a["angle"])
        lines += [f"## {title}", "", "| 주장 | 판정 | 정정·메모 | 근거 |", "|---|---|---|---|"]
        for c in a["claim_verdicts"]:
            src = c.get("source") or ""
            src = f"[링크]({src})" if src.startswith("http") else cell(src)
            lines.append(f"| {cell(c['claim'])} | {VERDICT.get(c['verdict'], c['verdict'])} | {cell(c.get('correction'))} | {src} |")
        flagged = [s for s in a["services"] if s.get("verification", {}).get("status") not in ("ok", "not-checked", None)]
        if flagged:
            lines += ["", "**상태 주의 서비스**", ""]
            for s in flagged:
                v = s["verification"]
                lines.append(f"- **{cell(s['name'])}** — {STATUS.get(v['status'], v['status'])}: {cell(v.get('note'))}")
        lines.append("")
    return "\n".join(lines)


def main():
    dataset = json.loads(DATA.read_text(encoding="utf-8"))
    OUT_CATALOG.write_text(build_catalog(dataset), encoding="utf-8")
    OUT_VERIFY.write_text(build_verification(dataset), encoding="utf-8")
    print(f"wrote {OUT_CATALOG.relative_to(ROOT)} and {OUT_VERIFY.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
