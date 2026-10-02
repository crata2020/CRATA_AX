// 지식 `/docs/knowledge` · C-05 · 깊이 B · 모듈 knowledge · 소유: collab 그룹
// 결정·규정·매뉴얼·FAQ·참고 자료를 잇고 "지금도 맞는지"(검증일·재검토일)를 관리합니다. 본문은 회사 저장소에 둡니다.
// 서랍(?selected=<id>): 요약 · 원문 링크 · 관련 항목(이 지식이 가리키는 곳 + 이 지식을 가리키는 곳) · [검증됨으로 확정](검토자)
// 만들기(?selected=new): 구성원 이상, 초안으로 저장
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, Form, Input, Select, Tooltip } from "antd";
import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import { DataTable, DdayBadge, DetailDrawer, FilterBar, PageHeader, PersonChip, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useList, useRpc } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { addDays } from "@/lib/clock";
import { formatDate } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { CrudFilter } from "@/lib/refine";
import type { KnowledgeItem, KnowledgeLink } from "@/types/entities";
import { Caption, ExternalLink, KeyValue, SummaryLinks, useProjects } from "../docs/shared/lib";
import { LINK_TYPE_LABEL, useLinkTargets } from "../docs/shared/links";

interface NewValues { kind: KnowledgeItem["kind"]; title: string; summary: string; project_id?: string | null; body_ref?: string; source_ref?: string }

function LinkList({ links, side, resolve }: { links: KnowledgeLink[]; side: "to" | "from"; resolve: (t: string, id: string) => { label: string; to: string } | null }) {
  if (!links.length) return <p className="cb-caption">{side === "to" ? "연결한 항목이 없어요." : "이 지식을 가리키는 곳이 없어요."}</p>;
  return (
    <ul className="cb-rows">
      {links.map((l) => {
        const type = side === "to" ? l.to_type : l.from_type;
        const id = side === "to" ? l.to_id : l.from_id;
        const target = resolve(type, id);
        return (
          <li key={l.id}>
            <div className="cb-row" style={{ paddingBlock: 10 }}>
              <div className="cb-row__main">
                <span className="cb-meta">
                  <span className="ws-tag">{LINK_TYPE_LABEL[type] ?? type}</span>
                  <span className="cb-meta-text">{l.relation}</span>
                </span>
                {target ? <Link to={target.to}>{target.label}</Link> : <span className="ws-muted">볼 수 없는 항목이에요</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Page() {
  const { can, today } = useWorksite();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useSelectedParam();
  const { projects, byId } = useProjects();
  const verify = useRpc("verify_knowledge", { successMessage: "검증됨으로 확정했어요. 180일 뒤에 다시 확인해요" });
  const canCreate = can("knowledge_items", "create").can;

  const fbProps: FilterBarProps = {
    search: { placeholder: "지식 검색", fields: ["title", "summary"] },
    chips: [{ param: "kind", field: "kind", options: optionsOf("knowledge_items.kind"), multiple: true, ariaLabel: "종류" }],
    selects: [
      { param: "kstatus", label: "상태", field: "status", options: optionsOf("knowledge_items.status") },
      { param: "project", label: "프로젝트", field: "project_id", options: projects.map((p) => ({ value: p.id, label: p.name })) },
    ],
  };
  const fb = useFilterBarState(fbProps);
  const due = params.get("due");
  const soonTo = addDays(today, 30);
  const dueFilters: CrudFilter[] = due === "overdue"
    ? [{ field: "review_by", operator: "lt", value: today }, { field: "status", operator: "ne", value: "archived" }]
    : due === "soon" ? [{ field: "review_by", operator: "between", value: [today, soonTo] }, { field: "status", operator: "ne", value: "archived" }] : [];

  const allQ = useList<KnowledgeItem>({ resource: "knowledge_items", pagination: { mode: "off" } });
  const all = allQ.result?.data ?? [];
  const overdue = all.filter((k) => k.status !== "archived" && k.review_by && k.review_by < today).length;
  const soon = all.filter((k) => k.status !== "archived" && k.review_by && k.review_by >= today && k.review_by <= soonTo).length;
  const setDue = (v: string) => setParams((prev) => {
    const p = new URLSearchParams(prev);
    if (p.get("due") === v) p.delete("due"); else p.set("due", v);
    p.delete("currentPage");
    return p;
  }, { replace: true });

  const current = selected && selected !== "new" ? all.find((k) => k.id === selected) : undefined;
  const linksQ = useList<KnowledgeLink>({ resource: "knowledge_links", pagination: { mode: "off" }, queryOptions: { enabled: !!current } });
  const outgoing = (linksQ.result?.data ?? []).filter((l) => current && l.from_type === "knowledge" && l.from_id === current.id);
  const incoming = (linksQ.result?.data ?? []).filter((l) => current && l.to_type === "knowledge" && l.to_id === current.id);
  const targets = useLinkTargets(!!current);
  const canVerify = current ? can("knowledge_items", "approve", current as unknown as Record<string, unknown>).can : false;

  const header = useMemo(() => (
    <PageHeader
      title="지식"
      description="본문은 회사 저장소에 두고, 지금도 맞는지만 관리해요."
      actions={canCreate ? <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={() => setSelected("new")}>지식 추가</Button> : undefined}
    />
  ), [canCreate, setSelected]);

  return (
    <>
      {header}
      <FilterBar {...fbProps} />
      <SummaryLinks
        ariaLabel="재검토 빠른 필터"
        items={[
          { key: "overdue", label: "재검토 기한 지남", count: overdue, pressed: due === "overdue", onClick: () => setDue("overdue") },
          { key: "soon", label: "30일 안 재검토", count: soon, pressed: due === "soon", onClick: () => setDue("soon") },
        ]}
      />
      <DataTable<KnowledgeItem>
        resource="knowledge_items"
        ariaLabel="지식 목록"
        filters={[...fb.filters, ...dueFilters]}
        isFiltered={fb.active || !!due}
        onClearFilters={() => { fb.clear(); if (due) setDue(due); }}
        sorters={[{ field: "review_by", order: "asc" }]}
        onRowClick={(k) => setSelected(k.id)}
        columns={[
          { key: "title", title: "제목", kind: "name" },
          { key: "kind", title: "종류", width: 112, render: (k) => <span className="ws-tag">{labelOf("knowledge_items.kind", k.kind)}</span> },
          { key: "project_id", title: "프로젝트", width: 160, render: (k) => <span className="ws-ellipsis">{k.project_id ? byId.get(k.project_id)?.name ?? "—" : "회사 전체"}</span> },
          { key: "owner_id", title: "담당", kind: "person", width: 160 },
          { key: "verified_at", title: "검증일", kind: "date", low: true },
          {
            key: "review_by", title: "재검토일", width: 200,
            render: (k) => (k.review_by ? <span className="ws-row" style={{ flexWrap: "nowrap" }}><span className="ws-date">{formatDate(k.review_by, false)}</span><DdayBadge date={k.review_by} noun="재검토" done={k.status === "archived"} /></span> : "—"),
          },
          { key: "status", title: "상태", kind: "status", statusDomain: "knowledge_items.status", width: 120 },
        ]}
        mobileRow={(k) => ({
          title: k.title,
          subtitle: [labelOf("knowledge_items.kind", k.kind), k.project_id ? byId.get(k.project_id)?.name : "회사 전체", k.review_by ? `재검토 ${formatDate(k.review_by, false)}` : null].filter(Boolean).join(" · "),
          trailing: <StatusTag {...statusOf("knowledge_items.status", k.status)} />,
        })}
        empty={{ kind: "empty", title: "등록된 지식이 없어요", description: "회의에서 확정된 결정이 여기에 쌓여요.", action: canCreate ? { label: "지식 추가", onClick: () => setSelected("new") } : undefined }}
      />

      <DetailDrawer
        open={!!current}
        title={current?.title ?? "지식"}
        onClose={() => setSelected(null)}
        extra={current ? <StatusTag {...statusOf("knowledge_items.status", current.status)} /> : undefined}
        footer={current && current.status !== "archived" ? (
          canVerify
            ? <Button type="primary" icon={<CheckOutlined aria-hidden />} loading={verify.isPending} onClick={() => void verify.run({ itemId: current.id }).catch(() => undefined)}>검증됨으로 확정</Button>
            : <Tooltip title="검토자 이상이 확정할 수 있어요"><span tabIndex={0}><Button disabled>검증됨으로 확정</Button></span></Tooltip>
        ) : undefined}
      >
        {current && (
          <>
            <section className="cb-drawer-section">
              <p className="cb-body" style={{ fontSize: 15, lineHeight: "24px" }}>{current.summary}</p>
              <div className="cb-mt">
                <KeyValue
                  items={[
                    ["종류", labelOf("knowledge_items.kind", current.kind)],
                    ["프로젝트", current.project_id ? byId.get(current.project_id)?.name ?? "—" : "회사 전체"],
                    ["담당", <PersonChip memberId={current.owner_id} size="sm" />],
                    ["원문", <ExternalLink href={current.body_ref}>회사 저장소에서 보기</ExternalLink>],
                    ["출처", current.source_ref ?? "—"],
                    ["검증일", formatDate(current.verified_at)],
                    ["재검토일", current.review_by ? <span className="ws-row">{formatDate(current.review_by)}<DdayBadge date={current.review_by} noun="재검토" /></span> : "검증하면 정해져요"],
                  ]}
                />
              </div>
            </section>
            <section className="cb-drawer-section">
              <h3>관련 항목</h3>
              <LinkList links={outgoing} side="to" resolve={targets.resolve} />
            </section>
            <section className="cb-drawer-section">
              <h3>이 지식을 가리키는 곳</h3>
              <LinkList links={incoming} side="from" resolve={targets.resolve} />
            </section>
          </>
        )}
      </DetailDrawer>

      {selected === "new" && canCreate && <NewKnowledgeDrawer onClose={() => setSelected(null)} onCreated={(id) => setSelected(id)} />}
    </>
  );
}

/** 지식 추가 서랍(?selected=new). 초안으로 저장해요 */
function NewKnowledgeDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { persona } = useWorksite();
  const { projects } = useProjects();
  const [form] = Form.useForm<NewValues>();
  const { mutateAsync: create, mutation: createM } = useCreate();
  const submit = async () => {
    const v = await form.validateFields();
    const res = await create({
      resource: "knowledge_items",
      values: {
        kind: v.kind, title: v.title.trim(), summary: v.summary.trim(), body_ref: v.body_ref?.trim() || null, project_id: v.project_id ?? null, owner_id: persona.memberId,
        source_ref: v.source_ref?.trim() || null, verified_at: null, review_by: null, status: "draft",
      },
      successNotification: () => ({ type: "success", message: "지식을 초안으로 추가했어요. 검토자가 확인하면 '검증됨'이 돼요" }),
    });
    onCreated(String(res.data.id));
  };
  return (
      <DetailDrawer
        open
        title="지식 추가"
        onClose={onClose}
        footer={<Button type="primary" loading={createM.isPending} onClick={() => void submit().catch(() => undefined)}>추가하기</Button>}
      >
        <Form form={form} layout="vertical" className="cb-form" requiredMark={false} disabled={createM.isPending} initialValues={{ kind: "manual" }}>
          <Form.Item name="kind" label="종류" rules={[{ required: true, message: "종류를 골라 주세요" }]}>
            <Select options={optionsOf("knowledge_items.kind")} />
          </Form.Item>
          <Form.Item name="title" label="제목" rules={[{ required: true, message: "제목을 적어 주세요" }, { min: 2, message: "두 글자 이상 적어 주세요" }]}>
            <Input maxLength={80} placeholder="예: 견적서 금액에 부가세를 넣나요?" />
          </Form.Item>
          <Form.Item name="summary" label="요약" rules={[{ required: true, message: "한두 문장으로 요약해 주세요" }]}>
            <Input.TextArea rows={3} maxLength={300} showCount placeholder="본문은 회사 저장소에 두고, 여기에는 요약만 적어요" />
          </Form.Item>
          <Form.Item name="project_id" label="프로젝트">
            <Select allowClear showSearch optionFilterProp="label" placeholder="회사 전체" options={projects.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="body_ref" label="원문 링크(회사 저장소)" rules={[{ pattern: /^https:\/\/\S+$/, message: "https로 시작하는 주소로 적어 주세요" }]}>
            <Input inputMode="url" placeholder="https://" />
          </Form.Item>
          <Form.Item name="source_ref" label="출처">
            <Input maxLength={60} placeholder="예: 회의 결정, 공개 법령" />
          </Form.Item>
          <Caption>새 지식은 '초안'으로 저장돼요. 검토자가 확인하면 '검증됨'이 되고 재검토일이 정해져요.</Caption>
        </Form>
      </DetailDrawer>
  );
}
