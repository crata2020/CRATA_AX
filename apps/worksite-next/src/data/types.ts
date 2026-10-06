// 데모 데이터 타입. 내용은 리서치(docs/research 00·02·03·04·08·09·10, docs/worksite 03)를 따릅니다.
import type { Hue } from "@/ui";

export type TenantId = "tr" | "crata";
export type PlatformRole = "owner" | "admin" | "reviewer" | "member";
export type AiClient = "Claude" | "ChatGPT" | "Codex" | "Gemini";
export type DataClass = "L0" | "L1" | "L2" | "L3";

export interface Person {
  id: string; name: string; title: string; unit: string; platform: PlatformRole;
  /** 누구로 보기 목록에 나옴 */
  persona?: boolean;
  /** 모바일 우선(현장 작업자) */
  field?: boolean;
}

export interface Project {
  id: string; code: string; name: string; lineId: string; owner: string; reviewer: string; members: string[];
  status: "planned" | "active" | "hold" | "done"; health: "good" | "warn" | "risk"; due: string; progress: number;
  parts: string[]; dataClass: DataClass; customer?: string;
}
export interface BusinessLine { id: string; code: string; name: string; hue: Hue; color: string; desc: string; hypothesis?: boolean }

export type TaskStatus = "stuck" | "todo" | "doing" | "review" | "done";
export type TaskSource = "meeting" | "field" | "mail" | "manual" | "ai" | "claim";
export interface Task {
  id: string; title: string; projectId: string; part?: string; assignee: string; reviewer: string; status: TaskStatus; progress: number;
  due: string; hours: number; source: TaskSource; desc: string; comments: number; files: number; checklist: [number, number];
  /** 검토 대기일 때 제출 방식 */
  submittedVia?: "web" | "ai"; submittedAt?: string; aiClient?: AiClient;
  /** 막힘 이유 */
  blocker?: string;
}

export interface Segment {
  id: string; from: number; to: number; lineCode: string | null; projectId?: string; topic: string; confidence: number; quote: string;
  status: "auto" | "pending" | "confirmed" | "unclassified";
}
export interface Decision { id: string; text: string; owner: string; status: "proposed" | "confirmed" }
export interface ActionItem { id: string; title: string; assignee: string; due: string; status: "proposed" | "accepted" | "dismissed"; projectId: string }
export interface Meeting {
  id: string; title: string; date: string; time: string; duration: number; source: "Plaud" | "클로바노트" | "직접 업로드";
  attendees: string[]; projectIds: string[]; status: "processing" | "review" | "done"; summary: string; dataClass: DataClass;
  segments: Segment[]; decisions: Decision[]; actions: ActionItem[]; kind: string;
}

export interface Rule {
  id: string; text: string; scope: "template" | "writing" | "once"; docType: string; evidence: number; status: "candidate" | "active" | "rejected";
  applied: number; overridden: number; approver: string; createdAt: string;
}
export interface Correction { id: string; doc: string; before: string; after: string; scope: "template" | "writing" | "once" | "unsorted"; by: string; at: string }
export interface Artifact {
  id: string; title: string; type: string; projectId: string; owner: string; version: number; status: "draft" | "review" | "final";
  aiDraft: boolean; updated: string; corrections: number;
}

export interface FieldReport {
  id: string; kind: "defect" | "equipment" | "nearmiss" | "other"; note: string; by: string; at: string; place: string;
  status: "new" | "assigned" | "done"; assignee?: string; suggested: string;
}
export interface Claim { id: string; no: string; customer: string; item: string; qty: number; received: string; step: number; due: string; severity: "high" | "mid" | "low"; status: "open" | "closed" }

export interface AiConnection { personId: string; client: AiClient; status: "connected" | "invited" | "off"; scopes: string[]; since?: string; lastUsed?: string; weekCalls: number }
export interface AiRun { id: string; personId: string; client: AiClient; tool: string; target: string; at: string; ms: number; result: "ok" | "blocked" | "error"; note?: string }

export interface Integration {
  id: string; name: string; category: "회의 녹음" | "메일" | "문서·지식" | "메신저·협업" | "결재·ERP" | "현장"; status: "connected" | "available" | "planned";
  desc: string; mono: string; color: string; scope?: string; note?: string;
}

export interface DnaLayer { code: string; name: string; group: "스타일" | "경계" | "패턴"; progress: number; confidence: number; found: string[]; todo: string[] }
export interface AssignRule { id: string; when: string; assignee: string; reviewer: string; basis: string; confidence: number }
export interface GlossaryTerm { term: string; meaning: string; alias?: string[]; confirm?: boolean }
export interface Cadence { name: string; rule: string; owner: string; next: string }

export interface RolloutStep { id: string; title: string; detail: string; done: boolean; owner: "CRATA" | "회사" }
export interface Notice { id: string; title: string; at: string; mustRead?: boolean }
export interface CalendarItem { id: string; title: string; date: string; time?: string; kind: "meeting" | "due" | "legal" | "event" }

/** ARA(개인 영역): 회사가 볼 수 없음 */
export interface AraState {
  checkins: { date: string; energy: number; focus: number }[];
  card: { title: string; lines: { text: string; shared: boolean }[] };
  suggestions: string[];
}

export interface TenantData {
  id: TenantId;
  name: string; shortName: string; monogram: string; tagline: string; industry: string; pack: "manufacturing" | "education";
  today: string; weekday: string;
  people: Person[]; defaultPersona: string;
  lines: BusinessLine[]; projects: Project[]; tasks: Task[]; meetings: Meeting[];
  rules: Rule[]; corrections: Correction[]; artifacts: Artifact[];
  fieldReports: FieldReport[]; claims: Claim[];
  quality?: {
    ppm: { month: string; value: number }[]; target: number;
    defects: { label: string; value: number }[];
    inspectionRate: number; equipment: { label: string; value: number; color: string }[]; equipmentTotal: number;
    fieldWeek: { day: string; defect: number; equipment: number; nearmiss: number; other: number }[];
  };
  learning: { weeks: string[]; repeatRate: number[]; firstPass: number[]; reviewMin: number[] };
  aiConnections: AiConnection[]; aiRuns: AiRun[];
  integrations: Integration[];
  dna: { layers: DnaLayer[]; assign: AssignRule[]; glossary: GlossaryTerm[]; cadences: Cadence[]; hypotheses: { text: string; confidence: number }[] };
  rollout: { stage: "phase1" | "full"; steps: RolloutStep[]; goal: string };
  notices: Notice[]; calendar: CalendarItem[];
  ara: AraState;
  /** 이번 주 처리 흐름(홈 선 차트) */
  flow: { days: string[]; done: number[]; incoming: number[] };
}
