// 시드 이야기 일관성(리뷰 3차): 진행 기록이 쉬는 날·업무 만들기 전에 남지 않음 · 현장 등록 → 업무 순서 · L2는 AI 꺼짐 · 회의 액션 중복 없음
import { describe, expect, it } from "vitest";
import { isOffDay, toKstDate } from "@/lib/clock";
import type { AuditEvent, FieldReport, MeetingSegment, Meeting, Notification, ProgressLog, Submission, Task } from "@/types/entities";
import { makeProvider } from "./helpers";

type Store = ReturnType<typeof makeProvider>["store"];
const rows = <T,>(store: Store, r: Parameters<Store["rows"]>[0]) => store.rows(r) as unknown as T[];

describe("시드 이야기", () => {
  for (const slug of ["tr-technology", "crata-demo"] as const) {
    it(`${slug}: 진행 기록은 일하는 날, 업무를 만든 뒤에만`, () => {
      const { store } = makeProvider(slug, "R_CEO");
      const tasks = new Map(rows<Task>(store, "tasks").map((t) => [t.id, t]));
      for (const l of rows<ProgressLog>(store, "progress_logs")) {
        const t = tasks.get(l.task_id)!;
        expect(isOffDay(toKstDate(l.created_at), { saturday: slug === "crata-demo" }), `${l.id} ${l.created_at}`).toBe(false);
        expect(l.created_at >= t.created_at, `${l.id} ${l.created_at} < ${t.id} ${t.created_at}`).toBe(true);
      }
      // 같은 사람·같은 시각·같은 문장 기록이 겹치지 않음
      const keys = rows<ProgressLog>(store, "progress_logs").map((l) => `${l.author_id}|${l.created_at}|${l.body}`);
      expect(keys.length - new Set(keys).size).toBe(0);
    });
    it(`${slug}: L2 업무·회의에는 AI 기록·AI 분류가 없음`, () => {
      const { store } = makeProvider(slug, "R_CEO");
      const l2Tasks = new Set(rows<Task>(store, "tasks").filter((t) => t.sensitivity === "L2").map((t) => t.id));
      expect(rows<ProgressLog>(store, "progress_logs").filter((l) => l2Tasks.has(l.task_id) && l.via === "ai_connection")).toEqual([]);
      expect(rows<Submission>(store, "submissions").filter((s) => l2Tasks.has(s.task_id) && s.via === "ai_connection")).toEqual([]);
      const l2Meetings = new Set(rows<Meeting>(store, "meetings").filter((m) => m.sensitivity === "L2").map((m) => m.id));
      expect(rows<MeetingSegment>(store, "meeting_segments").filter((s) => l2Meetings.has(s.meeting_id) && s.review_status === "auto")).toEqual([]);
    });
    it(`${slug}: 사람·AI 연결 감사 기록은 일하는 날에만`, () => {
      const { store } = makeProvider(slug, "R_CEO");
      const off = rows<AuditEvent>(store, "audit_events").filter((a) => a.actor_type !== "system" && a.actor_type !== "crata_operator" && isOffDay(toKstDate(a.at), { saturday: slug === "crata-demo" }));
      expect(off.map((a) => `${a.at} ${a.action} ${a.resource_id}`)).toEqual([]);
    });
  }

  it("TR 앵커: 현장 등록(08:40) → 공장장이 업무로(08:45) → 점검 기록 → 마감 알림", () => {
    const { store } = makeProvider("tr-technology", "R_PLANT_MGR");
    const fr = store.find("field_reports", "fr-tr-0085") as unknown as FieldReport;
    const t = store.find("tasks", "t-tr-028") as unknown as Task;
    expect(t.created_by).toBe(fr.assignee_id);
    expect(t.created_at > fr.reported_at).toBe(true);
    const logs = rows<ProgressLog>(store, "progress_logs").filter((l) => l.task_id === t.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.every((l) => l.created_at > t.created_at)).toBe(true);
    const due = rows<Notification>(store, "notifications").filter((n) => n.source_id === t.id && n.kind === "due_soon");
    expect(due.every((n) => n.created_at > t.created_at)).toBe(true);
  });

  it("TR 회의 액션 제안: 열린 업무와 같은 담당·같은 일은 새로 만들지 않고 연결", () => {
    const { store } = makeProvider("tr-technology", "R_CEO");
    const aps = rows<{ id: string; title: string; status: string; task_id: string | null }>(store, "action_proposals");
    const proposed = aps.filter((a) => a.status === "proposed");
    const titles = proposed.map((a) => a.title);
    expect(titles).not.toContain("편조 롤 폭 문의 회신");
    expect(titles).not.toContain("작업자용 현장 등록 안내문");
    expect(titles).not.toContain("불량 사진 기준 정하기");
    for (const a of aps.filter((x) => x.status === "accepted")) expect(a.task_id, a.id).toBeTruthy();
  });
});
