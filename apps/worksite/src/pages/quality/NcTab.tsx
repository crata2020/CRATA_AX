// 품질 현황 > 부적합 탭(I-11): 목록 + 처분 정하기(검토자) + 부적합 등록(구성원 이상).
import { useEffect } from "react";
import { Link } from "react-router";
import { Button, Form, Input, InputNumber, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { DataTable, DetailDrawer, Divider, EmptyState, FilterBar, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useUpdate } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { formatDate, formatNumber } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Item, Nonconformance } from "@/types/entities";
import { asRow, useIndex, useModuleRows, useRows } from "../ops-home/kit/data";
import { NC_SOURCE_LABEL } from "../ops-home/kit/labels";
import { Kv } from "../ops-home/kit/ui";

const DEFECT_TYPES = ["치수 불량", "찍힘", "코 빠짐", "중량 미달", "주름 불균일", "감김 풀림", "녹", "라벨 오류", "기타"];

export function NcTab() {
  const { can, today } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const items = useModuleRows<Item>("mfg-master-data", "items");
  const itemById = useIndex(items.rows);
  const ncs = useRows<Nonconformance>("nonconformances", { enabled: !!selected && selected !== "new" });
  const current = selected && selected !== "new" ? ncs.rows.find((n) => n.id === selected) ?? null : null;
  const canCreate = can("nonconformances", "create").can;
  const canApprove = current ? can("nonconformances", "approve", asRow(current)).can : false;
  const { mutateAsync: update, mutation: upM } = useUpdate<Nonconformance>();
  const { mutateAsync: create, mutation: crM } = useCreate<Nonconformance>();
  const [dispForm] = Form.useForm<{ disposition: string; qty_disposed?: number }>();
  const [newForm] = Form.useForm<{ source: string; item_id: string; lot_no?: string; qty: number; defect_type: string }>();

  const fbProps: FilterBarProps = {
    chips: [
      { param: "status", field: "status", options: optionsOf("nonconformances.status"), multiple: true, ariaLabel: "상태" },
      { param: "source", field: "source", options: Object.entries(NC_SOURCE_LABEL).map(([value, label]) => ({ value, label })), ariaLabel: "출처" },
    ],
  };
  const fb = useFilterBarState(fbProps);

  useEffect(() => {
    if (current) { dispForm.resetFields(); dispForm.setFieldsValue({ disposition: current.disposition ?? undefined, qty_disposed: current.qty_disposed ?? (current.qty || undefined) }); }
    if (selected === "new") { newForm.resetFields(); newForm.setFieldsValue({ source: "inspection", defect_type: "치수 불량" }); }
  }, [current?.id, selected, dispForm, newForm]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async () => {
    if (!current) return;
    const v = await dispForm.validateFields();
    await update({ resource: "nonconformances", id: current.id, values: { disposition: v.disposition, qty_disposed: v.qty_disposed ?? null, status: "dispositioned" }, successNotification: () => ({ type: "success", message: `처분을 '${labelOf("nonconformances.disposition", v.disposition)}'(으)로 정했어요` }) });
    setSelected(null);
  };
  const close = async () => {
    if (!current) return;
    await update({ resource: "nonconformances", id: current.id, values: { status: "closed" }, successNotification: () => ({ type: "success", message: "부적합을 종결했어요" }) });
    setSelected(null);
  };
  const add = async () => {
    const v = await newForm.validateFields();
    await create({ resource: "nonconformances", values: { source: v.source, item_id: v.item_id, lot_no: v.lot_no?.trim() || null, qty: v.qty, defect_type: v.defect_type, found_on: today, disposition: null, status: "open", linked_task_id: null, qty_disposed: null }, successNotification: () => ({ type: "success", message: "부적합을 등록했어요. 검토자가 처분을 정해요." }) });
    setSelected(null);
  };
  const qty = (n: Nonconformance) => (n.qty ? `${formatNumber(n.qty)}${itemById.get(n.item_id ?? "")?.unit === "개" || !itemById.get(n.item_id ?? "") ? "개" : ` ${itemById.get(n.item_id ?? "")!.unit}`}` : "확인 전");

  return (
    <>
      <FilterBar {...fbProps} right={canCreate ? <Button icon={<PlusOutlined />} onClick={() => setSelected("new")}>부적합 등록</Button> : undefined} />
      <DataTable<Nonconformance>
        resource="nonconformances"
        ariaLabel="부적합 목록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        syncWithLocation={false}
        sorters={[{ field: "found_on", order: "desc" }]}
        onRowClick={(n) => setSelected(n.id)}
        columns={[
          { key: "found_on", title: "등록일", kind: "date" },
          { key: "source", title: "출처", render: (n) => <span className="ws-tag">{NC_SOURCE_LABEL[n.source] ?? n.source}</span> },
          { key: "item_id", title: "품목", flex: true, render: (n) => <span className="ws-cell-name">{itemById.get(n.item_id ?? "")?.name ?? "—"}</span> },
          { key: "lot_no", title: "LOT", width: 190, render: (n) => <span className="ws-nowrap">{n.lot_no ?? "—"}</span> },
          { key: "qty", title: "수량", render: (n) => <span className="in-num">{qty(n)}</span> },
          { key: "defect_type", title: "불량 유형" },
          { key: "disposition", title: "처분", render: (n) => (n.disposition ? labelOf("nonconformances.disposition", n.disposition) : "—") },
          { key: "status", title: "상태", kind: "status", statusDomain: "nonconformances.status" },
        ]}
        mobileRow={(n) => ({ title: `${n.defect_type} · ${itemById.get(n.item_id ?? "")?.name ?? "품목 확인 전"}`, subtitle: `${formatDate(n.found_on)} · ${NC_SOURCE_LABEL[n.source]} · ${qty(n)}`, trailing: <StatusTag {...statusOf("nonconformances.status", n.status)} /> })}
        empty={{ kind: "empty", title: "부적합이 없어요", description: "검사나 현장 등록에서 불량이 나오면 여기에 모여요." }}
      />

      <DetailDrawer
        open={!!current}
        onClose={() => setSelected(null)}
        title={current ? `부적합 · ${current.defect_type}` : "부적합"}
        extra={current ? <StatusTag {...statusOf("nonconformances.status", current.status)} /> : undefined}
        footer={current && canApprove ? (
          current.status === "open" ? <Button type="primary" loading={upM.isPending} onClick={() => void decide()}>처분 정하기</Button>
            : current.status === "dispositioned" ? <Button type="primary" loading={upM.isPending} onClick={() => void close()}>종결하기</Button> : undefined
        ) : undefined}
      >
        {current ? (
          <div className="in-stack">
            <Kv rows={[
              ["등록일", formatDate(current.found_on)],
              ["출처", NC_SOURCE_LABEL[current.source]],
              ["품목", itemById.get(current.item_id ?? "")?.name ?? "확인 전"],
              ["LOT", current.lot_no ? <Link className="in-link" to={`/ops/trace?lot=${encodeURIComponent(current.lot_no)}`}>{current.lot_no}</Link> : null],
              ["수량", qty(current)],
              ["불량 유형", current.defect_type],
              ["처분", current.disposition ? labelOf("nonconformances.disposition", current.disposition) : "정하기 전"],
              ["처분 수량", current.qty_disposed != null ? formatNumber(current.qty_disposed) : null],
            ]} />
            {current.status === "open" && (
              <>
                <Divider />
                {canApprove ? (
                  <Form form={dispForm} layout="vertical" requiredMark="optional">
                    <Form.Item name="disposition" label="처분" rules={[{ required: true, message: "처분을 골라 주세요" }]}>
                      <Select options={optionsOf("nonconformances.disposition")} />
                    </Form.Item>
                    <Form.Item name="qty_disposed" label="처분 수량"><InputNumber<number> min={0} style={{ width: "100%" }} inputMode="numeric" /></Form.Item>
                  </Form>
                ) : <p className="in-note">처분은 검토자가 정해요.</p>}
              </>
            )}
          </div>
        ) : ncs.isLoading ? null : selected && selected !== "new" ? <EmptyState kind="not_found" compact /> : null}
      </DetailDrawer>

      <DetailDrawer open={selected === "new"} onClose={() => setSelected(null)} title="부적합 등록" closeLabel="취소" footer={<Button type="primary" loading={crM.isPending} onClick={() => void add()}>등록하기</Button>}>
        <Form form={newForm} layout="vertical" requiredMark="optional">
          <Form.Item name="source" label="출처" rules={[{ required: true }]}>
            <Select options={Object.entries(NC_SOURCE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="item_id" label="품목" rules={[{ required: true, message: "품목을 골라 주세요" }]}>
            <Select showSearch optionFilterProp="label" options={items.rows.filter((i) => i.kind !== "raw").map((i) => ({ value: i.id, label: `${i.item_no} · ${i.name}` }))} />
          </Form.Item>
          <Form.Item name="lot_no" label="LOT"><Input maxLength={40} placeholder="예: F-PR02-260915-003" /></Form.Item>
          <Form.Item name="qty" label="수량" rules={[{ required: true, message: "수량을 적어 주세요" }]}><InputNumber<number> min={1} style={{ width: "100%" }} inputMode="numeric" /></Form.Item>
          <Form.Item name="defect_type" label="불량 유형" rules={[{ required: true }]}><Select options={DEFECT_TYPES.map((d) => ({ value: d, label: d }))} /></Form.Item>
        </Form>
      </DetailDrawer>
    </>
  );
}
