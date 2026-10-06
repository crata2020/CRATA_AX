// AI 연결: FinSight(post_3.jpg)의 'Quick Action' 줄 → 빠른 동작, KPI 2×2 + '30-day Cost Forecast' 질감 분할 막대 → AI별 호출,
// 'Live Runs Stream' 표 → 실행 기록(Botrix refs/botrix-ai-command-center.jpg의 All/Success/Failed 짙은 세그먼트),
// 'Compliance pulse'(게이지 + 정책 줄) → 데이터 등급 경로, 'Getting Started' 체크 줄 → 내 AI 연결하기.
// 연결 목록은 Botrix 'Connected tools', ClarityAI(refs/clarityai-dark.jpg)의 칩·아바타는 밝게 바꿔서. 내용은 리서치 09(원격 MCP)·04(등급).
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Activity, ArrowRight, Ban, Bot, CheckCircle2, Circle, ClipboardCheck, Copy, Download, FileSearch, Fingerprint, Globe2, ListChecks, Lock, MapPin,
  PenLine, Play, Send, ShieldAlert, ShieldCheck, Users,
} from "lucide-react";
import { useApp } from "@/data/store";
import { num, when } from "@/data/format";
import type { AiClient, AiRun, DataClass } from "@/data/types";
import { Avatar, Button, Card, Chip, Delta, Drawer, IconButton, KpiCard, MoreButton, PageHead, Segmented, Track, cx, type Hue, type Tone } from "@/ui";
import { Gauge } from "@/ui/charts";
import { CLIENT, CLIENTS, ClientTile, GradeTag, gradeRows } from "./Ai.parts";
import "./Ai.css";

/** 원격 MCP 도구 6개(리서치 09 · 7장 표) */
const TOOLS: { key: string; name: string; scope: string; kind: "read" | "write" | "submit"; hue: Hue; icon: JSX.Element; rule: string }[] = [
  { key: "list_my_tasks", name: "내 업무 보기", scope: "read:tasks", kind: "read", hue: "blue", icon: <ListChecks />, rule: "담당자는 언제나 로그인한 나예요" },
  { key: "get_task", name: "업무 상세", scope: "read:tasks", kind: "read", hue: "cyan", icon: <FileSearch />, rule: "다른 회사 업무 번호를 넣으면 ‘없음’으로 답해요" },
  { key: "start_task", name: "시작", scope: "write:progress", kind: "write", hue: "amber", icon: <Play />, rule: "내 업무만 시작할 수 있어요" },
  { key: "log_progress", name: "진행 기록", scope: "write:progress", kind: "write", hue: "orange", icon: <PenLine />, rule: "덧붙이기만 해요. 지난 기록은 고치지 않아요" },
  { key: "submit_result", name: "결과 제출", scope: "submit:results", kind: "submit", hue: "brand", icon: <Send />, rule: "상태가 ‘검토 대기’로만 바뀌어요. 보내기 전에 한 번 더 확인해요" },
  { key: "get_submission_status", name: "검토 상태", scope: "read:tasks", kind: "read", hue: "violet", icon: <ClipboardCheck />, rule: "검토자의 승인·수정 요청과 코멘트를 돌려줘요" },
];
const KIND: Record<"read" | "write" | "submit", { label: string; tone: Tone }> = {
  read: { label: "읽기 전용", tone: "info" }, write: { label: "쓰기", tone: "warn" }, submit: { label: "제출 · 확인", tone: "brand" },
};
const CONN: Record<"connected" | "invited" | "off", { label: string; tone: Tone }> = {
  connected: { label: "연결됨", tone: "good" }, invited: { label: "초대됨", tone: "warn" }, off: { label: "안 함", tone: "neutral" },
};
const MCP_URL = "https://mcp.ara.example/mcp";

/** 차단 이유에서 등급을 읽어요(없으면 권한 차단) */
const gradeOf = (r: AiRun): DataClass | null => (r.note?.match(/L[0-3]/)?.[0] as DataClass | undefined) ?? null;

export default function Ai() {
  const { d, me, person, act, toast } = useApp();
  const nav = useNavigate();
  const [filter, setFilter] = useState<"all" | "ok" | "blocked">("all");
  const [policy, setPolicy] = useState(false);
  const conns = d.aiConnections;
  const mine = conns.find((c) => c.personId === me.id);
  const [pick, setPick] = useState<AiClient>(mine?.client ?? "Claude");

  // ───────── 숫자
  const connected = conns.filter((c) => c.status === "connected");
  const pending = conns.filter((c) => c.status !== "connected");
  const weekAgo = new Date(new Date(`${d.today}T00:00:00`).getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const newThisWeek = connected.filter((c) => (c.since ?? "") >= weekAgo).length;
  const calls = conns.reduce((s, c) => s + c.weekCalls, 0);
  const blocked = d.aiRuns.filter((r) => r.result === "blocked");
  const errors = d.aiRuns.filter((r) => r.result === "error").length;
  const gradeBlocked = blocked.filter((r) => gradeOf(r)).length;
  const okRate = calls ? Math.round(((calls - blocked.length - errors) / calls) * 1000) / 10 : 0;
  const byClient = CLIENTS.map((c) => ({ client: c, value: conns.filter((x) => x.client === c).reduce((s, x) => s + x.weekCalls, 0), people: conns.filter((x) => x.client === c && x.status === "connected").length }));
  const shown = byClient.filter((b) => b.value > 0);
  const aiSubmits = d.tasks.filter((t) => t.submittedVia === "ai").sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));

  // 등급별 업무(프로젝트 등급으로): 해외 AI로 다룰 수 있는 몫
  const grades = gradeRows(d);
  const taskGrade = (pid: string) => d.projects.find((p) => p.id === pid)?.dataClass ?? "L1";
  const openTasks = d.tasks.filter((t) => t.status !== "done");
  const lowTasks = openTasks.filter((t) => ["L0", "L1"].includes(taskGrade(t.projectId))).length;
  const l2Tasks = openTasks.length - lowTasks;
  const lowShare = openTasks.length ? lowTasks / openTasks.length : 1;

  const runs = useMemo(() => [...d.aiRuns].sort((a, b) => b.at.localeCompare(a.at)).filter((r) => filter === "all" || (filter === "ok" ? r.result === "ok" : r.result !== "ok")), [d.aiRuns, filter]);
  const runFilter = (
    <Segmented label="결과" size="sm" value={filter} onChange={setFilter} options={[
      { value: "all", label: "전체", n: d.aiRuns.length }, { value: "ok", label: "성공", n: d.aiRuns.length - blocked.length - errors }, { value: "blocked", label: "차단", n: blocked.length + errors },
    ]} />
  );
  const lastUse = (toolName: string) => d.aiRuns.filter((r) => r.tool === toolName && r.result === "ok").sort((a, b) => b.at.localeCompare(a.at))[0];

  // ───────── 내 AI 연결하기(단계)
  const myCalls = mine?.weekCalls ?? 0;
  const mySubmitted = d.tasks.some((t) => t.assignee === me.id && t.submittedVia === "ai");
  const on = mine?.status === "connected";
  const steps = [
    { t: "쓰는 AI 고르기", s: "Claude · ChatGPT · Codex · Gemini", done: !!mine && mine.status !== "off" },
    { t: "연결 주소 넣기", s: "회사마다 따로 만들지 않아요. 주소는 하나예요", done: on },
    { t: "회사 계정으로 로그인", s: "로그인 토큰에 회사 ID가 담겨요", done: on },
    { t: "범위 동의", s: "내 업무 보기 · 진행 기록 · 결과 제출", done: on && (mine?.scopes.length ?? 0) > 0 },
    { t: "‘내 업무 보여줘’로 시험", s: "AI가 내 업무 목록을 읽으면 성공이에요", done: myCalls > 0 },
    { t: "첫 결과 제출", s: "검토자가 웹에서 승인하면 완료돼요", done: mySubmitted },
  ];
  const doneSteps = steps.filter((s) => s.done).length;
  const current = steps.findIndex((s) => !s.done);

  const sendInvite = () => toast(pending.length ? `아직 연결 전인 ${pending.length}명에게 연결 안내를 보냈어요` : "모두 연결했어요. 새로 들어온 사람에게만 보내요");
  const copyUrl = () => {
    try { void navigator.clipboard?.writeText(MCP_URL); } catch { /* 복사 불가 */ }
    toast("연결 주소를 복사했어요");
  };
  const exportCsv = () => {
    const head = ["시간", "사람", "AI", "도구", "대상", "응답(ms)", "결과", "이유"];
    const rows = [...d.aiRuns].sort((a, b) => b.at.localeCompare(a.at)).map((r) => [r.at.replace("T", " "), person(r.personId)?.name ?? r.personId, r.client, r.tool, r.target, String(r.ms), r.result === "ok" ? "성공" : r.result === "blocked" ? "차단" : "오류", r.note ?? ""]);
    const csv = "﻿" + [head, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `ai-runs-${d.id}-${d.today}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { /* 내려받기 불가 */ }
    toast(`실행 기록 ${rows.length}건을 CSV로 내보냈어요`);
  };

  return (
    <>
      <PageHead
        title="AI 연결"
        desc="각자 쓰는 AI가 원격 MCP로 회사 업무를 보고, 기록하고, 제출해요. 완료는 검토자가 웹에서 해요."
        actions={
          <>
            <span className="ai-qa">빠른 동작</span>
            <Button variant="dark" icon={<Send />} onClick={sendInvite}>연결 안내 보내기</Button>
            <Button icon={<ShieldCheck />} onClick={() => setPolicy(true)}>정책</Button>
            <Button icon={<Download />} onClick={exportCsv}>기록 내보내기</Button>
          </>
        }
      />

      <div className="grid g-12">
        {/* KPI 2×2 (FinSight 왼쪽 위) */}
        <div className="s-6 ai-kpis">
          <KpiCard icon={<Users />} hue="brand" label="연결한 사람" value={connected.length} unit={`/${conns.length}명`}
            delta={newThisWeek ? <Delta value={`이번 주 ${newThisWeek}명`} dir="up" good /> : undefined}
            foot={pending.length ? `초대·미연결 ${pending.length}명이 남았어요` : "초대한 사람 모두 연결했어요"} />
          <KpiCard icon={<Activity />} hue="cyan" label="이번 주 호출" value={num(calls)} unit="회"
            delta={<Delta value={`${CLIENTS.filter((c) => byClient.find((b) => b.client === c)!.value > 0).length}종 AI`} dir="flat" />}
            foot={`연결한 사람당 평균 ${connected.length ? Math.round(calls / connected.length) : 0}회`} />
          <KpiCard icon={<CheckCircle2 />} hue="green" label="성공률" value={okRate} unit="%"
            delta={<Delta value={`오류 ${errors}건`} dir="flat" />} foot={`차단 ${blocked.length}건을 뺀 비율이에요`} />
          <KpiCard icon={<ShieldAlert />} hue="coral" label="차단" value={blocked.length} unit="건"
            delta={blocked.length ? <Delta value="규칙대로" dir="flat" /> : undefined}
            foot={`등급 때문 ${gradeBlocked}건 · 권한 때문 ${blocked.length - gradeBlocked}건`} />
        </div>

        {/* AI별 호출(FinSight 'Cost Forecast' 질감 분할 막대) */}
        <Card className="s-6" title="AI별 호출" sub="이번 주 · 각자 고른 AI에서 부른 횟수" actions={<MoreButton />}>
          <div className="ai-split">
            <div className="row" style={{ gap: 10, alignItems: "baseline" }}>
              <span className="ai-big num">{num(calls)}<span>회</span></span>
              <span className="muted small">연결 {connected.length}명 · AI {shown.length}종</span>
            </div>
            <div className="ai-split__bar" role="img" aria-label={shown.map((b) => `${b.client} ${b.value}회`).join(", ")}>
              {shown.map((b, i) => {
                const pct = Math.round((b.value / Math.max(1, calls)) * 100);
                return (
                  <div key={b.client} className="ai-split__seg" style={{ flexGrow: b.value }}>
                    <span className="ai-split__pct num">{pct}%</span>
                    <i className={`ai-split__fill ai-split__fill--${i % 3}`} style={{ ["--c" as string]: CLIENT[b.client].color }} />
                  </div>
                );
              })}
            </div>
            <ul className="ai-split__legend">
              {byClient.map((b) => (
                <li key={b.client}><i style={{ background: CLIENT[b.client].color }} />{b.client}<b className="num">{b.value}</b><span className="faint xs">{b.value ? `${b.people}명` : conns.some((c) => c.client === b.client) ? "초대됨" : "없음"}</span></li>
              ))}
            </ul>
          </div>
          <div className="ai-sub">
            <div className="ai-sub__head"><Lock /><span>AI는 제출까지 · 완료는 검토자가 웹에서</span><span className="faint xs num" style={{ marginLeft: "auto" }}>AI 제출 {aiSubmits.length}건</span></div>
            {aiSubmits.length ? aiSubmits.slice(0, 2).map((t) => {
              const who = person(t.assignee);
              const canApprove = t.status === "review" && t.reviewer === me.id;
              return (
                <div key={t.id} className="ai-sub__row">
                  {t.aiClient && <ClientTile client={t.aiClient} size={28} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="ai-sub__t ellipsis" title={t.title}>{t.title}</div>
                    <div className="faint xs ellipsis">{who?.name} · {t.aiClient}로 제출 · {when(t.submittedAt ?? t.due, d.today)}</div>
                  </div>
                  {canApprove
                    ? <Button size="sm" variant="soft" onClick={() => { act.setTaskStatus(t.id, "done"); toast(`“${t.title}” 승인했어요. 완료로 바꿨어요`); }}>웹에서 승인</Button>
                    : <Chip tone={t.status === "done" ? "good" : "info"} dot sm>{t.status === "done" ? "완료" : "검토 대기"}</Chip>}
                </div>
              );
            }) : <p className="muted small" style={{ padding: "6px 0 2px" }}>아직 AI로 제출한 업무가 없어요.</p>}
          </div>
        </Card>

        {/* 실행 기록(FinSight 'Live Runs Stream') */}
        <Card className="s-12" title="실행 기록" sub="각자의 AI가 부른 도구는 모두 남아요. 막힌 호출은 이유와 함께 보여요" flush
          actions={<div className="ai-hide-m">{runFilter}</div>}
          foot={<><Fingerprint size={15} />기록은 덧붙이기만 돼요. 누가·어느 AI로·어떤 도구를 불렀는지 남기고 개인정보는 가려요.</>}>
          <div className="ai-show-m ai-runbar">{runFilter}</div>
          <div className="tablewrap ai-hide-m">
            <table className="table ai-runs">
              <thead><tr><th>사람</th><th>AI</th><th>도구</th><th>대상</th><th>시간</th><th className="r">응답</th><th>결과</th></tr></thead>
              <tbody>
                {runs.map((r) => {
                  const p = person(r.personId);
                  const g = gradeOf(r);
                  return (
                    <tr key={r.id} className={cx(r.result !== "ok" && "ai-runs__blocked")}>
                      <td><div className="cellmain"><Avatar name={p?.name ?? "?"} size="sm" /><div style={{ minWidth: 0 }}><div className="cellmain__t ellipsis" style={{ maxWidth: 150 }}>{p?.name}</div><div className="cellmain__s">{p?.title}</div></div></div></td>
                      <td><div className="row" style={{ gap: 8 }}><ClientTile client={r.client} />{r.client}</div></td>
                      <td className="strong" style={{ whiteSpace: "nowrap" }}>{r.tool}</td>
                      <td><div className="ellipsis" style={{ maxWidth: 240 }} title={r.target}>{r.target}</div></td>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>{when(r.at, d.today)}</td>
                      <td className="r num" style={{ whiteSpace: "nowrap" }}>{num(r.ms)}<span className="faint">ms</span></td>
                      <td>
                        <Chip tone={r.result === "ok" ? "good" : r.result === "blocked" ? "bad" : "warn"} dot sm>{r.result === "ok" ? "성공" : r.result === "blocked" ? "차단" : "오류"}</Chip>
                        {r.note && <div className="ai-why">{g ? <GradeTag code={g} sm /> : <span className="ai-why__perm">권한</span>}<span>{r.note}</span></div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* 모바일: 표 대신 줄 목록 */}
          <ul className="ai-runlist ai-show-m">
            {runs.map((r) => {
              const p = person(r.personId);
              const g = gradeOf(r);
              return (
                <li key={r.id} className={cx(r.result !== "ok" && "ai-runs__blocked")}>
                  <div className="row" style={{ gap: 8 }}>
                    <Avatar name={p?.name ?? "?"} size="sm" /><span className="cellmain__t ellipsis">{p?.name}</span>
                    <ClientTile client={r.client} size={20} /><span className="small muted">{r.client}</span>
                    <span className="faint xs num" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>{when(r.at, d.today)}</span>
                  </div>
                  <div className="ai-runlist__mid"><b>{r.tool}</b><span className="ellipsis">{r.target}</span></div>
                  <div className="row" style={{ gap: 8 }}>
                    <Chip tone={r.result === "ok" ? "good" : r.result === "blocked" ? "bad" : "warn"} dot sm>{r.result === "ok" ? "성공" : r.result === "blocked" ? "차단" : "오류"}</Chip>
                    <span className="faint xs num">{num(r.ms)}ms</span>
                  </div>
                  {r.note && <div className="ai-why">{g ? <GradeTag code={g} sm /> : <span className="ai-why__perm">권한</span>}<span>{r.note}</span></div>}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* 데이터 등급 경로(FinSight 'Compliance pulse') */}
        <Card className="s-4" title="데이터 등급 경로" sub="AI에 보내기 전에 등급부터 봐요" actions={<MoreButton />}>
          <div className="ai-pulse">
            <Gauge value={1} max={1} size={210} label={`${Math.round(lowShare * 100)}%`} sub="해외 AI로 다룰 수 있는 업무"
              segments={[{ to: Math.max(0.02, lowShare), color: "var(--c-green)" }, { to: 1, color: "var(--c-amber)" }]} />
            <div className="ai-pulse__lg">
              <span className="tagsq"><i style={{ background: "var(--c-green)" }} />L0·L1 업무 <b className="num">{lowTasks}</b></span>
              <span className="tagsq"><i style={{ background: "var(--c-amber)" }} />L2 업무 <b className="num">{l2Tasks}</b></span>
            </div>
          </div>
          <ul className="ai-grades">
            {grades.map((g) => (
              <li key={g.code} className={`ai-grades__row ai-grades__row--${g.tone}`}>
                <GradeTag code={g.code} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ai-grades__t ellipsis">{g.name}</div>
                  <div className="ai-grades__s ellipsis">{g.code === "L3" ? <Ban /> : g.code === "L2" ? <MapPin /> : <Globe2 />}{g.short}</div>
                </div>
                <Chip tone={g.tone} sm>{g.state}</Chip>
              </li>
            ))}
          </ul>
        </Card>

        {/* 사람별 연결(Botrix 'Connected tools and services') */}
        <Card className="s-4" title="사람별 연결" sub="회사 ID로 나뉘어 자기 회사 업무만 보여요" actions={<Chip tone="outline" sm><span className="num">{connected.length}/{conns.length}</span></Chip>}>
          <ul className="ai-conns">
            {conns.map((c) => {
              const p = person(c.personId);
              const st = CONN[c.status];
              return (
                <li key={c.personId}>
                  <Avatar name={p?.name ?? "?"} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ gap: 8 }}><span className="list__t ellipsis">{p?.name}</span>{c.personId === me.id && <Chip tone="brand" sm>나</Chip>}</div>
                    <div className="ai-conns__s">
                      <ClientTile client={c.client} size={20} />
                      <span className="ellipsis">{c.client}{c.status === "connected" ? ` · ${c.lastUsed ? when(c.lastUsed, d.today) : "사용 전"} · ${c.weekCalls}회` : c.status === "invited" ? " · 로그인 전" : " · 연결하지 않음"}</span>
                    </div>
                    {c.scopes.length > 0 && <div className="ai-conns__scopes">{c.scopes.map((s) => <span key={s}>{s}</span>)}</div>}
                  </div>
                  <Chip tone={st.tone} dot sm>{st.label}</Chip>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* 내 AI 연결하기(FinSight 'Getting Started') */}
        <Card className="s-4 ai-wide-md" title="내 AI 연결하기" sub={`${me.name} · ${doneSteps}/${steps.length}단계`} actions={<span className="ai-ring num" aria-label={`진행 ${doneSteps}/${steps.length}`} style={{ ["--p" as string]: `${(doneSteps / steps.length) * 360}deg` }}>{Math.round((doneSteps / steps.length) * 100)}%</span>}>
          <Track label="내 AI" value={pick} onChange={setPick} options={CLIENTS.map((c) => ({ value: c, label: c }))} />
          <div className="ai-url">
            <code className="ellipsis">{MCP_URL}</code>
            <IconButton label="연결 주소 복사" size="sm" onClick={copyUrl}><Copy /></IconButton>
          </div>
          <p className="ai-howto"><Bot />{CLIENT[pick].howto}</p>
          <ol className="ai-steps">
            {steps.map((s, i) => (
              <li key={s.t} className={cx(s.done && "is-done", i === current && "is-now")}>
                {s.done ? <CheckCircle2 className="ai-steps__ic" aria-label="끝남" /> : <Circle className="ai-steps__ic" aria-label="남음" />}
                <div style={{ minWidth: 0 }}>
                  <div className="ai-steps__t">{s.t}</div>
                  {i === current && <div className="ai-steps__s">{s.s}</div>}
                </div>
                {i === current && <span className="ai-steps__now">지금</span>}
              </li>
            ))}
          </ol>
        </Card>

        {/* 도구 6개 */}
        <Card className="s-12" title="도구 6개" sub="원격 MCP로 열어 둔 도구는 이것뿐이에요. 회사 ID는 도구 인자가 아니라 로그인 토큰에서만 읽어요"
          actions={<div className="row ai-hide-m" style={{ gap: 6 }}><Chip tone="info" sm>읽기 3</Chip><Chip tone="warn" sm>쓰기 2</Chip><Chip tone="brand" sm>제출 1</Chip></div>}
          foot={<><Lock size={15} />‘완료’ 도구는 없어요. AI가 결과를 제출하면 검토자가 웹에서 승인하거나 수정을 요청해요.<Button size="sm" variant="ghost" style={{ marginLeft: "auto" }} onClick={() => nav("/tasks")}>검토하러 가기<ArrowRight /></Button></>}>
          <div className="ai-tools">
            {TOOLS.map((t) => {
              const last = lastUse(t.name);
              return (
                <article key={t.key} className="ai-tool">
                  <div className="ai-tool__head">
                    <span className={`ai-tool__ic tone-${t.hue}`}>{t.icon}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="ai-tool__t">{t.name}</div>
                      <code className="ai-tool__k">{t.key}</code>
                    </div>
                    <Chip tone={KIND[t.kind].tone} sm>{KIND[t.kind].label}</Chip>
                  </div>
                  <p className="ai-tool__r">{t.rule}</p>
                  <div className="ai-tool__f">
                    <span className="ai-tool__scope">{t.scope}</span>
                    <span className="faint xs">{last ? `최근 ${when(last.at, d.today)}` : "최근 기록 없음"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      </div>

      <Drawer open={policy} title="AI 연결 사용 기준" onClose={() => setPolicy(false)}
        foot={<><Button onClick={() => setPolicy(false)}>닫기</Button><Button variant="brand" icon={<Send />} onClick={() => { setPolicy(false); toast("구성원에게 사용 기준을 공지했어요"); }}>구성원에게 공지</Button></>}>
        <p className="muted small">리서치 09(원격 MCP)와 04(데이터 등급)를 따른 기준이에요.</p>
        <ol className="ai-policy">
          {[
            ["회사 ID로 나뉘어요", "로그인 토큰의 회사 ID로만 업무를 찾아요. 다른 회사 업무 번호를 넣으면 ‘없음’이 나와요."],
            ["AI는 제출까지", "보기·시작·진행 기록·결과 제출까지만 해요. 승인·수정 요청·완료는 검토자가 웹에서 해요."],
            ["등급마다 경로가 달라요", "L0·L1은 해외 AI 허용, L2는 국내(서울) 경로만, L3는 어떤 AI에도 보내지 않아요."],
            ["범위는 나눠서 동의해요", "내 업무 보기 · 진행 기록 · 결과 제출을 따로 골라요. 전체 권한은 없어요."],
            ["모든 호출을 기록해요", "누가·어느 AI로·어떤 도구를 불렀는지 남기고, 개인정보는 가려요."],
            ["언제든 끊을 수 있어요", "본인과 관리자가 연결을 끊을 수 있어요. 회사 전체를 끄거나 읽기 전용으로 바꿀 수도 있어요."],
            ["해외로 전달됨을 알려요", "도구 결과는 각자 연결한 AI 회사로 전달돼요. 처리방침에 국외 이전을 적어요."],
          ].map(([t, s], i) => (
            <li key={t}><span className="ai-policy__n num">{i + 1}</span><div><div className="ai-policy__t">{t}</div><div className="muted small">{s}</div></div></li>
          ))}
        </ol>
      </Drawer>
    </>
  );
}
