// 회의: Orbix 'Auralis'(post_2)의 왼쪽 '진행 중 / 검토 준비' 목록과 처리 노드, 'AI support inbox'(refs/ai-support-inbox-dark)의
// 목록 + 상세 받은편지함 구조, 'Botrix AI Command Center'(refs/botrix-ai-command-center)의 KPI 띠·상태 칩을 밝은 Orbix 문법으로 옮겼어요.
// 리서치 02(GOAL A): 녹음 하나 → 구간 분할 → 사업·프로젝트 다중 분류 → 결정·액션 추출 → 확신이 낮은 구간만 사람이 확인.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CalendarDays, Check, CheckCircle2, CircleDashed, Clock, Gavel, Inbox, ListTodo, LoaderCircle, Mic, Plus, ScanSearch, ShieldCheck, Sparkles, Tags, Upload, Users, WandSparkles, Zap,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { DataClass, Meeting, TenantData } from "@/data/types";
import { daysLeft, dday, md, mdw, mins, when } from "@/data/format";
import { Avatar, AvatarStack, Bar, Button, Card, Chip, Delta, Empty, KpiCard, MoreButton, PageHead, StackBar, Track, cx, type Tone } from "@/ui";
import { Pipeline, SegmentRow, Timeline, UploadDrawer, lineOf, needsCheck, segProject } from "./Meetings.parts";
import "./Meetings.css";

type Eff = "processing" | "review" | "done";
const GROUPS: { key: Eff; title: string }[] = [{ key: "processing", title: "분류 중" }, { key: "review", title: "확인 대기" }, { key: "done", title: "정리됨" }];
const EFF_CHIP: Record<Eff, { label: string; tone: Tone }> = { processing: { label: "분류 중", tone: "warn" }, review: { label: "확인 대기", tone: "info" }, done: { label: "정리됨", tone: "good" } };
const DC: Record<DataClass, { label: string; tone: Tone }> = {
  L0: { label: "L0 공개", tone: "outline" }, L1: { label: "L1 사내", tone: "outline" }, L2: { label: "L2 고객 비밀 · 국내 경로", tone: "warn" }, L3: { label: "L3 처리 안 함", tone: "bad" },
};

const needOf = (m: Meeting) => {
  const seg = m.segments.filter(needsCheck).length;
  const dec = m.decisions.filter((x) => x.status === "proposed").length;
  const act = m.actions.filter((x) => x.status === "proposed").length;
  return { seg, dec, act, all: seg + dec + act };
};
const effOf = (m: Meeting): Eff => (m.status === "processing" ? "processing" : m.status === "review" && needOf(m).all > 0 ? "review" : "done");
const stamp = (m: Meeting) => `${m.date}T${m.time}`;

export default function Meetings() {
  const { d, me } = useApp();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [upload, setUpload] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const fallback = d.meetings.find((m) => m.status === "review" && needOf(m).all > 0) ?? d.meetings.find((m) => m.status === "review") ?? d.meetings[0];
  const sel = d.meetings.find((m) => m.id === params.get("m")) ?? fallback;
  const pick = (id: string) => {
    setParams((p) => { p.set("m", id); return p; });
    if (window.matchMedia("(max-width: 1279px)").matches) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  // KPI
  const k = useMemo(() => {
    const age = (m: Meeting) => -daysLeft(m.date, d.today);
    const week = d.meetings.filter((m) => age(m) >= 0 && age(m) <= 7);
    const prev = d.meetings.filter((m) => age(m) > 7 && age(m) <= 14).length;
    const segs = d.meetings.flatMap((m) => m.segments);
    const hi = segs.filter((s) => s.confidence >= 0.85).length, mid = segs.filter((s) => s.confidence >= 0.6 && s.confidence < 0.85).length, lo = segs.length - hi - mid;
    const p = (v: number) => (segs.length ? Math.round((v / segs.length) * 100) : 0);
    const acts = d.meetings.flatMap((m) => m.actions);
    return {
      week: week.length, prev, weekMin: week.reduce((a, m) => a + m.duration, 0),
      auto: p(hi + mid), hi: p(hi), mid: p(mid), lo: p(lo),
      pend: segs.filter(needsCheck).length, unc: segs.filter((s) => s.status === "unclassified").length,
      made: acts.filter((a) => a.status === "accepted").length, acts: acts.length, propAct: acts.filter((a) => a.status === "proposed").length,
    };
  }, [d]);

  const listed = d.meetings.filter((m) => scope === "all" || m.attendees.includes(me.id));

  return (
    <>
      <PageHead
        title="회의"
        desc="녹음 하나를 구간으로 나눠 사업·프로젝트에 붙여요. 확신이 낮은 구간만 확인하면 돼요."
        actions={
          <>
            <Button variant="dark" icon={<Upload />} onClick={() => setUpload(true)}>회의 올리기</Button>
            <Button icon={<Tags />} onClick={() => nav("/company")}>분류 기준</Button>
          </>
        }
      />

      <div className="kpirow mt-kpis">
        <KpiCard icon={<Mic />} hue="violet" label="이번 주 회의" value={k.week} unit="건"
          delta={<Delta value={k.week === k.prev ? `지난주 ${k.prev}` : `${Math.abs(k.week - k.prev)}건`} dir={k.week > k.prev ? "up" : k.week < k.prev ? "down" : "flat"} good />}
          foot={`최근 7일 · 녹음 ${mins(k.weekMin)}`} />
        <KpiCard icon={<WandSparkles />} hue="brand" label="자동 분류율" value={k.auto} unit="%"
          foot={<span className="mt-kfoot"><StackBar label="확신 구간별 비율" parts={[{ value: k.hi, color: "var(--c-green)", label: "바로 붙임" }, { value: k.mid, color: "var(--c-amber)", label: "확인 제안" }, { value: k.lo, color: "var(--c-coral)", label: "미분류" }]} /><span className="mt-kfoot__lg num"><span><i style={{ background: "var(--c-green)" }} />바로 {k.hi}%</span><span><i style={{ background: "var(--c-amber)" }} />확인 {k.mid}%</span><span><i style={{ background: "var(--c-coral)" }} />미분류 {k.lo}%</span></span></span>} />
        <KpiCard icon={<ScanSearch />} hue="amber" label="확인 대기 구간" value={k.pend} unit="구간"
          delta={k.unc ? <Delta value={`미분류 ${k.unc}`} dir="flat" /> : undefined} foot="확신이 낮은 구간만 사람이 봐요" />
        <KpiCard icon={<ListTodo />} hue="green" label="업무로 만든 액션" value={<>{k.made}<span className="kpi__unit">/{k.acts}건</span></>}
          delta={k.propAct ? <Delta value={`제안 ${k.propAct}`} dir="flat" /> : undefined} foot="추천 담당·기한은 AI가 채워요" />
      </div>

      <div className="mt-split">
        <div className="mt-listcol">
          <Card title="회의 목록" actions={<Track label="회의 범위" value={scope} onChange={setScope} options={[{ value: "all", label: "전체" }, { value: "mine", label: "내 회의" }]} />} flush
            foot={<><span className="mt-mono">P</span><span className="mt-foot__t">Plaud에서 녹음이 끝나면 자동으로 올라와요</span><button type="button" className="mt-link" onClick={() => nav("/integrations")}>연결</button></>}>
            <div className="mt-list">
              {listed.length === 0 && <Empty icon={<Inbox />} title="참석한 회의가 없어요">전체 회의에서 찾아보세요</Empty>}
              {GROUPS.map((g) => {
                const items = listed.filter((m) => effOf(m) === g.key).sort((a, b) => stamp(b).localeCompare(stamp(a)));
                if (!items.length) return null;
                return (
                  <section key={g.key} className="mt-grp" aria-label={g.title}>
                    <h3 className="mt-grp__t">{g.title}<span className="num">{items.length}</span></h3>
                    <ul>{items.map((m) => <ListItem key={m.id} d={d} m={m} on={m.id === sel?.id} onPick={() => pick(m.id)} />)}</ul>
                  </section>
                );
              })}
            </div>
          </Card>
          <MixCard d={d} />
        </div>

        <div className="mt-detail" ref={detailRef}>
          {sel ? <Detail key={sel.id} m={sel} /> : <Card><Empty icon={<Mic />} title="아직 회의가 없어요">녹음을 올리면 구간을 나눠 드려요</Empty></Card>}
        </div>
      </div>

      <UploadDrawer open={upload} onClose={() => setUpload(false)} />
    </>
  );
}

/** 사업별 회의 시간: 정리된·확인 대기 회의의 구간을 사업별로 더해요(한 회의가 여러 사업으로 나뉘는 걸 모아 보기) */
function MixCard({ d }: { d: TenantData }) {
  const segs = d.meetings.filter((m) => m.status !== "processing").flatMap((m) => m.segments);
  const total = segs.reduce((a, s) => a + (s.to - s.from), 0) || 1;
  const rows = [
    ...d.lines.map((l) => ({ key: l.code, name: l.name, color: l.color, min: segs.filter((s) => s.lineCode === l.code).reduce((a, s) => a + (s.to - s.from), 0) })),
    { key: "_none", name: "미분류", color: "", min: segs.filter((s) => !lineOf(d, s.lineCode)).reduce((a, s) => a + (s.to - s.from), 0) },
  ].filter((r) => r.min > 0).sort((a, b) => (a.key === "_none" ? 1 : b.key === "_none" ? -1 : b.min - a.min));
  const mixed = d.meetings.filter((m) => new Set(m.segments.map((s) => s.lineCode).filter(Boolean)).size > 1).length;
  return (
    <Card className="mt-mix" title="사업별 회의 시간" sub={`회의 ${d.meetings.filter((m) => m.status !== "processing").length}건 · 구간 기준`} actions={<MoreButton label="사업별 회의 시간 메뉴" />}>
      <div className="mt-mix__rows">
        {rows.map((r) => (
          <div key={r.key} className="mt-mix__row">
            <div className="between small"><span className="tagsq"><i className={cx(!r.color && "mt-hatch")} style={{ background: r.color || undefined }} />{r.name}</span><span className="num"><b style={{ fontWeight: 500 }}>{mins(r.min)}</b><span className="faint"> · {Math.round((r.min / total) * 100)}%</span></span></div>
            <Bar value={(r.min / total) * 100} color={r.color || "#c9cad3"} label={`${r.name} ${r.min}분`} />
          </div>
        ))}
      </div>
      <p className="mt-mix__note"><Sparkles />회의 {mixed}건이 여러 사업 이야기를 함께 다뤘어요. 구간마다 나눠 각 사업에 붙였어요.</p>
    </Card>
  );
}

function ListItem({ d, m, on, onPick }: { d: TenantData; m: Meeting; on: boolean; onPick: () => void }) {
  const eff = effOf(m);
  const need = needOf(m);
  return (
    <li>
      <button type="button" className={cx("mt-item", on && "is-on")} aria-current={on || undefined} onClick={onPick}>
        <span className={`mt-item__ic mt-item__ic--${eff}`} aria-hidden>{eff === "processing" ? <LoaderCircle className="mt-spin" /> : eff === "review" ? <CircleDashed /> : <CheckCircle2 />}</span>
        <span className="mt-item__body">
          <span className="mt-item__top">
            <span className="mt-item__t ellipsis">{m.title}</span>
            {eff === "review" && <Chip tone="warn" sm>확인 {need.all}</Chip>}
            {eff === "processing" && <Chip tone="neutral" sm>나누는 중</Chip>}
          </span>
          <span className="mt-item__s num">{m.source} · {when(stamp(m), d.today)} · {m.duration}분{m.segments.length ? ` · ${m.segments.length}구간` : ""}</span>
          {eff === "processing" ? (
            <span className="mt-item__prog" aria-label="구간을 나누는 중"><i /></span>
          ) : (
            <span className="mt-strip" aria-hidden>
              {[...m.segments].sort((a, b) => a.from - b.from).map((s) => {
                const l = lineOf(d, s.lineCode);
                return <i key={s.id} className={cx(!l && "mt-hatch")} style={{ flexGrow: s.to - s.from, background: l?.color }} />;
              })}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function Detail({ m }: { m: Meeting }) {
  const { d, me, person, act } = useApp();
  const nav = useNavigate();
  const [focus, setFocus] = useState<string | null>(null);
  const [segView, setSegView] = useState<"all" | "check">("all");
  const eff = effOf(m);
  const need = needOf(m);
  useEffect(() => { if (need.seg === 0) setSegView("all"); }, [need.seg]);

  const segs = [...m.segments].sort((a, b) => a.from - b.from);
  const lineCount = new Set(segs.map((s) => lineOf(d, s.lineCode)?.code).filter(Boolean)).size;
  const projCount = new Set(segs.map((s) => segProject(d, s)?.id).filter(Boolean)).size;
  const shown = segs.filter((s) => segView === "all" || needsCheck(s));
  const names = m.attendees.map((id) => person(id)?.name ?? id);
  const src = m.source === "직접 업로드";

  const pickSeg = (id: string) => {
    setFocus(id);
    if (segView === "check" && !needsCheck(segs.find((s) => s.id === id)!)) setSegView("all");
    setTimeout(() => document.getElementById(`seg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  };

  return (
    <>
      <Card className="mt-head">
        <div className="mt-head__top">
          <span className="mt-head__ic tone-violet" aria-hidden><Mic /></span>
          <div className="mt-head__main">
            <div className="mt-head__kind">{m.kind}</div>
            <h2 className="mt-head__t">{m.title}</h2>
            <div className="mt-head__meta">
              <span><CalendarDays />{mdw(m.date)} {m.time}</span>
              <span><Clock />{m.duration}분</span>
              <span><Users />참석 {names.length}명 <AvatarStack names={names} max={4} /></span>
            </div>
          </div>
          <div className="mt-head__acts"><MoreButton label="회의 메뉴" /></div>
        </div>
        <div className="mt-head__chips">
          <Chip tone={src ? "outline" : "brand"} icon={src ? <Upload /> : <Zap />}>{src ? "직접 올림" : `${m.source}에서 자동`}</Chip>
          <Chip tone={DC[m.dataClass].tone} icon={<ShieldCheck />}>{DC[m.dataClass].label}</Chip>
          <Chip tone={EFF_CHIP[eff].tone} dot>{EFF_CHIP[eff].label}</Chip>
        </div>
        <Pipeline m={m} need={need.all} />
        <div className="mt-sum">
          <Sparkles aria-hidden />
          <div style={{ minWidth: 0 }}>
            <div className="mt-sum__t">AI 요약</div>
            <p>{m.summary}</p>
            {eff !== "processing" && (
              <div className="mt-sum__stats">
                <Chip sm tone="outline">사업 {lineCount}개</Chip><Chip sm tone="outline">프로젝트 {projCount}개</Chip>
                <Chip sm tone="outline">결정 {m.decisions.length}</Chip><Chip sm tone="outline">액션 {m.actions.length}</Chip>
                {need.seg > 0 && <Chip sm tone="warn">확인할 구간 {need.seg}</Chip>}
              </div>
            )}
          </div>
        </div>
      </Card>

      {eff === "processing" ? (
        <Card title="구간 나누는 중" sub={`${m.source}에서 받은 ${m.duration}분 녹음을 나누고 있어요`} actions={<Chip tone="warn" dot sm>약 2분 남음</Chip>}>
          <div className="mt-wait" aria-hidden><i style={{ flexGrow: 3 }} /><i style={{ flexGrow: 2 }} /><i style={{ flexGrow: 4 }} /><i style={{ flexGrow: 1.5 }} /><i style={{ flexGrow: 2.5 }} /></div>
          <ul className="mt-next">
            <li><Check />전사를 받았고 민감 정보(L3)는 없었어요</li>
            <li><LoaderCircle className="mt-spin" />주제가 바뀌는 곳을 찾아 구간으로 나누고 있어요</li>
            <li><CircleDashed />끝나면 사업·프로젝트를 붙이고 결정·액션을 뽑아 참석자에게 알려요</li>
          </ul>
        </Card>
      ) : (
        <>
          <Card title="구간 타임라인" sub={`${m.duration}분 녹음이 사업 ${lineCount}개 · 프로젝트 ${projCount}개로 나뉘었어요`} actions={<MoreButton label="타임라인 메뉴" />}>
            <Timeline d={d} m={m} focus={focus} onPick={pickSeg} />
          </Card>

          <Card title="구간" sub="AI가 붙인 분류예요. 확신이 낮은 것만 확인해 주세요" flush
            actions={<Track label="구간 보기" value={segView} onChange={setSegView} options={[{ value: "all", label: <>전체 <span className="num">{segs.length}</span></> }, { value: "check", label: <>확인 필요 <span className="num">{need.seg}</span></> }]} />}>
            {shown.length ? (
              <ol className="mt-segs">
                {shown.map((s) => (
                  <SegmentRow key={s.id} d={d} s={s} on={focus === s.id} onFocus={() => setFocus(s.id)}
                    onOk={() => act.confirmSegment(m.id, s.id)} onFix={(code) => act.confirmSegment(m.id, s.id, code ?? undefined)} />
                ))}
              </ol>
            ) : <Empty icon={<CheckCircle2 />} title="확인할 구간을 다 봤어요">고친 분류는 다음 회의를 나눌 때 예시로 쓰여요</Empty>}
          </Card>

          <div className="mt-two">
            <Card title="결정" sub="회의에서 정한 것" actions={<Chip sm tone="outline"><span className="num">{m.decisions.filter((x) => x.status === "confirmed").length}/{m.decisions.length}</span> 확정</Chip>}>
              {m.decisions.length ? (
                <ul className="mt-dl">
                  {m.decisions.map((dc) => {
                    const o = person(dc.owner);
                    const can = dc.owner === me.id || me.platform === "owner";
                    return (
                      <li key={dc.id}>
                        <span className="mt-dl__ic tone-blue" aria-hidden><Gavel /></span>
                        <div className="mt-dl__main">
                          <div className="mt-dl__t">{dc.text}</div>
                          <div className="mt-dl__s"><Avatar name={o?.name ?? "?"} size="sm" />{o?.name}{dc.status === "proposed" && !can ? "님이 확정해요" : " 확정"}</div>
                        </div>
                        <div className="mt-dl__side">
                          {dc.status === "confirmed" ? <Chip tone="good" dot sm>확정</Chip>
                            : can ? <Button size="sm" variant="soft" icon={<Check />} onClick={() => act.confirmDecision(m.id, dc.id)}>확정</Button>
                              : <Chip tone="warn" dot sm>확정 대기</Chip>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <Empty icon={<Gavel />} title="정한 것이 없었어요" />}
            </Card>

            <Card title="액션" sub="추천 담당·기한은 AI가 채웠어요" actions={<Chip sm tone="outline"><span className="num">{m.actions.filter((a) => a.status === "accepted").length}/{m.actions.length}</span> 업무로</Chip>}>
              {m.actions.length ? (
                <ul className="mt-dl">
                  {m.actions.map((a) => {
                    const p = person(a.assignee);
                    const left = daysLeft(a.due, d.today);
                    return (
                      <li key={a.id}>
                        <span className="mt-dl__ic tone-green" aria-hidden><ListTodo /></span>
                        <div className="mt-dl__main">
                          <div className="mt-dl__t">{a.title}</div>
                          <div className="mt-dl__s">
                            <Avatar name={p?.name ?? "?"} size="sm" />{a.status === "proposed" ? "추천 " : ""}{p?.name}
                            <span className="faint">·</span><span className="num">{md(a.due)}</span>
                            {a.status !== "accepted" && <Chip sm tone={left <= 1 ? "warn" : "neutral"}>{dday(a.due, d.today)}</Chip>}
                          </div>
                        </div>
                        <div className="mt-dl__side">
                          {a.status === "proposed" ? <Button size="sm" variant="soft" icon={<Plus />} onClick={() => act.acceptAction(m.id, a.id)}>업무로 만들기</Button>
                            : a.status === "accepted" ? <button type="button" className="mt-made" onClick={() => nav("/tasks")}><Chip tone="good" dot sm>업무로 만듦</Chip></button>
                              : <Chip sm>안 함</Chip>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <Empty icon={<ListTodo />} title="나온 액션이 없어요" />}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
