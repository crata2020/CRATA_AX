// 프로젝트: Orbix CRM 'Projects' 칸반(post_1.jpg, refs/orbixcrm-projects-kanban-light.jpg — 제목 옆 ⓘ ☆, 오른쪽 '활동' + ⋯, 아이콘 밑줄 탭,
// 초록 'New Project' 자리에 브랜드 버튼 + 검색·담당·필터·정렬 알약, 옅은 회색 레인 4열) + 일정은 refs/orbixcrm-milestones-calendar.jpg의 머리 문법.
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Activity, ArrowUpDown, Bot, CalendarRange, Check, Download, FolderTree, Info, LayoutList, ListFilter, Mic, MoreHorizontal, Plus, Search, SquareKanban, Star, UserRound,
} from "lucide-react";
import { useApp } from "@/data/store";
import { longDate, when } from "@/data/format";
import type { Project, TaskStatus } from "@/data/types";
import { Avatar, Button, Drawer, Empty, IconButton, Menu, PageHead, PillSelect, Tabs, cx } from "@/ui";
import { NewTaskDrawer, STATUS, TaskDrawer, useTaskList } from "./Tasks.parts";
import { Board, NewProjectDrawer, Structure, Timeline } from "./Projects.parts";
import "./Projects.css";

type View = "board" | "structure" | "timeline";
type Health = "all" | "risk" | "warn";
type Sort = "due" | "progress" | "recent";

export default function Projects() {
  const { d, me, person, toast } = useApp();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { tasks, setStatus, add } = useTaskList();
  const [local, setLocal] = useState<Project[]>([]);
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("all");
  const [health, setHealth] = useState<Health>("all");
  const [sort, setSort] = useState<Sort>("due");
  const [off, setOff] = useState<Set<string>>(new Set());
  const [star, setStar] = useState(false);
  const [feed, setFeed] = useState(false);
  const [newTask, setNewTask] = useState<TaskStatus | null>(null);
  const [newProj, setNewProj] = useState<{ lineId?: string } | null>(null);

  const view = (params.get("v") as View) || "board";
  const setView = (v: View) => { const n = new URLSearchParams(params); n.set("v", v); n.delete("t"); setParams(n, { replace: true }); };
  const openId = params.get("t");
  const openTask = (id: string | null) => { const n = new URLSearchParams(params); if (id) n.set("t", id); else n.delete("t"); setParams(n, { replace: true }); };

  const all = useMemo(() => [...d.projects, ...local], [d.projects, local]);
  const k = q.trim().toLowerCase();
  const projects = all.filter((p) => {
    if (off.has(p.lineId)) return false;
    if (health !== "all" && p.health !== health && !(health === "warn" && p.health === "risk")) return false;
    if (owner !== "all" && p.owner !== owner && !p.members.includes(owner)) return false;
    return true;
  });
  const ids = new Set(projects.map((p) => p.id));
  const projName = (id: string) => all.find((p) => p.id === id)?.name ?? "";
  const boardTasks = tasks
    .filter((t) => (ids.has(t.projectId) || (!all.some((p) => p.id === t.projectId) && !off.size && health === "all")) && t.status !== "todo")
    .filter((t) => owner === "all" || t.assignee === owner || t.reviewer === owner)
    .filter((t) => !k || `${t.title} ${projName(t.projectId)} ${t.part ?? ""}`.toLowerCase().includes(k))
    .sort((a, b) => sort === "progress" ? b.progress - a.progress : sort === "recent" ? (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "") : a.due.localeCompare(b.due));
  const shownProjects = k ? projects.filter((p) => `${p.name} ${p.code} ${p.customer ?? ""} ${p.parts.join(" ")}`.toLowerCase().includes(k) || boardTasks.some((t) => t.projectId === p.id)) : projects;
  const todoN = tasks.filter((t) => ids.has(t.projectId) && t.status === "todo").length;

  const people = d.people.filter((p) => !p.field && all.some((x) => x.owner === p.id || x.members.includes(p.id)));
  const toggleLine = (id: string) => setOff((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const cur = tasks.find((t) => t.id === openId);

  // 활동: 데이터에서 시간이 있는 일만 모아요(제출 · 회의 · 현장)
  const events = useMemo(() => {
    const list: { at: string; who?: string; icon: JSX.Element; text: string; sub: string }[] = [];
    tasks.forEach((t) => {
      if (t.submittedAt) list.push({ at: t.submittedAt, who: t.assignee, icon: t.submittedVia === "ai" ? <Bot /> : <Check />, text: `“${t.title}” ${t.status === "done" ? "승인됨" : "검토 요청"}`, sub: `${projName(t.projectId)} · ${t.submittedVia === "ai" ? `${t.aiClient}로 제출` : "웹에서 제출"}` });
    });
    d.meetings.forEach((m) => list.push({ at: `${m.date}T${m.time}`, icon: <Mic />, text: `회의 “${m.title}” 올라옴`, sub: `${m.source} · 구간 ${m.segments.length}개 · ${m.projectIds.map(projName).filter(Boolean).slice(0, 2).join(", ")}` }));
    return list.filter((e) => e.at.slice(0, 10) <= d.today).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  }, [tasks, d.meetings, d.today]);

  return (
    <>
      <PageHead
        title="프로젝트"
        icon={
          <span className="pj-ttl">
            <span className="pj-ttl__i" title="업무는 모두 사업 › 프로젝트 › 파트에 붙어요"><Info aria-label="도움말: 업무는 모두 사업 › 프로젝트 › 파트에 붙어요" /></span>
            <button type="button" className={cx("pj-ttl__star", star && "is-on")} aria-pressed={star} aria-label="즐겨찾기" onClick={() => { setStar((v) => !v); toast(star ? "즐겨찾기에서 뺐어요" : "즐겨찾기에 넣었어요"); }}><Star /></button>
          </span>
        }
        desc="사업별로 프로젝트를 나누고, 담당·검토자와 마감을 정해 진행을 따라가요."
        actions={
          <>
            <Button icon={<Activity />} onClick={() => setFeed(true)}>활동</Button>
            <Menu align="right" width={220} trigger={({ toggle }) => <IconButton label="프로젝트 더보기" onClick={toggle}><MoreHorizontal /></IconButton>}>
              {(close) => (
                <>
                  <button type="button" className="menu__item" onClick={() => { close(); nav("/tasks"); }}><LayoutList />목록으로 보기</button>
                  <button type="button" className="menu__item" onClick={() => { close(); toast("예시 화면이라 내보내기는 흉내만 내요"); }}><Download />표로 내보내기</button>
                </>
              )}
            </Menu>
          </>
        }
      />

      <Tabs<View> label="보기" value={view} onChange={setView} options={[
        { value: "board", label: "보드", icon: <SquareKanban />, n: boardTasks.length },
        { value: "structure", label: "사업 구조", icon: <FolderTree />, n: shownProjects.length },
        { value: "timeline", label: "일정", icon: <CalendarRange /> },
      ]} />

      <div className="toolbar pj-toolbar">
        <Button variant="brand" icon={<Plus />} onClick={() => setNewProj({})}>새 프로젝트</Button>
        <label className="search pj-search"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="찾기" aria-label="업무·프로젝트 찾기" /></label>
        <span className="pj-pill"><UserRound /><PillSelect label="담당" value={owner} onChange={setOwner} options={[{ value: "all", label: "모든 담당" }, ...people.map((p) => ({ value: p.id, label: p.id === me.id ? `${p.name}(나)` : p.name }))]} /></span>
        <span className="pj-pill"><ListFilter /><PillSelect<Health> label="필터" value={health} onChange={setHealth} options={[{ value: "all", label: "모든 상태" }, { value: "warn", label: "주의·위험만" }, { value: "risk", label: "위험만" }]} /></span>
        <span className="pj-pill"><ArrowUpDown /><PillSelect<Sort> label="정렬" value={sort} onChange={setSort} options={[{ value: "due", label: "마감 빠른 순" }, { value: "progress", label: "진행 많은 순" }, { value: "recent", label: "최근 제출 순" }]} /></span>
      </div>

      <div className="pj-lines" role="group" aria-label="사업 고르기">
        {d.lines.map((l) => {
          const on = !off.has(l.id);
          const n = all.filter((p) => p.lineId === l.id).length;
          return (
            <button key={l.id} type="button" className={cx("pj-linechip", on && "is-on")} aria-pressed={on} onClick={() => toggleLine(l.id)}>
              <i style={{ background: l.color }} />{l.name}<span className="num">{n}</span>
            </button>
          );
        })}
        {off.size > 0 && <button type="button" className="pj-linechip pj-linechip--reset" onClick={() => setOff(new Set())}>모두 보기</button>}
        {view === "board" && todoN > 0 && <span className="pj-lines__note">‘할 일’ {todoN}건은 <button type="button" onClick={() => nav("/tasks")}>내 업무</button>에서 봐요</span>}
      </div>

      {view === "board" && (projects.length === 0
        ? <section className="card"><Empty icon={<SquareKanban />} title="고른 사업에 프로젝트가 없어요">사업 칩을 다시 켜 보세요</Empty></section>
        : <Board tasks={boardTasks} projects={all} lines={d.lines} onOpen={(id) => openTask(id)} onAdd={(s) => setNewTask(s)} />)}
      {view === "structure" && <Structure lines={d.lines} projects={shownProjects} tasks={tasks} onAddProject={(lineId) => setNewProj({ lineId })} />}
      {view === "timeline" && <Timeline lines={d.lines} projects={shownProjects} tasks={tasks} />}

      <p className="faint xs pj-foot">{longDate(d.today)} 기준 · 숫자·사람·회사는 모두 예시 데이터예요.</p>

      <TaskDrawer task={cur} onClose={() => openTask(null)} onStatus={setStatus} projects={all} />
      <NewTaskDrawer open={newTask != null} preset={{ status: newTask ?? "doing" }} projects={projects.length ? projects : all} onClose={() => setNewTask(null)} onCreate={(t) => add(t)} />
      <NewProjectDrawer open={newProj != null} lineId={newProj?.lineId} onClose={() => setNewProj(null)} onCreate={(p) => { setLocal((l) => [...l, p]); setOff((s) => { const n = new Set(s); n.delete(p.lineId); return n; }); setView("structure"); }} />

      <Drawer open={feed} title="최근 활동" onClose={() => setFeed(false)}>
        <p className="muted small">제출·승인과 회의가 올라온 순서예요. 누가 언제 무엇을 했는지만 남겨요.</p>
        {events.length === 0 ? <Empty icon={<Activity />} title="아직 활동이 없어요" /> : (
          <ol className="pj-feed">
            {events.map((e, i) => (
              <li key={i}>
                <span className="pj-feed__ic">{e.icon}</span>
                <div className="pj-feed__txt">
                  <div className="pj-feed__t">{e.text}</div>
                  <div className="pj-feed__s">{e.sub}</div>
                </div>
                <div className="pj-feed__r">
                  {e.who && <Avatar name={person(e.who)?.name ?? "?"} size="sm" />}
                  <span className="num">{when(e.at, d.today)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="faint xs">업무 상태 색: {(["stuck", "doing", "review", "done"] as TaskStatus[]).map((s) => STATUS[s].label).join(" · ")}</p>
      </Drawer>
    </>
  );
}

