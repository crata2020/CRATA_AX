// 클레임 상세 `/ops/quality/claims/:claimId` · I-13 · 깊이 A · 모듈 mfg-quality · TR 전용 · 소유: industry 그룹
// 클레임 하나를 8D 단계로 끝까지 따라가고, 대상 LOT · 4M 변경 · 연결 업무 · 8D 보고서(산출물, L2라 사람 초안) · 작성 규칙 후보를 잇습니다(시나리오 S2).
// [이 단계 완료로 표시](rpc:complete_d_step)와 [+ 업무](rpc:create_linked_task, source=claim)는 검토자 이상.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Button, DatePicker, Form, Input, Select, Skeleton } from "antd";
import { CheckOutlined, FileTextOutlined, NodeIndexOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  AiTag, CardGrid, DdayBadge, DetailDrawer, Divider, EmptyState, ListRows, PageHeader, SectionCard, SensitivityTag, StatusTag, Timeline, type TimelineItem,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useOne, useRpc } from "@/lib/refine";
import { kstIso } from "@/lib/clock";
import { formatDate, formatNumber } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { Artifact, ChangeRequest4M, CorrectiveAction, CustomerClaim, Item, Partner, Project, Rule, Task } from "@/types/entities";
import { useModuleRows, useRows } from "../ops-home/kit/data";
import { Kv } from "../ops-home/kit/ui";
import { STEPS, STEP_NAME, currentStep, shortTitle } from "../claims/shared";
import "../ops-home/kit/industry.css";

interface TaskValues { title: string; assigneeId: string; projectId: string; due?: Dayjs | null }

export default function Page() {
  const { claimId = "" } = useParams();
  const { can, tenant, today, persona } = useWorksite();
  const { result, query } = useOne<CustomerClaim>({ resource: "customer_claims", id: claimId, queryOptions: { retry: false } });
  const claim = result as CustomerClaim | undefined;
  const cas = useRows<CorrectiveAction>("corrective_actions", { filters: [{ field: "related_id", operator: "eq", value: claimId }] });
  const ca = cas.rows[0];
  const item = useOne<Item>({ resource: "items", id: claim?.item_id ?? "", queryOptions: { enabled: !!claim, retry: false } });
  const partner = useOne<Partner>({ resource: "partners", id: claim?.partner_id ?? "", queryOptions: { enabled: !!claim, retry: false } });
  const tasks = useModuleRows<Task>("tasks", "tasks", { filters: [{ field: "source_ref", operator: "eq", value: claimId }], sorters: [{ field: "due_at", order: "asc" }] });
  const changes = useModuleRows<ChangeRequest4M>("mfg-quality", "change_requests_4m", { filters: [{ field: "affected_item_ids", operator: "eq", value: claim?.item_id ?? "__none__" }], enabled: !!claim });
  const art = useOne<Artifact>({ resource: "artifacts", id: ca?.artifact_id ?? "", queryOptions: { enabled: !!ca?.artifact_id, retry: false } });
  const rules = useModuleRows<Rule>("correction-rules", "rules", { filters: [{ field: "doc_types", operator: "eq", value: "report_8d" }, { field: "status", operator: "eq", value: "candidate" }] });
  const projects = useRows<Project>("projects", { filters: [{ field: "status", operator: "ne", value: "done" }] });
  usePageReady(!query.isLoading && !cas.isLoading);
  const canApprove = can("customer_claims", "approve").can;
  const canTask = can("tasks", "create").can && persona.role !== "member";
  const complete = useRpc<{ ok: boolean; done: string; next: string | null }>("complete_d_step");
  const addTask = useRpc<{ ok: boolean; taskId: string }>("create_linked_task", { successMessage: "업무를 만들었어요. 담당에게 알렸어요." });
  const [taskOpen, setTaskOpen] = useState(false);
  const [form] = Form.useForm<TaskValues>();

  const cur = currentStep(ca);
  const artifact = art.result as Artifact | undefined;
  const itemRow = item.result as Item | undefined;
  const claimProject = useMemo(() => projects.rows.find((p) => p.code.includes(claim?.claim_no ?? "~")) ?? projects.rows.find((p) => p.partner_id === claim?.partner_id) ?? projects.rows[0], [projects.rows, claim]);

  useEffect(() => {
    if (!taskOpen || !claim) return;
    form.resetFields();
    const qa = tenant.people.find((p) => p.roleCode === "R_QA")?.id;
    form.setFieldsValue({ title: `${claim.claim_no} ${cur ? `${cur.step} ` : ""}후속 조치`, assigneeId: qa, projectId: claimProject?.id, due: dayjs(today).add(3, "day") });
  }, [taskOpen, claim, cur, form, tenant.people, claimProject, today]);

  if (query.isLoading) return (<><PageHeader title="클레임 상세" back={{ label: "클레임·8D", to: "/ops/quality/claims" }} /><Skeleton active paragraph={{ rows: 8 }} /></>);
  if (query.isError || !claim) {
    return (
      <>
        <PageHeader title="클레임 상세" back={{ label: "클레임·8D", to: "/ops/quality/claims" }} />
        {(query.error as { statusCode?: number } | null)?.statusCode === 404 || !claim
          ? <EmptyState kind="not_found" action={{ label: "클레임 목록 보기", to: "/ops/quality/claims" }} />
          : <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void query.refetch() }} />}
      </>
    );
  }

  const stepsTimeline: TimelineItem[] = STEPS.map((s) => {
    const d = ca?.d_steps.find((x) => x.step === s);
    const status = d?.status ?? "todo";
    return {
      id: s,
      at: status === "done" ? `완료 ${formatDate(d?.done_on ?? null, false)}` : status === "doing" ? "진행 중" : "할 일",
      title: `${s} ${STEP_NAME[s]}`,
      description: d?.note ?? undefined,
      tone: status === "done" ? "good" : status === "doing" ? "info" : "neutral",
      actor: status === "doing" && d?.owner_id ? { memberId: d.owner_id } : undefined,
    };
  });

  const saveTask = async () => {
    const v = await form.validateFields();
    await addTask.run({ title: v.title, projectId: v.projectId, assigneeId: v.assigneeId, dueAt: v.due ? kstIso(v.due.format("YYYY-MM-DD"), "18:00") : null, source: "claim", sourceRef: claim.id, description: `클레임 ${claim.claim_no}: ${shortTitle(claim.description)}` });
    setTaskOpen(false);
  };

  return (
    <>
      <PageHeader
        title={`${claim.claim_no} · ${shortTitle(claim.description)}`}
        back={{ label: "클레임·8D", to: "/ops/quality/claims" }}
        meta={
          <>
            <StatusTag {...statusOf("customer_claims.status", claim.status)} />
            <SensitivityTag level="L2" />
            <span>{(partner.result as Partner | undefined)?.name ?? "고객"}</span>
            <span>접수 {formatDate(claim.received_on)}</span>
            {claim.status !== "closed" && <DdayBadge date={claim.report_8d_due} noun="8D 기한" />}
          </>
        }
        actions={artifact ? <Link to={`/docs/artifacts/${artifact.id}`}><Button type="primary" icon={<FileTextOutlined />}>8D 보고서 열기</Button></Link> : undefined}
      />
      <CardGrid>
        <SectionCard title="8D 단계" span={8}>
          {ca ? (
            <>
              <Timeline items={stepsTimeline} order="asc" relative={false} ariaLabel="8D 단계" />
              {cur && (
                canApprove
                  ? <Button className="in-mt" icon={<CheckOutlined />} loading={complete.isPending} onClick={() => void complete.run({ claimId: claim.id })}>{cur.step} {STEP_NAME[cur.step]} 완료로 표시</Button>
                  : <p className="in-caption in-mt">단계 완료는 검토자 이상이 표시해요.</p>
              )}
              <Divider />
              <Kv rows={[
                ["임시 조치", ca.containment],
                ["근본 원인", ca.root_cause ?? (cur && cur.step <= "D4" ? "조사 중이에요" : null)],
                ["대책", ca.actions],
                ["효과 검증", ca.verification],
                ["수평 전개", ca.horizontal_deployment],
              ]} />
            </>
          ) : <EmptyState kind="empty" compact title="8D 기록이 아직 없어요" description="클레임을 접수하면 8D 단계가 함께 만들어져요." />}
        </SectionCard>
        <SectionCard title="요약" span={4} demo>
          <Kv rows={[
            ["품목", itemRow ? `${itemRow.item_no} · ${itemRow.name}` : null],
            ["고객 품번", itemRow?.customer_part_no ?? <span className="in-caption">검토자 이상에게 보여요</span>],
            ["수량", `${formatNumber(claim.qty_affected)}개`],
            ["심각도", labelOf("customer_claims.severity", claim.severity)],
            ["고객 참조번호", claim.customer_ref_no],
            ["임시 조치 기한", formatDate(claim.containment_due)],
            ["대상 LOT", claim.lot_nos.length ? (
              <span className="in-stack in-stack--tight">
                {claim.lot_nos.map((l) => <Link key={l} className="in-link" to={`/ops/trace?lot=${encodeURIComponent(l)}`}><NodeIndexOutlined aria-hidden /> {l} LOT 추적</Link>)}
              </span>
            ) : null],
          ]} />
          <Divider />
          <div className="in-row in-row--between">
            <h3 className="in-sub--sm" style={{ margin: 0 }}>연결 업무 {tasks.rows.length}건</h3>
            {canTask && <Button size="small" icon={<PlusOutlined />} onClick={() => setTaskOpen(true)}>업무</Button>}
          </div>
          <ListRows
            ariaLabel="연결 업무"
            empty={<p className="in-note">연결된 업무가 없어요.</p>}
            rows={tasks.rows.map((t) => ({ key: t.id, title: t.title, subtitle: t.due_at ? `${formatDate(t.due_at, false)} 마감` : undefined, to: `/work/tasks/${t.id}`, trailing: <StatusTag {...statusOf("tasks.status", t.status)} /> }))}
          />
          <Divider />
          <h3 className="in-sub--sm">4M 변경</h3>
          <ListRows
            ariaLabel="관련 4M 변경"
            empty={<p className="in-note">관련 4M 변경이 없어요.</p>}
            rows={changes.rows.filter((c) => c.status !== "closed").map((c) => ({ key: c.id, title: `${c.change_no} ${c.description}`, to: `/ops/quality?tab=4m&selected=${c.id}`, trailing: <StatusTag {...statusOf("change_requests_4m.status", c.status)} /> }))}
          />
          <Divider />
          <h3 className="in-sub--sm">8D 보고서</h3>
          {artifact ? (
            <div className="in-row">
              <Link className="in-link" to={`/docs/artifacts/${artifact.id}`}><FileTextOutlined aria-hidden /> {artifact.title}</Link>
              {artifact.ai_generated && <AiTag kind="draft" />}
            </div>
          ) : <p className="in-note">{ca?.artifact_id ? "8D 보고서를 볼 수 없어요(권한 또는 준비 중)." : "아직 8D 보고서가 없어요."}</p>}
          <Divider />
          <h3 className="in-sub--sm">수정에서 배운 규칙</h3>
          {rules.rows.length ? (
            <Link className="in-link" to="/docs/rules?tab=pending">8D 작성 규칙 후보 {rules.rows.length}건 보기</Link>
          ) : <p className="in-note">승인 대기 중인 8D 작성 규칙 후보가 없어요.</p>}
          <p className="in-caption in-mt">8D 보고서를 고친 내용은 작성 규칙 후보로 쌓여요.</p>
        </SectionCard>
      </CardGrid>

      <DetailDrawer open={taskOpen} onClose={() => setTaskOpen(false)} title="클레임 후속 업무 만들기" closeLabel="취소" footer={<Button type="primary" loading={addTask.isPending} onClick={() => void saveTask()}>만들기</Button>}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="title" label="업무 제목" rules={[{ required: true, whitespace: true, message: "업무 제목을 적어 주세요" }]}><Input maxLength={80} /></Form.Item>
          <Form.Item name="assigneeId" label="담당" rules={[{ required: true, message: "담당을 골라 주세요" }]}>
            <Select options={tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }))} />
          </Form.Item>
          <Form.Item name="projectId" label="프로젝트" rules={[{ required: true, message: "프로젝트를 골라 주세요" }]}>
            <Select options={projects.rows.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="due" label="마감"><DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" /></Form.Item>
          <p className="in-caption">업무의 출처는 이 클레임으로 남아요.</p>
        </Form>
      </DetailDrawer>
    </>
  );
}
