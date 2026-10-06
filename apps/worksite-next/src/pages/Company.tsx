// 회사 DNA: refs/hope-hr-analytics.jpg(위 KPI 띠 + 'Analytic View' 큰 % · 묶음 목록 · 막대), refs/orbixcrm-growth-stats-kpis-charts.jpg(캡슐 막대·카드 머리 알약),
// refs/carenest-healthcare.jpg('Suggested Next Steps' 세로 단계 목록 → 사업 구조 나무·리듬 목록)에서 가져왔어요.
// 리서치 03: 회사가 일하는 방식을 10개 층(L1~L10, 스타일·경계·패턴)으로 뽑아 설정 → 진단 진행률, 확인 필요, 가설.
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, BookOpen, Boxes, CalendarClock, CalendarRange, Check, CheckCircle2, CircleHelp, FileDown, FileText, FlaskConical, Network, Palette,
  MessageSquareQuote, ScanSearch, Sparkles, Target, Timer, Upload, Workflow, Wrench, Zap,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { DnaLayer, Person, TenantId } from "@/data/types";
import { Avatar, Bar, Button, Card, Chip, KpiCard, MoreButton, PageHead, PillSelect, Segmented, type Hue, type Tone } from "@/ui";
import { CapsuleBars } from "@/ui/charts";
import "./Company.css";

type Group = DnaLayer["group"];
const GROUP: Record<Group, { hue: Hue; color: string; soft: string; range: string; desc: string }> = {
  스타일: { hue: "violet", color: "var(--c-violet)", soft: "var(--c-violet-soft)", range: "L1–L3", desc: "보이는 것 · 말하는 방식" },
  경계: { hue: "amber", color: "var(--c-amber)", soft: "var(--c-amber-soft)", range: "L4", desc: "서식은 스타일, 결재·구조는 패턴" },
  패턴: { hue: "blue", color: "var(--c-blue)", soft: "var(--c-blue-soft)", range: "L5–L10", desc: "일하고 결정하는 방식" },
};
const LAYER_ICON: Record<string, ReactNode> = {
  L1: <Palette />, L2: <MessageSquareQuote />, L3: <BookOpen />, L4: <FileText />, L5: <Network />,
  L6: <Boxes />, L7: <Workflow />, L8: <CalendarClock />, L9: <Wrench />, L10: <Target />,
};
// 진단 순서(리서치 03 §3.1). 지금 단계·주차는 예시예요.
const STAGES = ["계약·동의", "사전조사", "사전 인터뷰", "킥오프 워크샵", "수집·셰도잉", "AI 분석", "검증 워크샵", "확정"];
const DIAG: Record<TenantId, { stage: number; week: number; next: string }> = {
  tr: { stage: 4, week: 2, next: "검증 워크샵 10/20(화) 예정" },
  crata: { stage: 6, week: 3, next: "프로파일 v1.0 확정 10/16(금) 예정" },
};

const pct = (v: number) => Math.round(v * 100);
const confTone = (c: number): { tone: Tone; label: string } => (c >= 0.7 ? { tone: "good", label: "높음" } : c >= 0.5 ? { tone: "warn", label: "보통" } : { tone: "bad", label: "낮음" });
const HEALTH: Record<string, { tone: Tone; label: string }> = { good: { tone: "good", label: "순조" }, warn: { tone: "warn", label: "주의" }, risk: { tone: "bad", label: "위험" } };
const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

/** 확신도: 다섯 칸 + 글자(색만으로 구분하지 않게) */
function Conf({ value }: { value: number }) {
  const on = Math.round(value * 5);
  const t = confTone(value);
  return (
    <span className={`dna-conf dna-conf--${t.tone}`} aria-label={`확신도 ${pct(value)}% ${t.label}`}>
      <span className="dna-conf__cells" aria-hidden>{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < on ? "on" : ""} />)}</span>
      <b className="num">{pct(value)}%</b><span className="dna-conf__l">{t.label}</span>
    </span>
  );
}

export default function Company() {
  const { d, tenant, toast } = useApp();
  const dna = d.dna;
  const diag = DIAG[tenant];
  const [metric, setMetric] = useState<"progress" | "confidence">("progress");
  const [group, setGroup] = useState<"all" | Group>("all");
  const [answers, setAnswers] = useState<Record<string, Record<number, "yes" | "no">>>({});
  const [term, setTerm] = useState<string>(dna.glossary.find((g) => g.confirm)?.term ?? dna.glossary[0]?.term ?? "");
  const ans = answers[tenant] ?? {};

  const layers = dna.layers;
  const val = (l: DnaLayer) => (metric === "progress" ? l.progress : pct(l.confidence));
  const avgOf = (ls: DnaLayer[]) => Math.round(avg(ls.map(val)));
  const groups = (Object.keys(GROUP) as Group[]).map((g) => ({ g, ...GROUP[g], layers: layers.filter((l) => l.group === g) }));
  const lowest = layers.reduce((m, l) => (val(l) < val(m) ? l : m), layers[0]!);
  const lowConf = layers.reduce((m, l) => (l.confidence < m.confidence ? l : m), layers[0]!);

  const found = layers.reduce((s, l) => s + l.found.length, 0);
  const todos = layers.reduce((s, l) => s + l.todo.length, 0);
  const termConfirm = dna.glossary.filter((g) => g.confirm).length;
  const ruleLow = dna.assign.filter((a) => a.confidence < 0.6).length;
  const pendingHypo = dna.hypotheses.filter((_, i) => !ans[i]).length;
  const hypoLines = d.lines.filter((l) => l.hypothesis).length;

  // 역할 이름 → 사람(담당·검토자 아바타)
  const byRole = (role: string): Person | undefined =>
    d.people.find((p) => p.title === role) ?? d.people.find((p) => p.title.startsWith(role)) ?? d.people.find((p) => role.startsWith(p.title));

  const answer = (i: number, v: "yes" | "no" | null) => {
    setAnswers((a) => {
      const cur = { ...(a[tenant] ?? {}) };
      if (v) cur[i] = v; else delete cur[i];
      return { ...a, [tenant]: cur };
    });
    if (v) toast(v === "yes" ? "가설을 확정했어요. 프로파일에 반영돼요" : "아니라고 남겼어요. 다음 진단에서 다시 볼게요");
  };

  const shownLayers = group === "all" ? layers : layers.filter((l) => l.group === group);
  const sel = dna.glossary.find((g) => g.term === term);

  const tree = useMemo(() => d.lines.map((l) => ({ line: l, projects: d.projects.filter((p) => p.lineId === l.id) })), [d]);

  return (
    <>
      <PageHead
        title="회사 DNA"
        desc="회사가 일하는 방식을 10개 층으로 정리했어요. AI가 흔적에서 초안을 만들고, 회사가 확인해서 확정해요."
        actions={
          <>
            <Button variant="dark" icon={<CheckCircle2 />} count={pendingHypo} onClick={() => document.getElementById("dna-hypo")?.scrollIntoView({ behavior: "smooth", block: "center" })}>가설 확인하기</Button>
            <Button icon={<Upload />} onClick={() => toast("근거 자료는 국내 저장소에만 올라가요(예시)")}>근거 자료 올리기</Button>
            <Button icon={<FileDown />} onClick={() => toast("company_profile.yaml을 만들었어요(예시)")}>프로파일 내보내기</Button>
          </>
        }
      />

      <div className="kpirow" style={{ marginBottom: "var(--gap)" }}>
        <KpiCard icon={<CalendarRange />} hue="brand" label="진단 단계" value={`${diag.week}주차`} unit="/ 4주" foot={`지금: ${STAGES[diag.stage]} · ${diag.next}`} />
        <KpiCard icon={<ScanSearch />} hue="green" label="찾은 것" value={found} unit="개" foot="근거와 함께 프로파일에 들어가요" />
        <KpiCard icon={<CircleHelp />} hue="orange" label="확인 필요" value={todos + termConfirm + ruleLow} unit="개" foot={`층별 할 일 ${todos} · 용어 ${termConfirm} · 규칙 ${ruleLow}`} />
        <KpiCard icon={<FlaskConical />} hue="violet" label="확인 기다리는 가설" value={pendingHypo} unit="개" foot={pendingHypo === dna.hypotheses.length ? "회사가 맞다고 하면 확정돼요" : `${dna.hypotheses.length - pendingHypo}개 확인했어요`} />
      </div>

      <div className="grid g-12">
        <Card className="s-8" title="진단 한눈에" line actions={
          <>
            <PillSelect label="지표" value={metric} onChange={setMetric} options={[{ value: "progress", label: "진행률" }, { value: "confidence", label: "확신도" }]} />
            <MoreButton />
          </>
        }>
          <div className="dna-over">
            <div className="dna-over__side">
              <div className="muted small">10개 층 평균 {metric === "progress" ? "진행률" : "확신도"}</div>
              <div className="dna-over__big num">{avgOf(layers)}<span>%</span></div>
              <ul className="dna-over__groups">
                {groups.map((g) => (
                  <li key={g.g}>
                    <span className="dna-over__dot" style={{ background: g.color }} />
                    <span className="dna-over__gname">{g.g}<span className="faint xs"> {g.range}</span></span>
                    <b className="num">{avgOf(g.layers)}%</b>
                  </li>
                ))}
              </ul>
              <p className="dna-over__ai"><Sparkles />확신도가 가장 낮은 층은 {lowConf.code} {lowConf.name}({pct(lowConf.confidence)}%)이에요.{lowConf.todo[0] ? ` ‘${lowConf.todo[0]}’부터 하면 올라가요.` : ""}</p>
            </div>
            <div className="dna-over__chart">
              <CapsuleBars
                height={236} max={100} highlight={layers.indexOf(lowest)} format={(v) => `${Math.round(v)}`}
                data={layers.map((l) => ({ label: l.code, value: val(l), color: GROUP[l.group].color, soft: GROUP[l.group].soft }))}
                tipLabel={(x) => { const l = layers.find((y) => y.code === x.label)!; return <><div style={{ opacity: .7 }}>{l.code} · {l.group}</div><div>{l.name}</div><b className="num">{metric === "progress" ? "진행" : "확신"} {x.value}%</b></>; }}
              />
              <div className="dna-over__legend">
                {groups.map((g) => <span key={g.g} className="tagsq"><i style={{ background: g.color }} />{g.g}</span>)}
              </div>
            </div>
          </div>
          <ol className="dna-steps" aria-label="진단 단계">
            {STAGES.map((s, i) => {
              const st = i < diag.stage ? "done" : i === diag.stage ? "now" : "next";
              return (
                <li key={s} className={`dna-steps__i dna-steps__i--${st}`} aria-current={st === "now" ? "step" : undefined}>
                  <span className="dna-steps__dot">{st === "done" ? <Check /> : <span className="num">{i + 1}</span>}</span>
                  <span className="dna-steps__t">{s}</span>
                  <span className="dna-steps__s">{st === "done" ? "끝남" : st === "now" ? "지금" : ""}</span>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="s-4" title="가설 확인" sub="AI가 흔적에서 세운 가설이에요. 맞는지 알려 주세요" actions={<MoreButton />}
          foot={<><FlaskConical size={15} aria-hidden /><span>확인 <b className="num" style={{ color: "var(--ink)" }}>{dna.hypotheses.length - pendingHypo}/{dna.hypotheses.length}</b> · 맞다고 한 가설만 프로파일에 들어가요</span></>}>
          <div id="dna-hypo" />
          <ul className="dna-hypo">
            {dna.hypotheses.map((h, i) => {
              const a = ans[i];
              return (
                <li key={h.text}>
                  <div className="dna-hypo__t">{h.text}</div>
                  <div className="dna-hypo__conf">
                    <div style={{ flex: 1 }}><Bar value={pct(h.confidence)} color={h.confidence >= 0.7 ? "var(--c-green)" : h.confidence >= 0.5 ? "var(--c-amber)" : "var(--c-coral)"} label={`확신도 ${pct(h.confidence)}%`} /></div>
                    <span className="xs muted num" style={{ whiteSpace: "nowrap" }}>확신 {pct(h.confidence)}%</span>
                  </div>
                  {a ? (
                    <div className="row" style={{ gap: 8, marginTop: 10 }}>
                      <Chip tone={a === "yes" ? "good" : "neutral"} sm dot>{a === "yes" ? "맞아요로 확정" : "아니에요 · 다시 볼게요"}</Chip>
                      <button type="button" className="dna-link" onClick={() => answer(i, null)}>되돌리기</button>
                    </div>
                  ) : (
                    <div className="row" style={{ gap: 6, marginTop: 10 }}>
                      <Button size="sm" variant="soft" icon={<Check />} onClick={() => answer(i, "yes")}>맞아요</Button>
                      <Button size="sm" variant="ghost" onClick={() => answer(i, "no")}>아니에요</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="s-12 dna-wraphead" title="10개 층" sub="스타일은 홈페이지·문서에서, 패턴은 회의·결재·폴더 같은 내부 흔적에서 찾아요" actions={
          <Segmented label="묶음" size="sm" value={group} onChange={setGroup} options={[
            { value: "all", label: "전체", n: layers.length },
            ...(Object.keys(GROUP) as Group[]).map((g) => ({ value: g, label: g, n: layers.filter((l) => l.group === g).length })),
          ]} />
        }>
          <p className="dna-swipe">옆으로 넘겨 {shownLayers.length}개 층을 볼 수 있어요</p>
          <div className="dna-layers">
            {shownLayers.map((l) => {
              const g = GROUP[l.group];
              return (
                <article key={l.code} className="dna-layer">
                  <div className="dna-layer__top">
                    <span className={`dna-layer__ic tone-${g.hue}`}>{LAYER_ICON[l.code]}</span>
                    <span className="dna-layer__code num">{l.code}</span>
                    <span className={`chip chip--sm tone-${g.hue}`} style={{ marginLeft: "auto" }}>{l.group}</span>
                  </div>
                  <h3 className="dna-layer__name">{l.name}</h3>
                  <div className="dna-layer__row"><span className="muted">진행</span><b className="num">{l.progress}%</b></div>
                  <Bar value={l.progress} color={g.color} label={`${l.code} 진행률`} />
                  <div className="dna-layer__row" style={{ marginTop: 10 }}><span className="muted">확신도</span><Conf value={l.confidence} /></div>
                  <div className="dna-layer__sec">찾은 것</div>
                  <div className="dna-tags">{l.found.map((f) => <span key={f} className="dna-tag">{f}</span>)}</div>
                  <div className={`dna-layer__todo${l.todo.length ? "" : " dna-layer__todo--none"}`}>
                    {l.todo.length ? <><CircleHelp aria-hidden /><span>할 일 · {l.todo.join(", ")}</span></> : <><Check aria-hidden /><span>할 일 없어요</span></>}
                  </div>
                </article>
              );
            })}
          </div>
        </Card>

        <Card className="s-12 dna-wraphead" title="사업 구조" sub="사업 › 프로젝트 › 파트. 업무·회의·문서가 모두 이 뼈대에 붙어요" actions={<>{hypoLines > 0 && <Chip tone="warn" sm>가설 {hypoLines}</Chip>}<MoreButton /></>}>
          <div className="dna-org">
            <div className="dna-org__root"><span className="dna-org__mono">{d.monogram}</span><span><b>{d.shortName}</b><span className="xs muted"> · 사업 {d.lines.length} · 프로젝트 {d.projects.length}</span></span></div>
            <p className="dna-swipe">옆으로 넘겨 사업 {tree.length}개를 볼 수 있어요</p>
            <div className="dna-org__cols" style={{ ["--n" as string]: tree.length }}>
              {tree.map(({ line, projects }) => (
                <section key={line.id} className="dna-org__col" aria-label={line.name}>
                  <div className="dna-org__head">
                    <span className="dna-tree__sq" style={{ background: line.color }} aria-hidden />
                    <span className="dna-org__lname ellipsis">{line.name}</span>
                    <span className="dna-org__n num">{projects.length}</span>
                  </div>
                  <div className="dna-org__meta"><span className="faint xs num">{line.code}</span>{line.hypothesis ? <Chip tone="warn" sm>가설</Chip> : <Chip tone="good" sm>확정</Chip>}</div>
                  <p className="dna-org__desc">{line.desc}</p>
                  <ul className="dna-org__ps">
                    {projects.map((p) => (
                      <li key={p.id} className="dna-org__p">
                        <div className="dna-org__pt">{p.name}</div>
                        <div className="dna-tree__parts">{p.parts.map((x) => <span key={x} className="dna-tag dna-tag--sm">{x}</span>)}</div>
                        <div className="dna-org__chips">
                          <Chip tone={p.dataClass === "L2" ? "bad" : "outline"} sm>{p.dataClass}</Chip>
                          <Chip tone={HEALTH[p.health]!.tone} sm dot>{HEALTH[p.health]!.label}</Chip>
                        </div>
                        <div className="dna-org__prog"><Bar value={p.progress} color={line.color} label={`${p.name} 진행률`} /><span className="num xs">{p.progress}%</span></div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </Card>

        <Card className="s-12" title="배분 규칙" sub="일이 생기면 누가 맡고 누가 검토하는지예요. 현장 등록·메일·회의 액션의 추천 담당에 써요" actions={<MoreButton />} flush>
          <div className="tablewrap">
            <table className="table">
              <thead><tr><th>언제</th><th>담당</th><th>검토자</th><th>근거</th><th>신뢰도</th><th>상태</th></tr></thead>
              <tbody>
                {dna.assign.map((r) => {
                  const a = byRole(r.assignee), v = byRole(r.reviewer);
                  const ok = r.confidence >= 0.7;
                  return (
                    <tr key={r.id}>
                      <td><div className="cellmain"><span className="dna-when"><Zap /></span><span className="cellmain__t" style={{ whiteSpace: "nowrap" }}>{r.when}</span></div></td>
                      <td><div className="row" style={{ gap: 8, whiteSpace: "nowrap" }}><ArrowRight size={15} className="faint" aria-hidden />{a && <Avatar name={a.name} size="sm" />}<span className="strong">{r.assignee}</span></div></td>
                      <td><div className="row" style={{ gap: 8, whiteSpace: "nowrap" }}>{v && <Avatar name={v.name} size="sm" />}<span>{r.reviewer}</span></div></td>
                      <td className="muted" style={{ minWidth: 160 }}>{r.basis}</td>
                      <td><div className="dna-rconf"><Bar value={pct(r.confidence)} color={ok ? "var(--c-green)" : "var(--c-amber)"} label={`신뢰도 ${pct(r.confidence)}%`} /><span className="num small">{pct(r.confidence)}%</span></div></td>
                      <td>{ok ? <Chip tone="good" sm dot>추천에 써요</Chip> : <Chip tone="warn" sm dot>확인 필요</Chip>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="s-6" title="회의·업무 리듬" sub="L8 · 캘린더와 회의 녹음에서 찾았어요" actions={<MoreButton />}>
          <ul className="list">
            {dna.cadences.map((c) => {
              const p = byRole(c.owner);
              return (
                <li key={c.name}>
                  <span className="dna-cad__ic tone-blue"><CalendarClock /></span>
                  <div className="list__main">
                    <div className="list__t ellipsis">{c.name}</div>
                    <div className="list__s">{c.rule} · {c.owner}</div>
                  </div>
                  {p && <Avatar name={p.name} size="sm" />}
                  <Chip tone="outline" sm>다음 {c.next}</Chip>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="s-6" title="용어집" sub="L3 · 문서·회의에서 찾은 회사 말이에요" actions={termConfirm ? <Chip tone="warn" sm dot>확인 필요 {termConfirm}</Chip> : <Chip tone="good" sm dot>모두 확인</Chip>}>
          <div className="dna-terms" role="group" aria-label="용어">
            {dna.glossary.map((g) => (
              <button key={g.term} type="button" className={`dna-term${g.confirm ? " dna-term--q" : ""}`} aria-pressed={g.term === term} onClick={() => setTerm(g.term)}>
                {g.term}{g.confirm && <span className="dna-term__q">확인 필요</span>}
              </button>
            ))}
          </div>
          {sel && (
            <div className="dna-def">
              <div className="between"><b className="dna-def__t">{sel.term}</b>{sel.confirm ? <Chip tone="warn" sm>뜻 확인 필요</Chip> : <Chip tone="good" sm icon={<Check />}>확인됨</Chip>}</div>
              <p className="dna-def__m">{sel.meaning}</p>
              {sel.alias?.length ? <div className="xs muted" style={{ marginTop: 6 }}>다른 말: {sel.alias.join(", ")}</div> : null}
              {sel.confirm && <Button size="sm" variant="soft" style={{ marginTop: 10 }} onClick={() => toast(`‘${sel.term}’ 뜻을 담당에게 물어볼게요`)}>담당에게 묻기</Button>}
            </div>
          )}
          <p className="dna-note"><Sparkles aria-hidden />회의·문서에 새 말이 나오면 AI가 후보로 올려요. 확인한 말은 문서 초안과 회의 분류에 써요.</p>
        </Card>
      </div>
      <p className="faint xs" style={{ marginTop: 16, display: "flex", gap: 6, alignItems: "center" }}><Timer size={14} />숫자·사람·진단 일정은 모두 예시예요. 사람은 역할로만 기록하고, 인사평가에는 쓰지 않아요.</p>
    </>
  );
}
