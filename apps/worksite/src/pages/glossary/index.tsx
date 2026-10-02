// 용어집 `/docs/glossary` · C-06 · 깊이 B · 모듈 knowledge · 소유: collab 그룹
// 회사가 쓰는 말과 화면 표기를 맞춥니다(?tab=terms). 화면 이름(?tab=screen)은 메뉴·필드 이름이고, 고치면 바로 바뀝니다.
// owner·admin만 [화면 표기 고치기](서랍, rpc:set_glossary_label → tenant_settings.overrides.glossary).
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button, Input, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { DataTable, DetailDrawer, FilterBar, PageHeader, SectionCard, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useRpc, type CrudFilter } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { DEFAULT_TERMS, NAV_GROUPS, makeT } from "@/modules";
import type { GlossaryTerm } from "@/types/entities";
import { Caption, KeyValue, isAdminish } from "../docs/shared/lib";

const TERM_WHERE: Record<string, string> = {
  "term.businessLine": "사업 구조·프로젝트 화면", "term.project": "프로젝트·업무·산출물 화면", "term.part": "프로젝트 상세", "term.task": "업무 화면 전체",
  "term.meeting": "회의 화면", "term.artifact": "산출물 화면", "term.partner": "거래처 화면", "term.review": "검토함·업무 상세",
};

interface ScreenRow { key: string; where: string; current: string; base: string }

export default function Page() {
  const { persona, t, tenant, overrides } = useWorksite();
  const [params] = useSearchParams();
  const [selected, setSelected] = useSelectedParam();
  const [label, setLabel] = useState("");
  const tab = params.get("tab") === "screen" ? "screen" : "terms";
  const canEdit = isAdminish(persona);
  const save = useRpc("set_glossary_label", { successMessage: "화면 표기를 고쳤어요. 메뉴·화면 이름에 바로 반영돼요" });

  const fbProps: FilterBarProps = {
    search: { placeholder: "용어 검색", fields: ["term", "ui_label", "definition"] },
    chips: [{ param: "only", options: [{ value: "platform", label: "화면 이름에 쓰이는 용어" }, { value: "forbidden", label: "금칙어" }, { value: "confirm", label: "확인 필요" }], ariaLabel: "용어 종류" }],
  };
  const fb = useFilterBarState(fbProps);
  const only = params.get("only");
  const extra: CrudFilter[] = only === "platform" ? [{ field: "platform_key", operator: "nnull", value: true }]
    : only === "forbidden" ? [{ field: "forbidden", operator: "eq", value: true }]
      : only === "confirm" ? [{ field: "to_confirm", operator: "eq", value: true }] : [];

  const termsQ = useList<GlossaryTerm>({ resource: "glossary_terms", pagination: { mode: "off" } });
  usePageReady(!termsQ.query.isLoading);
  const terms = termsQ.result?.data ?? [];
  const base = useMemo(() => makeT(tenant, null), [tenant]);
  const screenRows: ScreenRow[] = useMemo(() => [
    ...Object.keys(DEFAULT_TERMS).map((k) => ({ key: k, where: TERM_WHERE[k] ?? "화면", current: t(k), base: base(k) })),
    ...[...NAV_GROUPS].sort((a, b) => a.order - b.order).map((g) => ({ key: `nav.${g.id}`, where: "왼쪽 메뉴", current: t(`nav.${g.id}`), base: base(`nav.${g.id}`) })),
  ], [t, base]);
  // 모든 줄이 비어 있는 칸(쓰이는 곳·금칙어)은 빼요(빈 칸 두 줄이 용어집을 덜 된 것처럼 보이게 해요)
  const hasWhere = terms.some((x) => !!x.platform_key);
  const hasForbidden = terms.some((x) => x.forbidden);
  const screenLabel = (key: string | null) => (key ? `${key.startsWith("nav.") ? "메뉴" : "화면"} · ${t(key)}` : "—");

  const editingTerm = selected && !selected.startsWith("key:") ? terms.find((x) => x.id === selected) : undefined;
  const editingKey = selected?.startsWith("key:") ? screenRows.find((r) => r.key === selected.slice(4)) : undefined;
  useEffect(() => {
    if (editingTerm) setLabel(editingTerm.ui_label);
    else if (editingKey) setLabel(editingKey.current);
  }, [editingTerm?.id, editingKey?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    const payload = editingTerm ? { termId: editingTerm.id, uiLabel: label } : { platformKey: editingKey!.key, uiLabel: label };
    void save.run(payload).then(() => setSelected(null)).catch(() => undefined);
  };

  return (
    <>
      <PageHeader
        title="용어집"
        description="화면 이름과 AI 초안이 이 표기를 따라요."
        tabs={[
          { key: "terms", label: `회사 용어 ${terms.length}`, to: "?tab=terms" },
          { key: "screen", label: `화면 이름 ${screenRows.length}`, to: "?tab=screen" },
        ]}
      />
      {tab === "terms" ? (
        <>
          <FilterBar {...fbProps} />
          <DataTable<GlossaryTerm>
            syncWithLocation={false}
        resource="glossary_terms"
            ariaLabel="용어 목록"
            filters={[...fb.filters, ...extra]}
            isFiltered={fb.active}
            onClearFilters={fb.clear}
            sorters={[{ field: "term", order: "asc" }]}
            pageSize={30}
            onRowClick={(g) => setSelected(g.id)}
            columns={[
              { key: "term", title: "용어", width: 184, render: (g) => <span className="cb-title-cell"><span className="ws-cell-name">{g.term}</span>{g.to_confirm && <StatusTag tone="neutral" label="진단에서 확인" />}</span> },
              { key: "ui_label", title: "화면 표기", width: 132 },
              { key: "aliases", title: "같은 말", width: 140, low: true, render: (g) => (g.aliases.length ? g.aliases.join(", ") : "—") },
              { key: "definition", title: "뜻", flex: true, render: (g) => <span style={{ display: "block", whiteSpace: "normal" }}>{g.definition}</span> },
              ...(hasWhere ? [{ key: "platform_key", title: "쓰이는 곳", width: 156, render: (g: GlossaryTerm) => screenLabel(g.platform_key) }] : []),
              ...(hasForbidden ? [{ key: "forbidden", title: "금칙어", width: 104, render: (g: GlossaryTerm) => (g.forbidden ? <StatusTag tone="critical" label="쓰지 않음" /> : "—") }] : []),
            ]}
            mobileRow={(g) => ({
              title: g.term === g.ui_label ? g.term : `${g.term} → ${g.ui_label}`,
              subtitle: g.definition,
              trailing: g.forbidden ? <StatusTag tone="critical" label="쓰지 않음" /> : g.to_confirm ? <StatusTag tone="neutral" label="확인 필요" /> : undefined,
            })}
            empty={{ kind: "empty", title: "등록된 용어가 없어요", description: "Company DNA를 만들 때 회사 용어를 모아요." }}
          />
          <Caption style={{ marginTop: 12 }}>'진단에서 확인' 표시는 업계에서 흔히 쓰지만 이 회사에서 쓰는지는 아직 확인하지 않은 말이에요.</Caption>
        </>
      ) : (
        <SectionCard title="화면 이름" caption={overrides.glossary && Object.keys(overrides.glossary).length ? "바꾼 이름은 메뉴·화면에 바로 반영돼요. 데모 초기화를 하면 처음 이름으로 돌아가요." : "메뉴와 화면에 쓰는 이름이에요. 관리자가 회사 말로 바꿀 수 있어요."}>
          <ul className="cb-rows" aria-label="화면 이름">
            {screenRows.map((r) => (
              <li key={r.key}>
                <div className="cb-row">
                  <div className="cb-row__main">
                    <span className="cb-row__title">{r.current}</span>
                    <span className="cb-meta">
                      <span className="ws-tag">{r.where}</span>
                      {r.current !== r.base && <span className="cb-meta-text">기본 이름: {r.base}</span>}
                    </span>
                  </div>
                  <div className="cb-row__actions">
                    {canEdit
                      ? <Button size="small" icon={<EditOutlined aria-hidden />} onClick={() => setSelected(`key:${r.key}`)}>고치기</Button>
                      : <Tooltip title="화면 이름은 관리자가 고칠 수 있어요"><span tabIndex={0}><Button size="small" disabled>고치기</Button></span></Tooltip>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <DetailDrawer
        open={!!editingTerm || !!editingKey}
        title={editingTerm ? editingTerm.term : editingKey ? "화면 이름 고치기" : "용어"}
        onClose={() => setSelected(null)}
        footer={canEdit ? <Button type="primary" loading={save.isPending} disabled={!label.trim()} onClick={submit}>화면 표기 고치기</Button> : undefined}
      >
        {editingTerm && (
          <section className="cb-drawer-section">
            <KeyValue
              items={[
                ["뜻", editingTerm.definition],
                ["같은 말", editingTerm.aliases.join(", ") || "—"],
                ["쓰이는 곳", screenLabel(editingTerm.platform_key)],
                ["금칙어", editingTerm.forbidden ? "예(이 말은 쓰지 않아요)" : "아니요"],
                ["확인", editingTerm.to_confirm ? "진단에서 확인할 말이에요" : "확인했어요"],
              ]}
            />
          </section>
        )}
        {editingKey && (
          <section className="cb-drawer-section">
            <KeyValue items={[["쓰이는 곳", editingKey.where], ["기본 이름", editingKey.base], ["지금 이름", editingKey.current]]} />
          </section>
        )}
        {(editingTerm || editingKey) && (
          <section className="cb-drawer-section">
            <h3><label htmlFor="cb-ui-label">화면 표기</label></h3>
            {canEdit ? (
              <>
                <Input id="cb-ui-label" value={label} maxLength={20} onChange={(e) => setLabel(e.target.value)} />
                <Caption style={{ marginTop: 8 }}>{editingKey || editingTerm?.platform_key ? "고치면 메뉴·화면 이름이 바로 바뀌어요." : "AI 초안과 검색이 이 표기를 따라요."}</Caption>
              </>
            ) : <p className="cb-meta-text">{label}<br /><span className="cb-caption">화면 표기는 관리자가 고칠 수 있어요.</span></p>}
          </section>
        )}
      </DetailDrawer>
    </>
  );
}
