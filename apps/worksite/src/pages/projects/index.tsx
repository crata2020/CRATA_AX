// 사업·프로젝트 `/projects` · W-01 · 깊이 A · 모듈 business-structure · 소유: work 그룹
// 회사의 뼈대(사업 > 프로젝트 > 파트)를 구조(트리)·목록으로 보고 프로젝트를 찾고 만듭니다. 업무·회의·문서는 모두 프로젝트에 붙어요.
import { useMemo, type Key } from "react";
import { useNavigate } from "react-router";
import { Button, Skeleton, Tree } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  CardGrid, DataTable, EmptyState, FilterBar, PageHeader, PersonChip, SectionCard, SensitivityTag, StatusTag, useFilterBarState, type FilterBarProps,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList } from "@/lib/refine";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { optionsOf, statusOf } from "@/lib/status";
import type { Part, Project } from "@/types/entities";
import { STACK_STYLE, useStructure } from "../task-detail/lib";
import { ProjectFormDrawer } from "./ProjectFormDrawer";
import "../task-detail/work.css";

export default function Page() {
  const { persona, can } = useWorksite();
  const nav = useNavigate();
  const bp = useBreakpoint();
  const st = useStructure();
  const [view] = useUrlParam("view", "tree");
  const [line, setLine] = useUrlParam("line");
  const [selected, setSelected] = useSelectedParam();
  const parts = useList<Part>({ resource: "parts", pagination: { mode: "off" } });
  usePageReady(!st.isLoading);

  const canCreate = persona.role !== "member" && can("projects", "create").can;
  const adminish = persona.role === "owner" || persona.role === "admin";

  const fbProps: FilterBarProps = {
    search: { placeholder: "프로젝트·코드 검색", fields: ["name", "code"] },
    chips: [{ param: "line", field: "business_line_id", options: st.lines.map((l) => ({ value: l.id, label: l.name })), ariaLabel: "사업", allLabel: "전체" }],
    selects: [{ param: "status", label: "상태", field: "status", options: optionsOf("projects.status") }],
    view: { ariaLabel: "보기", urlParam: "view", value: "tree", onChange: () => undefined, options: [{ value: "tree", label: "구조" }, { value: "list", label: "목록" }] },
  };
  const fb = useFilterBarState(fbProps);

  const partCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of parts.result?.data ?? []) m.set(p.project_id, (m.get(p.project_id) ?? 0) + 1);
    return m;
  }, [parts.result]);

  const treeData = useMemo(() => st.lines.map((l) => {
    const list = st.projects.filter((p) => p.business_line_id === l.id);
    return {
      key: `line:${l.id}`,
      title: (
        <span className="wk-tree-title">
          <strong>{l.name}</strong><span className="wk-tree-code">{l.code}</span>
          <span className="ws-tag">{list.length}</span>
          {/* 진단 전 가설 표시는 설정하는 사람(소유자·관리자)에게만 */}
          {adminish && l.hypothesis && <span className="ws-tag" title="진단에서 확인할 초안이에요">진단 전 초안</span>}
        </span>
      ),
      children: list.map((p) => ({
        key: `prj:${p.id}`,
        isLeaf: true,
        title: (
          <span className="wk-tree-title">
            <span>{p.name}</span>
            {p.sensitivity === "L2" && <SensitivityTag level="L2" />}
          </span>
        ),
      })),
    };
  }), [st.lines, st.projects]);

  const columns = [
    {
      key: "name", title: "이름", kind: "name" as const,
      render: (p: Project) => (
        <span className="ws-row" style={{ flexWrap: "nowrap", minWidth: 0 }}>
          <span className="ws-cell-name ws-ellipsis" title={p.name}>{p.name}</span>{p.sensitivity === "L2" && <SensitivityTag level="L2" />}
        </span>
      ),
    },
    { key: "code", title: "코드", width: 168, render: (p: Project) => <span className="ws-tabular ws-ellipsis" title={p.code}>{p.code}</span> },
    { key: "owner_member_id", title: "담당", kind: "person" as const, width: 176 },
    { key: "period", title: "기간", width: 168, render: (p: Project) => <span className="ws-tabular">{formatDate(p.start_on, false)} – {formatDate(p.due_on, false)}</span> },
    { key: "parts", title: "파트", width: 64, align: "right" as const, low: true, render: (p: Project) => <span className="ws-tabular">{partCount.get(p.id) ?? 0}</span> },
    { key: "status", title: "상태", kind: "status" as const, statusDomain: "projects.status" as const, width: 96 },
    { key: "health", title: "신호", kind: "status" as const, statusDomain: "projects.health" as const, width: 96 },
  ];
  const mobileRow = (p: Project) => ({
    title: p.name,
    subtitle: `${st.lineById.get(p.business_line_id)?.name ?? "—"} · ${formatDate(p.due_on, false)} 마감`,
    trailing: <span style={STACK_STYLE}><StatusTag {...statusOf("projects.status", p.status)} /><StatusTag {...statusOf("projects.health", p.health)} /></span>,
  });
  const empty = { kind: "empty" as const, title: "이 사업에 프로젝트가 없어요", description: canCreate ? "프로젝트를 만들어 업무·회의를 붙여 보세요." : "프로젝트가 생기면 여기에 보여요." };

  const header = (
    <PageHeader
      title="사업·프로젝트"
      description="업무·회의·문서는 모두 프로젝트에 붙어요."
      actions={canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected("new")}>프로젝트 만들기</Button>}
    />
  );

  if (st.isLoading) return <>{header}<Skeleton active paragraph={{ rows: 6 }} /></>;
  if (st.isError) return <>{header}<EmptyState kind="error" action={{ label: "다시 시도", onClick: () => window.location.reload() }} /></>;
  if (!st.lines.length) {
    return (
      <>
        {header}
        <EmptyState kind="empty" title="아직 등록된 사업이 없어요" description="Company DNA에서 사업 구조를 먼저 정해요."
          action={adminish ? { label: "회사 설정 열기", to: "/admin/settings" } : undefined} />
      </>
    );
  }

  const showTreeCols = view !== "list" && bp !== "mobile";
  const treeColumns = columns.filter((c) => ["name", "code", "period", "status", "health"].includes(c.key)).map((c) =>
    c.key === "period" ? { ...c, title: "마감", width: 96, render: (p: Project) => <span className="ws-tabular">{formatDate(p.due_on, false)}</span> } : c);
  const table = (
    <DataTable<Project>
      key={`${view}-${line}`}
      resource="projects"
      ariaLabel="프로젝트 목록"
      filters={fb.filters}
      isFiltered={view === "list" ? fb.active : !!(fb.values.q || fb.values.status)}
      onClearFilters={fb.clear}
      sorters={[{ field: "code", order: "asc" }]}
      rowHref={(p) => `/projects/${p.id}`}
      columns={showTreeCols ? treeColumns : columns}
      mobileRow={mobileRow}
      empty={empty}
    />
  );

  const selectedLine = line ? st.lineById.get(line) : undefined;
  const showTree = view !== "list" && bp !== "mobile";

  return (
    <>
      {header}
      <FilterBar {...fbProps} />
      <div style={{ marginTop: 16 }}>
        {!showTree ? table : (
          <CardGrid>
            <SectionCard span={4} title="구조">
              <Tree
                className="wk-tree"
                blockNode
                showLine
                defaultExpandAll
                treeData={treeData}
                selectedKeys={selectedLine ? [`line:${selectedLine.id}`] : []}
                onSelect={(keys: Key[]) => {
                  const k = String(keys[0] ?? "");
                  if (k.startsWith("line:")) setLine(k.slice(5));
                  else if (k.startsWith("prj:")) nav(`/projects/${k.slice(4)}`);
                  else setLine(null);
                }}
              />
              <p className="wk-caption" style={{ marginTop: 12 }}>사업을 고르면 오른쪽에 그 사업의 프로젝트가 보여요. 화살표 키로도 움직일 수 있어요.</p>
            </SectionCard>
            <SectionCard span={8} title={selectedLine ? `${selectedLine.name} · ${selectedLine.code}` : "전체 사업"}
              actions={selectedLine ? <PersonChip memberId={selectedLine.owner_member_id} size="sm" /> : undefined}>
              {selectedLine?.description && <p className="wk-body-2" style={{ marginBottom: 12 }}>{selectedLine.description}</p>}
              {table}
            </SectionCard>
          </CardGrid>
        )}
      </div>
      <ProjectFormDrawer open={selected === "new" && canCreate} onClose={() => setSelected(null)} lineId={line || undefined} />
    </>
  );
}
