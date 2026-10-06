// collab 그룹 화면이 함께 쓰는 도우미(소유: collab 그룹). 같은 그룹 폴더(docs·artifact-detail·templates·correction-rules·knowledge·
// glossary·mail-inbox·notices·notice-detail·calendar·approvals·people·org-chart·company-about)에서만 import합니다.
// 공통 승격 후보: KeyValue(정보 표), SummaryLinks(글자 링크 요약), ExternalLink — notes/collab.md 참고
import { useSyncExternalStore, type ReactNode } from "react";
import { Tooltip } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { useWorksite } from "@/app/TenantBoundary";
import { useList } from "@/lib/refine";
import { labelOf, type StatusValue } from "@/lib/status";
import type { Notice, Project } from "@/types/entities";
import type { Persona } from "@/data/seed/types";
import "./collab.css";

export type DocType = StatusValue<"artifacts.doc_type">;

/** 업종 팩별 문서 유형(빌드 스펙 C-01) */
const DOC_TYPES_BY_PACK: { manufacturing: DocType[]; education_consulting: DocType[] } = {
  education_consulting: ["proposal", "curriculum", "result_report", "quote", "minutes"],
  manufacturing: ["report_8d", "outgoing_cert", "daily_production", "request_4m", "monthly_quality"],
};

export function useDocTypes(): DocType[] {
  const { tenant } = useWorksite();
  return tenant.packs.includes("manufacturing") ? DOC_TYPES_BY_PACK.manufacturing : DOC_TYPES_BY_PACK.education_consulting;
}
export function useDocTypeOptions() {
  return useDocTypes().map((v) => ({ value: v, label: labelOf("artifacts.doc_type", v) }));
}

/** 볼 수 있는 프로젝트(공급자가 이미 거름) */
export function useProjects(enabled = true) {
  const q = useList<Project>({ resource: "projects", pagination: { mode: "off" }, sorters: [{ field: "code", order: "asc" }], queryOptions: { enabled } });
  const projects = q.result?.data ?? [];
  return { projects, byId: new Map(projects.map((p) => [p.id, p])), isLoading: q.query.isLoading };
}

export const isAdminish = (p: Persona) => p.role === "owner" || p.role === "admin";
export const isReviewerUp = (p: Persona) => p.role !== "member";

/** 수정 종류 글자 */
export const DIFF_LABEL: Record<"insert" | "delete" | "replace" | "move", string> = { insert: "추가", delete: "삭제", replace: "바꿈", move: "옮김" };

/** 공지 대상에 내가 드는지(작성자·관리자는 따로 판단) */
export function noticeForMe(n: Notice, persona: Persona, projects: Map<string, Project>): boolean {
  const a = n.audience;
  if (!a || a.type === "all") return true;
  if (a.type === "unit") return (a.ids ?? []).includes(persona.unitId);
  if (a.type === "role") return (a.ids ?? []).includes(persona.roleCode);
  return (a.ids ?? []).some((id) => {
    const p = projects.get(id);
    return !!p && (p.owner_member_id === persona.memberId || p.reviewer_member_id === persona.memberId || p.member_ids.includes(persona.memberId));
  });
}

/** 공지 대상 사람 id(작성자는 확인 대상에서 뺌). 조직·역할은 TenantConfig, 프로젝트는 볼 수 있는 프로젝트 기준 */
export function noticeAudienceIds(n: Notice, people: { id: string; unitId: string; roleCode: string }[], projects: Map<string, Project>): string[] {
  const a = n.audience;
  let ids: string[];
  if (!a || a.type === "all") ids = people.map((p) => p.id);
  else if (a.type === "unit") ids = people.filter((p) => (a.ids ?? []).includes(p.unitId)).map((p) => p.id);
  else if (a.type === "role") ids = people.filter((p) => (a.ids ?? []).includes(p.roleCode)).map((p) => p.id);
  else {
    const set = new Set<string>();
    for (const id of a.ids ?? []) {
      const pr = projects.get(id);
      if (pr) for (const m of [pr.owner_member_id, pr.reviewer_member_id, ...pr.member_ids]) set.add(m);
    }
    ids = [...set];
  }
  return ids.filter((id) => id !== n.author_id);
}

/** 정보 표(라벨 · 값) */
export function KeyValue({ items, ariaLabel }: { items: [string, ReactNode][]; ariaLabel?: string }) {
  return (
    <dl className="cb-kv" aria-label={ariaLabel}>
      {items.map(([k, v]) => (
        <div key={k} className="cb-kv__row">
          <dt>{k}</dt>
          <dd>{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 바깥 링크(회사 저장소·결재 시스템). 데모 링크는 열리지 않는 주소예요 */
export function ExternalLink({ href, children }: { href: string | null | undefined; children: ReactNode }) {
  if (!href) return <span className="ws-muted">링크 없음</span>;
  return (
    <Tooltip title="데모 링크예요. 실제 파일은 회사 저장소에 있어요">
      <a className="cb-extlink" href={href} target="_blank" rel="noreferrer noopener">
        {children}
        <ExportOutlined aria-hidden />
        <span className="ws-sr-only">(새 창)</span>
      </a>
    </Tooltip>
  );
}

/** 글자 링크 요약: "재검토 기한 지남 2 · 30일 안 재검토 3" (카드 아님) */
export function SummaryLinks({ items, ariaLabel }: { items: { key: string; label: string; count: number; pressed: boolean; onClick: () => void }[]; ariaLabel: string }) {
  return (
    <ul className="cb-summary" aria-label={ariaLabel}>
      {items.map((it) => (
        <li key={it.key}>
          <button type="button" className="cb-linkbtn" aria-pressed={it.pressed} onClick={it.onClick}>
            {it.label} <strong>{it.count}</strong>
          </button>
        </li>
      ))}
    </ul>
  );
}

const subscribeResize = (cb: () => void) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); };
/** 창 폭이 px 이상인지. 태블릿 구간(768~1279) 안에서 표 칸을 더 둘지 고를 때(예: 1024 이상이면 담당 칸) */
export function useMinWidth(px: number): boolean {
  return useSyncExternalStore(subscribeResize, () => window.innerWidth >= px, () => true);
}

/** 작은 설명 글 */
export const Caption = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => <p className="cb-caption" style={style}>{children}</p>;

/** "rule-cr-07" → "R-07" */
export const ruleCode = (id: string) => `R-${id.split("-").pop()}`;

/** 404인지 */
export const isNotFound = (err: unknown) => (err as { statusCode?: number } | null)?.statusCode === 404;
