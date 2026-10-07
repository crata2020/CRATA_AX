// 채용 공고: refs/orbixcrm-projects-kanban-light.jpg의 툴바(짙은 '새 공고' + 찾기 + 알약 선택)와 단계 색 네모,
// refs/orbixcrm-team-members-grid.jpg의 카드(파스텔 머리 + 이름 + 점 칩 + ⋯), refs/projectflow-grouped-task-table.jpg의 접히는 묶음(마감 공고),
// refs/hope-hr-analytics.jpg의 KPI 띠, 새 공고는 refs/orbixcrm-add-project-drawer.jpg 서랍(Hiring.parts.tsx)에서 가져왔어요.
// AI는 추천과 근거만 내요. 면접 대상·합격은 담당자가 정해요.
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight, BriefcaseBusiness, ChevronDown, ChevronRight, ClipboardCheck, ExternalLink, Inbox, Link2, MoreHorizontal, Plus, Search, ShieldCheck,
  Sparkles, UserPlus, Users,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { Position } from "@/lib/model";
import { AvatarStack, Button, Card, Chip, Delta, Empty, IconButton, KpiCard, Menu, PageHead, PillSelect, StackBar, cx } from "@/ui";
import {
  EXAMPLE_NOTE, GROUP, GROUP_ORDER, HUE_OF, MODE, NewPositionDrawer, Sq, addDays, conditions, dday, daysLeft, longDate, md, mdw, statsOf, useHiring,
  type Group, type Row,
} from "./Hiring.parts";
import "./Hiring.css";

type Sort = "deadline" | "recent" | "many";

export default function Hiring() {
  const { positions, teams, today, toast } = useApp();
  const nav = useNavigate();
  const all = useHiring();
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState("");
  const [teamF, setTeamF] = useState("all");
  const [sort, setSort] = useState<Sort>("deadline");
  const [scope, setScope] = useState("all");
  const [showClosed, setShowClosed] = useState(false);

  const open = positions.filter((p) => p.status === "open");
  const closed = positions.filter((p) => p.status === "closed");
  const rowsOf = (p: Position) => all.get(p.id) ?? [];
  const openRows = open.flatMap(rowsOf);
  const s = statsOf(openRows);
  const flowRows = scope === "all" ? openRows : rowsOf(open.find((p) => p.id === scope) ?? open[0]!);
  const fs = statsOf(flowRows);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "";

  // KPI
  const seats = open.reduce((n, p) => n + p.count, 0);
  const soonest = [...open].sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  const wk = openRows.filter((r) => daysLeft(r.a.appliedAt, today) > -7).length;
  const prevWk = openRows.filter((r) => { const n = daysLeft(r.a.appliedAt, today); return n <= -7 && n > -14; }).length;
  const rate = s.sent ? Math.round((s.tested / s.sent) * 100) : 0;
  const waitTest = s.testing;

  const k = q.trim().toLowerCase();
  const list = open
    .filter((p) => (teamF === "all" || p.teamId === teamF) && (!k || `${p.title} ${teamName(p.teamId)} ${p.brief}`.toLowerCase().includes(k)))
    .sort((a, b) => (sort === "deadline" ? a.deadline.localeCompare(b.deadline) : sort === "recent" ? b.opened.localeCompare(a.opened) : rowsOf(b).length - rowsOf(a).length));

  const flow: { g: Group; sub: string }[] = [
    { g: "intake", sub: `서류 확인 대기 ${fs.applied} · 통과 ${fs.screened}` },
    { g: "test", sub: `결과 기다림 ${fs.testing} · 검토 ${fs.review}` },
    { g: "rec", sub: "서류 통과 · 적합도 75 이상" },
    { g: "interview", sub: "일정은 담당자가 잡아요" },
    { g: "result", sub: `합격 ${fs.offer} · 불합격 ${fs.closed} · 보류 ${fs.hold}` },
  ];

  const copyLink = (p: Position) => {
    const url = `${location.origin}${location.pathname}#/apply/${p.id}`;
    try { void navigator.clipboard?.writeText(url).catch(() => undefined); } catch { /* 복사 안 됨 */ }
    toast("지원서 링크를 복사했어요");
  };
  const posMenu = (p: Position) => (
    <Menu align="right" width={200} trigger={({ toggle, open: o }) => <IconButton label={`${p.title} 더보기`} size="sm" plain aria-expanded={o} onClick={toggle}><MoreHorizontal /></IconButton>}>
      {(close) => (
        <>
          <button type="button" className="menu__item" onClick={() => { close(); nav(`/hiring/${p.id}`); }}><BriefcaseBusiness />공고 보기</button>
          <a className="menu__item" href={`#/apply/${p.id}`} onClick={close}><ExternalLink />지원서 화면 보기</a>
          <button type="button" className="menu__item" onClick={() => { close(); copyLink(p); }}><Link2 />지원서 링크 복사</button>
        </>
      )}
    </Menu>
  );

  return (
    <>
      <PageHead
        title="채용 공고"
        desc="접수 → CRATA 검사 → AI 추천 → 면접 흐름을 공고마다 봐요. 추천은 근거와 함께, 결정은 담당자가 해요."
        actions={
          <>
            <a className="btn" href={`#/apply/${open[0]?.id ?? "pos-qa"}`}><ExternalLink />지원자 화면</a>
            <Link className="btn" to="/policy"><ShieldCheck />채용 기준</Link>
          </>
        }
      />

      <div className="kpirow hg-kpis">
        <KpiCard icon={<BriefcaseBusiness />} hue="brand" label="열린 공고" value={open.length} unit="개"
          delta={<Chip sm>모집 <span className="num">{seats}</span>명</Chip>}
          foot={soonest ? `가장 빠른 마감 ${md(soonest.deadline)} · ${dday(soonest.deadline, today).text}` : "열린 공고가 없어요"} />
        <KpiCard icon={<UserPlus />} hue="violet" label="이번 주 지원" value={wk} unit="명"
          delta={<Delta value={`${wk - prevWk >= 0 ? "+" : ""}${wk - prevWk}`} dir={wk > prevWk ? "up" : wk < prevWk ? "down" : "flat"} good={wk >= prevWk} />}
          foot={`최근 7일 · 그 전 7일 ${prevWk}명`} />
        <KpiCard icon={<ClipboardCheck />} hue="blue" label="CRATA 검사 완료율" value={rate} unit="%"
          delta={waitTest ? <Chip tone="info" sm>기다림 <span className="num">{waitTest}</span></Chip> : undefined}
          foot={`검사 보낸 ${s.sent}명 중 ${s.tested}명 완료`} />
        <KpiCard icon={<Sparkles />} hue="green" label="면접 대상(추천)" value={s.by.rec} unit="명"
          delta={<Chip tone="good" sm>면접 <span className="num">{s.by.interview}</span>명</Chip>}
          foot="AI 추천은 참고예요. 담당자가 정해요" />
      </div>

      <Card className="hg-flowcard" title="채용 흐름" sub={scope === "all" ? `열린 공고 ${open.length}개 합계 · 지금 각 단계에 있는 사람` : "이 공고에서 지금 각 단계에 있는 사람"}
        actions={open.length > 1 ? <PillSelect label="공고" value={scope} onChange={setScope} options={[{ value: "all", label: "열린 공고 전체" }, ...open.map((p) => ({ value: p.id, label: p.title }))]} /> : undefined}>
        <ol className="hg-flow">
          {flow.map(({ g, sub }, i) => {
            const n = fs.by[g];
            const pct = fs.total ? Math.round((n / fs.total) * 100) : 0;
            return (
              <li key={g} className="hg-flow__step">
                <div className="hg-flow__top">
                  <span className="hg-flow__ic" style={{ color: GROUP[g].color }}>{GROUP[g].icon}</span>
                  <span className="hg-flow__name"><span className="hg-flow__i num">{i + 1}</span>{GROUP[g].step}</span>
                </div>
                <div className="hg-flow__val"><span className="num">{n}</span><small>명</small><span className="hg-flow__pct num">{pct}%</span></div>
                <div className="hg-flow__bar" aria-hidden><i style={{ width: `${pct}%`, background: GROUP[g].color }} /></div>
                <div className="hg-flow__sub">{sub}</div>
                {i < flow.length - 1 && <span className="hg-flow__arrow" aria-hidden><ChevronRight /></span>}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="toolbar hg-toolbar">
        <Button variant="dark" icon={<Plus />} onClick={() => setNewOpen(true)}>새 공고</Button>
        <label className="search hg-search"><Search aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공고·팀 찾기" aria-label="공고 찾기" /></label>
        <PillSelect label="팀" value={teamF} onChange={setTeamF} options={[{ value: "all", label: "모든 팀" }, ...Array.from(new Set(open.map((p) => p.teamId))).map((id) => ({ value: id, label: teamName(id) }))]} />
        <PillSelect<Sort> label="정렬" value={sort} onChange={setSort} options={[{ value: "deadline", label: "마감 빠른 순" }, { value: "recent", label: "최근 공고 순" }, { value: "many", label: "지원자 많은 순" }]} />
        <span className="toolbar__spacer" />
        <span className="hg-count small muted">열린 공고 <b className="num">{list.length}</b></span>
      </div>
      <p className="hg-rule"><ShieldCheck aria-hidden /><span>AI 추천은 참고예요. 면접 대상·합격은 담당자가 정해요. 지원서에는 사진·나이·가족 사항을 받지 않아요. <Link to="/policy">기준 보기</Link></span></p>

      {list.length === 0 ? (
        <section className="card"><Empty icon={<Inbox />} title={q || teamF !== "all" ? "찾는 공고가 없어요" : "열린 공고가 없어요"}>{q || teamF !== "all" ? "검색어나 팀을 바꿔 보세요" : "'새 공고'로 첫 공고를 만들어 보세요"}</Empty></section>
      ) : (
        <div className="hg-grid">
          {list.map((p) => <PosCard key={p.id} p={p} rows={rowsOf(p)} menu={posMenu(p)} />)}
        </div>
      )}

      {closed.length > 0 && (
        <section className="card hg-closed" aria-labelledby="hg-closed-t">
          <header className="hg-closed__head">
            <button type="button" className="hg-closed__toggle" aria-expanded={showClosed} aria-controls="hg-closed-b" onClick={() => setShowClosed((v) => !v)}>
              <ChevronDown className={cx("hg-chev", !showClosed && "is-closed")} />
              <span id="hg-closed-t">마감된 공고</span>
              <span className="hg-n num">{closed.length}</span>
            </button>
          </header>
          <div id="hg-closed-b">
            {!showClosed ? (
              <p className="hg-closed__empty">마감된 공고 <b className="num">{closed.length}</b>개가 접혀 있어요. 채용서류는 반환 청구 기간이 지나면 파기해요.</p>
            ) : (
              <div className="tablewrap">
                <table className="table hg-ctable">
                  <thead><tr><th>공고</th><th>팀</th><th>마감</th><th className="r">지원</th><th>결과</th><th aria-label="열기" /></tr></thead>
                  <tbody>
                    {closed.map((p) => {
                      const cs = statsOf(rowsOf(p));
                      return (
                        <tr key={p.id} onClick={() => nav(`/hiring/${p.id}`)}>
                          <td><span className="cellmain__t">{p.title}</span></td>
                          <td>{teamName(p.teamId)}</td>
                          <td className="num">{md(p.deadline)}</td>
                          <td className="r num">{cs.total}</td>
                          <td><span className="hg-chips"><Chip tone="good" sm dot>합격 {cs.offer}</Chip><Chip sm dot>불합격 {cs.closed}</Chip></span></td>
                          <td className="r"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); nav(`/hiring/${p.id}`); }}>보기<ArrowRight /></Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      <p className="faint xs hg-foot">{longDate(today)} 기준 · 회사·사람은 모두 예시 데이터예요. {EXAMPLE_NOTE}</p>

      <NewPositionDrawer open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}

function PosCard({ p, rows, menu }: { p: Position; rows: Row[]; menu: ReactNode }) {
  const { team, today } = useApp();
  const nav = useNavigate();
  const t = team(p.teamId);
  const s = statsOf(rows);
  const dd = dday(p.deadline, today);
  const fresh = p.opened >= addDays(today, -1);
  return (
    <article className="hg-card">
      <div className={`hg-card__hero tone-${HUE_OF[t?.env.color ?? "blue"]}`}>
        <div className="hg-card__row">
          <span className="hg-card__team"><Users aria-hidden />{t?.name}</span>
          <span className={cx("hg-card__dd", dd.tone === "warn" && "is-soon")}>{dd.text}</span>
        </div>
        <div className="hg-card__row hg-card__row--end">
          <div className="hg-card__big"><span className="num">{s.total}</span><small>지원자</small></div>
          {rows.length > 0 ? <AvatarStack names={rows.map((r) => r.a.name)} max={4} /> : fresh && <span className="hg-card__new">새로 만듦</span>}
        </div>
      </div>
      <div className="hg-card__body">
        <div className="hg-card__head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 className="hg-card__name"><Link to={`/hiring/${p.id}`}>{p.title}</Link></h3>
            <div className="hg-card__sub"><span className="num">{p.count}</span>명 모집 · <span className="num">{mdw(p.deadline)}</span> 마감</div>
          </div>
          {menu}
        </div>
        <div className="hg-chips">
          <Chip tone="brand" sm dot>{MODE[p.mode].label}</Chip>
          {conditions(p).slice(0, 2).map((c) => <Chip key={c} tone="outline" sm>{c}</Chip>)}
        </div>
        <div className="hg-card__flow">
          <StackBar label={`${p.title} 단계별 인원`} parts={GROUP_ORDER.map((g) => ({ value: s.by[g], color: GROUP[g].color, label: GROUP[g].label }))} />
          <ul className="hg-card__legend">
            {GROUP_ORDER.map((g) => <li key={g}><Sq color={GROUP[g].color} />{GROUP[g].label}<b className="num">{s.by[g]}</b></li>)}
          </ul>
        </div>
        <div className="hg-card__stats">
          <div><span className="num">{s.tested}<em>/{s.sent}</em></span><small>검사 완료</small></div>
          <div><span className="num">{s.by.rec}</span><small>추천</small></div>
          <div><span className="num">{s.by.interview}</span><small>면접</small></div>
        </div>
        <Button size="sm" block onClick={() => nav(`/hiring/${p.id}`)}>공고 보기<ArrowRight /></Button>
      </div>
    </article>
  );
}
