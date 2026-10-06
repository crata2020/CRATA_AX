// 프로젝트 화면 조각: 칸반 레인·카드(post_1.jpg, refs/orbixcrm-projects-kanban-light.jpg),
// 사업 구조 카드(사업 > 프로젝트 > 파트), 일정 가로 막대(refs/orbixcrm-milestones-calendar.jpg의 머리 + 오늘 세로선), 새 프로젝트 서랍.
import { useState, type ReactNode } from "react";
import {
  Bot, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock3, FolderTree, Layers, ListChecks, Lock, MessageSquare, MoreHorizontal,
  Paperclip, Plus, TriangleAlert, UserCheck, UserRound,
} from "lucide-react";
import { useApp } from "@/data/store";
import { daysLeft, dday, longDate, md, mdw, slash, toDate, when } from "@/data/format";
import type { BusinessLine, DataClass, Project, Task, TaskStatus } from "@/data/types";
import { Avatar, AvatarStack, Bar, Button, Card, Chip, Empty, IconButton, PillSelect, Segmented, cx, type Tone } from "@/ui";
import { useWidth } from "@/ui/charts";
import { ClassChip, DueChip, STATUS, Sq, addDays, iso } from "./Tasks.parts";
import { Drawer } from "@/ui";

export const HEALTH: Record<Project["health"], { label: string; tone: Tone }> = {
  good: { label: "좋음", tone: "good" }, warn: { label: "주의", tone: "warn" }, risk: { label: "위험", tone: "bad" },
};
const PSTATUS: Record<Project["status"], string> = { planned: "준비", active: "진행", hold: "보류", done: "끝남" };

// ───────── 보드
export const LANES: TaskStatus[] = ["stuck", "doing", "review", "done"];

export function Board({ tasks, projects, lines, onOpen, onAdd }: {
  tasks: Task[]; projects: Project[]; lines: BusinessLine[]; onOpen: (id: string) => void; onAdd: (s: TaskStatus) => void;
}) {
  const { d, person } = useApp();
  return (
    <div className="pj-boardwrap">
      <div className="pj-board">
        {LANES.map((s) => {
          const list = tasks.filter((t) => t.status === s);
          return (
            <section key={s} className="pj-lane" aria-labelledby={`pj-l-${s}`}>
              <header className="pj-lane__head">
                <Sq color={STATUS[s].color} />
                <h2 id={`pj-l-${s}`} className="pj-lane__t">{STATUS[s].label}<span className="num">({list.length})</span></h2>
                <IconButton label={`${STATUS[s].label} 더보기`} size="sm" plain><MoreHorizontal /></IconButton>
                <IconButton label={`${STATUS[s].label}에 업무 추가`} size="sm" plain onClick={() => onAdd(s)}><Plus /></IconButton>
              </header>
              <div className="pj-lane__body">
                {list.map((t) => {
                  const p = projects.find((x) => x.id === t.projectId);
                  const line = p ? lines.find((l) => l.id === p.lineId) : undefined;
                  const names = [t.assignee, t.reviewer, ...(p?.members ?? [])].filter((v, i, a) => a.indexOf(v) === i).map((id) => person(id)?.name ?? "?");
                  return (
                    <article key={t.id} className={cx("pj-card", s === "stuck" && "pj-card--stuck")} onClick={() => onOpen(t.id)}>
                      <div className="pj-card__proj"><i style={{ background: line?.color ?? "var(--faint)" }} /><span className="ellipsis">{p?.name ?? "새 프로젝트"}{t.part && ` · ${t.part}`}</span></div>
                      <h3><button type="button" className="pj-card__t" onClick={(e) => { e.stopPropagation(); onOpen(t.id); }}>{t.title}</button></h3>
                      <div className="pj-card__meta">
                        <span className={cx(s !== "done" && daysLeft(t.due, d.today) < 0 && "is-late")}><CalendarDays />{mdw(t.due)}</span>
                        <span><Clock3 />{t.hours}시간</span>
                      </div>
                      <p className="pj-card__d">{t.desc}</p>
                      {s === "stuck" && t.blocker && <div className="pj-card__flag pj-card__flag--bad"><TriangleAlert />{t.blocker}</div>}
                      {s === "review" && t.submittedVia === "ai" && t.submittedAt && <div className="pj-card__flag pj-card__flag--ai"><Bot />{t.aiClient}로 제출 · {when(t.submittedAt, d.today)}</div>}
                      <div className="pj-card__bar"><Bar value={t.progress} color={STATUS[s].color} label={`${t.title} 진행률`} /></div>
                      <div className="pj-card__pct"><span>{s === "done" ? "완료" : s === "review" ? "검토 중" : s === "stuck" ? "멈춤" : "진행"}</span><span className="num">{t.progress}%</span></div>
                      <div className="pj-card__foot">
                        <span title="체크리스트"><ListChecks /><span className="num">{t.checklist[0]}/{t.checklist[1]}</span></span>
                        <span title="댓글"><MessageSquare /><span className="num">{t.comments}</span></span>
                        <span title="파일"><Paperclip /><span className="num">{t.files}</span></span>
                        <span className="pj-card__ppl"><AvatarStack names={names} max={2} /></span>
                      </div>
                    </article>
                  );
                })}
                {!list.length && <p className="pj-lane__empty">비어 있어요</p>}
                <button type="button" className="pj-add" onClick={() => onAdd(s)}><Plus />업무 추가</button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ───────── 사업 구조(사업 > 프로젝트 > 파트)
export function Structure({ lines, projects, tasks, onAddProject }: { lines: BusinessLine[]; projects: Project[]; tasks: Task[]; onAddProject: (lineId: string) => void }) {
  const { d, person } = useApp();
  const shown = lines.filter((l) => projects.some((p) => p.lineId === l.id));
  const parts = projects.reduce((s, p) => s + p.parts.length, 0);
  const hypo = lines.filter((l) => l.hypothesis).length;
  if (!shown.length) return <section className="card"><Empty icon={<FolderTree />} title="조건에 맞는 프로젝트가 없어요">사업 칩이나 필터를 바꿔 보세요</Empty></section>;
  return (
    <>
      <section className="card pj-lead">
        <span className="pj-lead__ic tone-brand"><FolderTree /></span>
        <div className="pj-lead__txt">
          <h2>사업 › 프로젝트 › 파트는 모든 것의 뼈대예요</h2>
          <p>회의 구간 분류, 업무 배정, 문서·규칙이 모두 이 구조에 붙어요. 진단에서 뽑은 구조는 <span className="pj-hypo">가설</span>로 두고, 회사가 확인하면 지워요.</p>
        </div>
        <dl className="pj-lead__stats">
          <div><dt>사업</dt><dd className="num">{shown.length}</dd></div>
          <div><dt>프로젝트</dt><dd className="num">{projects.length}</dd></div>
          <div><dt>파트</dt><dd className="num">{parts}</dd></div>
          <div><dt>확인할 가설</dt><dd className="num">{hypo}</dd></div>
        </dl>
      </section>
      <div className="pj-tree">
        {shown.map((l) => {
          const ps = projects.filter((p) => p.lineId === l.id);
          const open = tasks.filter((t) => t.status !== "done" && ps.some((p) => p.id === t.projectId)).length;
          const avg = Math.round(ps.reduce((s, p) => s + p.progress, 0) / ps.length);
          return (
            <section key={l.id} className="card pj-line">
              <header className="pj-line__head">
                <span className={`pj-line__code tone-${l.hue}`}>{l.code}</span>
                <div className="pj-line__txt">
                  <h2 className="pj-line__name">{l.name}{l.hypothesis && <span className="pj-hypo" title="진단 전 가설이에요. 회사가 확인하면 지워져요">가설</span>}</h2>
                  <p className="pj-line__desc">{l.desc}</p>
                </div>
                <dl className="pj-line__stats">
                  <div><dt>프로젝트</dt><dd className="num">{ps.length}</dd></div>
                  <div><dt>열린 업무</dt><dd className="num">{open}</dd></div>
                  <div><dt>평균 진행</dt><dd className="num">{avg}%</dd></div>
                </dl>
              </header>
              <div className="pj-line__body">
                {ps.map((p) => {
                  const o = person(p.owner), r = person(p.reviewer);
                  return (
                    <article key={p.id} className="pj-pc">
                      <div className="pj-pc__top"><span className="pj-pc__code">{p.code}</span><Chip tone={HEALTH[p.health].tone} dot sm>{HEALTH[p.health].label}</Chip></div>
                      <h3 className="pj-pc__name">{p.name}</h3>
                      <div className="pj-pc__sub">{p.customer ?? "사내"} · {PSTATUS[p.status]} · 마감 {slash(p.due)}</div>
                      <div className="pj-pc__prog"><Bar value={p.progress} color={l.color} label={`${p.name} 진행률`} /><span className="num">{p.progress}%</span></div>
                      <ul className="pj-parts" aria-label="파트">
                        {p.parts.map((part) => {
                          const n = tasks.filter((t) => t.projectId === p.id && t.part === part && t.status !== "done").length;
                          return <li key={part}><span>{part}</span><span className="num">{n ? `업무 ${n}` : "—"}</span></li>;
                        })}
                      </ul>
                      <div className="pj-pc__ppl">
                        <span title={`담당 ${o?.name}`}><Avatar name={o?.name ?? "?"} size="sm" /><span className="ellipsis"><em>담당</em>{o?.name}</span></span>
                        <span title={`검토 ${r?.name}`}><Avatar name={r?.name ?? "?"} size="sm" /><span className="ellipsis"><em>검토</em>{r?.name}</span></span>
                      </div>
                      <div className="pj-pc__chips"><ClassChip c={p.dataClass} />{p.status !== "done" && <DueChip due={p.due} today={d.today} />}</div>
                    </article>
                  );
                })}
                <button type="button" className="pj-pc pj-pc--add" onClick={() => onAddProject(l.id)}><Plus />{l.name}에 프로젝트 추가</button>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

// ───────── 일정(가로 막대 + 오늘 세로선)
/** 데이터에 시작일이 없어서 둔 예시 시작일 */
const START: Record<string, string> = {
  "pj-exh": "2026-07-01", "pj-saf": "2026-07-01", "pj-ppm": "2026-08-03", "pj-clm": "2026-09-18", "pj-d52": "2026-08-24", "pj-press": "2026-09-07", "pj-ax": "2026-09-14",
  "pj-edu-a": "2026-09-14", "pj-edu-b": "2026-09-28", "pj-ssi-a": "2026-09-01", "pj-ara-mcp": "2026-08-17", "pj-ara-well": "2026-10-19", "pj-core": "2026-07-01",
};
const between = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
const LABEL_W = 248;

export function Timeline({ lines, projects, tasks }: { lines: BusinessLine[]; projects: Project[]; tasks: Task[] }) {
  const { d } = useApp();
  const [zoom, setZoom] = useState<"all" | "6w">("all");
  const [shift, setShift] = useState(0);
  const [ref, w] = useWidth<HTMLDivElement>();
  const startOf = (p: Project) => START[p.id] ?? addDays(d.today, p.status === "planned" ? 7 : -14);
  let from: string, to: string;
  if (zoom === "all") {
    const s0 = projects.map(startOf).sort()[0] ?? d.today, e0 = projects.map((p) => p.due).sort().slice(-1)[0] ?? d.today;
    const a = toDate(s0), b = toDate(e0);
    from = iso(new Date(a.getFullYear(), a.getMonth(), 1));
    to = iso(new Date(b.getFullYear(), b.getMonth() + 1, 1));
  } else {
    const t = toDate(d.today); const mon = addDays(d.today, -((t.getDay() + 6) % 7));
    from = addDays(mon, -14 + shift * 7); to = addDays(from, 42);
  }
  const span = Math.max(1, between(from, to));
  const pct = (s: string) => Math.max(0, Math.min(100, (between(from, s) / span) * 100));
  const trackW = Math.max(0, w - LABEL_W);
  const ticks: { at: number; label: string; sub?: string }[] = [];
  if (zoom === "all") {
    for (let m = toDate(from); iso(m) < to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) ticks.push({ at: pct(iso(m)), label: `${m.getMonth() + 1}월` });
  } else {
    for (let i = 0; i < 6; i++) { const s = addDays(from, i * 7); ticks.push({ at: pct(s), label: slash(s), sub: `${i + 1 + shift - 2 >= 0 ? "" : ""}` }); }
  }
  const todayAt = pct(d.today);
  const todayIn = d.today >= from && d.today <= to;
  const shown = lines.filter((l) => projects.some((p) => p.lineId === l.id));

  return (
    <Card className="pj-time" title="일정" icon={<CalendarRange />} sub="프로젝트별 시작부터 마감까지. 세로선이 오늘이에요"
      actions={
        <>
          <span className="pj-time__date">{longDate(d.today).replace(/ \S+요일$/, "")}</span>
          {zoom === "6w" && (
            <span className="pj-nav">
              <IconButton label="이전 주" size="sm" plain onClick={() => setShift((v) => v - 1)}><ChevronLeft /></IconButton>
              <button type="button" onClick={() => setShift(0)}>오늘</button>
              <IconButton label="다음 주" size="sm" plain onClick={() => setShift((v) => v + 1)}><ChevronRight /></IconButton>
            </span>
          )}
          <PillSelect label="기간" value={zoom} onChange={(v) => { setZoom(v); setShift(0); }} options={[{ value: "all", label: "전체 기간" }, { value: "6w", label: "6주" }]} />
        </>
      } flush>
      {!shown.length ? <Empty icon={<CalendarRange />} title="조건에 맞는 프로젝트가 없어요" /> : (
        <div className="pj-gscroll">
          <div className="pj-gantt" ref={ref}>
            <div className="pj-gantt__axis">
              <div className="pj-gantt__corner">프로젝트</div>
              <div className="pj-gantt__ticks">
                {ticks.map((t) => <span key={t.label} style={{ left: `${t.at}%` }}>{t.label}</span>)}
                {todayIn && <span className="pj-gantt__today" style={{ left: `${todayAt}%` }}>오늘 {slash(d.today)}</span>}
              </div>
            </div>
            <div className="pj-gantt__body">
              <div className="pj-gantt__grid" aria-hidden>
                {ticks.map((t) => <i key={t.label} style={{ left: `${t.at}%` }} />)}
                {todayIn && <b style={{ left: `${todayAt}%` }} />}
              </div>
              {shown.map((l) => (
                <div key={l.id} className="pj-gantt__group" role="rowgroup" aria-label={l.name}>
                  <div className="pj-gantt__gh"><span className="tagsq"><i style={{ background: l.color }} />{l.name}</span>{l.hypothesis && <span className="pj-hypo">가설</span>}</div>
                  {projects.filter((p) => p.lineId === l.id).map((p) => {
                    const s = startOf(p);
                    const a = pct(s), b = pct(p.due);
                    const width = Math.max(b - a, 0.6);
                    const px = (width / 100) * trackW;
                    const cutL = s < from, cutR = p.due > to;
                    const marks = tasks.filter((t) => t.projectId === p.id && t.status !== "done" && t.due >= from && t.due <= to);
                    const visible = b > 0 && a < 100;
                    return (
                      <div key={p.id} className="pj-gantt__row">
                        <div className="pj-gantt__label">
                          <div className="pj-gantt__name ellipsis" title={p.name}>{p.name}</div>
                          <div className="pj-gantt__meta"><span className="num">{md(s)} – {md(p.due)}</span><Chip tone={p.health === "risk" ? "bad" : daysLeft(p.due, d.today) <= 7 ? "warn" : "neutral"} sm>{dday(p.due, d.today)}</Chip></div>
                        </div>
                        <div className="pj-gantt__track">
                          {visible && (
                            <div className={cx("pj-bar", `tone-${l.hue}`, cutL && "is-cut-l", cutR && "is-cut-r", p.status === "planned" && "is-planned")}
                              style={{ left: `${a}%`, width: `${width}%` }} title={`${p.name} · ${md(s)} – ${md(p.due)} · ${p.progress}%`}>
                              <i style={{ width: `${p.progress}%`, background: l.color }} />
                              {px > 64 ? <span className="pj-bar__t num">{p.progress}%</span> : null}
                            </div>
                          )}
                          {visible && px <= 64 && <span className="pj-bar__out num" style={{ left: `calc(${b}% + 8px)` }}>{p.progress}%</span>}
                          {!cutR && visible && <span className="pj-bar__due" style={{ left: `${b}%`, background: l.color }} title={`마감 ${md(p.due)}`} />}
                          {marks.map((t) => <span key={t.id} className="pj-mark" style={{ left: `${pct(t.due)}%`, background: STATUS[t.status].color }} title={`${t.title} · ${md(t.due)} 마감 · ${STATUS[t.status].label}`} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="pj-time__legend">
        <span><i className="pj-legend-bar" />진행한 만큼 진하게</span>
        <span><i className="pj-legend-dot" />업무 마감(상태 색)</span>
        <span><i className="pj-legend-today" />오늘</span>
        <span className="faint">시작일은 예시예요</span>
      </div>
    </Card>
  );
}

// ───────── 새 프로젝트 서랍
export function NewProjectDrawer({ open, lineId, onClose, onCreate }: { open: boolean; lineId?: string; onClose: () => void; onCreate: (p: Project) => void }) {
  if (!open) return null;
  return <NewProjectBody lineId={lineId} onClose={onClose} onCreate={onCreate} />;
}
function NewProjectBody({ lineId, onClose, onCreate }: { lineId?: string; onClose: () => void; onCreate: (p: Project) => void }) {
  const { d, me, person, toast } = useApp();
  const [line, setLine] = useState(lineId ?? d.lines[0]!.id);
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [owner, setOwner] = useState(me.id);
  const [reviewer, setReviewer] = useState(d.people.find((p) => p.platform === "reviewer" && p.id !== me.id)?.id ?? d.people[0]!.id);
  const [due, setDue] = useState(addDays(d.today, 60));
  const [cls, setCls] = useState<DataClass>("L1");
  const [parts, setParts] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const L = d.lines.find((l) => l.id === line)!;
  const addPart = () => { const v = draft.trim(); if (v && !parts.includes(v)) setParts((l) => [...l, v]); setDraft(""); };
  const create = () => {
    const n = d.lines.length;
    onCreate({ id: `pj-new-${Date.now()}`, code: `${L.code}-NEW${n}`, name: name.trim(), lineId: line, owner, reviewer, members: [owner, reviewer], status: "planned", health: "good", due, progress: 0, parts: parts.length ? parts : ["기본"], dataClass: cls, customer: customer.trim() || undefined });
    toast(`“${name.trim()}” 프로젝트를 만들었어요`);
    onClose();
  };
  const field = (icon: ReactNode, label: string, el: ReactNode) => <label className="tk-pillbtn">{icon}{label}{el}</label>;
  return (
    <Drawer open title="새 프로젝트" onClose={onClose} foot={<><Button onClick={onClose}>취소</Button><Button variant="brand" icon={<Plus />} disabled={!name.trim()} onClick={create}>프로젝트 만들기</Button></>}>
      <div className="tk-dr__pills">
        <label className="tk-pill tk-pill--btn"><Sq color={L.color} />{L.name}
          <select aria-label="사업" value={line} onChange={(e) => setLine(e.target.value)}>{d.lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        </label>
        {L.hypothesis && <span className="pj-hypo">가설 사업</span>}
      </div>
      <input className="tk-new__title" value={name} onChange={(e) => setName(e.target.value)} placeholder="프로젝트 이름을 적어 주세요" aria-label="프로젝트 이름" autoFocus />
      <label className="tk-field"><Layers /><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="고객·기관(없으면 비워 두세요)" aria-label="고객" /></label>
      <div className="tk-pillrow">
        {field(<CalendarDays />, `마감 ${md(due)}`, <input type="date" aria-label="마감일" value={due} min={d.today} onChange={(e) => e.target.value && setDue(e.target.value)} />)}
        {field(<UserRound />, `담당 · ${person(owner)?.name}`, <select aria-label="담당" value={owner} onChange={(e) => setOwner(e.target.value)}>{d.people.filter((p) => !p.field).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}</select>)}
        {field(<UserCheck />, `검토 · ${person(reviewer)?.name}`, <select aria-label="검토자" value={reviewer} onChange={(e) => setReviewer(e.target.value)}>{d.people.filter((p) => p.platform !== "member").map((p) => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}</select>)}
      </div>
      <section className="tk-sec">
        <h3 className="tk-sec__t">데이터 등급</h3>
        <Segmented label="데이터 등급" size="sm" value={cls} onChange={setCls} options={[{ value: "L1", label: "L1 일반" }, { value: "L2", label: "L2 고객 비밀" }]} />
        <p className="faint xs" style={{ display: "flex", gap: 6, alignItems: "center" }}>{cls === "L2" && <Lock size={13} />}{cls === "L2" ? "견적·도면·클레임처럼 고객 비밀이 있으면 L2예요. AI 초안은 국내 경로가 열린 뒤에만 써요." : "일반 업무예요. 각자의 AI로 초안을 쓸 수 있어요."}</p>
      </section>
      <section className="tk-sec">
        <h3 className="tk-sec__t">파트 <span className="num faint">{parts.length}</span></h3>
        {parts.length > 0 && <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>{parts.map((p) => <button key={p} type="button" className="pj-partchip" onClick={() => setParts((l) => l.filter((x) => x !== p))} aria-label={`${p} 빼기`}>{p}<span aria-hidden>×</span></button>)}</div>}
        <label className="tk-field"><Plus /><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPart(); } }} placeholder="파트 더하기 (예: 교안, 운영, 정산)" aria-label="파트" />{draft.trim() && <Button size="sm" variant="soft" onClick={addPart}>더하기</Button>}</label>
      </section>
      <p className="faint xs">만든 프로젝트는 회의 분류와 업무 배정에 바로 쓰여요(예시 화면에서는 이 화면 안에만 남아요).</p>
    </Drawer>
  );
}
