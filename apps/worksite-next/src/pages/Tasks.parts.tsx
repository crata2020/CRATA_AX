// 업무 공통 조각(내 업무 · 프로젝트 화면이 함께 씀).
// - 상태·출처 메타, 마감 칩, 데이터 등급 칩, 체크리스트(예시 항목)
// - 업무 상세 서랍: Orbix CRM 'Add new projects' 서랍(refs/orbixcrm-add-project-drawer.jpg)의 알약 줄 → 속성 목록 → 바닥 동작
// - 새 업무 서랍: 같은 서랍 + 프로젝트 고르기 펼침(refs/orbixcrm-add-project-dropdown-detail.jpg), 점선 '파일 올리기'
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight, Bot, CalendarDays, Check, ChevronDown, Clock3, Factory, FileText, FolderClosed, Layers, ListChecks, Lock, Mail, MessageSquare,
  Mic, Paperclip, PenLine, Play, Plus, RotateCcw, Search, Send, Sparkles, TriangleAlert, UserCheck, UserRound, X,
} from "lucide-react";
import { useApp } from "@/data/store";
import { daysLeft, dday, md, mdw, num, toDate, when } from "@/data/format";
import type { DataClass, Person, Project, Task, TaskSource, TaskStatus, TenantData } from "@/data/types";
import { Avatar, Bar, Button, Checkbox, Chip, Drawer, IconButton, Menu, cx, type Tone } from "@/ui";
import "./Tasks.css";

// ───────── 메타
export const STATUS_ORDER: TaskStatus[] = ["stuck", "doing", "review", "todo", "done"];
export const STATUS: Record<TaskStatus, { label: string; tone: Tone; color: string }> = {
  stuck: { label: "막힘", tone: "bad", color: "var(--c-coral)" },
  doing: { label: "진행 중", tone: "warn", color: "var(--c-amber)" },
  review: { label: "검토 중", tone: "info", color: "var(--c-blue)" },
  todo: { label: "할 일", tone: "neutral", color: "var(--c-violet)" },
  done: { label: "완료", tone: "good", color: "var(--c-green)" },
};
export const SOURCE: Record<TaskSource, { label: string; icon: ReactNode; long: string }> = {
  meeting: { label: "회의", icon: <Mic />, long: "회의에서 나온 액션" },
  field: { label: "현장", icon: <Factory />, long: "현장 등록에서 생긴 업무" },
  mail: { label: "메일", icon: <Mail />, long: "고객 메일에서 생긴 업무" },
  ai: { label: "AI", icon: <Sparkles />, long: "AI 연결로 만든 업무" },
  claim: { label: "클레임", icon: <TriangleAlert />, long: "고객 클레임 대응" },
  manual: { label: "직접", icon: <PenLine />, long: "직접 만든 업무" },
};
export const DATA_CLASS: Record<DataClass, { label: string; tone: Tone; note: string }> = {
  L0: { label: "L0 공개", tone: "outline", note: "공개 자료예요" },
  L1: { label: "L1 일반", tone: "outline", note: "일반 업무예요. 해외 AI도 쓸 수 있어요" },
  L2: { label: "L2 고객 비밀", tone: "warn", note: "고객 비밀이에요. AI 초안은 국내 경로가 열린 뒤에만 써요" },
  L3: { label: "L3 처리 안 함", tone: "bad", note: "AI로 처리하지 않아요" },
};

export const SourceChip = ({ source }: { source: TaskSource }) => (
  <span className={`tk-src tk-src--${source}`}><Chip tone="outline" sm icon={SOURCE[source].icon}>{SOURCE[source].label}</Chip></span>
);
export const ClassChip = ({ c }: { c: DataClass }) => (
  <Chip tone={DATA_CLASS[c].tone} sm icon={c === "L2" || c === "L3" ? <Lock /> : undefined}>{DATA_CLASS[c].label}</Chip>
);
export const dueTone = (due: string, today: string): Tone => { const n = daysLeft(due, today); return n < 0 ? "bad" : n <= 1 ? "warn" : "neutral"; };
export const DueChip = ({ due, today }: { due: string; today: string }) => <Chip tone={dueTone(due, today)} sm>{dday(due, today)}</Chip>;
export const Sq = ({ color }: { color: string }) => <i className="tk-sq" style={{ background: color }} aria-hidden />;

// ───────── 날짜 도움
export const iso = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
export const addDays = (s: string, n: number) => { const dt = toDate(s); dt.setDate(dt.getDate() + n); return iso(dt); };
/** 이번 주 일요일까지 남은 날 */
export const toSunday = (today: string) => (7 - toDate(today).getDay()) % 7;

// ───────── 체크리스트(데이터에는 개수만 있어서 항목 이름은 출처별 예시)
const CHECK: Record<TaskSource, string[]> = {
  claim: ["불량 LOT 범위 확인", "검사 기록 모으기", "근거표 만들기", "고객 양식에 옮기기", "검토자 확인 받기", "고객에게 보내기"],
  meeting: ["회의 구간 다시 듣기", "할 일 나누기", "초안 쓰기", "관련자 의견 받기", "숫자 다시 확인", "제출하기"],
  field: ["현장 확인", "원인 기록", "조치하기", "재발 방지 메모"],
  mail: ["메일 원문 확인", "회신 초안 쓰기", "제출하기"],
  manual: ["자료 모으기", "초안 쓰기", "숫자·근거 확인", "다듬기", "검토 요청 메모", "제출하기"],
  ai: ["AI 초안 받기", "숫자 확인", "제출하기"],
};
const customChecklist = new Map<string, string[]>();
export function checklistFor(t: Task): { text: string; done: boolean }[] {
  const names = customChecklist.get(t.id) ?? CHECK[t.source];
  const [done, total] = t.checklist;
  return Array.from({ length: total }, (_, i) => ({ text: names[i] ?? `확인 항목 ${i + 1}`, done: i < done }));
}

// ───────── 업무 목록(스토어 + 이 화면에서 새로 만든 것)
/** 스토어에는 업무 추가 동작이 없어서, 이 화면에서 만든 업무는 화면 안에만 둡니다. */
export function useTaskList() {
  const { d, act } = useApp();
  const [local, setLocal] = useState<Task[]>([]);
  const tasks = useMemo(() => [...local, ...d.tasks], [local, d.tasks]);
  const setStatus = useCallback((id: string, s: TaskStatus) => {
    if (local.some((t) => t.id === id)) setLocal((l) => l.map((t) => (t.id === id ? { ...t, status: s, progress: s === "done" ? 100 : t.progress } : t)));
    else act.setTaskStatus(id, s);
  }, [local, act]);
  const add = useCallback((t: Task) => setLocal((l) => [t, ...l]), []);
  return { tasks, setStatus, add };
}

// ───────── 출처 찾기
function originOf(t: Task, d: TenantData, person: (id?: string | null) => Person | undefined): { title: string; detail: string; to?: string; cta?: string } {
  switch (t.source) {
    case "meeting": {
      const m = d.meetings.find((m) => m.actions.some((a) => a.title === t.title)) ?? d.meetings.find((m) => m.projectIds.includes(t.projectId));
      return m ? { title: m.title, detail: `${md(m.date)} ${m.time} · ${m.source} · ${m.duration}분`, to: `/meetings?m=${m.id}`, cta: "회의 열기" } : { title: "회의", detail: SOURCE.meeting.long };
    }
    case "field": {
      const f = d.fieldReports.find((f) => f.place.split(" · ").some((w) => w.length > 2 && t.title.includes(w)));
      return f ? { title: f.note, detail: `${f.place} · ${person(f.by)?.name ?? ""} · ${when(f.at, d.today)}`, to: "/quality", cta: "현장 보기" } : { title: "현장 등록", detail: SOURCE.field.long, to: d.pack === "manufacturing" ? "/quality" : undefined, cta: "현장 보기" };
    }
    case "claim": {
      const c = d.claims.find((c) => t.title.includes(c.no)) ?? d.claims.find((c) => c.status === "open");
      return c ? { title: `${c.no} · ${c.customer}`, detail: `${c.item} ${num(c.qty)}개 · 8D D${c.step} · 기한 ${dday(c.due, d.today)}`, to: "/quality", cta: "클레임 보기" } : { title: "고객 클레임", detail: SOURCE.claim.long };
    }
    case "mail": {
      const i = d.integrations.find((i) => i.category === "메일" && i.status === "connected");
      return { title: i ? `${i.name}로 받은 메일` : "고객 메일", detail: "메일 원문은 메일함에 두고 업무에는 링크만 붙여요" };
    }
    case "ai": return { title: "AI 연결", detail: "직원의 AI가 만든 업무예요. 완료는 검토자가 웹에서 해요" };
    default: return { title: "직접 만듦", detail: `${person(t.assignee)?.name ?? "담당"}이 업무 화면에서 만들었어요` };
  }
}

// ───────── 업무 상세 서랍
export function TaskDrawer({ task, onClose, onStatus, projects }: { task?: Task; onClose: () => void; onStatus: (id: string, s: TaskStatus) => void; projects?: Project[] }) {
  if (!task) return null;
  return <TaskDrawerBody key={task.id} t={task} onClose={onClose} onStatus={onStatus} projects={projects} />;
}

function TaskDrawerBody({ t, onClose, onStatus, projects }: { t: Task; onClose: () => void; onStatus: (id: string, s: TaskStatus) => void; projects?: Project[] }) {
  const { d, me, person, toast } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState(() => checklistFor(t));
  const p = (projects ?? d.projects).find((x) => x.id === t.projectId);
  const line = p ? d.lines.find((l) => l.id === p.lineId) : undefined;
  const a = person(t.assignee), r = person(t.reviewer);
  const isRev = t.reviewer === me.id, isMine = t.assignee === me.id;
  const origin = originOf(t, d, person);
  const doneN = items.filter((i) => i.done).length;
  const st = STATUS[t.status];

  const go = (s: TaskStatus, msg: string) => { onStatus(t.id, s); toast(msg); onClose(); };
  let hint: ReactNode = null;
  let actions: ReactNode;
  if (isRev && t.status === "review") {
    hint = "완료는 검토자만 웹에서 눌러요";
    actions = <><Button icon={<RotateCcw />} onClick={() => go("doing", "수정 요청을 보냈어요")}>수정 요청</Button><Button variant="brand" icon={<Check />} onClick={() => go("done", `“${t.title}” 승인했어요`)}>승인</Button></>;
  } else if (isMine && t.status === "todo") {
    actions = <Button variant="brand" icon={<Play />} onClick={() => go("doing", "시작했어요. 진행 중으로 옮겼어요")}>시작</Button>;
  } else if (isMine && t.status === "stuck") {
    hint = "막힌 이유가 풀렸으면 다시 시작해요";
    actions = <Button variant="brand" icon={<Play />} onClick={() => go("doing", "다시 시작했어요")}>다시 시작</Button>;
  } else if (isMine && t.status === "doing") {
    hint = "내 AI에서도 제출할 수 있어요";
    actions = <><Button icon={<TriangleAlert />} onClick={() => go("stuck", "막힘으로 표시하고 검토자에게 알렸어요")}>막힘 알리기</Button><Button variant="brand" icon={<Send />} onClick={() => go("review", "제출했어요. 검토자에게 알렸어요")}>제출</Button></>;
  } else if (isMine && t.status === "review") {
    hint = `${r?.name ?? "검토자"}의 검토를 기다려요`;
    actions = <Button disabled icon={<Clock3 />}>검토 기다리는 중</Button>;
  } else {
    hint = t.status === "done" ? "완료된 업무예요" : "담당과 검토자만 상태를 바꿀 수 있어요";
    actions = <Button onClick={onClose}>닫기</Button>;
  }

  return (
    <Drawer open title={t.title} onClose={onClose} foot={<>{hint && <span className="tk-dr__hint">{hint}</span>}{actions}</>}>
      <div className="tk-dr__pills">
        <span className="tk-pill"><Sq color={st.color} />{st.label}</span>
        {p && <span className="tk-pill"><FolderClosed />{p.name}{t.part && <span className="faint">› {t.part}</span>}</span>}
        {p && <ClassChip c={p.dataClass} />}
      </div>

      {t.status === "stuck" && t.blocker && (
        <div className="tk-callout tk-callout--bad"><TriangleAlert /><div><b>막힌 이유</b><p>{t.blocker}</p></div></div>
      )}
      {t.submittedVia && t.submittedAt && (
        <div className={cx("tk-callout", t.submittedVia === "ai" ? "tk-callout--ai" : "tk-callout--web")}>
          {t.submittedVia === "ai" ? <Bot /> : <Send />}
          <div>
            <b>{t.status !== "review" && "지난 제출 · "}{t.submittedVia === "ai" ? `${t.aiClient ?? "AI"}로 제출` : "웹에서 제출"} · {when(t.submittedAt, d.today)}</b>
            <p>{t.submittedVia === "ai" ? "AI는 제출까지만 해요. 완료는 검토자가 웹에서 눌러요." : `${a?.name ?? "담당"}이 웹에서 직접 제출했어요.`}</p>
          </div>
        </div>
      )}

      <dl className="tk-props">
        <dt><UserRound />담당</dt><dd><span className="tk-who"><Avatar name={a?.name ?? "?"} size="sm" /><span>{a?.name}<span className="faint"> · {a?.title}</span></span></span></dd>
        <dt><UserCheck />검토자</dt><dd><span className="tk-who"><Avatar name={r?.name ?? "?"} size="sm" /><span>{r?.name}<span className="faint"> · {r?.title}</span></span></span></dd>
        <dt><CalendarDays />마감</dt><dd className="row" style={{ gap: 8 }}><span className="num">{mdw(t.due)}</span>{t.status !== "done" && <DueChip due={t.due} today={d.today} />}</dd>
        <dt><ListChecks />진행률</dt><dd><span className="tk-prog"><Bar value={t.progress} color={st.color} label="진행률" /><span className="num">{t.progress}%</span></span></dd>
        <dt><Clock3 />들인 시간</dt><dd className="num">{t.hours}시간</dd>
        {line && <><dt><Layers />사업</dt><dd><span className="tagsq"><i style={{ background: line.color }} />{line.name}</span></dd></>}
      </dl>

      <section className="tk-sec">
        <h3 className="tk-sec__t">설명</h3>
        <p className="tk-desc">{t.desc}</p>
      </section>

      <section className="tk-sec">
        <div className="between"><h3 className="tk-sec__t">체크리스트 <span className="num faint">{doneN}/{items.length}</span></h3><span className="faint xs">항목 이름은 예시예요</span></div>
        {items.length ? (
          <ul className="tk-checks">
            {items.map((it, i) => (
              <li key={i} className={cx(it.done && "is-done")}>
                <Checkbox on={it.done} label={it.text} onChange={(v) => setItems((l) => l.map((x, j) => (j === i ? { ...x, done: v } : x)))} />
                <span>{it.text}</span>
              </li>
            ))}
          </ul>
        ) : <p className="faint small">체크리스트가 없어요</p>}
      </section>

      <section className="tk-sec">
        <h3 className="tk-sec__t">출처</h3>
        <div className="tk-origin">
          <span className={`tk-origin__ic tk-src--${t.source}`}>{SOURCE[t.source].icon}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="tk-origin__t">{SOURCE[t.source].label} · {origin.title}</div>
            <div className="tk-origin__s">{origin.detail}</div>
          </div>
          {origin.to && <Button size="sm" variant="ghost" onClick={() => nav(origin.to!)}>{origin.cta}<ArrowRight /></Button>}
        </div>
      </section>

      <div className="tk-dr__counts">
        <span><MessageSquare />댓글 <b className="num">{t.comments}</b></span>
        <span><Paperclip />파일 <b className="num">{t.files}</b></span>
        {p && <span><FileText />{p.code}</span>}
      </div>
    </Drawer>
  );
}

// ───────── 새 업무 서랍
export function NewTaskDrawer({ open, onClose, onCreate, preset, projects }: {
  open: boolean; onClose: () => void; onCreate: (t: Task) => void; preset?: { projectId?: string; status?: TaskStatus }; projects?: Project[];
}) {
  if (!open) return null;
  return <NewTaskBody onClose={onClose} onCreate={onCreate} preset={preset} projects={projects} />;
}

function NewTaskBody({ onClose, onCreate, preset, projects }: { onClose: () => void; onCreate: (t: Task) => void; preset?: { projectId?: string; status?: TaskStatus }; projects?: Project[] }) {
  const { d, me, person, toast } = useApp();
  const list = projects ?? d.projects;
  const first = list.find((p) => p.id === preset?.projectId) ?? list.find((p) => p.members.includes(me.id)) ?? list[0]!;
  const [pid, setPid] = useState(first.id);
  const p = list.find((x) => x.id === pid) ?? first;
  const defReviewer = (pp: Project) => (pp.reviewer !== me.id ? pp.reviewer : pp.owner !== me.id ? pp.owner : d.people.find((x) => x.platform === "owner")?.id ?? pp.reviewer);
  const [status, setStatus] = useState<TaskStatus>(preset?.status ?? "todo");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState(addDays(d.today, 3));
  const [assignee, setAssignee] = useState(me.id);
  const [reviewer, setReviewer] = useState(defReviewer(first));
  const [part, setPart] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState(0);
  const [q, setQ] = useState("");
  const l2 = p.dataClass === "L2" || p.dataClass === "L3";
  const pick = (id: string) => { const np = list.find((x) => x.id === id)!; setPid(id); setPart(""); setReviewer(defReviewer(np)); };
  const addItem = () => { const v = draft.trim(); if (v) { setItems((l) => [...l, v]); setDraft(""); } };
  const aiDraft = () => {
    setDesc(`${title.trim() || "이 업무"}: ${p.name}${part ? ` · ${part}` : ""}에 붙는 일이에요. 완료 기준은 검토자가 바로 판단할 수 있는 결과물 1개예요.`);
    if (!items.length) setItems(CHECK.manual.slice(0, 3));
    toast("AI가 설명과 체크리스트를 채웠어요. 고쳐서 쓰세요");
  };
  const create = () => {
    const id = `new-${Date.now()}`;
    if (items.length) customChecklist.set(id, items);
    onCreate({ id, title: title.trim(), projectId: p.id, part: part || undefined, assignee, reviewer, status, progress: status === "done" ? 100 : 0, due, hours: 0, source: "manual", desc: desc.trim() || "설명이 아직 없어요.", comments: 0, files, checklist: [0, items.length] });
    toast(assignee === me.id ? "업무를 만들었어요" : `업무를 만들고 ${person(assignee)?.name ?? "담당"}에게 알렸어요`);
    onClose();
  };
  const people = d.people.filter((x) => !x.field || x.id === assignee);
  const groups = d.lines.map((l) => ({ l, ps: list.filter((x) => x.lineId === l.id && (!q || x.name.includes(q) || x.code.toLowerCase().includes(q.toLowerCase()))) })).filter((g) => g.ps.length);

  return (
    <Drawer open title="새 업무" onClose={onClose} foot={
      <>
        <label className="tk-dashed"><Paperclip />{files ? `파일 ${files}개` : "파일 올리기"}<input type="file" multiple className="sr-only" onChange={(e) => setFiles(e.target.files?.length ?? 0)} /></label>
        <span className="tk-grow" />
        <Button onClick={onClose}>취소</Button>
        <Button variant="brand" icon={<Plus />} disabled={!title.trim()} onClick={create}>업무 만들기</Button>
      </>
    }>
      <div className="tk-dr__pills">
        <Menu width={300} trigger={({ toggle, open }) => (
          <button type="button" className="tk-pill tk-pill--btn" aria-expanded={open} onClick={toggle}><FolderClosed /><span className="ellipsis" style={{ maxWidth: 190 }}>{p.name}</span><ChevronDown /></button>
        )}>
          {(close) => (
            <div className="tk-pick">
              <label className="search search--filled tk-pick__q"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="프로젝트 찾기" aria-label="프로젝트 찾기" /></label>
              <div className="tk-pick__list">
                {groups.map(({ l, ps }) => (
                  <div key={l.id}>
                    <div className="menu__label"><span className="tagsq"><i style={{ background: l.color }} />{l.name}</span></div>
                    {ps.map((x) => (
                      <button key={x.id} type="button" className="menu__item" aria-current={x.id === p.id} onClick={() => { pick(x.id); close(); }}>
                        <FolderClosed /><span className="ellipsis" style={{ flex: 1 }}>{x.name}</span>{x.id === p.id && <Check />}
                      </button>
                    ))}
                  </div>
                ))}
                {!groups.length && <p className="faint small" style={{ padding: 10 }}>찾는 프로젝트가 없어요</p>}
              </div>
            </div>
          )}
        </Menu>
        <label className="tk-pill tk-pill--btn"><Sq color={STATUS[status].color} />{STATUS[status].label}<ChevronDown />
          <select aria-label="상태" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {STATUS_ORDER.filter((s) => s !== "done").map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
        </label>
        <ClassChip c={p.dataClass} />
      </div>

      <input className="tk-new__title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="업무 이름을 적어 주세요" aria-label="업무 이름" autoFocus />
      <label className="tk-field"><PenLine /><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="설명 더하기" aria-label="설명" /></label>
      <div>
        <button type="button" className="tk-ai" disabled={l2} onClick={aiDraft}><Sparkles />AI로 초안 쓰기</button>
        {l2 && <p className="tk-ai__no"><Lock />{DATA_CLASS[p.dataClass].note}</p>}
      </div>

      <div className="tk-pillrow">
        <label className="tk-pillbtn"><CalendarDays /><span className="num">{md(due)}</span>
          <input type="date" aria-label="마감일" value={due} min={d.today} onChange={(e) => e.target.value && setDue(e.target.value)} onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* 지원 안 함 */ } }} />
        </label>
        <label className="tk-pillbtn"><UserRound />담당 · {person(assignee)?.name}
          <select aria-label="담당" value={assignee} onChange={(e) => setAssignee(e.target.value)}>{people.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.title}</option>)}</select>
        </label>
        <label className="tk-pillbtn"><UserCheck />검토 · {person(reviewer)?.name}
          <select aria-label="검토자" value={reviewer} onChange={(e) => setReviewer(e.target.value)}>{d.people.filter((x) => x.platform !== "member" && x.id !== assignee).map((x) => <option key={x.id} value={x.id}>{x.name} · {x.title}</option>)}</select>
        </label>
        <label className="tk-pillbtn"><Layers />{part || "파트"}
          <select aria-label="파트" value={part} onChange={(e) => setPart(e.target.value)}><option value="">파트 없음</option>{p.parts.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </label>
      </div>

      <section className="tk-sec">
        <h3 className="tk-sec__t">체크리스트 <span className="num faint">{items.length}</span></h3>
        {items.length > 0 && (
          <ul className="tk-checks">
            {items.map((it, i) => (
              <li key={i}><ListChecks className="faint" /><span style={{ flex: 1 }}>{it}</span><IconButton label={`${it} 빼기`} size="sm" plain onClick={() => setItems((l) => l.filter((_, j) => j !== i))}><X /></IconButton></li>
            ))}
          </ul>
        )}
        <label className="tk-field"><Plus /><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} placeholder="체크리스트 항목 더하기 (Enter)" aria-label="체크리스트 항목" />{draft.trim() && <Button size="sm" variant="soft" onClick={addItem}>더하기</Button>}</label>
      </section>
      <p className="faint xs">검토자 {person(reviewer)?.name}에게 제출돼요. AI로 일해도 제출까지만, 완료는 검토자가 웹에서 해요.</p>
    </Drawer>
  );
}
