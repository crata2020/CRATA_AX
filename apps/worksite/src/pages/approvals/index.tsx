// 결재 `/company/approvals` · C-11 · 깊이 B · 모듈 approvals · 소유: collab 그룹
// 연동 미리보기: 그룹웨어 결재의 "내가 결재할 문서"(?tab=todo)와 "내가 올린 문서"(?tab=mine)를 상태와 링크로만 보여 줍니다.
// 서랍(?selected=<id>)에서 결재선을 단계로 보여 줘요(데모는 조직도 기준 예시 결재선). admin만 연동 설정 카드.
import { Link, useSearchParams } from "react-router";
import { Button } from "antd";
import { CheckOutlined, ClockCircleOutlined, CloseOutlined, MinusOutlined, RollbackOutlined, EditOutlined } from "@ant-design/icons";
import { Banner, CardGrid, DataTable, DemoOnlyLink, DetailDrawer, FilterBar, PageHeader, PersonChip, SectionCard, StatusTag, useFilterBarState, type FilterBarProps, DisabledAction } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useOne } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { formatDate, formatDateTime } from "@/lib/format";
import { optionsOf, statusOf } from "@/lib/status";
import type { ApprovalLink } from "@/types/entities";
import type { TenantConfig } from "@/tenants/types";
import { Caption, KeyValue } from "../docs/shared/lib";

type Tab = "todo" | "done" | "mine";
type StepState = "done" | "current" | "waiting" | "rejected" | "withdrawn" | "skipped";
interface Step { memberId: string; role: string; state: StepState; at?: string | null }

const STEP_VIEW: Record<StepState, { tone: "good" | "info" | "serious" | "neutral"; label: string; icon: React.ReactNode }> = {
  done: { tone: "good", label: "승인", icon: <CheckOutlined /> },
  current: { tone: "info", label: "결재 중", icon: <ClockCircleOutlined /> },
  waiting: { tone: "neutral", label: "대기", icon: <MinusOutlined /> },
  rejected: { tone: "serious", label: "반려", icon: <CloseOutlined /> },
  withdrawn: { tone: "neutral", label: "회수", icon: <RollbackOutlined /> },
  skipped: { tone: "neutral", label: "진행 안 함", icon: <MinusOutlined /> },
};

/** 조직도를 따라 올라가며 책임자를 모은 예시 결재선(기안자 제외). 현재 결재자가 없으면 그 앞에 넣음 */
function approvalLine(tenant: TenantConfig, a: ApprovalLink): Step[] {
  const unitOf = (id: string) => tenant.people.find((p) => p.id === id)?.unitId;
  const chain: string[] = [];
  let unit = tenant.orgUnits.find((u) => u.id === unitOf(a.requester_id));
  while (unit) {
    if (unit.headMemberId && unit.headMemberId !== a.requester_id && !chain.includes(unit.headMemberId)) chain.push(unit.headMemberId);
    unit = unit.parentId ? tenant.orgUnits.find((u) => u.id === unit!.parentId) : undefined;
  }
  if (a.current_approver_id && !chain.includes(a.current_approver_id)) chain.splice(Math.max(0, chain.length - 1), 0, a.current_approver_id);
  const curIdx = a.current_approver_id ? chain.indexOf(a.current_approver_id) : -1;
  const steps: Step[] = [{ memberId: a.requester_id, role: "기안", state: a.status === "withdrawn" ? "withdrawn" : "done", at: a.submitted_at }];
  chain.forEach((m, i) => {
    const role = i === chain.length - 1 ? "최종 결재" : "결재";
    let state: StepState;
    if (a.status === "approved") state = "done";
    else if (a.status === "withdrawn") state = "skipped";
    else if (a.status === "rejected") state = i < curIdx ? "done" : i === curIdx ? "rejected" : "skipped";
    else state = i < curIdx ? "done" : i === curIdx ? "current" : "waiting";
    steps.push({ memberId: m, role, state, at: (state === "done" && a.status === "approved" && i === chain.length - 1) || state === "rejected" ? a.completed_at : null });
  });
  return steps;
}

function ApprovalSteps({ steps }: { steps: Step[] }) {
  return (
    <ol className="cb-steps" aria-label="결재선">
      {steps.map((s, i) => {
        const v = s.role === "기안" && s.state === "done" ? { tone: "good" as const, label: "올림", icon: <EditOutlined /> } : STEP_VIEW[s.state];
        return (
          <li key={`${s.memberId}-${i}`} className="cb-step">
            <span className="cb-step__mark" data-tone={v.tone} aria-hidden>{v.icon}</span>
            <div className="cb-step__body">
              <span className="cb-step__role">{i + 1}단계 · {s.role}</span>
              <span className="ws-row"><PersonChip memberId={s.memberId} size="sm" /><StatusTag tone={v.tone} label={v.label} /></span>
              {s.at && <span className="cb-caption">{formatDateTime(s.at)}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Page() {
  const { persona, tenant, can } = useWorksite();
  const [params] = useSearchParams();
  const [selected, setSelected] = useSelectedParam();
  const rawTab = params.get("tab");
  const tab: Tab = rawTab === "mine" || rawTab === "done" ? rawTab : "todo";
  const me = persona.memberId;
  const admin = can("approval_links", "delete").can;

  const fbProps: FilterBarProps = {
    search: { placeholder: "문서 검색", fields: ["title", "doc_no", "form_name"] },
    // '내가 결재할 문서'는 결재 차례인 것(진행 중)만이라 상태 칩이 없어요(탭 숫자 = 줄 수)
    chips: tab === "todo" ? [] : [{ param: "astatus", field: "status", options: optionsOf("approval_links.status").filter((o) => tab === "mine" || o.value !== "pending"), multiple: true, ariaLabel: "상태" }],
  };
  const fb = useFilterBarState(fbProps);
  const todoQ = useList<ApprovalLink>({ resource: "approval_links", pagination: { mode: "off" }, filters: [{ field: "current_approver_id", operator: "eq", value: me }, { field: "status", operator: "eq", value: "pending" }] });
  const pendingCount = todoQ.result?.data.length ?? 0;
  const cur = useOne<ApprovalLink>({ resource: "approval_links", id: selected ?? "", queryOptions: { enabled: !!selected, retry: false } }).result;

  const relatedCell = (a: ApprovalLink) => (a.related_type === "task" && a.related_id
    ? <Link to={`/work/tasks/${a.related_id}`} onClick={(e) => e.stopPropagation()}>업무 보기</Link>
    : a.related_type === "project" && a.related_id ? <Link to={`/projects/${a.related_id}`} onClick={(e) => e.stopPropagation()}>프로젝트 보기</Link> : <span className="ws-muted">—</span>);
  const openOriginal = <DemoOnlyLink size="small" label="원문 열기" hint="결재 원본은 쓰시던 결재 시스템에 있어요. 결재 시스템을 연결하면 여기서 바로 열려요." />;

  return (
    <>
      <PageHeader
        title="결재"
        description="결재는 결재 시스템에서 하고, 여기서는 업무 옆에서 진행 상황만 봐요."
        tabs={[
          { key: "todo", label: "내가 결재할 문서", to: "?tab=todo", badge: pendingCount },
          { key: "done", label: "처리함", to: "?tab=done" },
          { key: "mine", label: "내가 올린 문서", to: "?tab=mine" },
        ]}
      />
      <Banner title="연동 미리보기">결재 원본은 결재 시스템에 있어요. 여기서는 상태와 링크만 보여요.</Banner>
      <FilterBar {...fbProps} />
      <DataTable<ApprovalLink>
        key={tab}
        syncWithLocation={false}
        resource="approval_links"
        ariaLabel={tab === "todo" ? "내가 결재할 문서" : tab === "done" ? "내가 처리한 문서" : "내가 올린 문서"}
        filters={[
          ...(tab === "mine" ? [{ field: "requester_id", operator: "eq" as const, value: me }] : [{ field: "current_approver_id", operator: "eq" as const, value: me }]),
          ...(tab === "todo" ? [{ field: "status", operator: "eq" as const, value: "pending" }] : tab === "done" ? [{ field: "status", operator: "ne" as const, value: "pending" }] : []),
          ...fb.filters,
        ]}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "submitted_at", order: "desc" }]}
        onRowClick={(a) => setSelected(a.id)}
        columns={[
          { key: "title", title: "문서 제목", kind: "name" },
          { key: "form_name", title: "양식" },
          { key: "doc_no", title: "문서 번호", render: (a) => <span className="cb-tabular">{a.doc_no}</span> },
          { key: "requester_id", title: "기안자", kind: "person" },
          { key: "current_approver_id", title: "현재 결재자", render: (a) => (a.current_approver_id && a.status === "pending" ? <PersonChip memberId={a.current_approver_id} size="sm" /> : <span className="ws-muted">—</span>) },
          { key: "status", title: "상태", kind: "status", statusDomain: "approval_links.status" },
          { key: "submitted_at", title: "올린 날", render: (a) => <span className="cb-tabular cb-nowrap">{formatDate(a.submitted_at, false)}</span> },
          { key: "related", title: "연결", render: relatedCell },
          { key: "open", title: "원문", render: () => openOriginal },
        ]}
        mobileRow={(a) => ({
          title: a.title,
          subtitle: `${a.form_name} · ${a.doc_no} · ${formatDate(a.submitted_at, false)}`,
          trailing: <StatusTag {...statusOf("approval_links.status", a.status)} />,
        })}
        empty={tab === "todo"
          ? { kind: "empty", title: "결재할 문서가 없어요", description: "결재 차례가 오면 여기에 보여요." }
          : tab === "done" ? { kind: "empty", title: "처리한 문서가 없어요", description: "승인하거나 반려한 문서가 여기에 남아요." }
          : { kind: "empty", title: "올린 문서가 없어요", description: "결재 시스템에서 올린 문서가 여기에 이어져요." }}
      />
      {admin && (
        <CardGrid className="cb-gap-top">
          <SectionCard title="연동 설정" span={12} caption="실제 연결은 2단계에서 해요. 연결해도 결재 원본과 첨부는 가져오지 않아요.">
            <div className="cb-row" style={{ padding: 0 }}>
              <div className="cb-row__main">
                <KeyValue items={[["결재 시스템", "예시 결재 시스템"], ["상태", <StatusTag tone="neutral" label="미연결" />], ["가져오는 것", "문서 제목·양식·번호·상태·결재자·링크"]]} />
              </div>
              <div className="cb-row__actions">
                <DisabledAction label="연결하기" reason={"결재 시스템 연결은 2단계에서 열려요"}><Button disabled>연결하기</Button></DisabledAction>
              </div>
            </div>
          </SectionCard>
        </CardGrid>
      )}

      <DetailDrawer
        open={!!cur}
        title={cur?.title ?? "결재 문서"}
        onClose={() => setSelected(null)}
        extra={cur ? <StatusTag {...statusOf("approval_links.status", cur.status)} /> : undefined}
        footer={openOriginal}
      >
        {cur && (
          <>
            <section className="cb-drawer-section">
              <KeyValue
                items={[
                  ["양식", cur.form_name],
                  ["문서 번호", cur.doc_no],
                  ["결재 시스템", cur.system],
                  ["올린 날", formatDateTime(cur.submitted_at)],
                  ["끝난 날", cur.completed_at ? formatDateTime(cur.completed_at) : "진행 중"],
                  ["연결", relatedCell(cur)],
                ]}
              />
            </section>
            <section className="cb-drawer-section">
              <h3>결재선</h3>
              <ApprovalSteps steps={approvalLine(tenant, cur)} />
              <Caption style={{ marginTop: 12 }}>결재선은 결재 시스템 기준이에요. 데모는 조직도를 따라 만든 예시예요.</Caption>
            </section>
          </>
        )}
      </DetailDrawer>
    </>
  );
}
