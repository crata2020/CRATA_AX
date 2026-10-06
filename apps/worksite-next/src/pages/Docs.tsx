// 문서·학습: Orbix CRM 'Growth Stats'(refs/orbixcrm-growth-stats-kpis-charts.jpg — 2×2 KPI 묶음 + '주간 ▾' 알약 차트 카드, 둥근 도넛 + 범례 네모)
// + Fintech 'Invoicing'(refs/fintech-invoicing.jpg — 머리 오른쪽 흰 버튼 + 짙은 버튼 하나, 표 머리의 짙은 'All' 세그먼트·Status 알약)
// + Fintech 'Transactions'(refs/fintech-transactions-table.jpg — 옅은 배경 상태 알약, 줄마다 펼침 칩, 회색 표 머리).
// 내용은 리서치 08(수정 → 범위 → 승인 → 규칙 → 효과). '수정 0'을 약속하지 않고 재발률·1차 통과율·검토 시간이 줄어드는지를 숫자로 보여 줘요.
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight, BadgeCheck, BookCheck, CheckCheck, ChevronDown, Download, FileCode2, FilePen, FileText, Info, LayoutTemplate, Repeat, ScanSearch, Split, Sparkles,
  Timer, TrendingDown, Upload, UserCheck,
} from "lucide-react";
import { useApp } from "@/data/store";
import { longDate, when } from "@/data/format";
import type { Artifact } from "@/data/types";
import { Avatar, Button, Card, Chip, Delta, Empty, Kpi, MoreButton, PageHead, PillSelect, Segmented, type Tone } from "@/ui";
import { Donut, LineChart } from "@/ui/charts";
import { CandidateCard, Diff, EVIDENCE_MIN, FlowBand, SCOPE, SCOPE_ORDER, ScopeTag, evidenceMap, skillMarkdown, type FlowStep, type Scope } from "./Docs.parts";
import "./Docs.css";

const ART_STATUS: Record<Artifact["status"], { label: string; tone: Tone }> = {
  draft: { label: "초안", tone: "neutral" }, review: { label: "검토 중", tone: "info" }, final: { label: "확정", tone: "good" },
};
/** 무시가 이 비율을 넘으면(적용 10번 이상일 때) 다시 검토 — 리서치 08 '충돌·만료' */
const OVERRIDE_MAX = 0.3;

export default function Docs() {
  const { d, me, person, act, toast } = useApp();
  const [cmp, setCmp] = useState<"prev" | "base">("prev");
  const [metric, setMetric] = useState<"rate" | "time">("rate");
  const [scopeF, setScopeF] = useState<"all" | Scope>("all");
  const [artF, setArtF] = useState<"all" | Artifact["status"]>("all");
  const [fix, setFix] = useState<Record<string, Scope>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // ───────── 숫자(리서치 08 'KPI와 증명 방법')
  const L = d.learning;
  const last = L.weeks.length - 1;
  const ref = cmp === "prev" ? Math.max(0, last - 1) : 0;
  const refName = cmp === "prev" ? "지난주" : `${L.weeks[0]} 기준선`;
  const diffOf = (arr: number[]) => (arr[last] ?? 0) - (arr[ref] ?? 0);
  const dRepeat = diffOf(L.repeatRate), dPass = diffOf(L.firstPass), dReview = diffOf(L.reviewMin);
  const dir = (v: number) => (v < 0 ? "down" : v > 0 ? "up" : "flat") as "down" | "up" | "flat";

  const candidates = d.rules.filter((r) => r.status === "candidate");
  const active = d.rules.filter((r) => r.status === "active");
  const rejected = d.rules.filter((r) => r.status === "rejected");
  const applied = active.reduce((s, r) => s + r.applied, 0);
  const overridden = active.reduce((s, r) => s + r.overridden, 0);
  const examples = useMemo(() => evidenceMap(d.rules, d.corrections), [d.rules, d.corrections]);

  // 사람이 고친 범위(이 화면에서만)
  const corr = useMemo(() => d.corrections
    .map((c) => ({ ...c, scope: fix[`${d.id}:${c.id}`] ?? c.scope }))
    .sort((a, b) => b.at.localeCompare(a.at)), [d.corrections, d.id, fix]);
  const scopeN = (s: Scope) => corr.filter((c) => c.scope === s).length;
  const scopes = SCOPE_ORDER.filter((s) => s !== "unsorted" || scopeN(s) > 0);
  const sorted = corr.length - scopeN("unsorted");
  const shownCorr = corr.filter((c) => scopeF === "all" || c.scope === scopeF);
  const setScope = (id: string, s: Scope) => { setFix((f) => ({ ...f, [`${d.id}:${id}`]: s })); toast(`범위를 ‘${SCOPE[s].label}’으로 바꿨어요. 다음 분류에 반영돼요`); };

  const arts = d.artifacts.filter((a) => artF === "all" || a.status === artF);
  const aiArts = d.artifacts.filter((a) => a.aiDraft).length;

  const canDecide = (approver: string) => approver === me.id || me.platform === "owner";
  const goto = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const exportSkill = () => {
    const md = skillMarkdown(d, (id) => person(id)?.name ?? id);
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" }));
      a.download = "SKILL.md";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { /* 내려받기 불가 */ }
    toast(active.length ? `승인한 규칙 ${active.length}개를 SKILL.md로 내보냈어요` : "아직 승인한 규칙이 없어 빈 SKILL.md를 만들었어요");
  };
  const onFile = (f?: File) => { if (f) toast(`‘${f.name}’을 받았어요. AI 초안과 비교해 수정을 모을게요`); if (fileRef.current) fileRef.current.value = ""; };

  const steps: FlowStep[] = [
    { key: "edit", label: "수정", icon: <FilePen />, hue: "orange", value: <>{corr.length}<small>건</small></>, sub: "AI 초안과 최종본을 비교해요" },
    { key: "scope", label: "범위", icon: <Split />, hue: "violet", value: <>{sorted}<small>/{corr.length}</small></>, sub: scopes.filter((s) => s !== "unsorted").map((s) => `${SCOPE[s].label} ${scopeN(s)}`).join(" · ") },
    { key: "approve", label: "승인", icon: <UserCheck />, hue: "blue", value: <>{candidates.length}<small>건 대기</small></>, sub: candidates.length ? "사람이 반영할지 골라요" : "기다리는 후보가 없어요", current: candidates.length > 0 },
    { key: "rule", label: "규칙", icon: <BookCheck />, hue: "brand", value: <>{active.length}<small>개</small></>, sub: <>운영 중 · 적용 <span className="num">{applied}</span>번</> },
    { key: "effect", label: "효과", icon: <TrendingDown />, hue: "green", value: <>{L.repeatRate[last]! - L.repeatRate[0]! > 0 ? "+" : "−"}{Math.abs(L.repeatRate[last]! - L.repeatRate[0]!)}<small>%p</small></>, sub: <>재발률 <span className="num">{L.repeatRate[0]}% → {L.repeatRate[last]}%</span></> },
  ];

  const series = metric === "rate"
    ? [{ name: "재발률", color: "var(--c-coral)", values: L.repeatRate }, { name: "1차 통과율", color: "var(--brand)", values: L.firstPass }]
    : [{ name: "검토 시간", color: "var(--c-cyan)", values: L.reviewMin }];
  const unit = metric === "rate" ? "%" : "분";

  const scopeFilter = (
    <Segmented label="범위" size="sm" value={scopeF} onChange={setScopeF} options={[
      { value: "all", label: "전체", n: corr.length },
      ...scopes.map((s) => ({ value: s, label: SCOPE[s].label, n: scopeN(s) })),
    ]} />
  );

  return (
    <>
      <PageHead
        title="문서·학습"
        desc="고친 내용을 범위별로 나누고, 승인한 것만 회사 규칙으로 써요. 같은 수정이 줄어드는지 숫자로 봐요."
        actions={
          <div className="dc-acts">
            {candidates.length
              ? <Button variant="dark" icon={<UserCheck />} count={candidates.length} onClick={() => goto("dc-cands")}>규칙 후보 검토</Button>
              : <Button variant="dark" icon={<BookCheck />} onClick={() => goto("dc-rules")}>운영 규칙 보기</Button>}
            <Button icon={<Upload />} onClick={() => fileRef.current?.click()}>최종본 올리기</Button>
            <Button icon={<Download />} onClick={exportSkill}>SKILL.md 내보내기</Button>
            <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} aria-hidden accept=".docx,.pptx,.hwp,.hwpx,.pdf,.md,.txt" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        }
      />

      <div className="grid g-12">
        {/* 학습 효과(Growth Stats 2×2 KPI) */}
        <Card className="s-6 dc-a" title="학습 효과" sub={`수정이 0이 되진 않아요. ${refName}보다 나아졌는지 봐요`}
          actions={<PillSelect label="비교 기준" value={cmp} onChange={setCmp} options={[{ value: "prev", label: "지난주 대비" }, { value: "base", label: "기준선 대비" }]} />}>
          <div className="kpigrid dc-kpis">
            <Kpi icon={<Repeat />} hue="coral" label="같은 수정 재발률" value={L.repeatRate[last]} unit="%"
              delta={<Delta value={`${Math.abs(dRepeat)}%p`} dir={dir(dRepeat)} good={dRepeat <= 0} />} note="같은 수정이 또 나온 비율" />
            <Kpi icon={<BadgeCheck />} hue="green" label="1차 통과율" value={L.firstPass[last]} unit="%"
              delta={<Delta value={`${Math.abs(dPass)}%p`} dir={dir(dPass)} good={dPass >= 0} />} note="고친 양 10% 이하로 보낸 문서" />
            <Kpi icon={<Timer />} hue="cyan" label="평균 검토 시간" value={L.reviewMin[last]} unit="분"
              delta={<Delta value={`${Math.abs(dReview)}분`} dir={dir(dReview)} good={dReview <= 0} />} note="문서를 열어서 승인할 때까지" />
            <Kpi icon={<BookCheck />} hue="violet" label="운영 중 규칙" value={active.length} unit="개"
              delta={candidates.length ? <Delta value={`후보 ${candidates.length}`} dir="flat" /> : undefined} note={`적용 ${applied}번 · 무시 ${overridden}번`} />
          </div>
        </Card>

        {/* 8주 추이(Growth Stats 'Sales and revenue' 선 + 흰 툴팁) */}
        <Card className="s-6 dc-a" title="8주 추이" sub="주마다 다시 재요"
          actions={<PillSelect label="지표" value={metric} onChange={setMetric} options={[{ value: "rate", label: "재발률·통과율" }, { value: "time", label: "검토 시간" }]} />}>
          <div className="dc-trend">
            <div className="dc-trend__legend">
              {series.map((s) => (
                <span key={s.name} className="dc-leg"><i style={{ background: s.color }} />{s.name}<b className="num">{s.values[0]}{unit} → {s.values[last]}{unit}</b></span>
              ))}
            </div>
            <div className="dc-trend__chart">
              <LineChart labels={L.weeks} series={series} focus={last} unit={unit} height={220} fill />
            </div>
            <p className="dc-trend__note"><Info aria-hidden /><span><span className="num">{L.weeks[0]}</span> 주는 규칙 없이 만든 기준선이에요. 그 뒤로 규칙을 하나씩 켰어요.</span></p>
          </div>
        </Card>

        {/* 흐름 띠 */}
        <section className="card s-12 dc-flowcard" aria-labelledby="dc-flow-t">
          <div className="dc-flowcard__head">
            <h2 id="dc-flow-t" className="dc-flowcard__t">수정이 규칙이 되기까지</h2>
            <span className="dc-flowcard__s">AI는 후보만 올리고, 규칙은 사람이 승인해요</span>
          </div>
          <FlowBand steps={steps} />
        </section>

        {/* 규칙 후보: 한 줄에 카드 3장(남는 칸은 '다음 후보' 점선 카드) */}
        <Card className="s-12" title="규칙 후보" sub={`같은 수정이 ${EVIDENCE_MIN}번 넘게 쌓이면 AI가 한 문장으로 정리해 올려요. 반영할지는 사람이 골라요`}
          actions={<>{candidates.length > 0 && <Chip tone="brand" sm><span className="num">{candidates.length}</span>건 대기</Chip>}<MoreButton /></>}
          foot={<><Info size={15} aria-hidden /><span>‘이번만’을 누르면 그 문서의 수정으로만 남고 규칙이 되지 않아요.</span>{rejected.length > 0 && <span className="dc-foot-r">이번만으로 남긴 후보 <b className="num">{rejected.length}</b>건</span>}</>}>
          <div id="dc-cands" className="dc-anchor" />
          {candidates.length ? (
            <ul className="dc-cands">
              {candidates.map((r) => (
                <CandidateCard key={r.id} rule={r} example={examples[r.id]} approver={person(r.approver)} today={d.today}
                  canDecide={canDecide(r.approver)} onDecide={(ok) => act.ruleDecision(r.id, ok)} />
              ))}
              {candidates.length % 3 !== 0 && (
                <li className="dc-ghost" style={{ gridColumn: `span ${3 - (candidates.length % 3)}` }}>
                  <span className="dc-ghost__ic"><Sparkles /></span>
                  <b>다음 후보</b>
                  <span>작성 규칙으로 나뉜 수정이 같은 쪽으로 {EVIDENCE_MIN}번 쌓이면 여기에 올라와요</span>
                  <span className="dc-ghost__n">지금 작성 규칙 수정 <b className="num">{scopeN("writing")}</b>건</span>
                </li>
              )}
            </ul>
          ) : <Empty icon={<CheckCheck />} title="검토할 후보가 없어요">같은 수정이 {EVIDENCE_MIN}번 쌓이면 여기에 올라와요</Empty>}
        </Card>

        {/* 범위 분류(Growth Stats 'Productivity KPIs' 도넛 + 범례 네모) */}
        <Card className="s-5" title="범위 분류" sub="수정마다 어디까지 적용할지 나눠요" actions={<MoreButton />}
          foot={<><Info size={15} aria-hidden /><span>헷갈리면 ‘이번만’이 기본이에요. 다른 고객 2곳 넘게 반복될 때만 후보로 올려요.</span></>}>
          <div className="dc-scopebox">
            <Donut data={scopes.map((s) => ({ label: SCOPE[s].label, value: scopeN(s), color: SCOPE[s].color }))} size={148} thickness={20} center={corr.length} sub="최근 수정" />
            <ul className="dc-routes">
              {scopes.map((s) => (
                <li key={s}>
                  <div className="between"><span className="tagsq"><i style={{ background: SCOPE[s].color }} />{SCOPE[s].label}</span><b className="num">{scopeN(s)}<span className="faint">건</span></b></div>
                  <p>{SCOPE[s].rule}</p>
                  <p className="dc-routes__to"><ArrowRight aria-hidden />{SCOPE[s].to}</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* 운영 중 규칙 */}
        <Card className="s-7 dc-rulescard dc-flush" title="운영 중 규칙" sub={`적용 10번 넘고 무시가 ${OVERRIDE_MAX * 100}%를 넘으면 다시 검토해요`} flush
          actions={<><Chip tone="outline" sm>적용 <span className="num">{applied}</span> · 무시 <span className="num">{overridden}</span></Chip><MoreButton /></>}>
          <div id="dc-rules" className="dc-anchor" />
          {active.length ? (
            <div className="tablewrap">
              <table className="table dc-rtable">
                <colgroup><col /><col className="w-n" /><col className="w-o" /><col className="w-st" /></colgroup>
                <thead><tr><th>규칙</th><th className="r">적용</th><th className="r">무시</th><th>상태</th></tr></thead>
                <tbody>
                  {active.map((r) => {
                    const rate = r.applied ? r.overridden / r.applied : 0;
                    const st = r.applied === 0 ? { label: "새로 반영", tone: "info" as Tone } : r.applied >= 10 && rate > OVERRIDE_MAX ? { label: "다시 검토", tone: "warn" as Tone } : { label: "잘 쓰여요", tone: "good" as Tone };
                    const ap = person(r.approver);
                    return (
                      <tr key={r.id}>
                        <td className="dc-r-main">
                          <div className="dc-rule__t dc-clamp">{r.text}</div>
                          <div className="dc-rule__s"><ScopeTag scope={r.scope} /><span className="ellipsis">{r.docType} · 승인 {ap?.name ?? "미정"} · <span className="num">{when(r.createdAt, d.today)}</span>부터</span></div>
                        </td>
                        <td className="r dc-rule__n"><span className="num">{r.applied}</span></td>
                        <td className="r dc-rule__n"><span className="num">{r.overridden}</span><span className="dc-rule__pct faint xs num">{Math.round(rate * 100)}%</span></td>
                        <td className="dc-r-st"><Chip tone={st.tone} dot sm>{st.label}</Chip></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={<BookCheck />} title="아직 운영 중인 규칙이 없어요">후보를 반영하면 여기에 모여요</Empty>}
          <div className="dc-assets">
            <div className="dc-assets__t">승인한 규칙이 가는 곳</div>
            <ul>
              <li><span className="dc-assets__ic tone-brand"><FileCode2 /></span><div><b>SKILL.md</b><span>각자의 AI가 초안을 쓸 때 불러와요</span></div></li>
              <li><span className="dc-assets__ic tone-violet"><LayoutTemplate /></span><div><b>템플릿 파일</b><span>판을 올려 모두 같은 틀로 써요</span></div></li>
              <li><span className="dc-assets__ic tone-amber"><ScanSearch /></span><div><b>자동 검사</b><span>제출 전에 빠진 규칙을 알려요</span></div></li>
            </ul>
          </div>
        </Card>

        {/* 최근 수정(Transactions 표) */}
        <Card className="s-12 dc-flush" title="최근 수정" sub="AI 초안과 최종본의 다른 곳이에요. 범위가 틀리면 바로 고쳐요" flush actions={<div className="dc-hide-m">{scopeFilter}</div>}>
          <div className="dc-show-m dc-mbar">{scopeFilter}</div>
          {shownCorr.length ? (
            <div className="tablewrap">
              <table className="table dc-ctable">
                <colgroup><col className="w-date" /><col className="w-doc" /><col /><col className="w-scope" /><col className="w-who" /></colgroup>
                <thead><tr><th>날짜</th><th>문서</th><th>전 → 후</th><th>범위</th><th>사람</th></tr></thead>
                <tbody>
                  {shownCorr.map((c) => {
                    const p = person(c.by);
                    return (
                      <tr key={c.id}>
                        <td className="dc-c-date num">{when(c.at, d.today)}</td>
                        <td className="dc-c-doc"><div className="cellmain"><span className="dc-doc-ic"><FilePen /></span><span className="cellmain__t dc-clamp">{c.doc}</span></div></td>
                        <td className="dc-c-diff"><Diff before={c.before} after={c.after} /></td>
                        <td className="dc-c-scope">
                          <span className={`chip chip--sm dc-scope dc-scope--${c.scope} dc-scopesel`}>
                            <i className="chip__dot" />{SCOPE[c.scope].label}<ChevronDown aria-hidden />
                            <select aria-label={`${c.doc} 수정의 범위 바꾸기`} value={c.scope} onChange={(e) => setScope(c.id, e.target.value as Scope)}>
                              {c.scope === "unsorted" && <option value="unsorted" disabled>미분류</option>}
                              {(["writing", "template", "once"] as Scope[]).map((s) => <option key={s} value={s}>{SCOPE[s].label}</option>)}
                            </select>
                          </span>
                        </td>
                        <td className="dc-c-who"><span className="dc-who"><Avatar name={p?.name ?? "?"} size="sm" /><span className="ellipsis">{p?.name ?? "구성원"}</span></span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={<FilePen />} title="이 범위의 수정이 없어요">다른 범위를 골라 보세요</Empty>}
        </Card>

        {/* 산출물(Invoicing 'All Invoices') */}
        <Card className="s-12 dc-flush" title="산출물" sub={`AI 초안 ${aiArts}건 · 판마다 사람이 고친 수를 남겨요`} flush
          actions={<PillSelect label="상태" value={artF} onChange={setArtF} options={[{ value: "all", label: "모든 상태" }, { value: "draft", label: "초안" }, { value: "review", label: "검토 중" }, { value: "final", label: "확정" }]} />}>
          {arts.length ? (
            <div className="tablewrap">
              <table className="table dc-atable">
                <colgroup><col /><col className="w-type" /><col className="w-v" /><col className="w-ai" /><col className="w-own" /><col className="w-st" /><col className="w-c" /><col className="w-up" /></colgroup>
                <thead><tr><th>산출물</th><th>종류</th><th>판</th><th>작성</th><th>담당</th><th>상태</th><th className="r">수정</th><th className="r">고친 날</th></tr></thead>
                <tbody>
                  {arts.map((a) => {
                    const pj = d.projects.find((p) => p.id === a.projectId);
                    const own = person(a.owner);
                    return (
                      <tr key={a.id}>
                        <td className="dc-a-main">
                          <div className="cellmain">
                            <span className="dc-doc-ic dc-doc-ic--art"><FileText /></span>
                            <div style={{ minWidth: 0 }}>
                              <div className="cellmain__t ellipsis" title={a.title}>{a.title}</div>
                              <div className="cellmain__s ellipsis">{pj?.name ?? "프로젝트"}<span className="dc-show-m-i"> · {a.type}</span></div>
                            </div>
                          </div>
                        </td>
                        <td className="dc-a-type"><Chip tone="outline" sm>{a.type}</Chip></td>
                        <td className="dc-a-v"><span className="dc-ver num">v{a.version}</span></td>
                        <td className="dc-a-ai">{a.aiDraft ? <Chip tone="brand" sm icon={<Sparkles />}>AI 초안</Chip> : <span className="muted small">직접 작성</span>}</td>
                        <td className="dc-a-own"><span className="dc-who"><Avatar name={own?.name ?? "?"} size="sm" /><span className="ellipsis">{own?.name ?? "구성원"}</span></span></td>
                        <td className="dc-a-st"><Chip tone={ART_STATUS[a.status].tone} dot sm>{ART_STATUS[a.status].label}</Chip></td>
                        <td className="dc-a-c r"><span className="num dc-cnt">{a.corrections}</span><span className="faint xs">건</span></td>
                        <td className="dc-a-up r num">{when(a.updated, d.today)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty icon={<FileText />} title="이 상태의 산출물이 없어요">다른 상태를 골라 보세요</Empty>}
        </Card>
      </div>
      <p className="faint xs dc-foot"><span className="num">{longDate(d.today)}</span> 기준 · 숫자·사람·회사는 모두 예시 데이터예요.</p>
    </>
  );
}
