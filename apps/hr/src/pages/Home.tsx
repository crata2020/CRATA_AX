// 인사 홈: post_3.jpg('Welcome Back' 인사 + 빠른 동작 줄 + KPI 카드 + 목록), refs/hope-hr-analytics.jpg(KPI 띠 · 도넛 대신 묶음 % 목록),
// worksite-next Home(카드 머리 17px + 알약 · 도넛 + 범례 · 목록 줄)에서 가져왔어요.
// 확정 전 이동은 판정 칩(VERDICT)과 함께, 비어 있으면 예시 문장을 눌러 바로 올려 볼 수 있어요.
import { useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight, BriefcaseBusiness, Check, CheckCircle2, GitBranchPlus, History, Lock, MessageSquareText, ShieldCheck, Sparkles, UserCheck, Users,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { Stage } from "@/lib/model";
import { VERDICT, type Verdict } from "@/lib/fit";
import { recommend } from "@/lib/hiring";
import { josa } from "@/lib/text";
import { Avatar, Button, Card, Chip, Delta, Empty, KpiCard, MoreButton, PageHead, StackBar } from "@/ui";
import { Donut } from "@/ui/charts";
import "./Home.css";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const longDate = (d: string) => { const t = new Date(`${d}T00:00:00`); return `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일 ${WD[t.getDay()]}요일`; };
const days = (a: string, b: string) => Math.round((new Date(`${b.slice(0, 10)}T00:00:00`).getTime() - new Date(`${a.slice(0, 10)}T00:00:00`).getTime()) / 86400000);
const dday = (deadline: string, today: string) => { const n = days(today, deadline); return n > 0 ? `D-${n}` : n === 0 ? "D-day" : "마감"; };
const when = (at: string, today: string) => { const d = at.slice(0, 10), t = at.slice(11, 16); return d === today ? `오늘 ${t}` : `${+d.slice(5, 7)}.${+d.slice(8, 10)} ${t}`; };

/** 채용 흐름 5칸(브리프: 접수 → CRATA 검사 → AI 추천 → 면접 → 결과) */
const FLOW: { key: string; label: string; color: string; stages: Stage[] }[] = [
  { key: "in", label: "접수", color: "var(--c-blue)", stages: ["applied", "screened"] },
  { key: "test", label: "CRATA 검사", color: "var(--c-violet)", stages: ["testing", "tested"] },
  { key: "short", label: "면접 추천", color: "var(--c-amber)", stages: ["shortlist"] },
  { key: "iv", label: "면접", color: "var(--c-green)", stages: ["interview"] },
  { key: "done", label: "결과", color: "var(--brand)", stages: ["offer"] },
];
const VERDICT_ORDER: Verdict[] = ["good", "mixed", "caution", "unknown"];
const HINTS = ["이하은 품질보증팀으로", "권해솔 개발팀으로", "정재윤 품질보증팀으로"];

export default function Home() {
  const { people, world, teams, pending, log, positions, applicants, today, person, team, send, toast } = useApp();
  const nav = useNavigate();

  const work = teams.filter((t) => !t.office);
  const openPos = positions.filter((p) => p.status === "open");
  const openApps = applicants.filter((a) => openPos.some((p) => p.id === a.positionId));
  const weekApps = openApps.filter((a) => days(a.appliedAt, today) <= 6).length;

  // 지원자별 추천(검사 끝난 사람만 의미 있음). 추천은 참고 — 면접 대상은 담당자가 정해요.
  const recs = useMemo(() => new Map(openApps.map((a) => {
    const pos = positions.find((p) => p.id === a.positionId)!;
    const t = teams.find((x) => x.id === pos.teamId)!;
    return [a.id, recommend(pos, t, people.filter((p) => p.teamId === t.id), a)] as const;
  })), [openApps, positions, teams, people]);
  const waitIv = openApps.filter((a) => a.stage === "shortlist" || (a.stage === "tested" && recs.get(a.id)?.tier === "recommend")).length;

  const consent = [
    { label: "배치 참고 동의", short: "배치 참고", value: people.filter((p) => p.consent === "placement").length, color: "var(--c-green)" },
    { label: "동의 안 함(본인만)", short: "동의 안 함", value: people.filter((p) => p.consent === "self").length, color: "var(--c-blue)" },
    { label: "미응시", short: "미응시", value: people.filter((p) => p.consent === "none").length, color: "var(--line-2)" },
  ];
  const took = consent[0]!.value + consent[1]!.value;
  const tookPct = Math.round((took / Math.max(1, people.length)) * 100);

  const byVerdict = VERDICT_ORDER.map((v) => ({ v, n: pending.filter((m) => m.advice.verdict === v).length })).filter((x) => x.n > 0);
  const caution = pending.filter((m) => m.advice.verdict === "caution").length;

  const heads = work.map((t) => {
    const now = world.people.filter((p) => p.teamId === t.id).length;
    const was = people.filter((p) => p.teamId === t.id).length;
    return { t, now, diff: now - was };
  });
  const scale = Math.max(...heads.map((h) => Math.max(h.now, h.t.min))) + 1;
  const short = heads.filter((h) => h.now < h.t.min).length;

  const pendingNames = new Set(pending.map((m) => person(m.personId)?.name));
  const moreHints = HINTS.filter((h) => !pendingNames.has(h.split(" ")[0]));
  const edge = heads.filter((h) => h.now === h.t.min);
  const tryHint = (text: string) => { send(text); toast("확정 전 이동에 올렸어요. 인사이동에서 확정해요"); };

  return (
    <>
      <PageHead
        eyebrow={longDate(today)}
        title="안녕하세요, 인사 담당님"
        desc={pending.length ? `확정 전 이동 ${pending.length}건과 면접 추천 대기 ${waitIv}명이 있어요.` : `오늘 확정할 이동은 없어요. 면접 추천 대기 ${waitIv}명이 있어요.`}
        actions={
          <div className="hh-acts">
            <Button variant="dark" icon={<GitBranchPlus />} count={pending.length || undefined} onClick={() => nav("/moves")}>인사이동 열기</Button>
            <Button icon={<Users />} onClick={() => nav("/people")}>구성원 보기</Button>
            <Button icon={<BriefcaseBusiness />} onClick={() => nav("/hiring")}>채용 공고</Button>
          </div>
        }
      />

      <div className="kpirow" style={{ marginBottom: "var(--gap)" }}>
        <KpiCard icon={<Users />} hue="brand" label="구성원" value={people.length} unit="명" foot={`팀 ${work.length}개 · 배치 참고 동의 ${consent[0]!.value}명`} />
        <KpiCard icon={<GitBranchPlus />} hue="orange" label="확정 전 이동" value={pending.length} unit="건"
          delta={caution ? <Chip tone="bad" dot sm>신중하게 <span className="num">{caution}</span></Chip> : undefined}
          foot={pending.length ? "확정 전까지 조직도에서 깜빡여요" : "ARA에게 '누구를 어디로' 적어 보세요"} />
        <KpiCard icon={<BriefcaseBusiness />} hue="violet" label="열린 공고" value={openPos.length} unit="개"
          delta={weekApps ? <Delta value={`이번 주 ${weekApps}명`} dir="up" good /> : undefined} foot={`지원자 ${openApps.length}명`} />
        <KpiCard icon={<UserCheck />} hue="green" label="면접 추천 대기" value={waitIv} unit="명" foot="AI 추천은 참고 · 결정은 담당자가 해요" />
      </div>

      <div className="grid g-12">
        {/* 확정 전 이동 */}
        <Card className="s-8" title="확정 전 이동" icon={pending.length ? <span className="hh-live" aria-hidden /> : undefined}
          sub={pending.length ? "ARA 판정은 참고예요. 확정은 인사이동에서 사람이 해요" : undefined}
          actions={pending.length ? <Button size="sm" onClick={() => nav("/moves")}>인사이동에서 확정<ArrowRight /></Button> : <MoreButton />} line={pending.length > 0}>
          {pending.length ? (
            <>
              <div className="hh-verdicts" aria-label="판정별 건수">
                {byVerdict.map((x) => <Chip key={x.v} tone={VERDICT[x.v].tone} dot sm>{VERDICT[x.v].label} <span className="num">{x.n}</span></Chip>)}
              </div>
              <ul className="hh-moves">
                {pending.slice(0, 4).map((m) => {
                  const p = person(m.personId);
                  const v = VERDICT[m.advice.verdict];
                  return (
                    <li key={m.id}>
                      <Avatar name={p?.name ?? "?"} />
                      <div className="hh-moves__main">
                        <div className="hh-moves__t">
                          <b>{p?.name}</b>
                          <span className="hh-route"><span>{team(m.fromTeamId)?.name}</span><ArrowRight aria-label="에서" /><span className="hh-route__to">{team(m.toTeamId)?.name}</span></span>
                          {m.lead && <Chip tone="dark" sm>팀장으로</Chip>}
                        </div>
                        <p className="hh-moves__s">{m.advice.headline}</p>
                      </div>
                      <div className="hh-moves__v">
                        <Chip tone={v.tone} dot sm>{v.label}</Chip>
                        {m.advice.score != null ? <span className="hh-score"><b className="num">{m.advice.score}</b><span className="faint xs">점</span></span> : <span className="faint xs">조직 정보로만</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {pending.length > 4 && <Button block style={{ marginTop: 12 }} onClick={() => nav("/moves")}>나머지 <span className="num">{pending.length - 4}</span>건 보기<ArrowRight /></Button>}
              {moreHints.length > 0 && pending.length < 3 && (
                <div className="hh-more">
                  <span className="muted small">이어서 적어 보기</span>
                  <div className="hh-hints">{moreHints.map((h) => <button key={h} type="button" className="hh-hint" onClick={() => tryHint(h)}><MessageSquareText aria-hidden />{h}</button>)}</div>
                </div>
              )}
            </>
          ) : (
            <div className="hh-empty">
              <div className="hh-empty__art" aria-hidden>
                <span className="hh-empty__node">생산1팀</span><span className="hh-empty__line" /><span className="hh-empty__node hh-empty__node--to"><i className="hh-live" />품질보증팀</span>
                <span className="hh-empty__who"><Avatar name="이하은" size="sm" /></span>
                <span className="hh-empty__cap">확정 전에는 깜빡여요</span>
              </div>
              <div className="hh-empty__body">
                <div className="hh-empty__t">확정 전 이동이 없어요</div>
                <p>ARA에게 누구를 어디로 보낼지 적으면 여기에 모여요. 확정 전까지 조직도에서 깜빡이고, 잘 맞는지와 걱정되는 점을 같이 알려 드려요.</p>
                <div className="hh-hints" aria-label="예시 문장">
                  {HINTS.map((h) => <button key={h} type="button" className="hh-hint" onClick={() => tryHint(h)}><MessageSquareText aria-hidden />{h}</button>)}
                </div>
                <span className="faint xs">누르면 예시로 올려 봐요. 확정하기 전에는 실제 조직이 바뀌지 않아요.</span>
              </div>
            </div>
          )}
        </Card>

        {/* CRATA 참여 · 동의 */}
        <Card className="s-4" title="CRATA 참여 · 동의" actions={<Button size="sm" variant="ghost" onClick={() => nav("/people")}>구성원<ArrowRight /></Button>}>
          <div className="hh-donut">
            <Donut data={consent} size={164} thickness={20} center={<>{tookPct}<span className="hh-pct">%</span></>} sub="검사 참여" />
          </div>
          <ul className="hh-cstats" aria-label="동의 상태별 인원">
            {consent.map((c) => (
              <li key={c.label}>
                <span className="tagsq"><i style={{ background: c.color }} />{c.short}</span>
                <span className="hh-cstats__v"><b className="num">{c.value}</b><span className="faint xs num">{Math.round((c.value / Math.max(1, people.length)) * 100)}%</span></span>
              </li>
            ))}
          </ul>
          <p className="hh-note"><Lock aria-hidden />개인 결과는 배치 참고에 동의한 사람만 써요. 응하지 않아도 불이익은 없어요.</p>
        </Card>

        {/* 채용 파이프라인 */}
        <Card className="s-7" title="채용 파이프라인" sub={`열린 공고 ${openPos.length}개 · 지원자 ${openApps.length}명`} actions={<Button size="sm" onClick={() => nav("/hiring")}>채용 공고<ArrowRight /></Button>} line>
          <ul className="hh-flowleg" aria-label="단계 색">
            {FLOW.map((f) => <li key={f.key}><span className="tagsq"><i style={{ background: f.color }} />{f.label}</span></li>)}
          </ul>
          <ul className="hh-pipe">
            {openPos.map((pos) => {
              const apps = applicants.filter((a) => a.positionId === pos.id);
              const parts = FLOW.map((f) => ({ label: f.label, color: f.color, value: apps.filter((a) => f.stages.includes(a.stage)).length }));
              const tested = apps.filter((a) => a.crata).length;
              const sentOrDone = apps.filter((a) => a.crata || a.stage === "testing").length;
              const rec = apps.filter((a) => recs.get(a.id)?.tier === "recommend").length;
              const dd = dday(pos.deadline, today);
              return (
                <li key={pos.id}>
                  <button type="button" className="hh-pipe__row" onClick={() => nav(`/hiring/${pos.id}`)} aria-label={`${pos.title} 공고 보기`}>
                    <div className="hh-pipe__top">
                      <div style={{ minWidth: 0 }}>
                        <div className="hh-pipe__t ellipsis">{pos.title}</div>
                        <div className="hh-pipe__s">{team(pos.teamId)?.name} · <span className="num">{pos.count}</span>명 채용</div>
                      </div>
                      <Chip tone={days(today, pos.deadline) <= 7 ? "warn" : "outline"} sm><span className="num">{dd}</span></Chip>
                    </div>
                    <StackBar parts={parts.filter((x) => x.value > 0)} label={`${pos.title} 단계별 인원`} />
                    <div className="hh-pipe__stats">
                      <span>지원 <b className="num">{apps.length}</b></span>
                      <span>검사 완료 <b className="num">{tested}</b><span className="faint num">/{sentOrDone}</span></span>
                      <span>추천 <b className="num">{rec}</b>명</span>
                      <ArrowRight className="hh-pipe__go" aria-hidden />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* 팀별 인원 · 최소 인원 */}
        <Card className="s-5" title="팀별 인원" sub={pending.length ? "확정 전 이동을 반영했어요" : "막대 끝의 눈금이 최소 인원이에요"} actions={short ? <Chip tone="bad" dot sm>최소 미달 <span className="num">{short}</span></Chip> : <Chip tone="good" dot sm>모두 최소 이상</Chip>} line>
          <ul className="hh-heads">
            {heads.map(({ t, now, diff }) => {
              const state = now < t.min ? "under" : now === t.min ? "edge" : "ok";
              return (
                <li key={t.id}>
                  <span className="hh-heads__n ellipsis">{t.name}</span>
                  <span className="hh-heads__bar" role="img" aria-label={`${t.name} ${now}명, 최소 ${t.min}명`}>
                    <i className={`hh-heads__fill hh-heads__fill--${state}`} style={{ width: `${(now / scale) * 100}%` }} />
                    <i className="hh-heads__min" style={{ left: `${(t.min / scale) * 100}%` }} />
                  </span>
                  <span className="hh-heads__v"><b className="num">{now}</b><span className="faint num">/{t.min}</span></span>
                  <span className="hh-heads__d">
                    {diff !== 0 ? <Delta value={`${Math.abs(diff)}`} dir={diff > 0 ? "up" : "down"} good={diff > 0} />
                      : state === "under" ? <Chip tone="bad" sm>부족</Chip> : state === "edge" ? <Chip tone="warn" sm>최소</Chip> : null}
                  </span>
                </li>
              );
            })}
          </ul>
          {edge.length > 0 && (
            <p className="hh-tip"><Sparkles aria-hidden /><span>{josa(edge.map((h) => h.t.name).join(", "), "은는")} 지금 최소 인원과 같아요. 여기서 사람을 옮기면 ARA가 먼저 알려 드려요.</span></p>
          )}
          <div className="hh-heads__leg">
            <span className="tagsq"><i style={{ background: "var(--c-blue)" }} />여유</span>
            <span className="tagsq"><i style={{ background: "var(--c-amber)" }} />최소와 같음</span>
            <span className="tagsq"><i style={{ background: "var(--c-coral)" }} />최소 미달</span>
          </div>
        </Card>

        {/* 최근 확정 */}
        <Card className="s-6" title="최근 확정" icon={<History />} actions={log.length ? <Chip tone="outline" sm><span className="num">{log.length}</span>건</Chip> : undefined}>
          {log.length ? (
            <ul className="list">
              {log.slice(0, 5).map((c) => {
                const p = person(c.personId);
                return (
                  <li key={c.id}>
                    <Avatar name={p?.name ?? "?"} size="sm" />
                    <div className="list__main">
                      <div className="list__t">{p?.name} <span className="muted" style={{ fontWeight: 400 }}>{josa(team(c.toTeamId)?.name ?? "", "으로")}</span></div>
                      <div className="list__s">{team(c.fromTeamId)?.name}에서 옮겼어요{c.lead ? " · 팀장" : ""}</div>
                    </div>
                    <Chip tone="good" sm icon={<Check />}>확정</Chip>
                    <span className="faint xs num" style={{ whiteSpace: "nowrap" }}>{when(c.at, today)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={<History />} title="아직 확정한 이동이 없어요"><span className="small">인사이동에서 확정하면 언제, 누가, 어디로 옮겼는지 여기에 남아요.</span></Empty>
          )}
        </Card>

        {/* 기준 */}
        <Card className="s-6" title="인사에 CRATA를 쓰는 기준" icon={<ShieldCheck />} actions={<Button size="sm" variant="ghost" onClick={() => nav("/policy")}>동의 · 보관<ArrowRight /></Button>}>
          <ul className="hh-rules">
            <li><CheckCircle2 aria-hidden /><span>결과는 <b>본인만</b> 보는 게 기본이에요.</span></li>
            <li><CheckCircle2 aria-hidden /><span>회사는 검사한 사람 <b className="num">5</b>명 이상인 팀의 분포만 봐요.</span></li>
            <li><CheckCircle2 aria-hidden /><span><b>배치 참고</b>에 따로 동의한 <span className="num">{consent[0]!.value}</span>명만 개인 결과를 인사이동에 참고해요.</span></li>
            <li><CheckCircle2 aria-hidden /><span>응하지 않아도 불이익이 없어요. ARA 마음 기록·대화는 인사에 쓰지 않아요.</span></li>
            <li><Sparkles aria-hidden /><span>AI는 추천과 근거만 내요. 이동 확정·면접 대상·합격은 <b>사람이</b> 정해요.</span></li>
          </ul>
        </Card>
      </div>
      <p className="faint xs" style={{ marginTop: 16 }}>회사·사람·숫자는 모두 예시 데이터예요. 색·동기·역량 항목 이름도 예시이고, 실제 CRATA 결과지 항목으로 바뀌어요.</p>
    </>
  );
}
