// 감사 로그 `/admin/audit` · A-12 · 깊이 B · 모듈 audit-log · 소유: ara_settings 그룹(owner·admin만, member는 /me에서 자기 활동)
// 사람·AI 연결·시스템·CRATA 운영자가 바꾼 기록을 필터로 봅니다. 읽기만(수정·삭제 버튼 없음). ARA 개인 영역 이벤트는 남기지 않아 여기에 없어요.
// URL: ?range=7d|30d · ?actor=<actor_type> · ?res=<resource> · ?who=<member id> · ?selected=<기록 id> 서랍(바뀐 필드 전 → 후, request_id)
import { Link } from "react-router";
import { Button, Skeleton, Tooltip } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { DataTable, DetailDrawer, EmptyState, FilterBar, PageHeader, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useOne, type CrudFilter } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { formatDateTime } from "@/lib/format";
import { addDays, kstIso } from "@/lib/clock";
import { labelOf, optionsOf } from "@/lib/status";
import type { AuditEvent, ResourceName } from "@/types/entities";
import { AuditActor, Caption, KeyValue, actionLabel, changeSummary, fieldLabel, resourceLabel, targetPath, valueText } from "../admin-company/shared/lib";

const RESOURCE_FILTER: ResourceName[] = [
  "tasks", "submissions", "progress_logs", "artifacts", "notices", "meeting_segments", "kpi_values", "field_reports",
  "members", "role_assignments", "invitations", "position_role_maps", "mcp_connections", "mcp_policies", "tenant_settings",
];
const NAME_FIELD: Partial<Record<ResourceName, string>> = {
  tasks: "title", artifacts: "title", notices: "title", meetings: "title", members: "display_name", projects: "name", mcp_connections: "client_name",
};

/** 대상 이름(볼 수 있을 때만) + 열 수 있으면 링크 */
function TargetCell({ e }: { e: Pick<AuditEvent, "resource" | "resource_id"> }) {
  const field = NAME_FIELD[e.resource as ResourceName];
  const q = useOne<Record<string, unknown> & { id: string }>({
    resource: e.resource, id: e.resource_id ?? "",
    queryOptions: { enabled: !!field && !!e.resource_id, retry: false, staleTime: 60_000 },
    errorNotification: false,
  });
  const name = field && q.result ? String(q.result[field] ?? "") : "";
  const label = resourceLabel(e.resource);
  const href = targetPath(e.resource, e.resource_id);
  const text = name ? `${label} · ${name.length > 18 ? `${name.slice(0, 17)}…` : name}` : label;
  return href ? <Link to={href} onClick={(ev) => ev.stopPropagation()}>{text}</Link> : <span>{text}</span>;
}

function EventDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useOne<AuditEvent>({ resource: "audit_events", id: id ?? "", queryOptions: { enabled: !!id, retry: false }, errorNotification: false });
  const e = q.result;
  return (
    <DetailDrawer open={!!id} title="기록 자세히" onClose={onClose}>
      {q.query.isLoading ? <Skeleton active paragraph={{ rows: 6 }} title={false} />
        : q.query.isError || !e ? <EmptyState kind="not_found" />
        : (
          <div className="as-stack" style={{ gap: 20 }}>
            <KeyValue items={[
              ["시각", formatDateTime(e.at)],
              ["행위자", <AuditActor row={e} size="md" />],
              ["종류", labelOf("audit_events.actor_type", e.actor_type)],
              ["동작", actionLabel(e.action)],
              ["대상", <TargetCell e={e} />],
              ["요청 번호", <code className="as-code" translate="no">{e.request_id ?? "—"}</code>],
            ]} />
            <div>
              <div className="as-subhead">바뀐 필드</div>
              {e.changes && Object.keys(e.changes).length ? (
                <table className="as-perm" style={{ whiteSpace: "normal" }}>
                  <thead><tr><th scope="col">필드</th><th scope="col">전</th><th scope="col">후</th></tr></thead>
                  <tbody>
                    {Object.entries(e.changes).map(([k, [a, b]]) => (
                      <tr key={k}>
                        <th scope="row">{fieldLabel(k)}</th>
                        <td style={{ whiteSpace: "normal" }}>{valueText(k, a, e.resource)}</td>
                        <td style={{ whiteSpace: "normal" }}>{valueText(k, b, e.resource)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="as-caption">바뀐 필드 기록이 없어요.</p>}
              <Caption style={{ marginTop: 8 }}>메일·전화·금액은 기록할 때부터 "••• 가림"으로 남겨요. 접속 주소와 기기 정보는 데모에서 비워 둬요.</Caption>
            </div>
          </div>
        )}
    </DetailDrawer>
  );
}

export default function Page() {
  const { tenant, today, person } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const fbProps: FilterBarProps = {
    chips: [
      { param: "range", ariaLabel: "기간", allLabel: "전체 기간", options: [{ value: "7d", label: "최근 7일" }, { value: "30d", label: "최근 30일" }] },
      { param: "actor", field: "actor_type", ariaLabel: "행위자 종류", allLabel: "모든 행위자", options: optionsOf("audit_events.actor_type") },
    ],
    selects: [
      { param: "res", label: "대상", field: "resource", options: RESOURCE_FILTER.map((r) => ({ value: r, label: resourceLabel(r) })) },
      { param: "who", label: "행위자", field: "actor_id", options: tenant.people.map((p) => ({ value: p.id, label: p.displayName })) },
    ],
  };
  const fb = useFilterBarState(fbProps);
  const range = fb.values.range;
  const filters: CrudFilter[] = [...fb.filters];
  if (range === "7d" || range === "30d") filters.push({ field: "at", operator: "gte", value: kstIso(addDays(today, range === "7d" ? -6 : -29), "00:00") });

  return (
    <>
      <PageHeader
        title="감사 로그"
        description="누가 언제 무엇을 바꿨는지 남겨요. 아무도 고치거나 지울 수 없어요."
        actions={<Tooltip title="준비 중이에요"><span tabIndex={0}><Button icon={<ExportOutlined aria-hidden />} disabled>내보내기</Button></span></Tooltip>}
      />
      <FilterBar {...fbProps} />
      <DataTable<AuditEvent>
        resource="audit_events"
        ariaLabel="감사 기록"
        filters={filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "at", order: "desc" }]}
        pageSize={20}
        onRowClick={(e) => setSelected(e.id)}
        columns={[
          { key: "at", title: "시각", kind: "datetime" },
          { key: "actor_id", title: "행위자", width: 200, render: (e) => <AuditActor row={e} /> },
          { key: "actor_type", title: "종류", kind: "tag", statusDomain: "audit_events.actor_type" },
          { key: "action", title: "동작", render: (e) => <b>{actionLabel(e.action)}</b> },
          { key: "resource", title: "대상", render: (e) => <TargetCell e={e} /> },
          { key: "changes", title: "바뀐 내용", flex: true, render: (e) => <span style={{ display: "block", whiteSpace: "normal" }}>{changeSummary(e)}</span> },
        ]}
        mobileRow={(e) => ({
          title: `${resourceLabel(e.resource)} ${actionLabel(e.action)}`,
          subtitle: `${e.actor_type === "member" ? person(e.actor_id)?.displayName ?? "구성원" : e.actor_type === "ai_connection" ? `AI 연결 · ${e.actor_client ?? ""}` : labelOf("audit_events.actor_type", e.actor_type)} · ${formatDateTime(e.at)}`,
        })}
        empty={{ kind: "empty", title: "아직 남은 기록이 없어요", description: "무언가 바뀌면 여기에 쌓여요." }}
      />
      <Caption style={{ marginTop: 12 }}>ARA 개인 영역(대화·카드 문장·동의)은 회사 기록에 남기지 않아요. 기록은 예시 데이터예요.</Caption>
      <EventDrawer id={selected || null} onClose={() => setSelected(null)} />
    </>
  );
}
