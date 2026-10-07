// 공고 상세: refs/projectflow-grouped-task-table.jpg(단계별로 묶은 표 — 접는 묶음 머리, 색 네모, 체크 열, 막대 + 숫자, 마지막 열 동작),
// refs/orbixcrm-projects-kanban-light.jpg의 밑줄 탭(아이콘 + 글자 + 개수)과 알약 툴바, refs/hope-hr-analytics.jpg('Analytic View' 큰 % + 줄 범례 + 도넛),
// 지원자 서랍은 refs/orbixcrm-add-project-drawer.jpg 문법(Hiring.parts.tsx)에서 가져왔어요.
// AI는 면접 추천만 미리 골라 둬요. 담당자가 빼거나 더한 뒤 면접 대상으로 정하고, 자동 탈락은 없어요.
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, ChevronDown, ExternalLink, Inbox, LayoutList, Link2, PauseCircle, Quote, Search, SearchX, Send, Sparkles, TriangleAlert, Check } from "lucide-react";
import { useApp } from "@/data/store";
import type { Position as Pos, Stage } from "@/lib/model";
import { TIER, type Tier } from "@/lib/hiring";
import { Donut } from "@/ui/charts";
import { Avatar, Bar, Button, Card, Checkbox, Chip, Empty, PageHead, PillSelect, Tabs, cx } from "@/ui";
import {
  ApplicantDrawer, EXAMPLE_NOTE, GROUP, GROUP_ORDER, LookList, MODE, Sq, TIER_COLOR, TierChip, araSentence, conditions, dday, longDate, lookFor, mdw, slash,
  statsOf, testStatus, useHiring, type Group, type Row,
} from "./Hiring.parts";
import "./Hiring.css";
import "./Position.css";

type Tab = "all" | Group;
const TIERS: Tier[] = ["recommend", "consider", "hold", "pending"];

export default function Position() {
  const { id } = useParams();
  const { positions } = useApp();
  const pos = positions.find((p) => p.id === id);
  if (!pos) {
    return (
      <>
        <PageHead eyebrow={<Link to="/hiring" className="ps-back"><ArrowLeft />채용 공고</Link>} title="공고를 찾지 못했어요" desc="주소가 바뀌었거나 지워진 공고예요." />
        <section className="card"><Empty icon={<SearchX />} title="찾는 공고가 없어요"><Link className="btn btn--sm" to="/hiring">채용 공고로 돌아가기</Link></Empty></section>
      </>
    );
  }
  return <PositionView key={pos.id} pos={pos} />;
}

function PositionView({ pos }: { pos: Pos }) {
  const { team, today, setStage, toast } = useApp();
  const all = useHiring();
  const rows = all.get(pos.id) ?? [];
  const t = team(pos.teamId)!;
  const s = statsOf(rows);
  const dd = dday(pos.deadline, today, pos.status === "closed");

  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && (tabParam === "all" || GROUP_ORDER.includes(tabParam as Group)) ? tabParam : "all";
  const setParam = (k: string, v: string | null) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };
  const openId = params.get("a");

  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const [sort, setSort] = useState<"score" | "date">("score");
  const recIds = rows.filter((r) => r.group === "rec").map((r) => r.a.id);
  const isClosed = pos.status === "closed";
  const [sel, setSel] = useState<Set<string>>(() => new Set(isClosed ? [] : recIds));
  const [closed, setClosed] = useState<Partial<Record<Group, boolean>>>({ result: true });

  const k = q.trim().toLowerCase();
  const shown = rows
    .filter((r) => (src === "all" || r.a.source === src) && (!k || `${r.a.name} ${r.a.summary}`.toLowerCase().includes(k)))
    .sort((x, y) => (sort === "score" ? (y.rec.score ?? -1) - (x.rec.score ?? -1) || x.a.appliedAt.localeCompare(y.a.appliedAt) : y.a.appliedAt.localeCompare(x.a.appliedAt)));
  const groupsAll = (tab === "all" ? GROUP_ORDER : [tab]).map((g) => ({ g, list: shown.filter((r) => r.group === g) }));
  // 전체 보기에서 빈 단계는 카드 대신 한 줄로 모아요
  const groups = tab === "all" ? groupsAll.filter((x) => x.list.length) : groupsAll;
  const empties = tab === "all" ? groupsAll.filter((x) => !x.list.length).map((x) => x.g) : [];
  const sources = Array.from(new Set(rows.map((r) => r.a.source)));

  // 고르기·묶음 동작
  const selRows = rows.filter((r) => sel.has(r.a.id));
  const toTest = selRows.filter((r) => r.a.stage === "applied" || r.a.stage === "screened");
  const toInterview = selRows.filter((r) => !["interview", "offer", "closed"].includes(r.a.stage));
  const toHold = selRows.filter((r) => !["hold", "offer", "closed"].includes(r.a.stage));
  const recSel = selRows.filter((r) => r.group === "rec").length;
  const isRecSel = toInterview.length > 0 && toInterview.length === recIds.length && toInterview.every((r) => r.group === "rec");
  const toggle = (id: string, on: boolean) => setSel((p) => { const n = new Set(p); if (on) n.add(id); else n.delete(id); return n; });
  const run = (list: Row[], stage: Stage, msg: string) => { setStage(list.map((r) => r.a.id), stage); toast(msg); setSel(new Set()); };
  const one = (r: Row, stage: Stage, msg: string) => { setStage([r.a.id], stage); toast(msg); setSel((p) => { const n = new Set(p); n.delete(r.a.id); return n; }); };
  const open = (id: string) => setParam("a", id);

  const next = (r: Row): { label: string; icon?: JSX.Element; act: () => void } => {
    const a = r.a;
    if (a.stage === "applied" || a.stage === "screened") return r.rec.screening.ok ? { label: "검사 보내기", icon: <Send />, act: () => one(r, "testing", `${a.name} 님에게 CRATA 검사 링크를 보냈어요`) } : { label: "서류 확인", act: () => open(a.id) };
    if (a.stage === "testing") return { label: "다시 알림", act: () => toast(`${a.name} 님에게 검사 링크를 다시 보냈어요`) };
    if (r.group === "rec") return { label: "면접으로", act: () => one(r, "interview", `${a.name} 님을 면접 대상으로 정했어요`) };
    if (a.stage === "tested" || a.stage === "shortlist") return { label: "근거 보기", act: () => open(a.id) };
    if (a.stage === "interview") return { label: "결과 정하기", act: () => open(a.id) };
    return { label: "보기", act: () => open(a.id) };
  };

  const hint: Record<Group, string> = {
    intake: s.docMiss ? `서류 조건 걸림 ${s.docMiss}명 · 사람이 확인해요` : "서류 조건을 확인하고 검사를 보내요",
    test: `결과 기다림 ${s.testing} · 검토 ${s.review}`,
    rec: "AI가 면접을 추천했어요 · 미리 골라 뒀어요",
    interview: "면접 일정은 담당자가 따로 잡아요",
    result: `합격 ${s.offer} · 불합격 ${s.closed} · 보류 ${s.hold}`,
  };

  // 추천 분포(Hope 'Analytic View')
  const tierN = (x: Tier) => rows.filter((r) => r.rec.tier === x).length;
  const rate = s.sent ? Math.round((s.tested / s.sent) * 100) : 0;
  const top = rows.filter((r) => r.rec.score != null && r.a.stage !== "closed").sort((x, y) => (y.rec.score ?? 0) - (x.rec.score ?? 0)).slice(0, 4);
  const slices = TIERS.map((x) => ({ label: TIER[x].label, value: tierN(x), color: TIER_COLOR[x] }));

  const copyLink = () => {
    try { void navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/apply/${pos.id}`).catch(() => undefined); } catch { /* 복사 안 됨 */ }
    toast("지원서 링크를 복사했어요");
  };

  return (
    <>
      <PageHead
        eyebrow={<Link to="/hiring" className="ps-back"><ArrowLeft />채용 공고</Link>}
        title={pos.title}
        desc={
          <span className="ps-meta">
            <span>{t.name}</span><span><span className="num">{pos.count}</span>명 모집</span><span className="num">{mdw(pos.deadline)} 마감</span>
            <Chip tone={dd.tone} sm>{dd.text}</Chip><span>지원 <b className="num">{rows.length}</b>명</span>
          </span>
        }
        actions={
          <>
            <Button icon={<Link2 />} onClick={copyLink}>링크 복사</Button>
            <a className="btn" href={`#/apply/${pos.id}`}><ExternalLink />지원서 화면 보기</a>
          </>
        }
      />

      <div className="grid g-12 ps-top">
        <Card className="s-7 ps-look" title="찾는 사람" sub="회사가 적은 글과 팀 환경을 ARA가 정리했어요" actions={<Chip tone="brand" sm dot>{MODE[pos.mode].label}</Chip>}
          foot={<span>{MODE[pos.mode].desc} {EXAMPLE_NOTE}</span>}>
          <div className="ps-look__intro">
            <p className="hg-quote"><Quote aria-hidden />{pos.brief}</p>
            <p className="ps-say"><Sparkles aria-hidden /><span>{araSentence(pos, t)}</span></p>
          </div>
          <LookList rows={lookFor(pos, t)} compact />
          <div className="ps-conds"><span className="ps-k">필수 조건</span><span className="hg-chips">{conditions(pos).map((c) => <Chip key={c} tone="outline" sm>{c}</Chip>)}</span></div>
        </Card>

        <Card className="s-5 ps-ana" title="AI 추천 분포" sub="검사를 마친 사람만 등급이 있어요">
          <div className="ps-ana__row">
            <div className="ps-ana__l">
              <div className="ps-big"><span className="num">{rate}%</span><span className="muted small">{s.sent ? <>검사 완료 <span className="num">{s.tested}/{s.sent}</span>명</> : "아직 보낸 검사가 없어요"}</span></div>
              <ul className="ps-legend">
                {TIERS.map((x) => (
                  <li key={x}><span className="tagsq"><i style={{ background: TIER_COLOR[x] }} />{TIER[x].label}</span><b className="num">{tierN(x)}<span className="faint"> · {rows.length ? Math.round((tierN(x) / rows.length) * 100) : 0}%</span></b></li>
                ))}
              </ul>
            </div>
            <Donut data={slices} size={148} thickness={20} center={tierN("recommend")} sub="면접 추천" />
          </div>
          {top.length === 0 ? (
            <div className="ps-topfit">
              <span className="ps-topfit__k">적합도 높은 지원자</span>
              <p className="faint small">검사를 마친 지원자가 생기면 적합도 높은 순으로 여기에 보여요.</p>
            </div>
          ) : (
            <div className="ps-topfit">
              <div className="between"><span className="ps-topfit__k">적합도 높은 지원자</span><span className="faint xs">누르면 근거를 봐요</span></div>
              <ul>
                {top.map((r) => (
                  <li key={r.a.id}>
                    <button type="button" onClick={() => open(r.a.id)}>
                      <Avatar name={r.a.name} size="sm" />
                      <span className="ps-topfit__n">{r.a.name}</span>
                      <span className="ps-topfit__bar"><Bar value={r.rec.score ?? 0} color={TIER_COLOR[r.rec.tier]} label={`${r.a.name} 적합도 ${r.rec.score}점`} /></span>
                      <span className="num ps-topfit__v">{r.rec.score}</span>
                      <TierChip t={r.rec.tier} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="hg-why ps-ana__note"><Check aria-hidden />자동 탈락은 없어요. 추천에서 빠진 사람도 담당자가 면접에 넣을 수 있어요.</p>
        </Card>
      </div>

      <div className="ps-tabs">
        <Tabs<Tab> label="채용 단계" value={tab} onChange={(v) => setParam("tab", v === "all" ? null : v)}
          options={[{ value: "all", label: "전체", icon: <LayoutList />, n: rows.length }, ...GROUP_ORDER.map((g) => ({ value: g as Tab, label: GROUP[g].label, icon: GROUP[g].icon, n: s.by[g] }))]} />
      </div>

      <div className="toolbar ps-toolbar">
        <label className="search ps-search"><Search aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·경력 찾기" aria-label="지원자 찾기" /></label>
        <PillSelect label="지원 경로" value={src} onChange={setSrc} options={[{ value: "all", label: "모든 경로" }, ...sources.map((x) => ({ value: x, label: x }))]} />
        <PillSelect<"score" | "date"> label="정렬" value={sort} onChange={setSort} options={[{ value: "score", label: "적합도 높은 순" }, { value: "date", label: "최근 지원 순" }]} />
      </div>

      {rows.length > 0 && isClosed && (
        <div className="ps-bulk" role="note"><span className="ps-bulk__t">마감된 공고예요. 결과를 확인하고, 채용서류는 반환 청구 기간이 지나면 파기해요.</span></div>
      )}
      {rows.length > 0 && !isClosed && (
        <div className={cx("ps-bulk", sel.size > 0 && "is-on")} role="status">
          <span className="ps-bulk__t">
            {recSel > 0 ? <><Sparkles aria-hidden />AI 추천 <b className="num">{recSel}</b>명을 미리 골라 뒀어요{sel.size > recSel && <> · 더 고른 <b className="num">{sel.size - recSel}</b>명</>}. 빼거나 더할 수 있어요.</>
              : sel.size ? <><b className="num">{sel.size}</b>명 골랐어요.</> : "줄 앞 체크로 지원자를 골라 주세요."}
          </span>
          <span className="ps-bulk__acts">
            <Button size="sm" icon={<Send />} disabled={!toTest.length} onClick={() => run(toTest, "testing", `${toTest.length}명 서류 통과, CRATA 검사 링크를 보냈어요`)}>서류 통과 → 검사 보내기{toTest.length ? ` ${toTest.length}` : ""}</Button>
            <Button size="sm" icon={<PauseCircle />} disabled={!toHold.length} onClick={() => run(toHold, "hold", `${toHold.length}명 보류했어요`)}>보류</Button>
            {sel.size > 0 ? <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>고르기 취소</Button>
              : recIds.length > 0 && <Button size="sm" variant="ghost" onClick={() => setSel(new Set(recIds))}>추천 다시 고르기</Button>}
            <Button variant="dark" size="sm" icon={<Check />} disabled={!toInterview.length}
              onClick={() => run(toInterview, "interview", `${toInterview.length}명을 면접 대상으로 정했어요`)}>
              {isRecSel ? `추천 ${toInterview.length}명 면접 대상으로` : toInterview.length ? `${toInterview.length}명 면접 대상으로` : "면접 대상으로"}
            </Button>
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <section className="card">
          <Empty icon={<Inbox />} title="아직 지원자가 없어요">
            <span className="small">지원서 링크를 공유하면 여기에 모여요.</span>
            <a className="btn btn--sm" href={`#/apply/${pos.id}`}><ExternalLink />지원서 화면 보기</a>
          </Empty>
        </section>
      ) : shown.length === 0 ? (
        <section className="card"><Empty icon={<SearchX />} title="찾는 지원자가 없어요">검색어나 경로를 바꿔 보세요</Empty></section>
      ) : (
        <div className="ps-groups">
          {groups.map(({ g, list }) => {
            const isOpen = tab !== "all" || !closed[g];
            const allOn = list.length > 0 && list.every((r) => sel.has(r.a.id));
            return (
              <section key={g} className="card ps-group" aria-labelledby={`ps-g-${g}`}>
                <header className="ps-group__head">
                  <button type="button" className="ps-group__toggle" aria-expanded={isOpen} aria-controls={`ps-gb-${g}`} onClick={() => setClosed((c) => ({ ...c, [g]: isOpen }))} disabled={tab !== "all"}>
                    <ChevronDown className={cx("hg-chev", !isOpen && "is-closed")} />
                    <Sq color={GROUP[g].color} />
                    <span id={`ps-g-${g}`}>{GROUP[g].label}</span>
                    <span className="hg-n num">{list.length}</span>
                  </button>
                  <span className="ps-group__hint">{hint[g]}</span>
                </header>
                <div id={`ps-gb-${g}`}>
                  {!isOpen ? (
                    <p className="ps-group__empty">{list.length ? <>지원자 <b className="num">{list.length}</b>명이 접혀 있어요</> : "이 단계에 있는 사람이 없어요"}</p>
                  ) : list.length === 0 ? (
                    <p className="ps-group__empty">이 단계에 있는 사람이 없어요</p>
                  ) : (
                    <div className="tablewrap">
                      <table className="table ps-table">
                        <colgroup><col className="w-chk" /><col /><col className="w-date" /><col className="w-yrs" /><col className="w-doc" /><col className="w-test" /><col className="w-fit" /><col className="w-tier" /><col className="w-act" /></colgroup>
                        <thead>
                          <tr>
                            <th><Checkbox on={allOn} label={`${GROUP[g].label} 모두 고르기`} onChange={(v) => list.forEach((r) => toggle(r.a.id, v))} /></th>
                            <th>지원자</th><th>지원일·경로</th><th>경력</th><th>서류 조건</th><th>검사</th><th>적합도</th><th>추천</th><th>다음 동작</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((r) => {
                            const a = r.a;
                            const ts = testStatus(a);
                            const nx = next(r);
                            return (
                              <tr key={a.id} className={cx(sel.has(a.id) && "is-sel")} onClick={() => open(a.id)}>
                                <td className="ps-c-chk" onClick={(e) => e.stopPropagation()}><Checkbox on={sel.has(a.id)} label={`${a.name} 고르기`} onChange={(v) => toggle(a.id, v)} /></td>
                                <td className="ps-c-main">
                                  <div className="ps-who">
                                    <Avatar name={a.name} size="sm" />
                                    <div style={{ minWidth: 0 }}>
                                      <button type="button" className="ps-name" onClick={(e) => { e.stopPropagation(); open(a.id); }}>{a.name}</button>
                                      <div className="ps-sub ellipsis">{a.summary}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="ps-c-date"><span className="num">{slash(a.appliedAt)}</span><span className="ps-src">{a.source}</span></td>
                                <td className="ps-c-yrs num">{a.years ? `${a.years}년` : "신입"}</td>
                                <td className="ps-c-doc">
                                  {r.rec.screening.ok ? <Chip tone="good" sm dot>통과</Chip>
                                    : <span title={r.rec.screening.misses.join(", ")}><Chip tone="warn" sm icon={<TriangleAlert />}>걸림 {r.rec.screening.misses.length}</Chip></span>}
                                </td>
                                <td className="ps-c-test"><Chip tone={ts.tone} sm dot>{ts.label}</Chip>{ts.date && <span className="ps-date num">{slash(ts.date)}</span>}</td>
                                <td className="ps-c-fit">
                                  {r.rec.score != null ? (
                                    <span className="ps-fit"><span className="num">{r.rec.score}</span><Bar value={r.rec.score} color={TIER_COLOR[r.rec.tier]} label={`${a.name} 적합도 ${r.rec.score}점`} /></span>
                                  ) : <span className="faint" aria-label="검사 후 나와요">—</span>}
                                </td>
                                <td className={cx("ps-c-tier", r.rec.tier === "pending" && "is-empty")}>{r.rec.tier === "pending" ? <span className="faint" aria-label="검사 후 나와요">—</span> : <TierChip t={r.rec.tier} />}</td>
                                <td className="ps-c-act" onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" icon={nx.icon} onClick={nx.act}>{nx.label}</Button>
                                </td>
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
          {empties.length > 0 && (
            <p className="ps-empties">
              <span className="muted">지금 비어 있는 단계</span>
              {empties.map((g) => <span key={g} className="ps-empties__i"><Sq color={GROUP[g].color} />{GROUP[g].label}<span className="num faint">0</span></span>)}
            </p>
          )}
        </div>
      )}

      <p className="faint xs ps-foot">
        {longDate(today)} 기준 · AI 추천은 참고예요. 면접 대상·합격은 담당자가 정해요. 지원자가 요청하면 추천 근거를 설명해요. 채용서류는 반환 청구 기간이 지나면 파기해요.
      </p>

      <ApplicantDrawer row={rows.find((r) => r.a.id === openId)} pos={pos} onClose={() => setParam("a", null)} />
    </>
  );
}
