// 산출물 `/docs` · C-01 · 깊이 A · 모듈 documents · 소유: collab 그룹
// AI 초안부터 최종본까지 산출물의 버전과 적용 규칙을 찾고, 회사 저장소 링크로 새 산출물을 등록합니다(?selected=new).
import { useSearchParams } from "react-router";
import { Button, Tooltip } from "antd";
import { LockOutlined, PlusOutlined, RobotOutlined } from "@ant-design/icons";
import { DataTable, FilterBar, PageHeader, StatusTag, useFilterBarState, type ColumnDef, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { isDesktopUp, useBreakpoint } from "@/lib/useBreakpoint";
import { formatDate } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Artifact } from "@/types/entities";
import { Caption, SummaryLinks, useDocTypeOptions, useMinWidth, useProjects } from "./shared/lib";
import { RegisterArtifactDrawer } from "./shared/RegisterArtifactDrawer";

/** AI 생성물 표시(인공지능기본법)·고객 비밀: 제목 앞 16px 아이콘 칸(+ aria-label + 툴팁). 좁은 화면에서도 빼지 않아요.
 *  표시가 없는 행도 칸을 비워 두어 모든 제목이 같은 왼쪽 선에서 시작해요. 둘 다면 제목 줄 · 둘째 줄에 하나씩 */
function DocFlags({ a }: { a: Artifact }) {
  return (
    <span className="cb-doc-name__flags">
      {a.ai_generated && (
        <Tooltip title="AI 초안 포함(AI가 만든 초안에서 시작했어요)">
          <span className="cb-flag cb-flag--ai" role="img" aria-label="AI 초안 포함"><RobotOutlined aria-hidden /></span>
        </Tooltip>
      )}
      {a.sensitivity === "L2" && (
        <Tooltip title="고객 비밀 · AI 꺼짐(국내 경로 개통 전). 해외 AI로 보내지 않아요">
          <span className="cb-flag" role="img" aria-label="고객 비밀"><LockOutlined aria-hidden /></span>
        </Tooltip>
      )}
    </span>
  );
}

export default function Page() {
  const { can, person } = useWorksite();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useSelectedParam();
  const docTypes = useDocTypeOptions();
  const { projects, byId } = useProjects();
  const bp = useBreakpoint();
  const roomy = useMinWidth(1024);
  const canCreate = can("artifacts", "create").can;

  const fbProps: FilterBarProps = {
    search: { placeholder: "산출물 검색", fields: ["title"] },
    chips: [
      { param: "doc", field: "doc_type", options: docTypes, multiple: true, ariaLabel: "문서 유형" },
      { param: "ai", field: "ai_generated", options: [{ value: "true", label: "AI 초안 포함만" }], multiple: true, ariaLabel: "AI 초안" },
    ],
    selects: [
      { param: "project", label: "프로젝트", field: "project_id", options: projects.map((p) => ({ value: p.id, label: p.name })) },
      { param: "status", label: "상태", field: "status", options: optionsOf("artifacts.status") },
    ],
  };
  const fb = useFilterBarState(fbProps);

  const all = useList<Artifact>({ resource: "artifacts", pagination: { mode: "off" } });
  const rows = all.result?.data ?? [];
  const status = params.get("status");
  const setStatus = (v: string | null) => setParams((prev) => {
    const p = new URLSearchParams(prev);
    if (!v || p.get("status") === v) p.delete("status"); else p.set("status", v);
    p.delete("currentPage");
    return p;
  }, { replace: true });

  const projectName = (a: Artifact) => (a.project_id ? byId.get(a.project_id)?.name ?? null : null);
  const ownerName = (a: Artifact) => person(a.owner_id)?.displayName ?? "담당 없음";
  const updatedCell = (a: Artifact) => <span className="cb-tabular cb-nowrap">{formatDate(a.updated_at, false)}</span>;
  // 제목 칸(데스크톱·태블릿 같은 모양): [표시 아이콘 칸] 제목 / 둘째 줄(13/20 muted). 둘째 줄이 비면(프로젝트 없음) '—' 대신 줄을 빼요
  const nameCell = (a: Artifact, sub: string) => (
    <span className="cb-doc-name" title={sub ? `${a.title} · ${sub}` : a.title}>
      <DocFlags a={a} />
      <span className="cb-doc-name__text">
        <span className="ws-cell-name">{a.title}</span>
        {sub && <span className="cb-cell-sub">{sub}</span>}
      </span>
    </span>
  );
  // 데스크톱: 제목(남는 폭, 프로젝트는 둘째 줄) + 문서 유형 136 + 담당 200 + 상태 112 + 수정일 96 = 544
  // → 제목 칸 ≈ 400(1280) · 560(1440). 버전·적용 규칙은 서랍·상세에 있어 표에서 빼요(제목이 한 줄에 들어가게)
  // 태블릿(768~1279): 문서 유형도 빼요. 담당 칸은 1024 이상에서만, 그보다 좁으면 둘째 줄 끝에 이름으로
  const columns: ColumnDef<Artifact>[] = isDesktopUp(bp) ? [
    { key: "title", title: "제목", flex: true, render: (a) => nameCell(a, projectName(a) ?? "") },
    { key: "doc_type", title: "문서 유형", width: 136, render: (a) => <span className="ws-tag">{labelOf("artifacts.doc_type", a.doc_type)}</span> },
    { key: "owner_id", title: "담당", kind: "person", width: 200 },
    { key: "status", title: "상태", kind: "status", statusDomain: "artifacts.status", width: 112 },
    { key: "updated_at", title: "수정일", sortable: true, width: 96, render: updatedCell },
  ] : [
    { key: "title", title: "제목", flex: true, render: (a) => nameCell(a, roomy ? projectName(a) ?? "" : [projectName(a), ownerName(a)].filter(Boolean).join(" · ")) },
    ...(roomy ? [{ key: "owner_id", title: "담당", kind: "person" as const, width: 176 }] : []),
    { key: "status", title: "상태", kind: "status", statusDomain: "artifacts.status", width: 112 },
    { key: "updated_at", title: "수정일", sortable: true, width: 96, render: updatedCell },
  ];

  return (
    <>
      <PageHeader
        title="산출물"
        description="AI 초안부터 최종본까지 버전을 남겨요. 파일은 회사 저장소에 있어요."
        actions={
          canCreate
            ? <Button type="primary" icon={<PlusOutlined aria-hidden />} onClick={() => setSelected("new")}>산출물 등록</Button>
            : <Tooltip title="산출물 등록 권한이 없어요"><Button disabled icon={<PlusOutlined aria-hidden />}>산출물 등록</Button></Tooltip>
        }
      />
      <FilterBar {...fbProps} />
      {rows.length > 0 && (
        <SummaryLinks
          ariaLabel="상태 빠른 필터"
          items={[
            { key: "in_review", label: "검토 중", count: rows.filter((a) => a.status === "in_review").length, pressed: status === "in_review", onClick: () => setStatus("in_review") },
            { key: "draft", label: "작성 중", count: rows.filter((a) => a.status === "draft").length, pressed: status === "draft", onClick: () => setStatus("draft") },
            { key: "final", label: "최종", count: rows.filter((a) => a.status === "final").length, pressed: status === "final", onClick: () => setStatus("final") },
          ]}
        />
      )}
      <div className="cb-docs-table">
      <DataTable<Artifact>
        resource="artifacts"
        ariaLabel="산출물 목록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "updated_at", order: "desc" }]}
        rowHref={(a) => `/docs/artifacts/${a.id}`}
        columns={columns}
        mobileRow={(a) => ({
          title: a.title,
          subtitle: [labelOf("artifacts.doc_type", a.doc_type), a.project_id ? byId.get(a.project_id)?.name : null, `v${a.current_version}`, a.ai_generated ? "AI 초안 포함" : null, formatDate(a.updated_at, false)].filter(Boolean).join(" · "),
          trailing: <StatusTag {...statusOf("artifacts.status", a.status)} />,
        })}
        empty={{ kind: "empty", title: "아직 등록된 산출물이 없어요", description: "업무를 제출하면 여기에 쌓여요.", action: canCreate ? { label: "산출물 등록", onClick: () => setSelected("new") } : { label: "내 업무 보기", to: "/work" } }}
      />
      </div>
      <Caption style={{ marginTop: 12 }}>파일 본체는 회사 저장소에 있고, 여기에는 제목·버전·적용 규칙 같은 정보만 남겨요.</Caption>
      {selected === "new" && canCreate && <RegisterArtifactDrawer open onClose={() => setSelected(null)} />}
    </>
  );
}
