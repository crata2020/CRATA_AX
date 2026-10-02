import { describe, expect, it } from "vitest";
import { makeProvider } from "./helpers";
import { resolvePersona } from "@/app/resolvePersona";
import type { PlatformRole } from "@/tenants/types";

describe("메모리 공급자", () => {
  it("getList: 필터 eq/contains/in, 정렬, 페이지", async () => {
    const { dp } = makeProvider("tr-technology", "R_CEO");
    const all = await dp.getList({ resource: "partners", pagination: { mode: "off" } });
    expect(all.total).toBe(11);
    const customers = await dp.getList({ resource: "partners", filters: [{ field: "kind", operator: "eq", value: "customer" }], pagination: { mode: "off" } });
    expect(customers.data.every((p) => p.kind === "customer")).toBe(true);
    const tag = await dp.getList({ resource: "partners", filters: [{ field: "tags", operator: "eq", value: "양산" }], pagination: { mode: "off" } });
    expect(tag.data.length).toBe(2);
    const contains = await dp.getList({ resource: "partners", filters: [{ field: "name", operator: "contains", value: "세이프티" }] });
    expect(contains.data.map((p) => p.id)).toEqual(["p-tr-saf"]);
    const inOp = await dp.getList({ resource: "partners", filters: [{ field: "kind", operator: "in", value: ["vendor", "agency"] }], sorters: [{ field: "name", order: "asc" }] });
    expect(inOp.data.map((p) => p.id)).toEqual(["p-tr-cal", "p-tr-prec"]);
    const page2 = await dp.getList({ resource: "partners", pagination: { currentPage: 2, pageSize: 5 }, sorters: [{ field: "id", order: "asc" }] });
    expect(page2.data.length).toBe(5);
    expect(page2.total).toBe(11);
  });

  it("getOne: 없는 id·다른 테넌트 id는 404", async () => {
    const { dp } = makeProvider("crata-demo");
    await expect(dp.getOne({ resource: "projects", id: "prj-tr-qual-clm" })).rejects.toMatchObject({ statusCode: 404 });
    const ok = await dp.getOne({ resource: "projects", id: "prj-cr-edu-a" });
    expect(ok.data.tenant_id).toBe("crata-demo");
  });

  it("L2 프로젝트는 참여자·owner·admin만", async () => {
    const outsider = makeProvider("crata-demo", "R_ARA_DEV");
    await expect(outsider.dp.getOne({ resource: "projects", id: "prj-cr-ssi-a" })).rejects.toMatchObject({ statusCode: 404 });
    const owner = makeProvider("crata-demo", "R_CEO");
    expect((await owner.dp.getOne({ resource: "projects", id: "prj-cr-ssi-a" })).data.sensitivity).toBe("L2");
    const member = makeProvider("tr-technology", "R_OPERATOR");
    const list = await member.dp.getList({ resource: "projects", pagination: { mode: "off" } });
    expect(list.data.map((p) => p.id).sort()).toEqual(["prj-tr-mass-exh", "prj-tr-mass-flt", "prj-tr-mass-saf", "prj-tr-safe-h2"]);
  });

  it("create/update/delete + 감사 기록, 권한 없으면 403", async () => {
    const { dp, store } = makeProvider("tr-technology", "R_CEO");
    const created = await dp.create({ resource: "partners", variables: { kind: "customer", name: "예시테스트(주)", status: "prospect", owner_member_id: "m-tr-sales", tags: [] } });
    expect(created.data.id).toMatch(/^p-/);
    const id = String(created.data.id);
    await dp.update({ resource: "partners", id, variables: { status: "active" } });
    await dp.deleteOne({ resource: "partners", id });
    const audits = store.rows("audit_events").filter((a) => a.resource === "partners");
    expect(audits.map((a) => a.action)).toEqual(["create", "update", "delete"]);
    const member = makeProvider("tr-technology", "R_OPERATOR");
    await expect(member.dp.create({ resource: "partners", variables: { name: "x" } })).rejects.toMatchObject({ statusCode: 403 });
    await expect(dp.update({ resource: "audit_events", id: audits[0]!.id, variables: { action: "x" } })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("금액을 못 보는 사람이 받은 행을 그대로 저장해도 실제 금액이 지워지지 않음(가린 칸은 patch에서 빠짐)", async () => {
    const plant = makeProvider("tr-technology", "R_PLANT_MGR");
    expect(plant.policy.hasBundle("view_prices")).toBe(false);
    // 수주 줄(unit_price) — 공장장은 단가를 못 봐요
    const line = plant.store.rows("sales_order_lines").find((l) => l.unit_price != null && plant.policy.can("sales_order_lines", "edit", l).can);
    expect(line).toBeTruthy();
    const real = line!.unit_price;
    const shown = (await plant.dp.getOne({ resource: "sales_order_lines", id: line!.id })).data as Record<string, unknown>;
    expect(shown.unit_price).toBeNull();
    await plant.dp.update({ resource: "sales_order_lines", id: line!.id, variables: { ...shown, late_reason: "테스트" } });
    expect(plant.store.find("sales_order_lines", line!.id)!.unit_price).toBe(real);
    // 발주(lines[].unit_price) — 배열 안 금액도 지금 값으로 되돌려 채움
    const po = plant.store.rows("purchase_orders").find((p) => plant.policy.can("purchase_orders", "edit", p).can && (p.lines as { unit_price: number | null }[]).some((x) => x.unit_price != null));
    if (po) {
      const before = JSON.stringify((po.lines as { unit_price: number | null }[]).map((x) => x.unit_price));
      const got = (await plant.dp.getOne({ resource: "purchase_orders", id: po.id })).data as Record<string, unknown>;
      await plant.dp.update({ resource: "purchase_orders", id: po.id, variables: got });
      expect(JSON.stringify((plant.store.find("purchase_orders", po.id)!.lines as { unit_price: number | null }[]).map((x) => x.unit_price))).toBe(before);
    }
  });

  it("시나리오 이야기가 서로 맞음: 앵커 출하는 클레임 접수 전 · LOT 번호 고유 · L2 업무·산출물에는 AI 연결·AI 초안 없음", () => {
    const { store } = makeProvider("tr-technology", "R_CEO");
    const claim = store.find("customer_claims", "clm-tr-2026-03")!;
    const ship = store.rows("shipments").find((s) => (s.lot_ids as string[]).includes("S-260916-012"))!;
    expect(ship).toBeTruthy();
    expect(String(ship.ship_date) < String(claim.received_on)).toBe(true);
    for (const res of ["stock_lots", "shipments"] as const) {
      const lots = store.rows(res).flatMap((r) => (res === "stock_lots" ? [r.lot_no as string] : (r.lot_ids as string[])));
      expect(new Set(lots).size).toBe(lots.length);
    }
    const l2Tasks = new Set(store.rows("tasks").filter((t) => t.sensitivity === "L2").map((t) => t.id));
    expect(store.rows("submissions").filter((s) => l2Tasks.has(s.task_id as string) && s.via === "ai_connection")).toEqual([]);
    expect(store.rows("progress_logs").filter((l) => l2Tasks.has(l.task_id as string) && l.via === "ai_connection")).toEqual([]);
    expect(store.rows("artifacts").filter((a) => a.sensitivity === "L2" && a.ai_generated)).toEqual([]);
  });

  it("custom: rpc 내장 동작과 셀렉터, 없는 이름은 400", async () => {
    // 그룹 시드가 들어온 뒤라 빈 시드(?empty=1)로 0을 확인하고, 실제 시드는 숫자인지만 봅니다.
    const empty = makeProvider("crata-demo", "R_EDU_LEAD", { emptyMode: true });
    const zero = await empty.dp.custom!({ url: "sel:nav.badges", method: "get" });
    expect(zero.data).toMatchObject({ reviewWaiting: 0, inboxWaiting: 0, unreadNotifications: 0 });
    const { dp } = makeProvider("crata-demo", "R_EDU_LEAD");
    const badges = (await dp.custom!({ url: "sel:nav.badges", method: "get" })).data as Record<string, unknown>;
    for (const k of ["reviewWaiting", "inboxWaiting", "unreadNotifications"]) expect(typeof badges[k]).toBe("number");
    await expect(dp.custom!({ url: "rpc:no_such_action", method: "post" })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("ActionContext: insert·notify·audit가 정책·공통 필드를 채움", async () => {
    const { dp, store, persona } = makeProvider("crata-demo", "R_EDU_LEAD");
    const ctx = (dp as unknown as { context: () => import("@/data/seed/types").ActionContext }).context();
    const before = await dp.getList({ resource: "notifications", pagination: { mode: "off" } });
    store.transaction(() => {
      ctx.notify({ recipientId: persona.memberId, kind: "system", title: "테스트 알림" });
      ctx.audit({ action: "rpc:test", resource: "tasks", resourceId: null });
    });
    const mine = await dp.getList({ resource: "notifications", pagination: { mode: "off" } });
    expect(mine.data.length - before.data.length).toBe(1);
    const added = mine.data.find((n) => n.title === "테스트 알림");
    expect(added).toMatchObject({ tenant_id: "crata-demo", is_demo: true, read_at: null });
    expect(store.rows("audit_events").some((a) => a.action === "rpc:test")).toBe(true);
  });

  it("트랜잭션: 도중에 실패하면 바꾼 행·변경 기록을 모두 되돌림(rpc 한 번 = 한 트랜잭션)", async () => {
    const { dp, store, persona } = makeProvider("tr-technology", "R_PLANT_MGR");
    const ctx = (dp as unknown as { context: () => import("@/data/seed/types").ActionContext }).context();
    const target = store.rows("field_reports").find((f) => f.status === "new")!;
    const tasksBefore = store.rows("tasks").length;
    const opsBefore = store.opCount;
    expect(() => store.transaction(() => {
      ctx.update("field_reports", target.id as string, { status: "assigned", assignee_id: persona.memberId });
      ctx.insert("tasks", { title: "되돌려질 업무" } as never);
      ctx.fail(400, "업무를 넣을 프로젝트를 골라 주세요");
    })).toThrow();
    expect(store.find("field_reports", target.id as string)).toMatchObject({ status: "new", assignee_id: null });
    expect(store.rows("tasks").length).toBe(tasksBefore);
    expect(store.opCount).toBe(opsBefore);
    // 이름 있는 동작도: 프로젝트 없이 업무를 만들려 하면 400, 현장 기록은 그대로
    await expect(dp.custom!({ url: "rpc:assign_field_report", method: "post", payload: { reportId: target.id, assigneeId: persona.memberId, task: { title: "조치" } } })).rejects.toMatchObject({ statusCode: 400 });
    expect(store.find("field_reports", target.id as string)).toMatchObject({ status: "new", assignee_id: null });
  });

  it("검토자도 내 정보(/me)에서 본인 감사 기록만 읽음(A-04)", async () => {
    const { dp, persona } = makeProvider("crata-demo", "R_EDU_LEAD");
    const rows = await dp.getList({ resource: "audit_events", pagination: { mode: "off" } });
    expect(rows.data.length).toBeGreaterThan(0);
    expect(rows.data.every((a) => a.actor_id === persona.memberId)).toBe(true);
    await expect(dp.update({ resource: "audit_events", id: rows.data[0]!.id!, variables: { action: "x" } })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("내 제출은 관리자·소유자여도 승인할 수 없음 · 남의 제출을 대신 승인하면 '대신 승인'으로 기록", async () => {
    // TR 총무(관리자): 본인이 담당인 '반기 점검 증빙 목록 1차 정리'(검토자 = 대표)
    const admin = makeProvider("tr-technology", "R_ADMIN_PUR_ACC");
    const mine = (await admin.dp.getList({ resource: "submissions", filters: [{ field: "status", operator: "eq", value: "submitted" }], pagination: { mode: "off" } })).data
      .find((s) => admin.store.find("tasks", String(s.task_id))?.assignee_id === admin.persona.memberId)!;
    expect(mine).toBeTruthy();
    expect(admin.policy.can("submissions", "approve", mine as never)).toMatchObject({ can: false, reason: "내 제출은 지정된 검토자가 승인해요" });
    await expect(admin.dp.custom!({ url: "rpc:approve_submission", method: "post", payload: { submissionId: mine.id } })).rejects.toMatchObject({ statusCode: 403 });
    // 대표(소유자)가 자기 업무를 제출한 경우도 막힘
    const owner = makeProvider("crata-demo", "R_CEO");
    const ownTask = owner.store.rows("tasks").find((t) => t.assignee_id === owner.persona.memberId && t.status === "in_progress")!;
    expect(owner.policy.can("submissions", "approve", { task_id: ownTask.id, submitted_by: owner.persona.memberId, status: "submitted" })).toMatchObject({ can: false });
    // 소유자는 남의 제출(검토자 = 공장장)을 대신 승인할 수 있고 감사 기록에 '대신 승인'으로 남아요
    const ceo = makeProvider("tr-technology", "R_CEO");
    const other = (await ceo.dp.getList({ resource: "submissions", filters: [{ field: "status", operator: "eq", value: "submitted" }], pagination: { mode: "off" } })).data
      .find((s) => ceo.store.find("tasks", String(s.task_id))?.reviewer_id !== ceo.persona.memberId)!;
    await ceo.dp.custom!({ url: "rpc:approve_submission", method: "post", payload: { submissionId: other.id } });
    const audit = ceo.store.rows("audit_events").filter((a) => a.resource_id === other.id);
    expect(audit.some((a) => a.action === "rpc:approve_submission_substitute")).toBe(true);
  });

  it("검토 대기 배지·홈 숫자는 내가 지정 검토자인 것만(소유자도 회사 전체를 세지 않음)", async () => {
    const ceo = makeProvider("tr-technology", "R_CEO");
    const badges = (await ceo.dp.custom!({ url: "sel:nav.badges", method: "get" })).data as Record<string, number>;
    const today = (await ceo.dp.custom!({ url: "sel:home.today", method: "get" })).data as { reviewWaiting: number; companyReviewWaiting: number | null };
    const own = ceo.store.rows("submissions").filter((s) => s.status === "submitted" && ceo.store.find("tasks", String(s.task_id))?.reviewer_id === ceo.persona.memberId).length;
    expect(badges.reviewWaiting).toBe(own);
    expect(today.reviewWaiting).toBe(own);
    expect(today.companyReviewWaiting).toBeGreaterThan(own);
    expect(typeof badges.myUrgent).toBe("number");
  });

  it("누구로 보기: 구성원 관리에서 바꾼 역할·비활성 상태를 따름", async () => {
    const ceo = makeProvider("tr-technology", "R_CEO");
    const plant = ceo.tenant.people.find((p) => p.roleCode === "R_PLANT_MGR" && p.persona)!;
    const op = ceo.tenant.people.find((p) => p.roleCode === "R_OPERATOR" && p.persona)!;
    await ceo.dp.custom!({ url: "rpc:change_member_role", method: "post", payload: { memberId: plant.id, role: "member" } });
    await ceo.dp.custom!({ url: "rpc:set_member_status", method: "post", payload: { memberId: op.id, status: "inactive" } });
    const memberOf = (id: string) => ceo.store.find("members", id) as { role?: PlatformRole; status?: string } | undefined;
    // 바꾼 역할로 들어가요(회사 설정의 reviewer가 아니라 member)
    expect(resolvePersona(ceo.tenant, memberOf, { as: "R_PLANT_MGR" })).toMatchObject({ roleCode: "R_PLANT_MGR", role: "member" });
    // 비활성 구성원은 고를 수 없어 기본 인물로
    expect(resolvePersona(ceo.tenant, memberOf, { as: "R_OPERATOR" }).roleCode).toBe(ceo.tenant.defaultPersona);
  });

  it("?empty=1: 기준 리소스 몇 개만 남음", async () => {
    const { dp } = makeProvider("tr-technology", "R_CEO", { emptyMode: true });
    expect((await dp.getList({ resource: "partners" })).total).toBe(0);
    expect((await dp.getList({ resource: "members", pagination: { mode: "off" } })).total).toBe(12);
  });
});
