// 인사이동 화면 조각: ARA 답 카드(조언·팀 추천·사람 추천·사람 요약), 실시간 조직도(확정 전 이동은 깜빡임, 나가는 사람은 점선).
// 레퍼런스: refs/orbix-ai-chat-home.jpg·refs/botrix-ai-command-center.jpg(대화 카드), refs/orbixcrm-team-members-grid.jpg(사람 칩·팀 카드),
// post_1.jpg(옅은 회색 레인 위 흰 카드)
import { useState, type DragEvent } from "react";
import { ArrowRight, Check, CircleAlert, Crown, Lightbulb, Lock, MoveRight, Sparkles, TriangleAlert, Undo2, UserRoundSearch } from "lucide-react";
import { useApp, type AraCard, type MoveWithAdvice } from "@/data/store";
import { COLOR, CONF_SHORT, CORE, MOTIVE, THINK_SHORT, type Person, type Team } from "@/lib/model";
import { fit, VERDICT } from "@/lib/fit";
import { josa, monthsBetween } from "@/lib/text";
import { Avatar, Button, Chip, Menu, cx } from "@/ui";

export const AraMark = ({ size = 32 }: { size?: number }) => (
  <span className="mv-ara" style={{ width: size, height: size }} aria-hidden><Sparkles /></span>
);

const scoreTone = (s?: number) => (s == null ? "var(--faint)" : s >= 75 ? "var(--c-green)" : s >= 55 ? "var(--c-amber)" : "var(--c-coral)");

// ───────── 조언 카드(한 사람의 이동)
export function AdviceView({ m, live }: { m: MoveWithAdvice; live?: boolean }) {
  const { person, team, pending, log, confirm, undo, propose } = useApp();
  const p = person(m.personId)!;
  const a = m.advice;
  const v = VERDICT[a.verdict];
  const isPending = pending.some((x) => x.id === m.id);
  const done = !isPending && log.some((l) => l.personId === m.personId && l.toTeamId === m.toTeamId);
  const replaced = !isPending && !done && pending.some((x) => x.personId === m.personId);
  return (
    <article className={cx("mv-adv", !isPending && !live && "is-settled")}>
      <header className="mv-adv__head">
        <Avatar name={p.name} size="sm" />
        <div className="mv-adv__who">
          <b>{p.name}</b><span className="muted">{team(m.fromTeamId)?.name}<MoveRight aria-label="에서" />{team(m.toTeamId)?.name}{m.lead && " 팀장"}</span>
        </div>
        {done ? <Chip tone="good" sm icon={<Check />}>확정됨</Chip> : !isPending && !live ? <Chip tone="neutral" sm>{replaced ? "다시 제안함" : "취소됨"}</Chip> : <Chip tone={v.tone} dot sm>{v.label}</Chip>}
      </header>
      {a.score != null ? (
        <div className="mv-adv__score">
          <span className="mv-adv__lbl">적합도</span>
          <span className="mv-meter" aria-hidden><i style={{ width: `${a.score}%`, background: scoreTone(a.score) }} />{a.fromScore != null && <b style={{ left: `${a.fromScore}%` }} title={`지금 팀 ${a.fromScore}`} />}</span>
          <span className="num mv-adv__n">{a.score}</span>
          <span className="faint xs num">지금 팀 {a.fromScore}</span>
        </div>
      ) : (
        <p className="mv-adv__nodata"><Lock />CRATA 결과 없이 조직 정보로만 봤어요</p>
      )}
      {(a.pros.length > 0 || a.cons.length > 0) && (
        <ul className="mv-adv__list">
          {a.pros.slice(0, 3).map((t) => <li key={t} className="is-pro"><Check aria-label="좋은 점" />{t}</li>)}
          {a.cons.map((c) => <li key={c.text} className={c.severe ? "is-severe" : "is-con"}>{c.severe ? <TriangleAlert aria-label="큰 우려" /> : <CircleAlert aria-label="우려" />}{c.text}</li>)}
        </ul>
      )}
      {a.tips.length > 0 && <p className="mv-adv__tip"><Lightbulb aria-hidden />{a.tips[0]}</p>}
      {a.better && isPending && (
        <p className="mv-adv__better">
          적합도만 보면 {josa(team(a.better.teamId)!.name, "이가")} 더 맞아요(<span className="num">{a.better.score}</span>).
          <button type="button" onClick={() => propose(m.personId, a.better!.teamId)}>{josa(team(a.better.teamId)!.name, "으로")} 바꿔 보기</button>
        </p>
      )}
      {isPending && (
        <div className="mv-adv__acts">
          <Button size="sm" variant="soft" icon={<Check />} onClick={() => confirm([m.personId])}>확정</Button>
          <Button size="sm" variant="ghost" icon={<Undo2 />} onClick={() => undo([m.personId])}>취소</Button>
        </div>
      )}
    </article>
  );
}

// ───────── ARA 답 카드
export function AraCardView({ card }: { card: AraCard }) {
  const { person, team, propose, send } = useApp();
  if (card.kind === "advice") return <div className="mv-cards">{card.moves.map((m) => <AdviceView key={m.id} m={m} />)}</div>;
  if (card.kind === "teams") {
    const p = person(card.personId)!;
    return (
      <ol className="mv-rank" aria-label={`${p.name} 님에게 맞는 팀`}>
        {card.items.map((it, i) => (
          <li key={it.teamId}>
            <span className="mv-rank__no num">{i + 1}</span>
            <div className="mv-rank__main">
              <div className="mv-rank__t"><b>{team(it.teamId)?.name}</b><span className="num" style={{ color: scoreTone(it.score) }}>{it.score}</span>{it.severe > 0 && <Chip tone="bad" sm>우려 {it.severe}</Chip>}</div>
              <p>{it.why}</p>
            </div>
            <Button size="sm" variant="soft" onClick={() => propose(card.personId, it.teamId)}>보내 보기</Button>
          </li>
        ))}
      </ol>
    );
  }
  if (card.kind === "people") {
    if (!card.items.length) return null;
    return (
      <ol className="mv-rank" aria-label={`${team(card.teamId)?.name}에 맞는 사람`}>
        {card.items.map((it, i) => {
          const p = person(it.personId)!;
          return (
            <li key={it.personId}>
              <span className="mv-rank__no num">{i + 1}</span>
              <div className="mv-rank__main">
                <div className="mv-rank__t"><Avatar name={p.name} size="sm" /><b>{p.name}</b><span className="faint xs">{team(p.teamId)?.name}</span><span className="num" style={{ color: scoreTone(it.score) }}>{it.score}</span>{it.severe > 0 && <Chip tone="bad" sm>우려 {it.severe}</Chip>}</div>
                <p>{it.why}</p>
              </div>
              <Button size="sm" variant="soft" onClick={() => propose(it.personId, card.teamId)}>보내 보기</Button>
            </li>
          );
        })}
      </ol>
    );
  }
  // 사람 요약
  const p = person(card.personId)!;
  const t = team(p.teamId)!;
  const c = p.consent === "placement" ? p.crata : undefined;
  return (
    <div className="mv-about">
      <div className="mv-about__head"><Avatar name={p.name} /><div><b>{p.name}</b><span className="muted small">{t.name} · {p.title} · 입사 {monthsBetween(p.joined, "2026-10-07") >= 12 ? `${Math.floor(monthsBetween(p.joined, "2026-10-07") / 12)}년` : `${monthsBetween(p.joined, "2026-10-07")}개월`}</span></div></div>
      {c ? (
        <dl className="mv-about__dl">
          <div><dt>핵심역량</dt><dd>{CORE[c.problem.core]}</dd></div>
          <div><dt>생각 정리</dt><dd>{THINK_SHORT[c.relation.think.own]}</dd></div>
          <div><dt>자신감</dt><dd>{CONF_SHORT[c.relation.conf.own]}</dd></div>
          <div><dt>시작 · 지속</dt><dd>{MOTIVE[c.motive.start.own]} · {MOTIVE[c.motive.keep.own]}</dd></div>
          <div><dt>필요한 환경</dt><dd><i className="mv-dot" style={{ background: COLOR[c.color.comfort].hex }} />{COLOR[c.color.comfort].label}</dd></div>
          <div><dt>지금 팀 적합도</dt><dd className="num">{fit(t.env, c, t.name).score}</dd></div>
        </dl>
      ) : <p className="mv-adv__nodata"><Lock />{p.consent === "self" ? "CRATA 결과는 본인만 봐요(배치 참고 동의 안 함)" : "CRATA 검사를 받지 않았어요"}</p>}
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{p.skills.map((s) => <span key={s} className="mv-tag">{s}</span>)}{p.licenses.map((s) => <span key={s} className="mv-tag mv-tag--lic">{s}</span>)}</div>
      {c && <button type="button" className="mv-link" onClick={() => send(`${p.name} 어디가 맞을까?`)}>맞는 팀 물어보기<ArrowRight /></button>}
    </div>
  );
}

// ───────── 조직도
type View = "fit" | "plain";

function PersonChip({ p, inc, view, teams }: { p: Person; inc?: MoveWithAdvice; view: View; teams: Team[] }) {
  const { propose, undo, confirm, send } = useApp();
  const t = teams.find((x) => x.id === p.teamId)!;
  const s = p.consent === "placement" && p.crata ? fit(t.env, p.crata, t.name).score : undefined;
  const onDrag = (e: DragEvent) => { e.dataTransfer.setData("text/person", p.id); e.dataTransfer.effectAllowed = "move"; };
  return (
    <Menu width={230} trigger={({ toggle, open }) => (
      <button type="button" draggable onDragStart={onDrag} onClick={toggle} aria-expanded={open}
        className={cx("oc-chip", inc && "oc-chip--in", p.leader && "oc-chip--lead")}
        aria-label={`${p.name} ${p.title}${p.leader ? " 팀장" : ""}${inc ? ", 확정 전 이동" : ""}${s != null ? `, 적합도 ${s}` : ""}`}>
        <Avatar name={p.name} size="sm" />
        <span className="oc-chip__n">{p.name}</span>
        {p.leader && <Crown className="oc-chip__crown" aria-hidden />}
        {view === "fit" && (s != null ? <span className="oc-chip__s num" style={{ color: scoreTone(s) }}>{s}</span> : <span className="oc-chip__s oc-chip__s--na" title={p.consent === "self" ? "본인만" : "미응시"}>–</span>)}
        {inc && <span className="oc-chip__flag">확정 전</span>}
      </button>
    )}>
      {(close) => (
        <>
          <div className="menu__label">{p.name} · {p.title}</div>
          {inc ? (
            <>
              <button type="button" className="menu__item" onClick={() => { confirm([p.id]); close(); }}><Check />이동 확정</button>
              <button type="button" className="menu__item" onClick={() => { undo([p.id]); close(); }}><Undo2 />이동 취소</button>
            </>
          ) : (
            <button type="button" className="menu__item" onClick={() => { send(`${p.name} 어디가 맞을까?`); close(); }}><UserRoundSearch />어디가 맞을까?</button>
          )}
          <div className="menu__label">보내 보기</div>
          {teams.filter((x) => !x.office && x.id !== p.teamId).map((x) => (
            <button key={x.id} type="button" className="menu__item" onClick={() => { propose(p.id, x.id); close(); }}><MoveRight />{x.name}</button>
          ))}
        </>
      )}
    </Menu>
  );
}

function TeamCard({ t, view }: { t: Team; view: View }) {
  const { world, people: base, pending, propose, teams } = useApp();
  const [over, setOver] = useState(false);
  const members = world.people.filter((p) => p.teamId === t.id);
  const ordered = [...members.filter((p) => p.leader), ...members.filter((p) => !p.leader && !pending.some((m) => m.personId === p.id)), ...members.filter((p) => !p.leader && pending.some((m) => m.personId === p.id))];
  const outgoing = pending.filter((m) => m.fromTeamId === t.id && m.toTeamId !== t.id);
  const touched = outgoing.length > 0 || pending.some((m) => m.toTeamId === t.id);
  const short = members.length < t.min;
  const lead = members.find((p) => p.leader);
  const fits = members.filter((p) => p.consent === "placement" && p.crata).map((p) => fit(t.env, p.crata!, t.name).score);
  const avg = fits.length ? Math.round(fits.reduce((s, x) => s + x, 0) / fits.length) : undefined;
  return (
    <section className={cx("oc-team", touched && "is-touched", short && "is-short", over && "is-over")} aria-label={`${t.name} ${members.length}명`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("text/person")) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData("text/person"); if (id) propose(id, t.id); }}>
      <header className="oc-team__head">
        <i className="oc-team__color" style={{ background: COLOR[t.env.color].hex }} aria-hidden />
        <h3>{t.name}</h3>
        <span className={cx("oc-team__n num", short && "is-bad")}>{members.length}명<span> · 최소 {t.min}</span></span>
      </header>
      <div className="oc-team__sub">
        {lead ? <span>팀장 {lead.name}</span> : <span className="oc-team__vacant"><TriangleAlert aria-hidden />팀장 공석</span>}
        {view === "fit" && avg != null && <span className="num">평균 적합도 {avg}</span>}
      </div>
      <div className="oc-team__chips">
        {ordered.map((p) => <PersonChip key={p.id} p={p} inc={pending.find((m) => m.personId === p.id)} view={view} teams={teams} />)}
        {outgoing.map((m) => {
          const p = base.find((x) => x.id === m.personId)!;
          return (
            <span key={m.id} className="oc-chip oc-chip--out" aria-label={`${p.name}, ${teams.find((x) => x.id === m.toTeamId)?.name}으로 이동 예정`}>
              <Avatar name={p.name} size="sm" /><span className="oc-chip__n">{p.name}</span><span className="oc-chip__to"><MoveRight aria-hidden />{teams.find((x) => x.id === m.toTeamId)?.name.replace(/팀$/, "")}</span>
            </span>
          );
        })}
      </div>
      {short && <p className="oc-team__warn">최소 {t.min}명보다 적어요</p>}
    </section>
  );
}

function Head({ p, label }: { p?: Person; label: string }) {
  return (
    <div className="oc-head">
      {p ? <Avatar name={p.name} /> : <span className="oc-head__ic"><Crown /></span>}
      <div><b>{p?.name ?? label}</b><span>{label}</span></div>
    </div>
  );
}

export function OrgChart({ view }: { view: View }) {
  const { teams, world } = useApp();
  const ceo = world.people.find((p) => p.teamId === "t-ceo");
  const plant = world.people.find((p) => p.teamId === "t-plant");
  const plantTeams = teams.filter((t) => t.parentId === "t-plant" && !t.office);
  const ceoTeams = teams.filter((t) => t.parentId === "t-ceo" && !t.office);
  return (
    <div className="oc">
      <div className="oc-top"><Head p={ceo} label="대표이사" /></div>
      <div className="oc-branches">
        <div className="oc-branch">
          <div className="oc-branch__head"><Head p={plant} label="공장장" /><span className="faint xs num">{plantTeams.reduce((s, t) => s + world.people.filter((p) => p.teamId === t.id).length, 0)}명</span></div>
          <div className="oc-teams">{plantTeams.map((t) => <TeamCard key={t.id} t={t} view={view} />)}</div>
        </div>
        <div className="oc-branch">
          <div className="oc-branch__head"><div className="oc-head"><span className="oc-head__ic"><Crown /></span><div><b>대표 직속</b><span>영업 · 구매·총무</span></div></div><span className="faint xs num">{ceoTeams.reduce((s, t) => s + world.people.filter((p) => p.teamId === t.id).length, 0)}명</span></div>
          <div className="oc-teams oc-teams--narrow">{ceoTeams.map((t) => <TeamCard key={t.id} t={t} view={view} />)}</div>
        </div>
      </div>
    </div>
  );
}

