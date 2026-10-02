// 기준정보 `/ops/master` · I-17 · 깊이 B · 모듈 mfg-master-data · TR 전용 · 소유: industry 그룹
// 탭: 품목 | 공정 | 재질. 제품 카테고리·재질·공정 이름은 공개 자료이고, 품번·치수·선경은 예시예요.
// 고객 품번(L2)은 owner·admin·reviewer에게만 보이고 구성원에게는 "—"(공급자가 지워서 보냄). 품목 상태 바꾸기는 검토자 이상.
import { useMemo } from "react";
import { Button, Tooltip } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { DataTable, DetailDrawer, Divider, EmptyState, FilterBar, ListRows, PageHeader, SensitivityTag, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useUpdate } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import type { Bom, Item, MaterialGrade, ProcessStep } from "@/types/entities";
import { asRow, useIndex, useRows } from "../ops-home/kit/data";
import { FORM_LABEL, ITEM_KIND_LABEL, ITEM_KIND_SHORT, MESH_LABEL, itemStatus } from "../ops-home/kit/labels";
import { Kv, Material } from "../ops-home/kit/ui";
import "../ops-home/kit/industry.css";

export default function Page() {
  const [tab] = useUrlParam("tab", "items");
  return (
    <>
      <PageHeader
        title="기준정보"
        description="제품 카테고리·재질·공정 이름은 공개 자료, 품번·치수는 예시예요."
        tabs={[{ key: "items", label: "품목", to: "?tab=items" }, { key: "steps", label: "공정", to: "?tab=steps" }, { key: "grades", label: "재질", to: "?tab=grades" }]}
      />
      {tab === "steps" ? <Steps /> : tab === "grades" ? <Grades /> : <Items />}
    </>
  );
}

function Items() {
  const { can, persona } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const all = useRows<Item>("items");
  const grades = useRows<MaterialGrade>("material_grades");
  const boms = useRows<Bom>("boms", { enabled: !!selected });
  usePageReady(!all.isLoading);
  const itemById = useIndex(all.rows);
  const categories = useMemo(() => [...new Set(all.rows.map((i) => i.application_category).filter((x): x is string => !!x))].sort(), [all.rows]);
  const fbProps: FilterBarProps = {
    search: { placeholder: "품번·품목명 검색", fields: ["item_no", "name", "customer_part_no"] },
    chips: [{ param: "kind", field: "kind", options: Object.entries(ITEM_KIND_LABEL).map(([value, label]) => ({ value, label })), ariaLabel: "종류" }],
    selects: [
      { param: "grade", label: "재질", field: "material_grade", options: grades.rows.map((g) => ({ value: g.code, label: g.label })) },
      { param: "cat", label: "적용 카테고리", field: "application_category", options: categories.map((c) => ({ value: c, label: c })) },
    ],
  };
  const fb = useFilterBarState(fbProps);
  const cur = selected ? itemById.get(selected) ?? null : null;
  const canEdit = cur ? can("items", "edit", asRow(cur)).can && persona.role !== "member" : false;
  const { mutateAsync: update, mutation } = useUpdate<Item>();
  const custNo = (i: Item) => (i.customer_part_no ? <span className="in-row"><span className="in-num">{i.customer_part_no}</span><SensitivityTag level="L2" /></span> : "—");
  // 표 칸: 고객 품번 옆 자물쇠 아이콘만(태그가 줄을 늘리지 않게). 뜻은 툴팁·화면 읽기 글자로
  const custNoCell = (i: Item) => (i.customer_part_no ? (
    <Tooltip title="고객 비밀(L2) · 국내에서만 처리해요">
      <span className="in-row" style={{ flexWrap: "nowrap", gap: 6 }}>
        <LockOutlined aria-hidden style={{ color: "var(--ws-ink-2)" }} />
        <span className="in-num ws-nowrap">{i.customer_part_no}</span>
        <span className="ws-sr-only"> · 고객 비밀</span>
      </span>
    </Tooltip>
  ) : "—");
  const gradeLabel = (code: string) => grades.rows.find((g) => g.code === code)?.label;
  const parents = cur ? boms.rows.filter((b) => b.child_item_id === cur.id) : [];
  const children = cur ? boms.rows.filter((b) => b.parent_item_id === cur.id) : [];

  return (
    <>
      <FilterBar {...fbProps} />
      {persona.role === "member" && <p className="in-caption in-mb">고객 품번은 고객 비밀(L2)이라 검토자 이상에게만 보여요.</p>}
      <DataTable<Item>
        resource="items"
        ariaLabel="품목"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "item_no", order: "asc" }]}
        onRowClick={(i) => setSelected(i.id)}
        columns={[
          { key: "item_no", title: "품번", kind: "name", width: 160 },
          { key: "name", title: "품목명", flex: true },
          { key: "kind", title: "종류", width: 104, render: (i) => <span className="ws-nowrap" title={ITEM_KIND_LABEL[i.kind] ?? i.kind}>{ITEM_KIND_SHORT[i.kind] ?? i.kind}</span> },
          { key: "material_grade", title: "재질", width: 190, render: (i) => <Material code={i.material_grade} label={gradeLabel(i.material_grade)} /> },
          { key: "mesh_grade", title: "메시", width: 96, low: true, render: (i) => (i.mesh_grade ? `${MESH_LABEL[i.mesh_grade] ?? i.mesh_grade}(${i.mesh_grade})` : "—") },
          { key: "application_category", title: "적용 카테고리", width: 152, render: (i) => <span className="ws-ellipsis" title={i.application_category ?? undefined}>{i.application_category ?? "—"}</span> },
          { key: "customer_part_no", title: "고객 품번", width: 172, render: custNoCell },
          { key: "status", title: "상태", width: 112, render: (i) => <StatusTag {...itemStatus(i.status)} /> },
        ]}
        mobileRow={(i) => ({ title: `${i.item_no} · ${i.name}`, subtitle: `${ITEM_KIND_LABEL[i.kind]} · ${gradeLabel(i.material_grade) ?? i.material_grade}${i.application_category ? ` · ${i.application_category}` : ""}`, trailing: <StatusTag {...itemStatus(i.status)} /> })}
        empty={{ kind: "empty", title: "등록된 품목이 없어요", description: "진단 후 품목·품번 체계를 정하면 여기에 채워요." }}
      />
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={cur ? `${cur.item_no} ${cur.name}` : "품목"}
        extra={cur ? <StatusTag {...itemStatus(cur.status)} /> : undefined}
        footer={cur && canEdit ? (
          <Button loading={mutation.isPending} onClick={async () => { await update({ resource: "items", id: cur.id, values: { status: cur.status === "active" ? "inactive" : "active" }, successNotification: () => ({ type: "success", message: cur.status === "active" ? "품목을 사용 안 함으로 바꿨어요" : "품목을 다시 쓰도록 바꿨어요" }) }); }}>
            {cur.status === "active" ? "사용 안 함으로 바꾸기" : "다시 쓰기"}
          </Button>
        ) : undefined}
      >
        {cur ? (
          <div className="in-stack">
            <Kv rows={[
              ["종류", ITEM_KIND_LABEL[cur.kind]],
              ["재질", <Material code={cur.material_grade} label={gradeLabel(cur.material_grade)} />],
              ["규격", cur.spec],
              ["선경", cur.wire_dia_mm != null ? `${cur.wire_dia_mm}mm` : null],
              ["메시", cur.mesh_grade ? `${MESH_LABEL[cur.mesh_grade] ?? cur.mesh_grade}(${cur.mesh_grade})` : null],
              ["편조 폭", cur.knit_width_mm != null ? `${cur.knit_width_mm}mm` : null],
              ["가공", cur.form_process ? FORM_LABEL[cur.form_process] : null],
              ["적용 카테고리", cur.application_category],
              ["특별 특성", cur.special_char ? "지정(LOT·검사 기록 엄격, 가설)" : "없음"],
              ["단위", cur.unit],
              ["고객 품번", custNo(cur)],
            ]} />
            {(parents.length > 0 || children.length > 0) && <Divider />}
            {children.length > 0 && (
              <>
                <h3 className="in-sub--sm">들어가는 것(BOM)</h3>
                <ListRows ariaLabel="하위 품목" rows={children.map((b) => ({ key: b.id, title: itemById.get(b.child_item_id)?.name ?? "—", subtitle: `${itemById.get(b.child_item_id)?.item_no ?? ""} · 1${cur.unit === "개" ? "개" : cur.unit}당 ${b.qty_per}${b.unit}`, onClick: () => setSelected(b.child_item_id) }))} />
              </>
            )}
            {parents.length > 0 && (
              <>
                <h3 className="in-sub--sm">쓰이는 곳</h3>
                <ListRows ariaLabel="상위 품목" rows={parents.map((b) => ({ key: b.id, title: itemById.get(b.parent_item_id)?.name ?? "—", subtitle: itemById.get(b.parent_item_id)?.item_no, onClick: () => setSelected(b.parent_item_id) }))} />
              </>
            )}
            <p className="in-caption">품번·치수·선경은 예시예요. 진단 후 실제 기준으로 바꿔요.</p>
          </div>
        ) : all.isLoading ? null : <EmptyState kind="not_found" compact />}
      </DetailDrawer>
    </>
  );
}

function Steps() {
  usePageReady(true);
  return (
    <DataTable<ProcessStep>
      resource="process_steps"
      ariaLabel="공정"
      syncWithLocation={false}
      sorters={[{ field: "sequence", order: "asc" }]}
      columns={[
        { key: "sequence", title: "순서", kind: "number" },
        { key: "code", title: "코드" },
        { key: "name", title: "공정", flex: true, render: (s) => <span className="in-row"><span className="ws-cell-name">{s.name}</span>{s.hypothesis && <span className="ws-tag">가설</span>}</span> },
        { key: "equipment_kind", title: "설비 종류", render: (s) => s.equipment_kind ?? "—" },
        { key: "fml", title: "초중종물 대상", render: (s) => (s.inspection_points.includes("초중종물") ? <StatusTag tone="info" label="대상" /> : "—") },
        { key: "points", title: "확인 항목", render: (s) => s.inspection_points.filter((p) => p !== "초중종물").join(" · ") || "—" },
        { key: "std_cycle_note", title: "메모", render: (s) => s.std_cycle_note ?? "—" },
      ]}
      mobileRow={(s) => ({ title: `${s.sequence}. ${s.name}${s.hypothesis ? "(가설)" : ""}`, subtitle: `${s.code} · ${s.equipment_kind ?? "설비 없음"}`, trailing: s.inspection_points.includes("초중종물") ? <StatusTag tone="info" label="초중종물" /> : undefined })}
      empty={{ kind: "empty", title: "등록된 공정이 없어요" }}
    />
  );
}

function Grades() {
  return (
    <>
      <p className="in-caption in-mb">재질은 늘 코드 글자와 색 견본을 같이 써요. 색만으로 구별하지 않아요.</p>
      <DataTable<MaterialGrade>
        resource="material_grades"
        ariaLabel="재질"
        syncWithLocation={false}
        sorters={[{ field: "id", order: "asc" }]}
        columns={[
          { key: "code", title: "코드", kind: "name" },
          { key: "label", title: "표시" },
          { key: "tag", title: "견본 + 글자", render: (g) => <Material code={g.code} /> },
          { key: "heat_resistant_note", title: "메모", render: (g) => g.heat_resistant_note ?? "—" },
        ]}
        mobileRow={(g) => ({ title: g.label, subtitle: g.heat_resistant_note ?? undefined, trailing: <Material code={g.code} /> })}
        empty={{ kind: "empty", title: "등록된 재질이 없어요" }}
      />
    </>
  );
}
