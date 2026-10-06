// 앱 상태: 회사·사람 선택, 데모 데이터(바꿀 수 있는 사본), 한 번 누르기 동작, 알림 토스트.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { TR } from "./tr";
import { CRATA } from "./crata";
import type { Person, TenantData, TenantId, Task } from "./types";

const BASE: Record<TenantId, TenantData> = { tr: TR, crata: CRATA };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** 한 번 눌러 끝나는 일(홈 '승인할 일') */
export interface Approval {
  key: string;
  kind: "review" | "segment" | "decision" | "action" | "field" | "rule";
  kindLabel: string; title: string; sub: string; at: string;
  primary: string; to: string; ai?: boolean;
}

interface Ctx {
  d: TenantData; tenant: TenantId; me: Person;
  setTenant: (t: TenantId) => void; setPersona: (id: string) => void;
  person: (id?: string | null) => Person | undefined;
  approvals: Approval[];
  act: {
    approve: (a: Approval) => void;
    setTaskStatus: (id: string, status: Task["status"]) => void;
    confirmSegment: (meetingId: string, segId: string, lineCode?: string) => void;
    acceptAction: (meetingId: string, actionId: string) => void;
    confirmDecision: (meetingId: string, decisionId: string) => void;
    ruleDecision: (id: string, ok: boolean) => void;
    assignField: (id: string, personId?: string) => void;
    addFieldReport: (kind: "defect" | "equipment" | "nearmiss" | "other", note: string, place: string) => void;
    toggleIntegration: (id: string) => void;
    setStage: (s: "phase1" | "full") => void;
    toggleShare: (i: number) => void;
  };
  toast: (msg: string) => void;
}
const C = createContext<Ctx | null>(null);

const readPref = (): { tenant?: TenantId; persona?: Record<string, string> } => {
  try { return JSON.parse(localStorage.getItem("wsn:prefs") ?? "{}"); } catch { return {}; }
};
const writePref = (v: object) => { try { localStorage.setItem("wsn:prefs", JSON.stringify({ ...readPref(), ...v })); } catch { /* 저장 불가 */ } };

const KIND_LABEL: Record<Approval["kind"], string> = { review: "검토", segment: "회의 분류", decision: "회의 결정", action: "회의 액션", field: "현장 배정", rule: "작성 규칙" };

export function AppProvider({ children }: { children: ReactNode }) {
  const pref = readPref();
  const params = new URLSearchParams(location.search);
  const initTenant = (params.get("tenant") as TenantId) || pref.tenant || "tr";
  const [tenant, setTenantState] = useState<TenantId>(BASE[initTenant] ? initTenant : "tr");
  const [data, setData] = useState<Record<TenantId, TenantData>>(() => ({ tr: clone(TR), crata: clone(CRATA) }));
  const [personaBy, setPersonaBy] = useState<Record<string, string>>(() => {
    const as = params.get("as");
    return { tr: TR.defaultPersona, crata: CRATA.defaultPersona, ...(pref.persona ?? {}), ...(as ? { [initTenant]: as } : {}) };
  });
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const d = data[tenant];
  const me = d.people.find((p) => p.id === personaBy[tenant]) ?? d.people.find((p) => p.id === d.defaultPersona)!;
  document.documentElement.dataset.tenant = tenant;

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  const mutate = useCallback((fn: (x: TenantData) => void) => {
    setData((all) => { const next = { ...all, [tenant]: clone(all[tenant]) }; fn(next[tenant]); return next; });
  }, [tenant]);
  const person = useCallback((id?: string | null) => (id ? d.people.find((p) => p.id === id) : undefined), [d]);

  // 내 차례인 한 번 누르기 일
  const approvals = useMemo<Approval[]>(() => {
    const out: Approval[] = [];
    const nm = (id?: string) => d.people.find((p) => p.id === id)?.name ?? "구성원";
    const proj = (id?: string) => d.projects.find((p) => p.id === id);
    for (const t of d.tasks) if (t.status === "review" && t.reviewer === me.id) {
      out.push({ key: `review:${t.id}`, kind: "review", kindLabel: KIND_LABEL.review, title: t.title, sub: `${nm(t.assignee)}${t.submittedVia === "ai" ? ` · AI 연결(${t.aiClient})` : ""} · ${proj(t.projectId)?.name ?? ""}`, at: t.submittedAt ?? t.due, primary: "승인", to: "/tasks", ai: t.submittedVia === "ai" });
    }
    for (const m of d.meetings) {
      const p = proj(m.projectIds[0]);
      const mine = p ? p.reviewer === me.id : m.attendees.includes(me.id);
      if (!mine) continue;
      for (const s of m.segments) if (s.status === "pending" && s.lineCode) {
        const line = d.lines.find((l) => l.code === s.lineCode);
        out.push({ key: `segment:${m.id}:${s.id}`, kind: "segment", kindLabel: KIND_LABEL.segment, title: `“${s.quote}”`, sub: `${m.title} · AI 분류 ${line?.name ?? s.lineCode}${s.projectId ? ` › ${proj(s.projectId)?.name ?? ""}` : ""} · 확신 ${Math.round(s.confidence * 100)}%`, at: m.date, primary: "분류 맞아요", to: `/meetings?m=${m.id}`, ai: true });
      }
      for (const a of m.actions) if (a.status === "proposed") {
        out.push({ key: `action:${m.id}:${a.id}`, kind: "action", kindLabel: KIND_LABEL.action, title: a.title, sub: `${m.title} · 추천 담당 ${a.assignee === me.id ? "나" : nm(a.assignee)} · ${a.due.slice(5).replace("-", "/")}까지`, at: m.date, primary: "업무로 만들기", to: `/meetings?m=${m.id}`, ai: true });
      }
      for (const dc of m.decisions) if (dc.status === "proposed" && (dc.owner === me.id || me.platform === "owner")) {
        out.push({ key: `decision:${m.id}:${dc.id}`, kind: "decision", kindLabel: KIND_LABEL.decision, title: dc.text, sub: `${m.title} · ${nm(dc.owner)} 확정`, at: m.date, primary: "확정", to: `/meetings?m=${m.id}`, ai: true });
      }
    }
    const dispatcher = d.id === "tr" ? "tr-plant" : null;
    if (me.id === dispatcher) for (const f of d.fieldReports) if (f.status === "new") {
      out.push({ key: `field:${f.id}`, kind: "field", kindLabel: KIND_LABEL.field, title: f.note, sub: `${f.place} · ${nm(f.by)} · 추천 담당 ${nm(f.suggested)}`, at: f.at, primary: "배정", to: "/quality" });
    }
    for (const r of d.rules) if (r.status === "candidate" && r.approver === me.id) {
      out.push({ key: `rule:${r.id}`, kind: "rule", kindLabel: KIND_LABEL.rule, title: r.text, sub: `${r.docType} · 같은 수정 ${r.evidence}번 → 규칙으로`, at: r.createdAt, primary: "반영", to: "/docs", ai: true });
    }
    const order: Approval["kind"][] = ["review", "field", "action", "decision", "segment", "rule"];
    return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  }, [d, me]);

  const act: Ctx["act"] = useMemo(() => ({
    approve: (a) => {
      const [kind, x, y] = a.key.split(":");
      mutate((t) => {
        if (kind === "review") { const k = t.tasks.find((k) => k.id === x); if (k) { k.status = "done"; k.progress = 100; } }
        if (kind === "segment") { const s = t.meetings.find((m) => m.id === x)?.segments.find((s) => s.id === y); if (s) s.status = "confirmed"; }
        if (kind === "action") {
          const m = t.meetings.find((m) => m.id === x); const ac = m?.actions.find((a) => a.id === y);
          if (m && ac) { ac.status = "accepted"; t.tasks.unshift({ id: `t-${ac.id}`, title: ac.title, projectId: ac.projectId, assignee: ac.assignee, reviewer: me.id, status: "todo", progress: 0, due: ac.due, hours: 0, source: "meeting", desc: `회의 “${m.title}”에서 나온 액션이에요.`, comments: 0, files: 0, checklist: [0, 1] }); }
        }
        if (kind === "decision") { const dc = t.meetings.find((m) => m.id === x)?.decisions.find((d) => d.id === y); if (dc) dc.status = "confirmed"; }
        if (kind === "field") { const f = t.fieldReports.find((f) => f.id === x); if (f) { f.status = "assigned"; f.assignee = f.suggested; } }
        if (kind === "rule") { const r = t.rules.find((r) => r.id === x); if (r) r.status = "active"; }
      });
      toast(a.kind === "review" ? `“${a.title}” 승인했어요` : a.kind === "field" ? "추천 담당에게 배정했어요" : a.kind === "action" ? "업무를 만들고 담당에게 알렸어요" : a.kind === "rule" ? "다음 초안부터 이 규칙을 써요" : a.kind === "decision" ? "결정을 확정했어요" : "분류를 확인했어요");
    },
    setTaskStatus: (id, status) => { mutate((t) => { const k = t.tasks.find((k) => k.id === id); if (k) { k.status = status; if (status === "done") k.progress = 100; } }); },
    confirmSegment: (mid, sid, lineCode) => { mutate((t) => { const s = t.meetings.find((m) => m.id === mid)?.segments.find((s) => s.id === sid); if (s) { s.status = "confirmed"; if (lineCode) s.lineCode = lineCode; } }); toast(lineCode ? "분류를 고쳤어요. 다음 분류에 반영돼요" : "분류를 확인했어요"); },
    acceptAction: (mid, aid) => { act.approve({ key: `action:${mid}:${aid}`, kind: "action" } as Approval); },
    confirmDecision: (mid, did) => { act.approve({ key: `decision:${mid}:${did}`, kind: "decision" } as Approval); },
    ruleDecision: (id, ok) => { mutate((t) => { const r = t.rules.find((r) => r.id === id); if (r) r.status = ok ? "active" : "rejected"; }); toast(ok ? "다음 초안부터 이 규칙을 써요" : "이번 수정으로만 남겼어요"); },
    assignField: (id, pid) => { mutate((t) => { const f = t.fieldReports.find((f) => f.id === id); if (f) { f.status = "assigned"; f.assignee = pid ?? f.suggested; } }); toast("담당에게 배정했어요"); },
    addFieldReport: (kind, note, place) => {
      mutate((t) => {
        const suggested = kind === "defect" ? "tr-qa" : kind === "equipment" ? "tr-plant" : "tr-admin";
        t.fieldReports.unshift({ id: `f${Date.now()}`, kind, note, place, by: me.id, at: `${t.today}T${new Date().toTimeString().slice(0, 5)}`, status: "new", suggested });
      });
      toast("등록했어요. 공장장에게 알렸어요");
    },
    toggleIntegration: (id) => { mutate((t) => { const i = t.integrations.find((i) => i.id === id); if (i && i.status !== "planned") i.status = i.status === "connected" ? "available" : "connected"; }); },
    setStage: (s) => { mutate((t) => { t.rollout.stage = s; }); toast(s === "phase1" ? "1단계로 바꿨어요. 꼭 필요한 화면만 보여요" : "전체로 바꿨어요. 모든 화면이 보여요"); },
    toggleShare: (i) => { mutate((t) => { const l = t.ara.card.lines[i]; if (l) l.shared = !l.shared; }); },
  }), [mutate, toast, me.id]);

  const value: Ctx = {
    d, tenant, me, person, approvals, act, toast,
    setTenant: (t) => { setTenantState(t); writePref({ tenant: t }); },
    setPersona: (id) => { setPersonaBy((p) => { const n = { ...p, [tenant]: id }; writePref({ persona: n }); return n; }); },
  };
  return (
    <C.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast"><CheckCircle2 />{t.msg}</div>)}
      </div>
    </C.Provider>
  );
}

export function useApp(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useApp는 AppProvider 안에서만 써요");
  return v;
}
