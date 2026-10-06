// 내 업무: Orbix 'ProjectFlow' 상태별로 묶은 업무 표(refs/projectflow-grouped-task-table.jpg — 접는 그룹 머리, 색 네모 상태, 진행 막대 + %)
// + Orbix CRM 'Time Tracking' 표의 열 문법(refs/orbixcrm-time-tracking-table.jpg — 체크 열, 아이콘 셀, 마지막 열 동작)
// + 줄을 누르면 오른쪽 서랍(refs/orbixcrm-add-project-drawer.jpg). 위에는 KPI 카드 띠 4장, 툴바는 짙은 세그먼트 + 검색 + 알약 + 짙은 '업무 만들기'.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AlarmClock, Bot, CalendarClock, Check, ChevronDown, ChevronRight, ClipboardCheck, Inbox, LayoutList, Plus, Search, SquareKanban, TriangleAlert } from "lucide-react";
import { useApp } from "@/data/store";
import { daysLeft, longDate, slash, when } from "@/data/format";
import type { Task, TaskStatus } from "@/data/types";
import { Avatar, Bar, Button, Checkbox, Chip, Delta, Empty, KpiCard, PageHead, PillSelect, Segmented, Track, cx } from "@/ui";
import { DueChip, NewTaskDrawer, STATUS, STATUS_ORDER, SourceChip, Sq, TaskDrawer, addDays, toSunday, useTaskList } from "./Tasks.parts";
import "./Tasks.css";

type Scope = "mine" | "review" | "all";
type DueF = "all" | "over" | "today" | "week" | "later";

export default function Tasks() {
  const { d, me, person, toast } = useApp();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { tasks, setStatus, add } = useTaskList();
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("all");
  const [dueF, setDueF] = useState<DueF>("all");
  const [closed, setClosed] = useState<Partial<Record<TaskStatus, boolean>>>({ done: true });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [newFor, setNewFor] = useState<TaskStatus | null>(null);

  const weekEnd = toSunday(d.today);
  const mineOpen = tasks.filter((t) => t.assignee === me.id && t.status !== "done");
  const toReview = tasks.filter((t) => t.reviewer === me.id && t.status === "review");
  // 검토할 게 내 일보다 많으면 '내가 검토'부터 보여 줘요
  const scope: Scope = (params.get("v") as Scope) || (toReview.length > mineOpen.length ? "review" : "mine");
  const setScope = (v: Scope) => { const n = new URLSearchParams(params); n.set("v", v); setParams(n, { replace: true }); setSel(new Set()); };
  const openId = params.get("t");
  const openTask = (id: string | null) => { const n = new URLSearchParams(params); if (id) n.set("t", id); else n.delete("t"); setParams(n, { replace: true }); };
  const closeDrawer = () => openTask(null);

  // KPI(나 기준)
  const dueToday = mineOpen.filter((t) => daysLeft(t.due, d.today) <= 0);
  const overdue = dueToday.filter((t) => daysLeft(t.due, d.today) < 0).length;
  const dueWeek = mineOpen.filter((t) => { const n = daysLeft(t.due, d.today); return n >= 0 && n <= weekEnd; });
  const myWaiting = mineOpen.filter((t) => t.status === "review");
  const aiWait = toReview.filter((t) => t.submittedVia === "ai").length;
  const oldest = [...toReview].filter((t) => t.submittedAt).sort((a, b) => a.submittedAt!.localeCompare(b.submittedAt!))[0];
  const stuck = tasks.filter((t) => t.status === "stuck" && (t.assignee === me.id || t.reviewer === me.id));

  const projName = (id: string) => d.projects.find((p) => p.id === id)?.name ?? "새 프로젝트";
  const inScope = (t: Task) => (scope === "mine" ? t.assignee === me.id : scope === "review" ? t.reviewer === me.id : true);
  const k = q.trim().toLowerCase();
  const rows = tasks.filter((t) => {
      if (!inScope(t)) return false;
      if (proj !== "all" && t.projectId !== proj) return false;
      if (k && !`${t.title} ${projName(t.projectId)} ${t.part ?? ""}`.toLowerCase().includes(k)) return false;
      if (dueF !== "all") {
        if (t.status === "done") return false;
        const n = daysLeft(t.due, d.today);
        if (dueF === "over" && n >= 0) return false;
        if (dueF === "today" && n > 0) return false;
        if (dueF === "week" && (n < 0 || n > weekEnd)) return false;
        if (dueF === "later" && n <= weekEnd) return false;
      }
      return true;
    }).sort((a, b) => a.due.localeCompare(b.due));

  const grouped = STATUS_ORDER.map((s) => ({ s, list: rows.filter((t) => t.status === s) }));
  const selRows = rows.filter((t) => sel.has(t.id));
  const canApprove = selRows.filter((t) => t.reviewer === me.id && t.status === "review");
  const toggle = (id: string, on: boolean) => setSel((p) => { const n = new Set(p); if (on) n.add(id); else n.delete(id); return n; });
  const approveSel = () => { canApprove.forEach((t) => setStatus(t.id, "done")); toast(`${canApprove.length}건 승인했어요`); setSel(new Set()); };

  const cur = tasks.find((t) => t.id === openId);

  return (
    <>
      <PageHead
        title="내 업무"
        desc="맡은 일과 검토할 일을 상태별로 모았어요. AI는 제출까지, 완료는 검토자가 웹에서 해요."
        actions={
          <>
            <Track label="보기" value="list" onChange={(v) => v === "board" && nav("/projects")} options={[{ value: "list", label: "목록", icon: <LayoutList /> }, { value: "board", label: "보드", icon: <SquareKanban /> }]} />
            <Button icon={<Bot />} onClick={() => nav("/ai")}>내 AI로 처리</Button>
          </>
        }
      />

      <div className="kpirow tk-kpis">
        <KpiCard icon={<AlarmClock />} hue="coral" label="오늘까지" value={dueToday.length} unit="건"
          delta={overdue ? <Delta value={`지남 ${overdue}`} dir="up" good={false} /> : undefined}
          foot={dueToday[0] ? <span className="ellipsis tk-kfoot">{dueToday[0].title}</span> : "오늘 마감인 내 업무가 없어요"} />
        <KpiCard icon={<CalendarClock />} hue="amber" label="이번 주 마감" value={dueWeek.length} unit="건"
          delta={<Delta value={`내 업무 ${mineOpen.length}`} dir="flat" />}
          foot={`${slash(addDays(d.today, weekEnd))}(일)까지 · 검토 중 ${dueWeek.filter((t) => t.status === "review").length}건 포함`} />
        <KpiCard icon={<ClipboardCheck />} hue="blue" label="검토 대기" value={toReview.length + myWaiting.length} unit="건"
          delta={aiWait ? <Delta value={`AI 제출 ${aiWait}`} dir="flat" /> : undefined}
          foot={`내가 검토 ${toReview.length} · 내 제출 ${myWaiting.length}${oldest ? ` · 가장 오래된 ${when(oldest.submittedAt!, d.today)}` : ""}`} />
        <KpiCard icon={<TriangleAlert />} hue="orange" label="막힘" value={stuck.length} unit="건"
          delta={stuck.length ? <Delta value="먼저 풀기" dir="flat" /> : undefined}
          foot={stuck[0] ? <span className="ellipsis tk-kfoot">{stuck[0].blocker ?? stuck[0].title}</span> : "막힌 일이 없어요"} />
      </div>

      <div className="toolbar tk-toolbar">
        <Segmented label="범위" value={scope} onChange={setScope} options={[
          { value: "mine", label: "내 업무", n: mineOpen.length },
          { value: "review", label: "내가 검토", n: toReview.length },
          { value: "all", label: "팀 전체", n: tasks.filter((t) => t.status !== "done").length },
        ]} />
        <label className="search tk-search"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="업무·프로젝트 찾기" aria-label="업무 찾기" /></label>
        <PillSelect label="프로젝트" value={proj} onChange={setProj} options={[{ value: "all", label: "모든 프로젝트" }, ...d.projects.map((p) => ({ value: p.id, label: p.name }))]} />
        <PillSelect<DueF> label="마감" value={dueF} onChange={setDueF} options={[{ value: "all", label: "모든 마감" }, { value: "over", label: "지난 마감" }, { value: "today", label: "오늘까지" }, { value: "week", label: "이번 주" }, { value: "later", label: "다음 주 이후" }]} />
        <span className="toolbar__spacer" />
        <Button variant="dark" icon={<Plus />} onClick={() => setNewFor("todo")}>업무 만들기</Button>
      </div>

      {sel.size > 0 && (
        <div className="tk-bulk" role="status">
          <span><b className="num">{sel.size}</b>건 골랐어요</span>
          {canApprove.length > 0 && <Button size="sm" variant="soft" icon={<Check />} onClick={approveSel}>검토 {canApprove.length}건 승인</Button>}
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>고르기 취소</Button>
        </div>
      )}

      {rows.length === 0 ? (
        <section className="card"><Empty icon={<Inbox />} title={q || proj !== "all" || dueF !== "all" ? "찾는 업무가 없어요" : "지금 할 일이 없어요"}>{q || proj !== "all" || dueF !== "all" ? "검색어나 알약 선택을 바꿔 보세요" : "새 일이 생기면 여기에 모여요"}</Empty></section>
      ) : (
        <div className="tk-groups">
          {grouped.map(({ s, list }) => {
            const open = !closed[s];
            const allOn = list.length > 0 && list.every((t) => sel.has(t.id));
            const hint = s === "review" && list.some((t) => t.submittedVia === "ai") ? `AI 제출 ${list.filter((t) => t.submittedVia === "ai").length}건 포함`
              : s === "stuck" && list.length ? "막힌 이유를 먼저 풀어요" : s === "done" ? "검토자가 승인한 일" : "";
            return (
              <section key={s} className="card tk-group" aria-labelledby={`tk-g-${s}`}>
                <header className="tk-group__head">
                  <button type="button" className="tk-group__toggle" aria-expanded={open} aria-controls={`tk-gb-${s}`} onClick={() => setClosed((c) => ({ ...c, [s]: open }))}>
                    <ChevronDown className={cx("tk-group__chev", !open && "is-closed")} />
                    <Sq color={STATUS[s].color} />
                    <span id={`tk-g-${s}`} className="tk-group__name">{STATUS[s].label}</span>
                    <span className="tk-group__n num">{list.length}</span>
                  </button>
                  {hint && <span className="tk-group__hint">{hint}</span>}
                  {s !== "done" && s !== "review" && <Button size="sm" variant="ghost" icon={<Plus />} className="tk-group__add" onClick={() => setNewFor(s)}>추가</Button>}
                </header>
                <div id={`tk-gb-${s}`}>
                  {!open ? (
                    <p className="tk-group__empty">{list.length ? <>업무 <b className="num">{list.length}</b>건이 접혀 있어요</> : "이 상태의 업무가 없어요"}</p>
                  ) : list.length === 0 ? (
                    <p className="tk-group__empty">이 상태의 업무가 없어요</p>
                  ) : (
                    <div className="tablewrap">
                      <table className="table tk-table">
                        <colgroup><col className="w-chk" /><col /><col className="w-who" /><col className="w-due" /><col className="w-prog" /><col className="w-src" /><col className="w-st" /><col className="w-open" /></colgroup>
                        <thead>
                          <tr>
                            <th><Checkbox on={allOn} label={`${STATUS[s].label} 업무 모두 고르기`} onChange={(v) => list.forEach((t) => toggle(t.id, v))} /></th>
                            <th>업무</th><th>담당·검토</th><th>마감</th><th>진행률</th><th>출처</th><th>상태</th><th aria-label="열기" />
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((t) => {
                            const a = person(t.assignee), r = person(t.reviewer);
                            const p = d.projects.find((x) => x.id === t.projectId);
                            return (
                              <tr key={t.id} className={cx(sel.has(t.id) && "is-sel")} onClick={() => openTask(t.id)}>
                                <td className="tk-c-chk" onClick={(e) => e.stopPropagation()}><Checkbox on={sel.has(t.id)} label={`${t.title} 고르기`} onChange={(v) => toggle(t.id, v)} /></td>
                                <td className="tk-c-main">
                                  <button type="button" className="tk-name ellipsis" onClick={(e) => { e.stopPropagation(); openTask(t.id); }}>{t.title}</button>
                                  <div className="tk-sub">
                                    <span className="ellipsis">{p?.name ?? projName(t.projectId)}{t.part && ` · ${t.part}`}</span>
                                    {t.status === "stuck" && t.blocker && <span className="tk-sub__bad"><TriangleAlert />{t.blocker}</span>}
                                    {t.status === "review" && t.submittedVia === "ai" && t.submittedAt && <span className="tk-sub__ai"><Bot />{t.aiClient}로 제출 · {when(t.submittedAt, d.today)}</span>}
                                    {t.status === "review" && t.submittedVia === "web" && t.submittedAt && <span className="tk-sub__web">웹 제출 · {when(t.submittedAt, d.today)}</span>}
                                  </div>
                                </td>
                                <td className="tk-c-who"><span className="avastack tk-pair" title={`담당 ${a?.name} · 검토 ${r?.name}`}><Avatar name={a?.name ?? "?"} size="sm" /><Avatar name={r?.name ?? "?"} size="sm" /></span></td>
                                <td className="tk-c-due"><span className="tk-due"><span className="num tk-due__d">{slash(t.due)}</span>{t.status !== "done" && <DueChip due={t.due} today={d.today} />}</span></td>
                                <td className="tk-c-prog"><span className="tk-prog"><Bar value={t.progress} color={STATUS[t.status].color} label={`${t.title} 진행률`} /><span className="num">{t.progress}%</span></span></td>
                                <td className="tk-c-src"><SourceChip source={t.source} /></td>
                                <td className="tk-c-st"><Chip tone={STATUS[t.status].tone} dot sm>{STATUS[t.status].label}</Chip></td>
                                <td className="tk-c-open r"><ChevronRight aria-hidden /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <p className="faint xs tk-foot">{longDate(d.today)} 기준 · 숫자·사람·회사는 모두 예시 데이터예요.</p>

      <TaskDrawer task={cur} onClose={closeDrawer} onStatus={setStatus} />
      <NewTaskDrawer open={newFor != null} preset={{ status: newFor ?? "todo", projectId: proj !== "all" ? proj : undefined }} onClose={() => setNewFor(null)} onCreate={(t) => { add(t); setClosed((c) => ({ ...c, [t.status]: false })); }} />
    </>
  );
}
