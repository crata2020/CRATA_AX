// 거래처 `/projects/partners` · I-01 · 깊이 A · 모듈 partners · 소유: industry 그룹
// CRM 라이트의 Companies: 고객사·공급사·외주처·기관을 찾고 프로젝트·거래와 잇습니다. 모든 거래처는 가상입니다.
import { useMemo } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { DataTable, FilterBar, PageHeader, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useSelectedParam } from "@/lib/url";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Partner, PartnerContact, Project } from "@/types/entities";
import { useRows } from "../ops-home/kit/data";
import { ExportButton } from "../ops-home/kit/ui";
import { PartnerFormDrawer } from "./PartnerFormDrawer";
import "../ops-home/kit/industry.css";

export default function Page() {
  const { can, tenant, person } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const canCreate = can("partners", "create").can;

  const fbProps: FilterBarProps = {
    search: { placeholder: "거래처 이름 검색", fields: ["name"] },
    chips: [{ param: "kind", field: "kind", options: optionsOf("partners.kind"), ariaLabel: "거래처 종류" }],
    selects: [
      { param: "status", label: "상태", field: "status", options: optionsOf("partners.status") },
      { param: "owner", label: "담당", field: "owner_member_id", options: tenant.people.map((p) => ({ value: p.id, label: p.displayName })) },
    ],
  };
  const fb = useFilterBarState(fbProps);

  const contacts = useRows<PartnerContact>("partner_contacts");
  const projects = useRows<Project>("projects");
  const contactCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contacts.rows) m.set(c.partner_id, (m.get(c.partner_id) ?? 0) + 1);
    return m;
  }, [contacts.rows]);
  const projectCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects.rows) if (p.partner_id && p.status !== "done") m.set(p.partner_id, (m.get(p.partner_id) ?? 0) + 1);
    return m;
  }, [projects.rows]);

  return (
    <>
      <PageHeader
        title="거래처"
        description="모든 거래처는 가상이에요. 거래처를 누르면 담당자·프로젝트·거래를 함께 볼 수 있어요."
        actions={
          <div className="ws-row">
            <ExportButton />
            {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>거래처 등록</Button>}
          </div>
        }
      />
      <FilterBar {...fbProps} />
      <DataTable<Partner>
        resource="partners"
        ariaLabel="거래처 목록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "name", order: "asc" }]}
        rowHref={(p) => `/projects/partners/${p.id}`}
        columns={[
          { key: "name", title: "거래처명", kind: "name" },
          { key: "kind", title: "종류", render: (p) => <span className="ws-tag">{labelOf("partners.kind", p.kind)}</span> },
          { key: "status", title: "상태", kind: "status", statusDomain: "partners.status" },
          { key: "owner_member_id", title: "담당", kind: "person" },
          { key: "projects", title: "진행 프로젝트", render: (p) => <span className="in-num">{projectCount.get(p.id) ?? 0}개</span> },
          { key: "contacts", title: "담당자 수", render: (p) => <span className="in-num">{contactCount.get(p.id) ?? 0}명</span> },
          { key: "tags", title: "태그", kind: "tag" },
        ]}
        mobileRow={(p) => ({
          title: p.name,
          subtitle: `${labelOf("partners.kind", p.kind)} · 담당 ${person(p.owner_member_id)?.displayName ?? "—"} · 담당자 ${contactCount.get(p.id) ?? 0}명`,
          trailing: <StatusTag {...statusOf("partners.status", p.status)} />,
        })}
        empty={{
          kind: "empty",
          title: "등록된 거래처가 없어요",
          description: canCreate ? "거래처를 등록하면 프로젝트·거래와 이어져요." : "검토자가 거래처를 등록하면 여기에 보여요.",
          action: canCreate ? { label: "거래처 등록하기", onClick: () => setSelected("new") } : undefined,
        }}
      />
      <PartnerFormDrawer open={selected === "new"} onClose={() => setSelected(null)} />
    </>
  );
}
