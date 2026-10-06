// 프로젝트 상세 `/projects/:projectId` · W-02 · 깊이 A · 모듈 business-structure · 소유: work 그룹
// 프로젝트에 붙은 사람·업무·회의·문서·결정·공유 메일을 탭(?tab=)으로 한 화면에서 봅니다. 볼 수 없는 프로젝트(L2 비참여 등)는 404 → not_found.
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Button, Form, Input, Select, Skeleton } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  CardGrid, DataTable, DdayBadge, DetailDrawer, Divider, EmptyState, ListRows, PageHeader, PersonChip, SectionCard, SensitivityTag,
  StackedShareBar, StatusTag,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useCreate, useList, useOne } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate, formatDateTime, formatMinutes } from "@/lib/format";
import { labelOf, statusOf, taskStatusSegments } from "@/lib/status";
import type { Artifact, Decision, MailLink, Meeting, Part, Partner, Project, Task } from "@/types/entities";
import { isOpen, meetingTitle, useStructure, useWorkPermissions } from "../task-detail/lib";
import { lazyDrawer } from "@/lib/lazyDrawer";

const TaskFormDrawer = lazyDrawer(() => import("../task-detail/TaskFormDrawer").then((m) => m.TaskFormDrawer));
const ProjectFormDrawer = lazyDrawer(() => import("../projects/ProjectFormDrawer").then((m) => m.ProjectFormDrawer));
import "../task-detail/work.css";

type ProjectRel = Project & { _rel?: { partner?: Partner | null } };
const TABS = ["overview", "tasks", "meetings", "docs", "decisions", "mail"] as const;

function PartDrawer({ open, onClose, projectId, people }: { open: boolean; onClose: () => void; projectId: string; people: { value: string; label: string }[] }) {
  const [form] = Form.useForm<{ name: string; lead_member_id: string }>();
  const { mutateAsync, mutation } = useCreate();
  const save = async () => {
    const v = await form.validateFields();
    await mutateAsync({ resource: "parts", values: { project_id: projectId, name: v.name.trim(), lead_member_id: v.lead_member_id, member_ids: [v.lead_member_id], sort_order: 99 }, successNotification: () => ({ type: "success", message: "파트를 더했어요" }) });
    form.resetFields();
    onClose();
  };
  return (
    <DetailDrawer open={open} onClose={onClose} title="파트 추가" footer={<Button type="primary" loading={mutation.isPending} onClick={() => void save().catch(() => undefined)}>추가하기</Button>}>
      <Form form={form} layout="vertical" className="wk-form" requiredMark={false}>
        <Form.Item name="name" label="파트 이름" rules={[{ required: true, message: "파트 이름을 적어 주세요" }]}><Input maxLength={30} placeholder="예: 교안" /></Form.Item>
        <Form.Item name="lead_member_id" label="파트 리드" rules={[{ required: true, message: "리드를 골라 주세요" }]}><Select showSearch optionFilterProp="label" options={people} /></Form.Item>
      </Form>
    </DetailDrawer>
  );
}

export default function Page() {
  const { projectId = "" } = useParams();
  const { persona, tenant, can } = useWorksite();
  const perms = useWorkPermissions();
  const st = useStructure();
  const [tabRaw] = useUrlParam("tab", "overview");
  const tab = (TABS as readonly string[]).includes(tabRaw) ? tabRaw : "overview";
  const [selected, setSelected] = useSelectedParam();
  const [partOpen, setPartOpen] = useState(false);

  const q = useOne<ProjectRel>({ resource: "projects", id: projectId, meta: { expand: ["partner"] }, queryOptions: { retry: false } });
  const project = q.result;
  const enabled = !!project;
  const parts = useList<Part>({ resource: "parts", filters: [{ field: "project_id", operator: "eq", value: projectId }], sorters: [{ field: "sort_order", order: "asc" }], pagination: { mode: "off" }, queryOptions: { enabled } });
  const tasks = useList<Task>({ resource: "tasks", filters: [{ field: "project_id", operator: "eq", value: projectId }], sorters: [{ field: "due_at", order: "asc" }], pagination: { mode: "off" }, queryOptions: { enabled } });
  const meetings = useList<Meeting>({ resource: "meetings", filters: [{ field: "project_ids", operator: "eq", value: projectId }], sorters: [{ field: "started_at", order: "desc" }], pagination: { mode: "off" }, queryOptions: { enabled } });
  const decisions = useList<Decision>({ resource: "decisions", filters: [{ field: "project_id", operator: "eq", value: projectId }], sorters: [{ field: "decided_at", order: "desc" }], pagination: { mode: "off" }, queryOptions: { enabled } });
  const mails = useList<MailLink>({ resource: "mail_links", filters: [{ field: "project_id", operator: "eq", value: projectId }, { field: "shared_to_project", operator: "eq", value: true }], sorters: [{ field: "received_at", order: "desc" }], pagination: { mode: "off" }, queryOptions: { enabled: enabled && tab === "mail" } });
  usePageReady(!q.query.isLoading);

  const taskList = tasks.result?.data ?? [];
  const counts = useMemo(() => ({
    todo: taskList.filter((t) => t.status === "todo").length,
    doing: taskList.filter((t) => t.status === "in_progress" || t.status === "changes_requested").length,
    review: taskList.filter((t) => t.status === "submitted").length,
    done: taskList.filter((t) => t.status === "done").length,
  }), [taskList]);

  const back = { label: "사업·프로젝트", to: "/projects" };
  if (q.query.isLoading) return <><PageHeader title="프로젝트 상세" back={back} /><Skeleton active paragraph={{ rows: 6 }} /></>;
  if (q.query.isError || !project) {
    const notFound = (q.query.error as { statusCode?: number } | null)?.statusCode === 404 || !project;
    return (
      <>
        <PageHeader title="프로젝트 상세" back={back} />
        {notFound ? <EmptyState kind="not_found" action={{ label: "사업·프로젝트로", to: "/projects" }} />
          : <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void q.query.refetch() }} />}
      </>
    );
  }

  const mineToEdit = perms.adminish || project.owner_member_id === persona.memberId || project.reviewer_member_id === persona.memberId;
  const canEdit = persona.role !== "member" && can("projects", "edit").can && mineToEdit;
  const canAddPart = perms.adminish || project.reviewer_member_id === persona.memberId;
  const line = st.lineById.get(project.business_line_id);
  const partner = project._rel?.partner;
  const peopleOptions = tenant.people.map((p) => ({ value: p.id, label: `${p.displayName} · ${p.jobTitle}` }));
  const partList = parts.result?.data ?? [];
  const nextDue = taskList.filter((t) => isOpen(t) && t.due_at).slice(0, 3);
  const meetingList = meetings.result?.data ?? [];
  const decisionList = decisions.result?.data ?? [];

  const tabs = [
    { key: "overview", label: "개요", to: "?tab=overview" },
    { key: "tasks", label: "업무", to: "?tab=tasks", badge: counts.todo + counts.doing + counts.review },
    { key: "meetings", label: "회의", to: "?tab=meetings" },
    { key: "docs", label: "문서", to: "?tab=docs" },
    { key: "decisions", label: "결정", to: "?tab=decisions" },
    { key: "mail", label: "메일", to: "?tab=mail" },
  ];

  return (
    <>
      <PageHeader
        title={project.name}
        back={back}
        meta={
          <div className="wk-meta">
            <StatusTag {...statusOf("projects.status", project.status)} />
            <StatusTag {...statusOf("projects.health", project.health)} />
            <SensitivityTag level={project.sensitivity} />
            <span className="wk-meta-text ws-tabular">{project.code} · {formatDate(project.start_on, false)} ~ {formatDate(project.due_on, false)}{line ? ` · ${line.name}` : ""}</span>
          </div>
        }
        actions={canEdit && <Button onClick={() => setSelected("edit")}>수정</Button>}
        tabs={tabs}
      />

      {tab === "overview" && (
        <CardGrid>
          <SectionCard span={8} title="요약">
            <p className="wk-body">{project.description || "설명이 없어요."}</p>
            <dl className="wk-kv" style={{ marginTop: 16 }}>
              <dt>별칭</dt>
              <dd>{project.aliases.length ? <span className="ws-row">{project.aliases.map((a) => <span key={a} className="ws-tag">{a}</span>)}</span> : "—"}</dd>
              <dt>거래처</dt>
              <dd>{partner ? <Link to={`/projects/partners/${partner.id}`}>{partner.name}</Link> : project.partner_id ? "볼 수 없는 거래처예요" : "—"}</dd>
            </dl>
            <Divider />
            <div className="ws-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <h3 className="wk-section-title" style={{ margin: 0 }}>파트</h3>
              {canAddPart && <Button className="ws-rowact" icon={<PlusOutlined />} onClick={() => setPartOpen(true)}>파트 추가</Button>}
            </div>
            <ListRows
              ariaLabel="파트"
              rows={partList.map((p) => ({
                key: p.id, title: p.name,
                subtitle: `리드 ${tenant.people.find((x) => x.id === p.lead_member_id)?.displayName ?? "—"}`,
                trailing: <span className="wk-caption">업무 {taskList.filter((t) => t.part_id === p.id && isOpen(t)).length}건</span>,
              }))}
              empty={<p className="wk-caption">파트 없이 진행하는 프로젝트예요.</p>}
            />
          </SectionCard>

          <SectionCard span={4} title="사람">
            <dl className="wk-kv">
              <dt>담당</dt><dd><PersonChip memberId={project.owner_member_id} size="sm" /></dd>
              <dt>검토자</dt><dd><PersonChip memberId={project.reviewer_member_id} size="sm" /></dd>
              <dt>구성원</dt><dd className="ws-tabular">{project.member_ids.length}명</dd>
            </dl>
            {partList.length > 0 && (
              <>
                <h3 className="wk-section-title" style={{ marginTop: 16 }}>파트 리드</h3>
                <div className="ws-row">{[...new Set(partList.map((p) => p.lead_member_id))].map((id) => <PersonChip key={id} memberId={id} size="sm" />)}</div>
              </>
            )}
            <Divider />
            <h3 className="wk-section-title">다음 마감</h3>
            <ListRows
              ariaLabel="다음 마감"
              rows={nextDue.map((t) => ({ key: t.id, title: t.title, subtitle: formatDate(t.due_at), to: `/work/tasks/${t.id}`, trailing: <DdayBadge date={t.due_at} /> }))}
              empty={<p className="wk-caption">다가오는 마감이 없어요.</p>}
            />
          </SectionCard>

          <SectionCard span={12} title="업무 상태" demo>
            {taskList.length ? (
              <StackedShareBar
                unit="건"
                ariaLabel="업무 상태 비중"
                height={14}
                // 홈 '팀 업무 현황'과 같은 상태 색(상태마다 고정 색, src/lib/status.ts)
                segments={taskStatusSegments((s) => taskList.filter((t) => t.status === s).length)}
              />
            ) : <EmptyState kind="empty" compact headingLevel={3} title="이 프로젝트에 붙은 업무가 없어요" />}
          </SectionCard>
        </CardGrid>
      )}

      {tab === "tasks" && (
        <>
          {perms.canCreateTask && (
            <div className="ws-toolbar wk-toolbar-end">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new-task")}>업무 만들기</Button>
            </div>
          )}
          <DataTable<Task>
            resource="tasks"
            ariaLabel="프로젝트 업무"
            syncWithLocation={false}
            filters={[{ field: "project_id", operator: "eq", value: project.id }]}
            sorters={[{ field: "due_at", order: "asc" }]}
            rowHref={(t) => `/work/tasks/${t.id}`}
            columns={[
              { key: "title", title: "업무명", kind: "name" },
              { key: "assignee_id", title: "담당", kind: "person" },
              { key: "reviewer_id", title: "검토자", kind: "person" },
              { key: "due_at", title: "마감", render: (t) => <span className="ws-row" style={{ flexWrap: "nowrap" }}><span className="ws-date">{formatDate(t.due_at, false)}</span><DdayBadge date={t.due_at} done={!isOpen(t)} /></span> },
              { key: "status", title: "상태", kind: "status", statusDomain: "tasks.status" },
            ]}
            mobileRow={(t) => ({ title: t.title, subtitle: formatDate(t.due_at, false), trailing: <StatusTag {...statusOf("tasks.status", t.status)} /> })}
            empty={{ kind: "empty", title: "이 프로젝트에 붙은 업무가 없어요", description: perms.canCreateTask ? "업무를 만들어 담당과 검토자를 정해 보세요." : undefined }}
          />
        </>
      )}

      {tab === "meetings" && (
        <SectionCard title="회의" ariaLabel="프로젝트 회의">
          {meetings.query.isLoading ? <Skeleton active paragraph={{ rows: 3 }} title={false} /> : (
            <ListRows
              ariaLabel="회의 목록"
              rows={meetingList.map((m) => ({
                key: m.id,
                title: `${m.title_prefix ? `${m.title_prefix} ` : ""}${meetingTitle(m)}`,
                subtitle: `${formatDateTime(m.started_at)} · ${formatMinutes(m.duration_min)} · 참석 ${m.attendee_ids.length}명`,
                to: `/meetings/${m.id}`,
                trailing: <StatusTag {...statusOf("meetings.status", m.status)} />,
              }))}
              empty={<EmptyState kind="empty" compact headingLevel={3} title="이 프로젝트에 붙은 회의가 없어요" />}
            />
          )}
        </SectionCard>
      )}

      {tab === "docs" && (
        <DataTable<Artifact>
          resource="artifacts"
          ariaLabel="프로젝트 문서"
          syncWithLocation={false}
          filters={[{ field: "project_id", operator: "eq", value: project.id }]}
          sorters={[{ field: "updated_at", order: "desc" }]}
          rowHref={(a) => `/docs/artifacts/${a.id}`}
          columns={[
            { key: "title", title: "문서", kind: "name" },
            { key: "doc_type", title: "종류", kind: "tag", statusDomain: "artifacts.doc_type" },
            { key: "current_version", title: "버전", render: (a) => <span className="ws-tabular">v{a.current_version}</span> },
            { key: "owner_id", title: "작성", kind: "person" },
            { key: "status", title: "상태", kind: "status", statusDomain: "artifacts.status" },
            { key: "updated_at", title: "고친 날", kind: "date" },
          ]}
          mobileRow={(a) => ({ title: a.title, subtitle: `${labelOf("artifacts.doc_type", a.doc_type)} · v${a.current_version}`, trailing: <StatusTag {...statusOf("artifacts.status", a.status)} /> })}
          empty={{ kind: "empty", title: "이 프로젝트에 붙은 문서가 없어요", description: "산출물이 등록되면 여기에 모여요." }}
        />
      )}

      {tab === "decisions" && (
        <SectionCard title="결정" more={{ label: "결정 모음", to: `/meetings/decisions?project=${project.id}` }}>
          {decisions.query.isLoading ? <Skeleton active paragraph={{ rows: 3 }} title={false} />
            : decisionList.length ? (
              <ol className="ws-timeline" aria-label="결정">
                {decisionList.map((d) => {
                  const s = statusOf("decisions.status", d.status);
                  return (
                    <li key={d.id} className="ws-tl">
                      <span className="ws-tl__dot" style={{ background: `var(--ws-${s.tone}-mark)` }} aria-hidden />
                      <div className="ws-tl__time">{formatDate(d.decided_at)}</div>
                      <div className="ws-tl__title">{d.statement} <StatusTag {...s} /></div>
                      <div className="wk-dec-links">
                        {d.decided_by_role && <span className="wk-caption">{d.decided_by_role}</span>}
                        <Link to={`/meetings/${d.meeting_id}?tab=decisions`}>회의 보기</Link>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : <EmptyState kind="empty" compact headingLevel={3} title="이 프로젝트에 붙은 결정이 없어요" />}
        </SectionCard>
      )}

      {tab === "mail" && (
        <SectionCard title="공유된 메일" caption="연동 미리보기예요. 메일 본문은 저장하지 않고 제목만 보여요.">
          {mails.query.isLoading ? <Skeleton active paragraph={{ rows: 3 }} title={false} /> : (
            <ListRows
              ariaLabel="공유된 메일"
              rows={(mails.result?.data ?? []).map((m) => ({ key: m.id, title: m.subject, subtitle: `${m.from_address} · ${formatDateTime(m.received_at)}` }))}
              empty={<EmptyState kind="empty" compact headingLevel={3} title="프로젝트에 공유된 메일이 없어요" description="메일 제안에서 프로젝트에 공유하면 여기에 보여요." />}
            />
          )}
        </SectionCard>
      )}

      <ProjectFormDrawer open={selected === "edit" && canEdit} onClose={() => setSelected(null)} project={project} />
      <TaskFormDrawer open={selected === "new-task" && perms.canCreateTask} onClose={() => setSelected(null)} projectId={project.id} goToDetail={false} />
      <PartDrawer open={partOpen} onClose={() => setPartOpen(false)} projectId={project.id} people={peopleOptions} />
    </>
  );
}
