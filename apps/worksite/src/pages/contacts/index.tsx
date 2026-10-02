// 담당자 `/projects/contacts` · I-03 · 깊이 B · 모듈 partners · 소유: industry 그룹
// CRM 라이트의 Contacts: 거래처 담당자 연락처(가상). 개인정보(L1)라 내보내기는 owner·admin만(데모에서는 준비 중).
import { useMemo } from "react";
import { Button } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import { CopyField, DataTable, DetailDrawer, EmptyState, FilterBar, PageHeader, SensitivityTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { labelOf, optionsOf } from "@/lib/status";
import type { CrudFilter } from "@/lib/refine";
import type { Partner, PartnerContact } from "@/types/entities";
import { asRow, useIndex, usePatchParams, useRows } from "../ops-home/kit/data";
import { ExportButton, Kv } from "../ops-home/kit/ui";
import { ContactFormDrawer } from "./ContactFormDrawer";
import "../ops-home/kit/industry.css";

export default function Page() {
  const { can } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const [mode, setMode] = useUrlParam("mode");
  const patch = usePatchParams();
  const canCreate = can("partners", "create").can;
  const partners = useRows<Partner>("partners", { sorters: [{ field: "name", order: "asc" }] });
  const partnerById = useIndex(partners.rows);

  const fbProps: FilterBarProps = {
    search: { placeholder: "이름·부서·메일 검색", fields: ["name", "dept", "title", "email"] },
    chips: [{ param: "kind", options: optionsOf("partners.kind"), ariaLabel: "거래처 종류" }],
    selects: [{ param: "partner", label: "거래처", field: "partner_id", options: partners.rows.map((p) => ({ value: p.id, label: p.name })) }],
  };
  const fb = useFilterBarState(fbProps);
  const kind = fb.values.kind;
  const filters = useMemo<CrudFilter[]>(() => {
    if (!kind) return fb.filters;
    const ids = partners.rows.filter((p) => p.kind === kind).map((p) => p.id);
    return [...fb.filters, { field: "partner_id", operator: "in", value: ids.length ? ids : ["__none__"] }];
  }, [fb.filters, kind, partners.rows]);

  const contactQ = useRows<PartnerContact>("partner_contacts", { enabled: !!selected && selected !== "new" });
  const current = selected && selected !== "new" ? contactQ.rows.find((c) => c.id === selected) ?? null : null;
  const editing = mode === "edit" && !!current;
  const partnerName = (id: string) => partnerById.get(id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title="담당자"
        description="거래처 담당자 연락처예요. 모두 가상 이름과 주소예요."
        meta={<SensitivityTag level="L1" />}
        actions={
          <div className="ws-row">
            <ExportButton />
            {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>담당자 추가</Button>}
          </div>
        }
      />
      <FilterBar {...fbProps} />
      <DataTable<PartnerContact>
        resource="partner_contacts"
        ariaLabel="거래처 담당자 목록"
        filters={filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "name", order: "asc" }]}
        onRowClick={(c) => setSelected(c.id)}
        columns={[
          { key: "name", title: "이름", kind: "name" },
          { key: "partner_id", title: "거래처", render: (c) => <Link className="in-link" to={`/projects/partners/${c.partner_id}`}>{partnerName(c.partner_id)}</Link> },
          { key: "dept", title: "부서" },
          { key: "title", title: "직함" },
          { key: "email", title: "메일", render: (c) => <CopyField value={c.email} label="메일 주소" />, width: 260 },
          { key: "phone", title: "전화", render: (c) => (c.phone ? <CopyField value={c.phone} label="전화번호" /> : "—"), width: 180 },
          { key: "is_primary", title: "주 담당", render: (c) => (c.is_primary ? <span className="ws-tag ws-tag--brand">주 담당</span> : "—") },
        ]}
        mobileRow={(c) => ({
          title: c.name,
          subtitle: [partnerName(c.partner_id), c.dept, c.title].filter(Boolean).join(" · "),
          trailing: c.is_primary ? <span className="ws-tag ws-tag--brand">주 담당</span> : undefined,
        })}
        empty={{
          kind: "empty",
          title: "등록된 담당자가 없어요",
          description: canCreate ? "거래처 담당자를 추가하면 연락처를 한곳에서 찾을 수 있어요." : "검토자가 담당자를 추가하면 여기에 보여요.",
          action: canCreate ? { label: "담당자 추가하기", onClick: () => setSelected("new") } : undefined,
        }}
      />

      <DetailDrawer
        open={!!selected && selected !== "new" && !editing}
        onClose={() => setSelected(null)}
        title={current?.name ?? "담당자"}
        footer={current && can("partner_contacts", "edit", asRow(current)).can ? <Button icon={<EditOutlined />} onClick={() => setMode("edit")}>수정하기</Button> : undefined}
      >
        {contactQ.isLoading ? null : current ? (
          <div className="in-stack">
            <Kv rows={[
              ["거래처", <Link className="in-link" to={`/projects/partners/${current.partner_id}`}>{partnerName(current.partner_id)}</Link>],
              ["거래처 종류", partnerById.get(current.partner_id) ? labelOf("partners.kind", partnerById.get(current.partner_id)!.kind) : null],
              ["부서", current.dept],
              ["직함", current.title],
              ["메일", <CopyField value={current.email} label="메일 주소" />],
              ["전화", current.phone ? <CopyField value={current.phone} label="전화번호" /> : null],
              ["주 담당", current.is_primary ? "예" : "아니요"],
            ]} />
            <p className="in-caption">개인정보(L1)예요. 업무 연락에만 써 주세요.</p>
          </div>
        ) : (
          <EmptyState kind="not_found" compact />
        )}
      </DetailDrawer>

      <ContactFormDrawer
        open={selected === "new" || editing}
        onClose={() => (selected === "new" ? patch({ selected: null, mode: null }) : setMode(null))}
        contact={editing ? current : null}
        partners={partners.rows}
      />
    </>
  );
}
