// 채용 공통 조각(채용 공고 · 공고 상세가 함께 씀). Orbix 레퍼런스에서 가져온 것:
// - 지원자 서랍: refs/orbixcrm-add-project-drawer.jpg(알약 줄 → 속성 목록 → 바닥 동작), 결과 막대는 refs/hope-hr-analytics.jpg의 줄 + 값
// - 새 공고 서랍: 같은 서랍의 큰 제목 입력·알약 필드·'Write with Ai' + refs/winx-add-product-form.jpg의 왼쪽 폼 / 오른쪽 요약 두 칸
// - 단계 묶음(접수·서류 → CRATA 검사 → 면접 추천 → 면접 → 결과), 날짜 도움, 공고별 집계, '찾는 사람' 요약(desiredEnv)
// AI는 추천과 근거만 내요. 면접 대상·합격·불합격은 담당자가 정하고, 불합격은 사람이 사유를 고른 뒤에만 돼요.
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight, Briefcase, CalendarDays, Check, ChevronDown, CircleAlert, CircleCheck, CircleHelp, ClipboardList, Clock3, Copy, FileText, Flag,
  GraduationCap, Inbox, Lightbulb, MessageCircleQuestion, MessagesSquare, Plus, Quote, Repeat, RotateCcw, Send, ShieldCheck, Sparkles,
  TriangleAlert, Users, X,
} from "lucide-react";
import { useApp } from "@/data/store";
import type { Applicant, Core, CrataProfile, Position, Stage, Team, Think } from "@/lib/model";
import { CENTER, COLOR, CONF, CONF_SHORT, CORE, GROWTH, MOTIVE, STAGE, THINK, THINK_SHORT } from "@/lib/model";
import type { Fit } from "@/lib/fit";
import { TIER, desiredEnv, recommend, type Rec, type Tier } from "@/lib/hiring";
import { q } from "@/lib/text";
import { Avatar, Bar, Button, Chip, Drawer, IconButton, Segmented, StackBar, Toggle, cx, type Hue, type Tone } from "@/ui";
import "./Hiring.css";

// ───────── 날짜
const toDate = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`);
const WD = "일월화수목금토";
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (s: string, n: number) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
export const daysLeft = (s: string, today: string) => Math.round((toDate(s).getTime() - toDate(today).getTime()) / 86400000);
export const md = (s: string) => { const d = toDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
export const mdw = (s: string) => `${md(s)}(${WD[toDate(s).getDay()]})`;
export const slash = (s: string) => { const d = toDate(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const longDate = (s: string) => { const d = toDate(s); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`; };
export function dday(deadline: string, today: string, closed?: boolean) {
  const n = daysLeft(deadline, today);
  if (closed || n < 0) return { text: "마감", tone: "neutral" as Tone };
  return { text: n === 0 ? "오늘 마감" : `D-${n}`, tone: (n <= 3 ? "warn" : "outline") as Tone };
}

// ───────── 단계 묶음(Orbix 칸반의 색 네모 + 이름 + 개수)
export type Group = "intake" | "test" | "rec" | "interview" | "result";
export const GROUP_ORDER: Group[] = ["intake", "test", "rec", "interview", "result"];
export const GROUP: Record<Group, { label: string; step: string; color: string; icon: ReactNode }> = {
  intake: { label: "접수·서류", step: "1차 접수", color: "var(--c-violet)", icon: <Inbox /> },
  test: { label: "CRATA 검사", step: "2차 CRATA 검사", color: "var(--c-blue)", icon: <ClipboardList /> },
  rec: { label: "면접 추천", step: "AI 추천", color: "var(--c-green)", icon: <Sparkles /> },
  interview: { label: "면접", step: "면접", color: "var(--c-amber)", icon: <MessagesSquare /> },
  result: { label: "결과", step: "결과", color: "#c3c4cc", icon: <Flag /> },
};
/** 지금 어느 단계에 있는지. 검사를 마친 사람 중 AI가 면접을 추천한 사람만 '면접 추천'으로 따로 봐요 */
export function groupOf(a: Applicant, tier: Tier): Group {
  switch (a.stage) {
    case "applied": case "screened": return "intake";
    case "testing": return "test";
    case "tested": case "shortlist": return tier === "recommend" ? "rec" : "test";
    case "interview": return "interview";
    default: return "result";
  }
}
export const STAGE_TONE: Record<Stage, Tone> = {
  applied: "neutral", screened: "info", testing: "info", tested: "brand", shortlist: "good", interview: "warn", offer: "good", hold: "warn", closed: "bad",
};
export const StageChip = ({ s }: { s: Stage }) => <Chip tone={STAGE_TONE[s]} dot sm>{STAGE[s].label}</Chip>;
export const TierChip = ({ t }: { t: Tier }) => <Chip tone={TIER[t].tone} dot sm>{TIER[t].label}</Chip>;
export const TIER_COLOR: Record<Tier, string> = { recommend: "var(--c-green)", consider: "var(--c-blue)", hold: "var(--c-amber)", pending: "#d5d6dc" };
export const Sq = ({ color }: { color: string }) => <i className="hg-sq" style={{ background: color }} aria-hidden />;

export function testStatus(a: Applicant): { label: string; tone: Tone; date?: string } {
  if (a.crata) return { label: "검사 완료", tone: "good", date: a.testedAt };
  if (a.testSentAt) return { label: "검사 보냄", tone: "info", date: a.testSentAt };
  return { label: "검사 전", tone: "neutral" };
}

/** 팀 환경 색 → 카드 파스텔 */
export const HUE_OF: Record<string, Hue> = { red: "coral", orange: "orange", yellow: "amber", green: "green", blue: "blue", purple: "violet" };

// ───────── 공고별 지원자 + 추천
export interface Row { a: Applicant; rec: Rec; group: Group }
export function useHiring() {
  const { positions, applicants, people, teams } = useApp();
  return useMemo(() => {
    const out = new Map<string, Row[]>();
    for (const p of positions) {
      const t = teams.find((x) => x.id === p.teamId);
      if (!t) { out.set(p.id, []); continue; }
      const members = people.filter((x) => x.teamId === p.teamId);
      out.set(p.id, applicants.filter((a) => a.positionId === p.id).map((a) => {
        const rec = recommend(p, t, members, a);
        return { a, rec, group: groupOf(a, rec.tier) };
      }));
    }
    return out;
  }, [positions, applicants, people, teams]);
}
export function statsOf(rows: Row[]) {
  const g = (x: Group) => rows.filter((r) => r.group === x).length;
  const st = (...s: Stage[]) => rows.filter((r) => s.includes(r.a.stage)).length;
  return {
    total: rows.length,
    by: { intake: g("intake"), test: g("test"), rec: g("rec"), interview: g("interview"), result: g("result") } as Record<Group, number>,
    applied: st("applied"), screened: st("screened"), testing: st("testing"),
    review: rows.filter((r) => r.group === "test" && r.a.crata).length,
    sent: rows.filter((r) => r.a.crata || r.a.testSentAt).length,
    tested: rows.filter((r) => r.a.crata).length,
    docMiss: rows.filter((r) => r.group === "intake" && !r.rec.screening.ok).length,
    offer: st("offer"), closed: st("closed"), hold: st("hold"),
  };
}

// ───────── '찾는 사람' 요약(desiredEnv = 팀 환경 + 회사가 강조한 항목)
type Draft = Pick<Position, "mode" | "want" | "minYears" | "shift" | "mustLicenses">;
export interface LookRow { key: string; label: string; values: string[]; emph: boolean; long?: string; swatch?: string }
export function lookFor(pos: Draft, team: Team): LookRow[] {
  const env = desiredEnv(pos as Position, team);
  const w = pos.want;
  return [
    { key: "core", label: "핵심역량", values: env.needs.map((c) => CORE[c]), emph: !!w.needs, long: "문제를 해결하는 행동 패턴" },
    { key: "center", label: "중심역량", values: env.centers.map((c) => CENTER[c]), emph: !!w.centers, long: "중심을 잡아 주는 환경 조건" },
    { key: "start", label: "시작 동기", values: env.starts.map((m) => MOTIVE[m]), emph: !!w.starts, long: "무엇이 있어야 움직이는가" },
    { key: "keep", label: "지속 동기", values: env.keeps.map((m) => MOTIVE[m]), emph: !!w.keeps, long: "무엇이 있어야 오래 가는가" },
    { key: "think", label: "생각 정리", values: [THINK_SHORT[env.think]], emph: !!w.think, long: THINK[env.think] },
    { key: "conf", label: "자신감", values: [CONF_SHORT[env.conf]], emph: !!w.conf, long: CONF[env.conf] },
    { key: "color", label: "환경 색", values: [COLOR[env.color].label], emph: false, long: COLOR[env.color].env, swatch: COLOR[env.color].hex },
  ];
}
const joinQ = (xs: string[], kind: "으로" | "이가") => `'${xs.join("·")}'${q(xs[xs.length - 1] ?? "", kind)}`;
/** ARA가 한 문장으로 정리한 '찾는 사람' */
export function araSentence(pos: Draft, team: Team) {
  const env = desiredEnv(pos as Position, team);
  return `${team.name}에서 ${joinQ(env.needs.map((c) => CORE[c]), "으로")} 문제를 풀고, ${joinQ(env.starts.map((m) => MOTIVE[m]), "이가")} 있을 때 움직이며 ${joinQ(env.keeps.map((m) => MOTIVE[m]), "이가")} 있으면 오래 가는 사람이에요. 생각은 ${THINK_SHORT[env.think]}하는 편이 맞고, ${COLOR[env.color].env}에서 편한 사람을 찾아요.`;
}
export const MODE: Record<Position["mode"], { label: string; desc: string }> = {
  fit: { label: "팀에 맞는 사람", desc: "팀 환경에 잘 맞는 사람을 앞에 둬요." },
  complement: { label: "팀에 없는 방식 채우기", desc: "팀에 지금 적은 방식을 가진 사람에게 점수를 더 줘요(배치 참고에 동의한 구성원 기준)." },
};
export function conditions(pos: Draft): string[] {
  return [pos.minYears > 0 ? `경력 ${pos.minYears}년 이상` : "경력 무관", pos.shift ? "교대 근무 가능" : "교대 없음", ...pos.mustLicenses.map((l) => `'${l}' 필요`)];
}
/** 적합도 100점 배분(fit.ts와 같은 배점) */
export const WEIGHTS = [
  { label: "핵심역량", value: 25, color: "var(--c-violet)" }, { label: "중심역량", value: 15, color: "var(--c-blue)" },
  { label: "시작 동기", value: 15, color: "var(--c-cyan)" }, { label: "지속 동기", value: 15, color: "var(--c-green)" },
  { label: "생각 정리", value: 10, color: "var(--c-amber)" }, { label: "자신감", value: 10, color: "var(--c-orange)" }, { label: "환경 색", value: 10, color: "var(--c-coral)" },
];
export const EXAMPLE_NOTE = "항목 이름은 예시, 실제 CRATA 결과지로 바뀌어요.";

/** '찾는 사람' 속성 표(공고 상세 카드 · 새 공고 미리보기) */
export function LookList({ rows, compact }: { rows: LookRow[]; compact?: boolean }) {
  return (
    <dl className={cx("hg-look", compact && "hg-look--compact")}>
      {rows.map((r) => (
        <div key={r.key} className="hg-look__row">
          <dt>{r.label}{r.emph && <span className="hg-emph">강조</span>}</dt>
          <dd title={compact ? r.long : undefined}>
            <span className="hg-look__vals">
              {r.swatch && <i className="hg-swatch" style={{ background: r.swatch }} aria-hidden />}
              {r.values.map((v) => <span key={v} className="hg-tag">{v}</span>)}
            </span>
            {r.long && !compact && <span className="hg-look__long">{r.long}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ───────── CRATA 4종 결과(검사를 마친 지원자만)
function Duo<T extends string>({ own, now, label }: { own: T; now: T; label: (v: T) => string }) {
  return own === now
    ? <span className="hg-duo"><span className="hg-tag">{label(own)}</span><span className="faint xs">고유·현재 같아요</span></span>
    : <span className="hg-duo"><span className="hg-tag">{label(own)}</span><ArrowRight aria-label="지금은" /><span className="hg-tag hg-tag--now">{label(now)}</span></span>;
}
export function CrataBlock({ c }: { c: CrataProfile }) {
  const colors: [string, string, keyof CrataProfile["color"]][] = [
    ["외면", "행동적 태도", "outer"], ["내면", "심리적 태도", "inner"], ["컴포트존", "지금 필요한 환경", "comfort"], ["챌린지존", "지금 필요하지 않은 환경", "challenge"],
  ];
  return (
    <div className="hg-crata">
      <section className="hg-crata__sec">
        <h4>색채검사</h4>
        <div className="hg-colors">
          {colors.map(([k, sub, key]) => (
            <div key={key} className="hg-color">
              <i style={{ background: COLOR[c.color[key]].hex }} aria-hidden />
              <div style={{ minWidth: 0 }}><div className="hg-color__k">{k} · <b>{COLOR[c.color[key]].label}</b></div><div className="hg-color__s">{sub}</div></div>
            </div>
          ))}
        </div>
      </section>
      <section className="hg-crata__sec">
        <h4>행동동기검사 <span className="faint xs">고유 → 현재</span></h4>
        <dl className="hg-kv">
          <dt>시작</dt><dd><Duo own={c.motive.start.own} now={c.motive.start.now} label={(v) => MOTIVE[v]} /></dd>
          <dt>지속</dt><dd><Duo own={c.motive.keep.own} now={c.motive.keep.now} label={(v) => MOTIVE[v]} /></dd>
        </dl>
      </section>
      <section className="hg-crata__sec">
        <h4>문제해결방식검사</h4>
        <div className="hg-quad">
          <div><span>중심역량</span><b>{CENTER[c.problem.center]}</b></div>
          <div><span>핵심역량</span><b>{CORE[c.problem.core]}</b></div>
          <div><span>성장역량</span><b>{GROWTH[c.problem.growth]}</b></div>
          <div><span>잠재역량</span><b>{c.problem.latent}</b></div>
        </div>
      </section>
      <section className="hg-crata__sec">
        <h4>관계성장방식검사 <span className="faint xs">고유 → 현재</span></h4>
        <dl className="hg-kv">
          <dt>생각 정리</dt><dd><Duo own={c.relation.think.own} now={c.relation.think.now} label={(v) => THINK_SHORT[v]} /></dd>
          <dt>자신감</dt><dd><Duo own={c.relation.conf.own} now={c.relation.conf.now} label={(v) => CONF_SHORT[v]} /></dd>
        </dl>
      </section>
      <p className="faint xs">{EXAMPLE_NOTE}</p>
    </div>
  );
}

// ───────── 찾는 사람과 비교(fit.parts 7줄)
const PART_MARK = (g: boolean | null) => (g === true ? { t: "맞아요", tone: "good" as Tone, c: "var(--c-green)" } : g === false ? { t: "달라요", tone: "bad" as Tone, c: "var(--c-coral)" } : { t: "일부", tone: "warn" as Tone, c: "var(--c-amber)" });
export function FitBars({ fit }: { fit: Fit }) {
  return (
    <ul className="hg-fit">
      {fit.parts.map((p) => {
        const m = PART_MARK(p.good);
        return (
          <li key={p.key}>
            <div className="hg-fit__top">
              <span className="hg-fit__l">{p.label}</span>
              <Chip tone={m.tone} sm>{m.t}</Chip>
              <span className="num hg-fit__v">{p.got}<span className="faint">/{p.max}</span></span>
            </div>
            <Bar value={(p.got / p.max) * 100} color={m.c} label={`${p.label} ${p.got}/${p.max}점`} />
            <p className="hg-fit__t">{p.text}</p>
          </li>
        );
      })}
    </ul>
  );
}

// ───────── 지원자 서랍
const REJECT = ["서류 조건이 맞지 않아요", "면접 결과로 정했어요", "지원자가 지원을 거뒀어요", "연락이 닿지 않아요", "다른 지원자로 정했어요"];

export function ApplicantDrawer({ row, pos, onClose }: { row?: Row; pos: Position; onClose: () => void }) {
  if (!row) return null;
  return <ApplicantBody key={row.a.id} row={row} pos={pos} onClose={onClose} />;
}

function ApplicantBody({ row, pos, onClose }: { row: Row; pos: Position; onClose: () => void }) {
  const { setStage, toast, today, team } = useApp();
  const { a, rec } = row;
  const t = team(pos.teamId);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const ts = testStatus(a);
  const go = (s: Stage, msg: string) => { setStage([a.id], s); toast(msg); onClose(); };
  const decided = a.stage === "offer" || a.stage === "closed" || a.stage === "hold";

  let primary: ReactNode = null;
  if (a.stage === "applied" || a.stage === "screened") primary = <Button variant="brand" icon={<Send />} onClick={() => go("testing", `${a.name} 님에게 CRATA 검사 링크를 보냈어요`)}>검사 보내기</Button>;
  else if (a.stage === "testing") primary = <Button variant="brand" icon={<Repeat />} onClick={() => { toast(`${a.name} 님에게 검사 링크를 다시 보냈어요`); onClose(); }}>다시 알림</Button>;
  else if (a.stage === "tested" || a.stage === "shortlist") primary = <Button variant="brand" icon={<MessagesSquare />} onClick={() => go("interview", `${a.name} 님을 면접 대상으로 정했어요`)}>면접으로</Button>;
  else if (a.stage === "interview") primary = <Button variant="brand" icon={<CircleCheck />} onClick={() => go("offer", `${a.name} 님 합격으로 정했어요`)}>합격</Button>;
  else primary = <Button icon={<RotateCcw />} onClick={() => go(a.crata ? "tested" : "screened", "다시 검토로 돌렸어요")}>다시 검토로</Button>;

  const foot = rejecting ? (
    <>
      <label className="hg-reason">
        <span className="sr-only">불합격 사유</span>
        <select className="select" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="불합격 사유">
          <option value="">사유를 골라 주세요</option>
          {REJECT.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <Button onClick={() => { setRejecting(false); setReason(""); }}>취소</Button>
      <Button variant="brand" disabled={!reason} onClick={() => go("closed", `${a.name} 님 불합격으로 정했어요 · ${reason}`)}>불합격 정하기</Button>
    </>
  ) : (
    <>
      {!decided && <Button variant="ghost" onClick={() => setRejecting(true)}>불합격…</Button>}
      {!decided && <Button onClick={() => go("hold", `${a.name} 님을 보류했어요`)}>보류</Button>}
      <span className="hg-grow" />
      {primary}
    </>
  );

  return (
    <Drawer open title={a.name} onClose={onClose} foot={foot}>
      <div className="hg-ap">
        <div className="hg-prof">
          <Avatar name={a.name} size="lg" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="hg-prof__n">{a.name}</div>
            <div className="muted small">{pos.title} · {t?.name}</div>
          </div>
        </div>
        <div className="hg-pills">
          <span className="hg-pill"><Sq color={GROUP[row.group].color} />{STAGE[a.stage].label}</span>
          <TierChip t={rec.tier} />
          {rec.score != null && <span className="hg-pill">적합도 <b className="num">{rec.score}</b></span>}
          <span className="hg-pill"><CalendarDays /><span className="num">{slash(a.appliedAt)}</span> 지원 · {a.source}</span>
        </div>

        {rejecting && (
          <div className="hg-callout hg-callout--warn" role="note">
            <CircleAlert />
            <div><b>불합격은 사람이 사유를 고른 뒤에만 정해져요</b><p>AI 추천 등급만으로 불합격 처리하지 않아요. 아래에서 사유를 골라 주세요.</p></div>
          </div>
        )}

        <dl className="hg-props">
          <dt><Briefcase />경력</dt><dd className="num">{a.years ? `${a.years}년` : "신입"}</dd>
          <dt><GraduationCap />자격·교육</dt><dd>{a.licenses.length ? <span className="hg-chips">{a.licenses.map((l) => <Chip key={l} tone="outline" sm>{l}</Chip>)}</span> : <span className="faint">적은 자격이 없어요</span>}</dd>
          <dt><Clock3 />교대 근무</dt><dd>{a.shiftOk ? "가능해요" : "어렵다고 적었어요"}</dd>
          <dt><FileText />서류 조건</dt>
          <dd>{rec.screening.ok ? <Chip tone="good" sm icon={<Check />}>통과</Chip> : <span className="hg-miss">{rec.screening.misses.map((m) => <Chip key={m} tone="warn" sm icon={<TriangleAlert />}>{m}</Chip>)}</span>}</dd>
          <dt><ClipboardList />CRATA 검사</dt><dd><Chip tone={ts.tone} sm dot>{ts.label}</Chip>{ts.date && <span className="faint small num"> {slash(ts.date)}</span>}</dd>
        </dl>
        <p className="hg-desc">{a.summary}{a.note && <span className="hg-desc__note"> · {a.note}</span>}</p>

        {a.crata && rec.fit ? (
          <>
            <section className="hg-sec">
              <div className="between"><h3 className="hg-sec__t">CRATA 4종 결과</h3><span className="faint xs">검사일 <span className="num">{md(a.crata.takenAt)}</span> · 이 채용 판단에만 써요</span></div>
              <CrataBlock c={a.crata} />
            </section>

            <section className="hg-sec">
              <div className="hg-score">
                <div>
                  <h3 className="hg-sec__t">찾는 사람과 비교</h3>
                  <p className="faint xs">{MODE[pos.mode].label} · 팀 환경 + 회사가 강조한 항목 기준</p>
                </div>
                <div className="hg-score__v"><span className="num">{rec.score}</span><span className="faint">/100</span></div>
              </div>
              <FitBars fit={rec.fit} />
              <p className="hg-why"><CircleHelp aria-hidden />서류 조건을 채우고 75점 이상이면 '면접 추천', 58점 이상이면 '검토', 그 밖에는 '담당자 판단'이에요.</p>
            </section>

            <section className="hg-sec hg-ara">
              <h3 className="hg-sec__t"><Sparkles />ARA 요약</h3>
              <div className="hg-ara__cols">
                <div>
                  <div className="hg-ara__h hg-ara__h--good"><CircleCheck />잘 맞는 점</div>
                  {rec.reasons.length ? <ul className="hg-bul">{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul> : <p className="faint small">뚜렷하게 맞는 점을 찾지 못했어요.</p>}
                </div>
                <div>
                  <div className="hg-ara__h hg-ara__h--warn"><TriangleAlert />우려</div>
                  {rec.concerns.length ? <ul className="hg-bul">{rec.concerns.map((r) => <li key={r}>{r}</li>)}</ul> : <p className="faint small">큰 우려는 없어요.</p>}
                </div>
              </div>
            </section>

            <section className="hg-sec">
              <h3 className="hg-sec__t"><MessageCircleQuestion />면접에서 물어볼 것</h3>
              {rec.questions.length ? (
                <ol className="hg-qs">{rec.questions.map((x, i) => <li key={x}><span className="num">{i + 1}</span><p>{x}</p></li>)}</ol>
              ) : <p className="faint small">따로 확인할 점이 없어요. 직무 경험 위주로 물어보세요.</p>}
            </section>
          </>
        ) : (
          <section className="hg-sec">
            <h3 className="hg-sec__t">CRATA 4종 결과</h3>
            <div className="hg-nores">
              <ClipboardList aria-hidden />
              <div>
                <b>{a.testSentAt ? `${md(a.testSentAt)}에 검사 링크를 보냈어요` : "아직 CRATA 검사 전이에요"}</b>
                <p>{a.testSentAt ? "검사를 마치면 결과와 적합도, 면접 질문이 여기에 나와요." : "서류를 확인하고 검사를 보내면, 결과와 적합도가 여기에 나와요."}</p>
              </div>
            </div>
            {rec.concerns.length > 0 && <p className="hg-why"><TriangleAlert aria-hidden />서류에서 확인할 점: {rec.concerns.join(", ")}</p>}
          </section>
        )}

        <div className="hg-legal">
          <ShieldCheck aria-hidden />
          <p>AI 추천은 참고예요. 면접 대상·합격은 담당자가 정해요. 지원자가 요청하면 추천 근거를 설명해요.</p>
          {a.crata && <Button size="sm" variant="ghost" icon={<Copy />} onClick={() => toast("추천 근거 설명문을 복사했어요(예시)")}>근거 설명문</Button>}
        </div>
        <p className="faint xs">{longDate(today)} 기준 · 채용서류는 반환 청구 기간이 지나면 파기해요.</p>
      </div>
    </Drawer>
  );
}

// ───────── 새 공고 서랍
const CORE_HINT: [RegExp, Core][] = [
  [/꼼꼼|검사|기록|확인|정확|판정/, "check"], [/빠르|빨리|손이 빠|속도|바로/, "execute"], [/구조|문서|표준|체계|설계|정리/, "structure"],
  [/소통|조율|협의|고객|관계/, "mediate"], [/새로운|새 공정|아이디어|개선|탐색|시도/, "explore"], [/책임|끝까지|맡아|주도/, "own"],
];
const THINK_HINT: [RegExp, Think][] = [[/혼자|스스로|독립/, "solo"], [/함께|같이|협업|팀워크/, "together"]];
const BANNED = /(\d+\s*세|나이|연령|젊은|남자|여자|남성|여성|미혼|기혼|결혼|출신|고향|키\s*\d|체중|몸무게|사진|외모|부모|가족|재산)/;

export function NewPositionDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <NewPositionBody onClose={onClose} />;
}

function NewPositionBody({ onClose }: { onClose: () => void }) {
  const { teams, people, today, addPosition, toast } = useApp();
  const nav = useNavigate();
  const choices = teams.filter((t) => !t.office);
  const [teamId, setTeamId] = useState((choices.find((t) => t.id === "t-qa") ?? choices[0]!).id);
  const team = choices.find((t) => t.id === teamId) ?? choices[0]!;
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(1);
  const [deadline, setDeadline] = useState(addDays(today, 21));
  const [brief, setBrief] = useState("");
  const [minYears, setMinYears] = useState("0");
  const [shift, setShift] = useState(team.shift);
  const [lic, setLic] = useState<string[]>([]);
  const [licDraft, setLicDraft] = useState("");
  const [mode, setMode] = useState<Position["mode"]>("fit");
  const [needs, setNeeds] = useState<Core[]>([]);
  const [think, setThink] = useState<"team" | Think>("team");
  const [sugg, setSugg] = useState<{ needs: Core[]; think?: Think } | null>(null);

  const pickTeam = (id: string) => { const t = choices.find((x) => x.id === id)!; setTeamId(id); setShift(t.shift); setLic([]); };
  const toggleNeed = (c: Core) => setNeeds((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  const addLic = (v = licDraft) => { const s = v.trim(); if (s && !lic.includes(s)) setLic((l) => [...l, s]); setLicDraft(""); };
  const findHints = () => {
    const text = `${title} ${brief}`;
    const n = CORE_HINT.filter(([re]) => re.test(text)).map(([, c]) => c).filter((c, i, xs) => xs.indexOf(c) === i).slice(0, 3);
    const th = THINK_HINT.find(([re]) => re.test(text))?.[1];
    setSugg({ needs: n, think: th });
  };
  const applyHints = () => { if (!sugg) return; if (sugg.needs.length) setNeeds(sugg.needs); if (sugg.think) setThink(sugg.think); setSugg(null); toast("ARA가 찾은 강조 항목을 넣었어요. 고쳐서 쓰세요"); };

  const want: Position["want"] = { ...(needs.length ? { needs } : {}), ...(think !== "team" ? { think } : {}) };
  const draft: Position = {
    id: "draft", title: title.trim() || "새 공고", teamId, count, status: "open", opened: today, deadline, brief: brief.trim(),
    mustLicenses: lic, minYears: Number(minYears), shift, mode, want,
  };
  const banned = `${title} ${brief}`.match(BANNED)?.[0];
  const members = people.filter((p) => p.teamId === teamId);
  const ok = title.trim().length > 0 && deadline >= today;

  const create = () => {
    const id = `pos-${Date.now().toString(36)}`;
    addPosition({ ...draft, id, title: title.trim(), brief: brief.trim() || "회사가 아직 글을 적지 않았어요." });
    toast("공고를 만들었어요. 지원서 링크를 공유해 보세요");
    onClose();
    nav(`/hiring/${id}`);
  };

  return (
    <Drawer open title="새 공고" onClose={onClose} foot={
      <>
        <span className="hg-foot__hint">{ok ? "저장하면 지원서 화면이 바로 열려요" : "직무 이름과 마감일을 정해 주세요"}</span>
        <Button onClick={onClose}>취소</Button>
        <Button variant="brand" icon={<Plus />} disabled={!ok} onClick={create}>공고 만들기</Button>
      </>
    }>
      <div className="hg-np">
        <div className="hg-np__form">
          <div className="hg-pills">
            <label className="hg-pill hg-pill--btn"><Users />{team.name}<ChevronDown />
              <select aria-label="팀" value={teamId} onChange={(e) => pickTeam(e.target.value)}>{choices.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </label>
            <label className="hg-pill hg-pill--btn"><Briefcase /><span className="num">{count}</span>명 모집<ChevronDown />
              <select aria-label="모집 인원" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}명</option>)}</select>
            </label>
            <label className="hg-pill hg-pill--btn"><CalendarDays /><span className="num">{md(deadline)}</span> 마감<ChevronDown />
              <input type="date" aria-label="마감일" value={deadline} min={today} onChange={(e) => e.target.value && setDeadline(e.target.value)}
                onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* 지원 안 함 */ } }} />
            </label>
          </div>

          <input className="hg-np__title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="직무 이름 (예: 품질검사원)" aria-label="직무 이름" autoFocus />
          <p className="faint xs hg-np__team">{team.desc}{team.shift ? " · 교대 팀" : ""}</p>

          <section className="hg-sec">
            <h3 className="hg-sec__t">이런 사람을 뽑고 싶어요</h3>
            <textarea className="textarea" value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} aria-label="이런 사람을 뽑고 싶어요"
              placeholder="예: 꼼꼼하게 기록하고 혼자서도 판정을 책임질 사람이면 좋겠어요." />
            <div className="hg-hintrow">
              <button type="button" className="hg-ai" onClick={findHints} disabled={!`${title}${brief}`.trim()}><Sparkles />ARA로 강조 항목 찾기</button>
              {sugg && (sugg.needs.length || sugg.think ? (
                <span className="hg-sugg">
                  {sugg.needs.map((c) => <span key={c} className="hg-tag hg-tag--dash">{CORE[c]}</span>)}
                  {sugg.think && <span className="hg-tag hg-tag--dash">{THINK_SHORT[sugg.think]}</span>}
                  <Button size="sm" variant="soft" onClick={applyHints}>넣기</Button>
                  <IconButton label="제안 닫기" size="sm" plain onClick={() => setSugg(null)}><X /></IconButton>
                </span>
              ) : <span className="faint xs">글에서 찾은 항목이 없어요. 아래에서 직접 골라 주세요.</span>)}
            </div>
            {banned && (
              <div className="hg-callout hg-callout--warn" role="alert">
                <TriangleAlert />
                <div><b>'{banned}' 같은 내용은 채용 조건으로 쓸 수 없어요</b><p>채용절차법·연령차별금지 기준이에요. 사진·나이·키·체중·출신 지역·혼인·재산·가족 사항은 받지 않아요. 일과 관련된 말로 바꿔 주세요.</p></div>
              </div>
            )}
          </section>

          <section className="hg-sec">
            <h3 className="hg-sec__t">필수 조건</h3>
            <div className="hg-field">
              <span className="hg-field__l">경력</span>
              <Segmented size="sm" label="경력" value={minYears} onChange={setMinYears}
                options={[{ value: "0", label: "무관" }, { value: "1", label: "1년+" }, { value: "2", label: "2년+" }, { value: "3", label: "3년+" }, { value: "5", label: "5년+" }]} />
            </div>
            <div className="hg-field hg-field--row">
              <div><span className="hg-field__l">교대 근무</span><span className="faint xs"> {team.shift ? `${team.name}은 교대 팀이에요` : "주간 근무 팀이에요"}</span></div>
              <Toggle on={shift} onChange={setShift} label="교대 근무 가능해야 해요" />
            </div>
            <div className="hg-field">
              <span className="hg-field__l">필수 자격·교육</span>
              <div className="hg-chips">
                {lic.map((l) => <span key={l} className="hg-tag hg-tag--x">{l}<button type="button" aria-label={`${l} 빼기`} onClick={() => setLic((x) => x.filter((y) => y !== l))}><X /></button></span>)}
                {team.requires.filter((r) => !lic.includes(r)).map((r) => <button key={r} type="button" className="hg-tag hg-tag--dash hg-tag--btn" onClick={() => addLic(r)}><Plus />{r}</button>)}
              </div>
              <label className="hg-input"><Plus aria-hidden /><input value={licDraft} onChange={(e) => setLicDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLic(); } }} placeholder="자격 더하기 (Enter)" aria-label="필수 자격 더하기" /></label>
              <span className="faint xs">들어와서 받으면 되는 교육은 필수로 넣지 않는 게 좋아요.</span>
            </div>
          </section>

          <section className="hg-sec">
            <h3 className="hg-sec__t">기준 방식</h3>
            <Segmented size="sm" label="기준 방식" value={mode} onChange={setMode} options={[{ value: "fit", label: MODE.fit.label }, { value: "complement", label: MODE.complement.label }]} />
            <p className="muted small">{MODE[mode].desc}</p>
          </section>

          <section className="hg-sec">
            <div className="between"><h3 className="hg-sec__t">강조 항목</h3><span className="faint xs">안 고르면 팀 환경 그대로</span></div>
            <div className="hg-field">
              <span className="hg-field__l">핵심역량 <span className="faint xs">여러 개 고를 수 있어요</span></span>
              <div className="hg-chips" role="group" aria-label="핵심역량">
                {(Object.keys(CORE) as Core[]).map((c) => (
                  <button key={c} type="button" className={cx("hg-opt", needs.includes(c) && "is-on")} aria-pressed={needs.includes(c)} onClick={() => toggleNeed(c)}>
                    {needs.includes(c) && <Check />}{CORE[c]}{!needs.length && team.env.needs.includes(c) && <span className="hg-opt__team">팀</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="hg-field">
              <span className="hg-field__l">생각 정리 방식</span>
              <Segmented size="sm" label="생각 정리 방식" value={think} onChange={setThink}
                options={[{ value: "team", label: `팀 그대로(${THINK_SHORT[team.env.think]})` }, { value: "solo", label: THINK_SHORT.solo }, { value: "together", label: THINK_SHORT.together }]} />
            </div>
          </section>
        </div>

        <aside className="hg-np__preview" aria-label="ARA가 정리한 찾는 사람">
          <div className="hg-prev">
            <div className="hg-prev__head"><span className="hg-prev__ic"><Sparkles /></span><div><b>ARA가 정리한 '찾는 사람'</b><span className="faint xs">쓰는 대로 바로 바뀌어요</span></div></div>
            <div className="hg-prev__pos">
              <span className="hg-prev__title">{draft.title}</span>
              <span className="muted small">{team.name} · <span className="num">{count}</span>명 · <span className="num">{mdw(deadline)}</span> 마감</span>
            </div>
            {brief.trim() && <p className="hg-quote"><Quote aria-hidden />{brief.trim()}</p>}
            <p className="hg-prev__say">{araSentence(draft, team)}</p>
            <LookList rows={lookFor(draft, team)} compact />
            <div className="hg-prev__block">
              <div className="hg-prev__k">필수 조건</div>
              <div className="hg-chips">{conditions(draft).map((c) => <Chip key={c} tone="outline" sm>{c}</Chip>)}</div>
            </div>
            <div className="hg-prev__block">
              <div className="hg-prev__k">기준 방식 · {MODE[mode].label}</div>
              <p className="muted small">{MODE[mode].desc}{mode === "complement" && members.filter((p) => p.consent === "placement").length < 3 ? " 동의한 구성원이 적어서 효과가 작을 수 있어요." : ""}</p>
            </div>
            <div className="hg-prev__block">
              <div className="hg-prev__k">적합도 100점은 이렇게 나눠요</div>
              <StackBar label="적합도 배점" parts={WEIGHTS} />
              <ul className="hg-weights">{WEIGHTS.map((w) => <li key={w.label}><span className="tagsq"><i style={{ background: w.color }} />{w.label}</span><span className="num">{w.value}</span></li>)}</ul>
            </div>
            <p className="hg-prev__note"><Lightbulb aria-hidden />AI는 추천과 근거만 드려요. 면접 대상·합격은 담당자가 정해요. {EXAMPLE_NOTE}</p>
          </div>
        </aside>
      </div>
    </Drawer>
  );
}

