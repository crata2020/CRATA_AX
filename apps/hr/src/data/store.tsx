// 화면 상태: 확정된 조직(people) + 확정 전 이동(pending) + 대화 + 채용.
// 확정 전 이동은 조직도에서 깜빡이고, 확정하면 people에 반영돼요. 예시 화면이라 새로고침하면 처음으로 돌아가요.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Applicant, Person, Position, Stage, Team } from "@/lib/model";
import { adviseMove, suggestPeople, suggestTeams, type Advice, type World } from "@/lib/fit";
import { parse, type Intent } from "@/lib/parse";
import { josa } from "@/lib/text";
import { APPLICANTS, PEOPLE, POSITIONS, TEAMS, TODAY } from "./seed";

export interface PendingMove { id: string; personId: string; fromTeamId: string; toTeamId: string; lead: boolean; at: string }
export interface MoveWithAdvice extends PendingMove { advice: Advice }
export interface Confirmed { id: string; personId: string; fromTeamId: string; toTeamId: string; lead: boolean; at: string }

export type AraCard =
  | { kind: "advice"; moves: MoveWithAdvice[] }
  | { kind: "teams"; personId: string; items: { teamId: string; score: number; why: string; severe: number }[] }
  | { kind: "people"; teamId: string; items: { personId: string; score?: number; why: string; severe: number }[] }
  | { kind: "about"; personId: string };
export interface ChatMsg { id: string; who: "me" | "ara"; text: string; at: string; card?: AraCard; chips?: string[] }

interface Toast { id: number; text: string }

interface Ctx {
  teams: Team[];
  /** 확정된 조직 */
  people: Person[];
  /** 확정 전 이동까지 반영한 조직 */
  world: World;
  pending: MoveWithAdvice[];
  log: Confirmed[];
  chat: ChatMsg[];
  positions: Position[];
  applicants: Applicant[];
  today: string;
  person: (id?: string) => Person | undefined;
  team: (id?: string) => Team | undefined;
  send: (text: string) => void;
  propose: (personId: string, toTeamId: string, lead?: boolean) => void;
  undo: (personIds?: string[]) => void;
  confirm: (personIds?: string[]) => void;
  setStage: (ids: string[], stage: Stage) => void;
  addApplicant: (a: Applicant) => void;
  addPosition: (p: Position) => void;
  toast: (text: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppCtx); if (!c) throw new Error("AppProvider 밖"); return c; };

const now = () => { const d = new Date(); return `${TODAY}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
let seq = 0;
const uid = (p: string) => `${p}-${++seq}`;

const HELLO: ChatMsg = {
  id: "m-hello", who: "ara", at: `${TODAY}T09:00`,
  text: "누구를 어디로 보낼지 적어 주세요. 확정 전까지는 조직도에서 깜빡이고, 옮겼을 때 잘 맞는지와 걱정되는 점을 같이 알려 드려요.",
  chips: ["이하은 품질보증팀으로", "개발팀에 누가 좋아?", "박준기 어디가 맞을까?"],
};

/** 확정 전 이동을 순서대로 적용한 조직과, 각 이동의 '그 시점' 조언 */
function applyPending(base: Person[], teams: Team[], pending: PendingMove[]) {
  let people = base;
  const out: MoveWithAdvice[] = [];
  for (const m of pending) {
    const w: World = { people, teams, today: TODAY };
    out.push({ ...m, advice: adviseMove(w, m.personId, m.toTeamId) });
    people = people.map((p) => {
      if (p.id === m.personId) return { ...p, teamId: m.toTeamId, leader: m.lead ? true : false };
      if (m.lead && p.teamId === m.toTeamId && p.leader) return { ...p, leader: false };
      return p;
    });
  }
  return { people, withAdvice: out };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [base, setBase] = useState<Person[]>(PEOPLE);
  const [teams, setTeams] = useState<Team[]>(TEAMS);
  const [pendingRaw, setPending] = useState<PendingMove[]>([]);
  const [log, setLog] = useState<Confirmed[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([HELLO]);
  const [positions, setPositions] = useState<Position[]>(POSITIONS);
  const [applicants, setApplicants] = useState<Applicant[]>(APPLICANTS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pendingRef = useRef(pendingRaw);
  pendingRef.current = pendingRaw;

  const { people: livePeople, withAdvice } = useMemo(() => applyPending(base, teams, pendingRaw), [base, teams, pendingRaw]);
  const liveTeams = useMemo(() => teams.map((t) => ({ ...t, leaderId: livePeople.find((p) => p.teamId === t.id && p.leader)?.id })), [teams, livePeople]);
  const world: World = useMemo(() => ({ people: livePeople, teams: liveTeams, today: TODAY }), [livePeople, liveTeams]);

  const person = useCallback((id?: string) => livePeople.find((p) => p.id === id), [livePeople]);
  const team = useCallback((id?: string) => liveTeams.find((t) => t.id === id), [liveTeams]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const say = useCallback((msgs: Omit<ChatMsg, "id" | "at">[]) => setChat((c) => [...c, ...msgs.map((m) => ({ ...m, id: uid("m"), at: now() }))]), []);

  /** 이동 제안을 추가(같은 사람의 이전 제안은 바꿔요). 새 제안들의 조언을 돌려줘요 */
  const addMoves = useCallback((moves: { personId: string; toTeamId: string; lead: boolean }[]) => {
    let next = [...pendingRef.current];
    for (const m of moves) {
      next = next.filter((x) => x.personId !== m.personId);
      const cur = applyPending(base, teams, next).people.find((p) => p.id === m.personId)!;
      if (cur.teamId === m.toTeamId) continue;
      next.push({ id: uid("mv"), personId: m.personId, fromTeamId: base.find((p) => p.id === m.personId)!.teamId, toTeamId: m.toTeamId, lead: m.lead, at: now() });
    }
    // 원래 팀으로 되돌리는 이동은 지워요
    next = next.filter((x) => x.fromTeamId !== x.toTeamId);
    pendingRef.current = next;
    setPending(next);
    const { withAdvice: wa } = applyPending(base, teams, next);
    return wa.filter((x) => moves.some((m) => m.personId === x.personId));
  }, [base, teams]);

  const propose = useCallback((personId: string, toTeamId: string, lead = false) => {
    const added = addMoves([{ personId, toTeamId, lead }]);
    const p = base.find((x) => x.id === personId)!;
    const t = teams.find((x) => x.id === toTeamId)!;
    say([{ who: "me", text: `${p.name} ${josa(t.name, "으로")}` }, { who: "ara", text: added.length ? added[0]!.advice.headline : "이미 그 팀이에요.", card: added.length ? { kind: "advice", moves: added } : undefined }]);
  }, [addMoves, base, teams, say]);

  const undo = useCallback((ids?: string[]) => {
    const cur = pendingRef.current;
    const target = ids && ids.length ? cur.filter((m) => ids.includes(m.personId)) : cur.slice(-1);
    const next = cur.filter((m) => !target.includes(m));
    pendingRef.current = next;
    setPending(next);
    return target;
  }, []);

  const confirm = useCallback((ids?: string[]) => {
    const cur = pendingRef.current;
    const target = ids && ids.length ? cur.filter((m) => ids.includes(m.personId)) : cur;
    if (!target.length) return target;
    const rest = cur.filter((m) => !target.includes(m));
    // 확정할 이동만 순서대로 적용
    const { people: applied } = applyPending(base, teams, target);
    const movedIds = new Set(target.map((m) => m.personId));
    setBase(applied.map((p) => (movedIds.has(p.id) ? { ...p, lastMoved: TODAY } : p)));
    setTeams((ts) => ts.map((t) => ({ ...t, leaderId: applied.find((p) => p.teamId === t.id && p.leader)?.id })));
    setLog((l) => [...target.map((m) => ({ id: uid("c"), personId: m.personId, fromTeamId: m.fromTeamId, toTeamId: m.toTeamId, lead: m.lead, at: now() })), ...l]);
    const restRebased = rest.map((m) => ({ ...m, fromTeamId: applied.find((p) => p.id === m.personId)!.teamId }));
    pendingRef.current = restRebased;
    setPending(restRebased);
    return target;
  }, [base, teams]);

  const run = useCallback((intent: Intent, text: string) => {
    const me: Omit<ChatMsg, "id" | "at"> = { who: "me", text };
    const name = (id: string) => base.find((p) => p.id === id)?.name ?? "";
    const tname = (id: string) => teams.find((t) => t.id === id)?.name ?? "";
    const w = world;
    switch (intent.kind) {
      case "move": {
        const added = addMoves(intent.personIds.map((personId) => ({ personId, toTeamId: intent.teamId, lead: intent.lead })));
        const head = added.length === 1 ? added[0]!.advice.headline : `${added.length}명을 ${josa(tname(intent.teamId), "으로")} 옮겨 봤어요. 확정 전까지 조직도에서 깜빡여요.`;
        return say([me, { who: "ara", text: head, card: { kind: "advice", moves: added }, chips: ["모두 확정", `${name(intent.personIds[0]!)} 취소`] }]);
      }
      case "swap": {
        const a = w.people.find((p) => p.id === intent.a)!, b = w.people.find((p) => p.id === intent.b)!;
        if (a.teamId === b.teamId) return say([me, { who: "ara", text: `${name(a.id)} 님과 ${name(b.id)} 님은 같은 팀이에요.` }]);
        const added = addMoves([{ personId: a.id, toTeamId: b.teamId, lead: !!b.leader }, { personId: b.id, toTeamId: a.teamId, lead: !!a.leader }]);
        return say([me, { who: "ara", text: `${name(a.id)} 님과 ${name(b.id)} 님 자리를 바꿔 봤어요.`, card: { kind: "advice", moves: added }, chips: ["모두 확정", "방금 거 되돌려"] }]);
      }
      case "undo": {
        const gone = undo(intent.personIds);
        return say([me, { who: "ara", text: gone.length ? `${gone.map((m) => name(m.personId)).join(", ")} 님 이동을 취소했어요. 조직도도 원래대로 돌아갔어요.` : "취소할 이동이 없어요." }]);
      }
      case "confirm": {
        const done = confirm(intent.personIds);
        if (done.length) toast(`${done.length}건 확정했어요`);
        return say([me, { who: "ara", text: done.length ? `${done.map((m) => `${name(m.personId)} → ${tname(m.toTeamId)}`).join(", ")} 확정했어요. 발령일과 본인 안내는 인사 기록에서 이어서 해 주세요.` : "확정할 이동이 없어요. 먼저 누구를 어디로 보낼지 적어 주세요." }]);
      }
      case "whereFor": {
        const p = w.people.find((x) => x.id === intent.personId)!;
        const list = suggestTeams(w, p.id);
        if (!list.length) return say([me, { who: "ara", text: `${p.name} 님은 CRATA 결과를 배치에 쓰는 데 동의하지 않아서 팀을 추천하지 않아요. 본인 희망과 업무 경험으로 정해 주세요.` }]);
        return say([me, { who: "ara", text: `${p.name} 님에게 맞는 팀을 골라 봤어요.`, card: { kind: "teams", personId: p.id, items: list.map((x) => ({ teamId: x.team.id, score: x.fit.score, why: x.advice.pros[0] ?? x.fit.parts.find((y) => y.good)?.text ?? "", severe: x.advice.cons.filter((c) => c.severe).length })) },
          chips: list.slice(0, 2).map((x) => `${p.name} ${josa(x.team.name, "으로")}`) }]);
      }
      case "whoFor": {
        const list = suggestPeople(w, intent.teamId);
        const t = tname(intent.teamId);
        return say([me, { who: "ara", text: list.length ? `${josa(t, "으로")} 보낼 만한 사람이에요. 배치 참고에 동의한 사람 중에서만 골랐어요.` : `${josa(t, "으로")} 추천할 사람이 없어요.`,
          card: { kind: "people", teamId: intent.teamId, items: list.map((x) => ({ personId: x.person.id, score: x.advice.score, why: x.advice.pros[0] ?? "", severe: x.advice.cons.filter((c) => c.severe).length })) },
          chips: list.slice(0, 2).map((x) => `${x.person.name} ${josa(t, "으로")}`) }]);
      }
      case "about": {
        const p = w.people.find((x) => x.id === intent.personId)!;
        return say([me, { who: "ara", text: `${p.name} 님은 지금 ${tname(p.teamId)} ${josa(p.title, "이에요")}.`, card: { kind: "about", personId: p.id }, chips: [`${p.name} 어디가 맞을까?`] }]);
      }
      case "help":
        return say([me, { who: "ara", text: "이렇게 적으면 돼요. '○○○ 품질팀으로', '○○○ 생산1팀 팀장으로', '○○○랑 △△△ 자리 바꿔', '○○○ 취소', '모두 확정', '개발팀에 누가 좋아?'", chips: ["이하은 품질보증팀으로", "모두 확정"] }]);
      case "unknown": {
        const msg = intent.reason === "ambiguous" ? `같은 이름이 여러 명이에요: ${intent.candidates!.map((id) => `${name(id)}(${tname(base.find((p) => p.id === id)!.teamId)})`).join(", ")}. 성까지 적어 주세요.`
          : intent.reason === "sameTeam" ? `${intent.personIds!.map(name).join(", ")} 님은 이미 ${josa(tname(intent.teamId!), "이에요")}.`
          : intent.reason === "noTeam" ? `${intent.personIds!.map(name).join(", ")} 님을 어느 팀으로 보낼까요? 팀 이름을 같이 적어 주세요.`
          : intent.reason === "noPerson" && intent.teamId ? `${josa(tname(intent.teamId), "으로")} 보낼 사람 이름을 찾지 못했어요. 구성원 목록에 있는 이름으로 적어 주세요.`
          : "누구를 어디로 보낼지 알아듣지 못했어요. 예: '이하은 품질보증팀으로'";
        return say([me, { who: "ara", text: msg, chips: ["도움말"] }]);
      }
    }
  }, [addMoves, base, teams, world, undo, confirm, say, toast]);

  const send = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    run(parse(t, world.people, world.teams), t);
  }, [run, world]);

  const setStage = useCallback((ids: string[], stage: Stage) => {
    setApplicants((as) => as.map((a) => (ids.includes(a.id) ? { ...a, stage, testSentAt: stage === "testing" ? a.testSentAt ?? TODAY : a.testSentAt } : a)));
  }, []);
  const addApplicant = useCallback((a: Applicant) => setApplicants((as) => [a, ...as]), []);
  const addPosition = useCallback((p: Position) => setPositions((ps) => [p, ...ps]), []);

  const value: Ctx = {
    teams: liveTeams, people: base, world, pending: withAdvice, log, chat, positions, applicants, today: TODAY,
    person, team, send, propose: (a, b, c) => propose(a, b, c), undo: (ids) => { undo(ids); }, confirm: (ids) => { const d = confirm(ids); if (d.length) toast(`${d.length}건 확정했어요`); },
    setStage, addApplicant, addPosition, toast,
  };
  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </AppCtx.Provider>
  );
}
