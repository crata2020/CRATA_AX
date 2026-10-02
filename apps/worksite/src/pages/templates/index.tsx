// 양식 `/docs/templates` · C-03 · 깊이 B · 모듈 documents · 소유: collab 그룹
// 문서 유형마다 지금 쓰는 양식 하나를 정해 둡니다. 서랍(?selected=)에서 연결된 규칙을 보고, 검토자는 [게시하기].
// TR 양식은 모두 "진단에서 수집할 양식"(파일 링크 없음, 초안)이라 게시 버튼이 꺼져 있어요.
import { useMemo } from "react";
import { Link } from "react-router";
import { Button } from "antd";
import { Banner, DataTable, DetailDrawer, FilterBar, PageHeader, PersonChip, StatusTag, useFilterBarState, type FilterBarProps, DisabledAction } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useRpc } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Artifact, Rule, Template } from "@/types/entities";
import { Caption, ExternalLink, KeyValue, ruleCode, useDocTypeOptions } from "../docs/shared/lib";

const FORMATS = ["PPTX", "DOCX", "XLSX", "HWP", "PDF"].map((f) => ({ value: f, label: f }));

export default function Page() {
  const { can, tenant } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const docTypes = useDocTypeOptions();
  const isTr = tenant.packs.includes("manufacturing");

  const fbProps: FilterBarProps = {
    chips: [
      { param: "doc", field: "doc_type", options: docTypes, multiple: true, ariaLabel: "문서 유형" },
      { param: "status", field: "status", options: optionsOf("templates.status"), ariaLabel: "상태" },
    ],
    selects: [{ param: "format", label: "형식", field: "format", options: FORMATS }],
  };
  const fb = useFilterBarState(fbProps);

  const arts = useList<Artifact>({ resource: "artifacts", pagination: { mode: "off" } });
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of arts.result?.data ?? []) if (a.template_id) m.set(a.template_id, (m.get(a.template_id) ?? 0) + 1);
    return m;
  }, [arts.result]);

  const tplQ = useList<Template>({ resource: "templates", pagination: { mode: "off" } });
  const current = selected ? (tplQ.result?.data ?? []).find((t) => t.id === selected) : undefined;
  const rulesQ = useList<Rule>({ resource: "rules", pagination: { mode: "off" }, filters: current ? [{ field: "doc_types", operator: "eq", value: current.doc_type }] : [], queryOptions: { enabled: !!current } });
  const linked = (rulesQ.result?.data ?? []).filter((r) => r.status === "active" || r.status === "candidate");
  const publish = useRpc("publish_template", { successMessage: "양식을 게시했어요. 같은 유형의 이전 양식은 '사용 안 함'이 됐어요" });
  const canPublish = can("templates", "approve").can;

  const publishBtn = current && current.status !== "active" && (
    !canPublish ? (
      <DisabledAction label="게시하기" reason={"양식 게시는 검토자가 할 수 있어요"}><Button disabled>게시하기</Button></DisabledAction>
    ) : !current.file_ref ? (
      <DisabledAction label="게시하기" reason={"양식 파일 링크가 없어요. 진단에서 양식을 받은 뒤 게시해요"}><Button disabled>게시하기</Button></DisabledAction>
    ) : (
      <Button type="primary" loading={publish.isPending} onClick={() => void publish.run({ templateId: current.id }).then(() => setSelected(null)).catch(() => undefined)}>게시하기</Button>
    )
  );

  return (
    <>
      <PageHeader title="양식" description="문서 유형마다 지금 쓰는 양식을 하나씩 정해 둬요." />
      {isTr && <Banner title="진단에서 수집할 양식이에요">고객 양식과 사내 양식을 진단에서 받은 뒤 파일 링크를 붙이고 게시해요. 지금은 이름과 문서 유형만 있어요.</Banner>}
      <FilterBar {...fbProps} />
      <DataTable<Template>
        resource="templates"
        ariaLabel="양식 목록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "doc_type", order: "asc" }]}
        onRowClick={(t) => setSelected(t.id)}
        columns={[
          { key: "name", title: "양식 이름", kind: "name" },
          { key: "doc_type", title: "문서 유형", render: (t) => <span className="ws-tag">{labelOf("artifacts.doc_type", t.doc_type)}</span> },
          { key: "format", title: "형식" },
          { key: "version", title: "버전" },
          { key: "owner_id", title: "담당", kind: "person" },
          { key: "status", title: "상태", kind: "status", statusDomain: "templates.status" },
          { key: "usage", title: "만든 산출물", render: (t) => <span className="cb-tabular">{usage.get(t.id) ?? 0}건</span> },
        ]}
        mobileRow={(t) => ({
          title: t.name,
          subtitle: `${labelOf("artifacts.doc_type", t.doc_type)} · ${t.format} · ${t.version} · 산출물 ${usage.get(t.id) ?? 0}건`,
          trailing: <StatusTag {...statusOf("templates.status", t.status)} />,
        })}
        empty={{ kind: "empty", title: "등록된 양식이 없어요", description: "문서 유형마다 쓰는 양식을 하나씩 등록해요." }}
      />
      <DetailDrawer
        open={!!current}
        title={current?.name ?? "양식"}
        onClose={() => setSelected(null)}
        extra={current ? <StatusTag {...statusOf("templates.status", current.status)} /> : undefined}
        footer={publishBtn || undefined}
      >
        {current && (
          <>
            <section className="cb-drawer-section">
              <h3>양식 정보</h3>
              <KeyValue
                items={[
                  ["문서 유형", labelOf("artifacts.doc_type", current.doc_type)],
                  ["형식", current.format],
                  ["버전", current.version],
                  ["담당", <PersonChip memberId={current.owner_id} size="sm" />],
                  ["파일", <ExternalLink href={current.file_ref}>양식 파일 링크</ExternalLink>],
                  ["만든 산출물", `${usage.get(current.id) ?? 0}건`],
                ]}
              />
              {current.to_collect && <Caption style={{ marginTop: 12 }}>진단에서 수집할 양식이에요. 받은 뒤 파일 링크를 붙이면 게시할 수 있어요.</Caption>}
            </section>
            <section className="cb-drawer-section">
              <h3>연결된 규칙</h3>
              {linked.length ? (
                <ul className="cb-rows">
                  {linked.map((r) => (
                    <li key={r.id}>
                      <div className="cb-row">
                        <div className="cb-row__main">
                          <span className="cb-row__title">{ruleCode(r.id)} {r.statement}</span>
                          <span className="cb-meta">
                            <StatusTag {...statusOf("rules.status", r.status)} />
                            <span className="ws-tag">{labelOf("corrections.scope", r.scope_level)}</span>
                          </span>
                        </div>
                        <div className="cb-row__actions">
                          <Link className="ws-card__more" to={r.status === "candidate" ? `/docs/rules?tab=pending&selected=${r.id}` : `/docs/rules?tab=rules&selected=${r.id}`}>규칙 보기</Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="cb-caption">이 문서 유형에 적용 중인 규칙이 없어요.</p>}
            </section>
            {current.status === "active" && <Caption style={{ marginTop: 16 }}>지금 이 문서 유형에서 쓰는 양식이에요. 새 양식을 게시하면 이 양식은 '사용 안 함'이 돼요.</Caption>}
          </>
        )}
      </DetailDrawer>
    </>
  );
}
