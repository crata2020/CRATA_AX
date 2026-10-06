// 홈: Orbix 'Welcome back' 대시보드 문법.
// 날짜 + 인사 + 동작 버튼 줄(짙은 버튼 하나) → 이번 주 흐름(선 차트 + AI 해설) · 승인할 일(한 번 누르기)
// → 한눈에 KPI 묶음 · 업무 상태 도넛 → 최근 활동 표(짙은 세그먼트 탭)
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlarmClock, ArrowRight, Bot, CheckCircle2, ClipboardCheck, Factory, FilePen, Inbox, ListTodo, Mic, PenLine, Plus, PlusCircle, Sparkles, Target, Timer,
} from "lucide-react";
import { useApp, type Approval } from "@/data/store";
import { dday, longDate, md, when } from "@/data/format";
import { Avatar, Button, Card, Chip, Delta, Empty, Kpi, MoreButton, PageHead, PillSelect, Segmented, type Tone } from "@/ui";
import { Donut, Legend, LineChart } from "@/ui/charts";
import "./Home.css";

const KIND_TONE: Record<Approval["kind"], Tone> = { review: "brand", segment: "info", decision: "neutral", action: "warn", field: "bad", rule: "good" };
const STATUS: Record<string, { label: string; tone: Tone }> = {
  stuck: { label: "막힘", tone: "bad" }, todo: { label: "할 일", tone: "neutral" }, doing: { label: "진행 중", tone: "warn" }, review: { label: "검토 중", tone: "info" }, done: { label: "완료", tone: "good" },
};

export default function Home() {
  const { d, me, approvals, act, person } = useApp();
  const nav = useNavigate();
  const [range, setRange] = useState<"week" | "month">("week");
  const [feed, setFeed] = useState<"all" | "task" | "meeting" | "field">("all");
  const mfg = d.pack === "manufacturing";
  const firstName = me.name;

  const mine = d.tasks.filter((t) => t.assignee === me.id && t.status !== "done");
  const dueToday = mine.filter((t) => t.due <= d.today).length;
  const reviewWait = d.tasks.filter((t) => t.status === "review" && t.reviewer === me.id).length;
  const segWait = d.meetings.reduce((s, m) => s + m.segments.filter((x) => x.status === "pending" || x.status === "unclassified").length, 0);
  const fieldToday = d.fieldReports.filter((f) => f.at.startsWith(d.today)).length;
  const aiSubmits = d.tasks.filter((t) => t.submittedVia === "ai").length;
  const L = d.learning;
  const repeatNow = L.repeatRate[L.repeatRate.length - 1]!, repeatPrev = L.repeatRate[L.repeatRate.length - 2]!;

  const doneWeek = d.flow.done.reduce((a, b) => a + b, 0);
  const inWeek = d.flow.incoming.reduce((a, b) => a + b, 0);
  const busiest = d.flow.days[d.flow.incoming.indexOf(Math.max(...d.flow.incoming))];

  const byStatus = (["stuck", "doing", "review", "todo", "done"] as const).map((s) => ({
    label: STATUS[s]!.label, value: d.tasks.filter((t) => t.status === s).length,
    color: { stuck: "var(--c-coral)", doing: "var(--c-amber)", review: "var(--c-blue)", todo: "var(--c-violet)", done: "var(--c-green)" }[s],
  }));

  type Row = { id: string; date: string; title: string; sub: string; who: string; kind: "task" | "meeting" | "field"; status: { label: string; tone: Tone }; to: string };
  const rows = useMemo<Row[]>(() => {
    const r: Row[] = [
      ...d.tasks.filter((t) => t.submittedAt || t.status === "done" || t.status === "stuck").map((t) => ({ id: t.id, date: t.submittedAt ?? t.due, title: t.title, sub: d.projects.find((p) => p.id === t.projectId)?.name ?? "", who: t.assignee, kind: "task" as const, status: STATUS[t.status]!, to: "/tasks" })),
      ...d.meetings.map((m) => ({ id: m.id, date: m.date, title: m.title, sub: `${m.source} · ${m.segments.length}개 구간`, who: m.attendees[0]!, kind: "meeting" as const, status: m.status === "processing" ? { label: "분류 중", tone: "warn" as Tone } : m.status === "review" ? { label: "확인 대기", tone: "info" as Tone } : { label: "정리됨", tone: "good" as Tone }, to: `/meetings?m=${m.id}` })),
      ...d.fieldReports.map((f) => ({ id: f.id, date: f.at, title: f.note, sub: f.place, who: f.by, kind: "field" as const, status: f.status === "new" ? { label: "미배정", tone: "bad" as Tone } : f.status === "assigned" ? { label: "배정됨", tone: "info" as Tone } : { label: "처리됨", tone: "good" as Tone }, to: "/quality" })),
    ];
    // 지난 일만(마감이 남은 업무는 '최근 활동'이 아님)
    return r.filter((x) => x.date.slice(0, 10) <= d.today && (feed === "all" || x.kind === feed)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [d, feed]);

  return (
    <>
      <PageHead
        eyebrow={longDate(d.today)}
        title={<>안녕하세요, {firstName}님</>}
        actions={
          <div className="hm-acts">
            <Button variant="dark" icon={<CheckCircle2 />} count={approvals.length} onClick={() => document.getElementById("approvals")?.scrollIntoView({ behavior: "smooth" })}>승인하기</Button>
            {mfg && <Button icon={<PlusCircle />} onClick={() => nav("/report")}>현장 등록</Button>}
            <Button icon={<Mic />} onClick={() => nav("/meetings")}>회의 올리기</Button>
            <Button icon={<Plus />} onClick={() => nav("/tasks")}>업무 만들기</Button>
            <Button icon={<Sparkles />} className="hm-ara" onClick={() => nav("/ara")}>ARA에게 묻기</Button>
          </div>
        }
      />

      <div className="grid g-12">
        <Card className="s-8" title="이번 주 흐름" actions={<><PillSelect label="기간" value={range} onChange={setRange} options={[{ value: "week", label: "이번 주" }, { value: "month", label: "이번 달" }]} /><MoreButton /></>} line>
          <div className="hm-flow">
            <div className="hm-flow__side">
              <div className="muted small">이번 주 처리한 일</div>
              <div className="hm-flow__big num">{doneWeek}<span>건</span></div>
              <div className="row" style={{ gap: 14, marginTop: 6 }}>
                <span className="hm-flow__mini"><i style={{ background: "var(--brand)" }} />처리 {doneWeek}</span>
                <span className="hm-flow__mini"><i style={{ background: "var(--c-cyan)" }} />들어옴 {inWeek}</span>
              </div>
              <p className="hm-flow__ai"><Sparkles />{busiest}요일에 들어온 일이 가장 많았어요. 남은 검토 {reviewWait}건을 오전에 처리하면 이번 주 안에 비울 수 있어요.</p>
            </div>
            <div className="hm-flow__chart">
              <LineChart labels={d.flow.days} series={[{ name: "처리", color: "var(--brand)", values: d.flow.done }, { name: "들어옴", color: "var(--c-cyan)", values: d.flow.incoming }]} focus={d.flow.days.length - 1} unit="건" height={250} fill />
            </div>
          </div>
        </Card>

        <Card className="s-4" title={approvals.length ? "승인할 일" : "다가오는 내 업무"} sub={approvals.length ? "AI가 미리 채웠어요. 맞으면 한 번만 누르세요" : undefined} actions={<MoreButton />}>
          <div id="approvals" />
          {approvals.length ? (
            <ul className="hm-appr">
              {approvals.slice(0, 3).map((a) => (
                <li key={a.key}>
                  <div className="hm-appr__top"><Chip tone={KIND_TONE[a.kind]} sm>{a.ai && <Sparkles />}{a.kindLabel}</Chip><span className="faint xs">{when(a.at, d.today)}</span></div>
                  <div className="hm-appr__t ellipsis" title={a.title}>{a.title}</div>
                  <div className="hm-appr__s ellipsis" title={a.sub}>{a.sub}</div>
                  <div className="row" style={{ gap: 6, marginTop: 10 }}>
                    <Button size="sm" variant="soft" onClick={() => act.approve(a)}>{a.primary}</Button>
                    <Button size="sm" variant="ghost" onClick={() => nav(a.to)}>열어 보기</Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : mine.length ? (
            <ul className="list">
              {mine.slice(0, 5).map((t) => (
                <li key={t.id}><div className="list__main"><div className="list__t ellipsis">{t.title}</div><div className="list__s">{md(t.due)} 마감</div></div><Chip tone={t.due <= d.today ? "warn" : "neutral"} sm>{dday(t.due, d.today)}</Chip></li>
              ))}
            </ul>
          ) : <Empty icon={<Inbox />} title="지금 할 일이 없어요">새 일이 생기면 여기에 모여요</Empty>}
          {approvals.length > 3 && <Button block variant="default" style={{ marginTop: 14 }} onClick={() => nav("/tasks")}>나머지 {approvals.length - 3}건 보기 <ArrowRight /></Button>}
        </Card>

        <Card className="s-7" title="한눈에" actions={<MoreButton />}>
          <div className="kpigrid">
            <Kpi icon={<AlarmClock />} hue="coral" label="오늘까지 할 일" value={dueToday} unit="건" delta={<Delta value={`내 업무 ${mine.length}`} dir="flat" />} />
            <Kpi icon={<ClipboardCheck />} hue="blue" label="내가 검토할 제출" value={reviewWait} unit="건" delta={reviewWait ? <Delta value="AI 연결 제출 포함" dir="flat" /> : undefined} />
            {mfg
              ? <Kpi icon={<Factory />} hue="orange" label="오늘 현장 등록" value={fieldToday} unit="건" delta={<Delta value="2건" dir="up" good={false} />} note="어제보다 2건 많아요" />
              : <Kpi icon={<Target />} hue="orange" label="제안 수주율" value={44} unit="%" delta={<Delta value="4%p" dir="up" good />} note="지난달 대비" />}
            <Kpi icon={<Mic />} hue="violet" label="회의 분류 확인 대기" value={segWait} unit="구간" note="AI 확신이 낮은 구간만 사람이 봐요" />
            <Kpi icon={<FilePen />} hue="green" label="같은 수정 재발률" value={repeatNow} unit="%" delta={<Delta value={`${repeatPrev - repeatNow}%p`} dir="down" good />} note="작성 규칙이 쌓일수록 줄어요" />
            <Kpi icon={<Bot />} hue="cyan" label="AI 연결로 제출" value={aiSubmits} unit="건" delta={<Delta value="이번 주" dir="flat" />} note="각자의 AI에서 바로 제출" />
          </div>
        </Card>

        <Card className="s-5" title="업무 상태" actions={<PillSelect label="범위" value="all" onChange={() => undefined} options={[{ value: "all", label: "회사 전체" }]} />}>
          <div className="hm-donut">
            <Donut data={byStatus} size={190} thickness={24} center={d.tasks.length} sub="전체 업무" />
            <Legend data={byStatus} />
          </div>
        </Card>

        <Card className="s-12" title="최근 활동" actions={
          <Segmented label="종류" size="sm" value={feed} onChange={setFeed} options={[{ value: "all", label: "전체" }, { value: "task", label: "업무" }, { value: "meeting", label: "회의" }, ...(mfg ? [{ value: "field" as const, label: "현장" }] : [])]} />
        } flush>
          <div className="tablewrap">
            <table className="table">
              <thead><tr><th>날짜</th><th>내용</th><th>종류</th><th>사람</th><th>상태</th><th className="r" aria-label="열기" /></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const p = person(r.who);
                  return (
                    <tr key={r.kind + r.id} onClick={() => nav(r.to)} style={{ cursor: "pointer" }}>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>{when(r.date, d.today)}</td>
                      <td><div className="cellmain"><span className={`hm-kind hm-kind--${r.kind}`}>{r.kind === "task" ? <ListTodo /> : r.kind === "meeting" ? <Mic /> : <Factory />}</span><div style={{ minWidth: 0 }}><div className="cellmain__t ellipsis" style={{ maxWidth: 420 }}>{r.title}</div><div className="cellmain__s ellipsis" style={{ maxWidth: 420 }}>{r.sub}</div></div></div></td>
                      <td><Chip tone="outline" sm>{r.kind === "task" ? "업무" : r.kind === "meeting" ? "회의" : "현장"}</Chip></td>
                      <td><div className="row" style={{ gap: 8 }}><Avatar name={p?.name ?? "?"} size="sm" /><span className="ellipsis" style={{ maxWidth: 140 }}>{p?.name}</span></div></td>
                      <td><Chip tone={r.status.tone} dot sm>{r.status.label}</Chip></td>
                      <td className="r"><PenLine size={16} className="faint" aria-hidden /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <p className="faint xs" style={{ marginTop: 16, display: "flex", gap: 6, alignItems: "center" }}><Timer size={14} />숫자·사람·회사는 모두 예시 데이터예요.</p>
    </>
  );
}
