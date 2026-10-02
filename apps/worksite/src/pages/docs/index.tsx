// 산출물 `/docs` · C-01 · 깊이 A · 모듈 documents · 소유: collab 그룹
// AI 초안부터 최종본까지 산출물의 버전과 적용 규칙을 찾고, 회사 저장소 링크로 새 산출물을 등록합니다(?selected=new).
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Button, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AiTag, DataTable, FilterBar, PageHeader, SensitivityTag, StatusTag, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useList } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Artifact, ArtifactVersion } from "@/types/entities";
import { Caption, SummaryLinks, useDocTypeOptions, useProjects } from "./shared/lib";
import { RegisterArtifactDrawer } from "./shared/RegisterArtifactDrawer";

export default function Page() {
  const { can } = useWorksite();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useSelectedParam();
  const docTypes = useDocTypeOptions();
  const { projects, byId } = useProjects();
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

  // 적용 규칙 수: 버전에 기록된 규칙 id(중복 없이)
  const versions = useList<ArtifactVersion>({ resource: "artifact_versions", pagination: { mode: "off" } });
  const ruleCount = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const v of versions.result?.data ?? []) {
      const s = m.get(v.artifact_id) ?? new Set<string>();
      for (const r of v.applied_rule_ids) s.add(r);
      m.set(v.artifact_id, s);
    }
    return m;
  }, [versions.result]);

  const all = useList<Artifact>({ resource: "artifacts", pagination: { mode: "off" } });
  const rows = all.result?.data ?? [];
  const status = params.get("status");
  const setStatus = (v: string | null) => setParams((prev) => {
    const p = new URLSearchParams(prev);
    if (!v || p.get("status") === v) p.delete("status"); else p.set("status", v);
    p.delete("currentPage");
    return p;
  }, { replace: true });

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
      <DataTable<Artifact>
        resource="artifacts"
        ariaLabel="산출물 목록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "updated_at", order: "desc" }]}
        rowHref={(a) => `/docs/artifacts/${a.id}`}
        columns={[
          { key: "title", title: "제목", kind: "name" },
          {
            // AI 생성물 표시(인공지능기본법)라 좁은 화면에서도 빼지 않아요
            key: "flags", title: "표시", width: 120,
            render: (a) => (
              <span className="cb-title-cell">
                {a.ai_generated && <AiTag kind="draft" />}
                {a.sensitivity === "L2" && <SensitivityTag level="L2" />}
                {!a.ai_generated && a.sensitivity !== "L2" && <span className="ws-muted">—</span>}
              </span>
            ),
          },
          { key: "doc_type", title: "문서 유형", width: 136, render: (a) => <span className="ws-tag">{labelOf("artifacts.doc_type", a.doc_type)}</span> },
          { key: "project_id", title: "프로젝트", width: 180, render: (a) => { const n = a.project_id ? byId.get(a.project_id)?.name ?? "—" : "—"; return <span className="ws-ellipsis" title={n}>{n}</span>; } },
          { key: "current_version", title: "버전", low: true, width: 72, render: (a) => <span className="cb-tabular">v{a.current_version}</span> },
          { key: "rules", title: "적용 규칙", low: true, width: 96, align: "right", render: (a) => <span className="cb-tabular">{ruleCount.get(a.id)?.size ?? 0}개</span> },
          { key: "owner_id", title: "담당", kind: "person", width: 184 },
          { key: "status", title: "상태", kind: "status", statusDomain: "artifacts.status", width: 112 },
          { key: "updated_at", title: "수정일", sortable: true, width: 96, render: (a) => <span className="cb-tabular cb-nowrap">{formatDate(a.updated_at, false)}</span> },
        ]}
        mobileRow={(a) => ({
          title: a.title,
          subtitle: [labelOf("artifacts.doc_type", a.doc_type), a.project_id ? byId.get(a.project_id)?.name : null, `v${a.current_version}`, a.ai_generated ? "AI 초안 포함" : null, formatDate(a.updated_at, false)].filter(Boolean).join(" · "),
          trailing: <StatusTag {...statusOf("artifacts.status", a.status)} />,
        })}
        empty={{ kind: "empty", title: "아직 등록된 산출물이 없어요", description: "업무를 제출하면 여기에 쌓여요.", action: canCreate ? { label: "산출물 등록", onClick: () => setSelected("new") } : { label: "내 업무 보기", to: "/work" } }}
      />
      <Caption style={{ marginTop: 12 }}>파일 본체는 회사 저장소에 있고, 여기에는 제목·버전·적용 규칙 같은 정보만 남겨요.</Caption>
      {selected === "new" && canCreate && <RegisterArtifactDrawer open onClose={() => setSelected(null)} />}
    </>
  );
}
