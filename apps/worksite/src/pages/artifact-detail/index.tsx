// 산출물 상세 `/docs/artifacts/:artifactId` · C-02 · 깊이 A · 모듈 documents · 소유: collab 그룹
// 버전끼리 비교(?from=&to=)하고, 사람이 고친 내용이 어떤 규칙 후보가 되는지 봅니다(수정에서 배운 규칙 루프의 입구).
// 동작: [사유 남기기](담당·검토자, ?selected=<수정 id>) · [규칙 후보 보기] · [최종본으로 확정](검토자)
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Button, Input, Popover, Select, Skeleton } from "antd";
import { CheckOutlined, EditOutlined, ExportOutlined, SwapRightOutlined } from "@ant-design/icons";
import {
  AiTag, CardGrid, DetailDrawer, GridCell, Divider, EmptyState, PageHeader, PersonChip, SectionCard, SensitivityTag, StatusTag, Timeline, useConfirm,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useOne, useRpc } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { labelOf, statusOf } from "@/lib/status";
import type { Artifact, ArtifactVersion, Correction, Project, Rule, Task, Template } from "@/types/entities";
import { Caption, DIFF_LABEL, ExternalLink, KeyValue, isNotFound, ruleCode } from "../docs/shared/lib";

type ArtRel = Artifact & { _rel?: { project?: Project | null; task?: Task | null; template?: Template | null } };

const ruleHref = (r: Rule) => (r.status === "candidate" ? `/docs/rules?tab=pending&selected=${r.id}` : `/docs/rules?tab=rules&selected=${r.id}`);

function DiffBlock({ c }: { c: Correction }) {
  const beforeMark = c.diff_kind === "move" ? "옮기기 전" : "삭제";
  const afterMark = c.diff_kind === "move" ? "옮긴 뒤" : "추가";
  return (
    <dl className="cb-diff">
      {c.before != null && (
        <>
          <dt>전</dt>
          <dd>{c.diff_kind === "insert" ? c.before : <><span className="cb-del">{c.before}</span><span className="cb-diffmark">{beforeMark}</span></>}</dd>
        </>
      )}
      {c.after != null && (
        <>
          <dt>후</dt>
          <dd><span className="cb-ins">{c.after}</span><span className="cb-diffmark">{afterMark}</span></dd>
        </>
      )}
    </dl>
  );
}

export default function Page() {
  const { artifactId = "" } = useParams();
  const { persona, can } = useWorksite();
  const confirm = useConfirm();
  const [selected, setSelected] = useSelectedParam();
  const [fromParam, setFrom] = useUrlParam("from");
  const [toParam, setTo] = useUrlParam("to");
  const [reason, setReason] = useState("");

  const q = useOne<ArtRel>({ resource: "artifacts", id: artifactId, meta: { expand: ["project", "task", "template"] }, queryOptions: { retry: false } });
  const art = q.result;
  const versionsQ = useList<ArtifactVersion>({ resource: "artifact_versions", filters: [{ field: "artifact_id", operator: "eq", value: artifactId }], sorters: [{ field: "ver", order: "asc" }], pagination: { mode: "off" }, queryOptions: { enabled: !!art } });
  const corsQ = useList<Correction>({ resource: "corrections", filters: [{ field: "artifact_id", operator: "eq", value: artifactId }], pagination: { mode: "off" }, queryOptions: { enabled: !!art } });
  const rulesQ = useList<Rule>({ resource: "rules", pagination: { mode: "off" }, queryOptions: { enabled: !!art } });
  const finalize = useRpc("finalize_artifact", { successMessage: "최종본으로 확정했어요" });
  const saveReason = useRpc("set_correction_reason", { successMessage: "사유를 남겼어요" });
  usePageReady(!q.query.isLoading && (!art || (!versionsQ.query.isLoading && !corsQ.query.isLoading)));

  const versions = versionsQ.result?.data ?? [];
  const corrections = corsQ.result?.data ?? [];
  const ruleById = useMemo(() => new Map((rulesQ.result?.data ?? []).map((r) => [r.id, r])), [rulesQ.result]);

  if (q.query.isLoading) {
    return (
      <>
        <PageHeader title="산출물 상세" back={{ label: "산출물", to: "/docs" }} />
        <Skeleton active paragraph={{ rows: 6 }} />
      </>
    );
  }
  if (q.query.isError || !art) {
    return (
      <>
        <PageHeader title="산출물 상세" back={{ label: "산출물", to: "/docs" }} />
        {isNotFound(q.query.error) || !art
          ? <EmptyState kind="not_found" action={{ label: "산출물 목록으로", to: "/docs" }} />
          : <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void q.query.refetch() }} />}
      </>
    );
  }

  const first = versions[0]?.ver ?? 1;
  const last = versions[versions.length - 1]?.ver ?? art.current_version;
  const from = Math.max(first, Number(fromParam) || first);
  const to = Math.min(last, Number(toParam) || last);
  const inRange = corrections.filter((c) => c.ai_ver >= from && c.final_ver <= to).sort((a, b) => a.id.localeCompare(b.id));
  const appliedIds = [...new Set(versions.filter((v) => v.ver >= from && v.ver <= to).flatMap((v) => v.applied_rule_ids))];
  const canFinalize = can("artifacts", "approve", art as unknown as Record<string, unknown>).can && art.status !== "final";
  const canReason = art.owner_id === persona.memberId || can("artifacts", "approve", art as unknown as Record<string, unknown>).can;
  const editing = selected ? corrections.find((c) => c.id === selected) : undefined;
  const versionOptions = versions.map((v) => ({ value: String(v.ver), label: `v${v.ver} ${labelOf("artifact_versions.kind", v.kind)}` }));
  const project = art._rel?.project;
  const task = art._rel?.task;

  const doFinalize = async () => {
    const ok = await confirm({ title: "최종본으로 확정할까요?", content: `v${last}을 최종본으로 표시해요. 담당자에게 알려요.`, okText: "확정하기" });
    if (ok) await finalize.run({ artifactId: art.id }).catch(() => undefined);
  };

  return (
    <>
      <PageHeader
        title={art.title}
        back={{ label: "산출물", to: "/docs" }}
        meta={
          <>
            {art.ai_generated && <AiTag kind="draft" />}
            <StatusTag {...statusOf("artifacts.status", art.status)} />
            <SensitivityTag level={art.sensitivity} />
            <span className="cb-meta-text">
              {labelOf("artifacts.doc_type", art.doc_type)}
              {project ? <> · <Link to={`/projects/${project.id}`}>{project.name}</Link></> : null}
              {task ? <> · <Link to={`/work/tasks/${task.id}`}>업무: {task.title}</Link></> : null}
            </span>
          </>
        }
        actions={
          <div className="ws-row">
            {/* 머리 보조 버튼: 흰 알약(기본 버튼). 채운 버튼은 '최종본으로 확정' 하나뿐. 데모에선 안내 팝오버만 */}
            <Popover trigger="click" placement="bottomRight" title="연동 후 열려요" content={<p className="ws-demo-pop">파일은 회사 저장소에 있어요. 저장소를 연결하면 여기서 바로 열려요.</p>}>
              <Button icon={<ExportOutlined aria-hidden />} aria-label="파일 열기(연동 후 열려요)">파일 열기</Button>
            </Popover>
            {canFinalize && <Button type="primary" icon={<CheckOutlined aria-hidden />} loading={finalize.isPending} onClick={() => void doFinalize()}>최종본으로 확정</Button>}
          </div>
        }
      />

      <CardGrid>
        {/* 왼쪽 줄기: 버전 + 정보를 쌓아 오른쪽 긴 비교 카드 옆이 비지 않게(태블릿은 둘 다 한 줄 전체) */}
        <GridCell span={5}>
          <div className="ws-stack">
            <SectionCard title={`버전(${versions.length})`}>
              {versions.length ? (
                <Timeline
                  ariaLabel="버전 기록"
                  items={versions.map((v) => ({
                    id: v.id,
                    at: v.created_at,
                    title: `v${v.ver} ${labelOf("artifact_versions.kind", v.kind)}`,
                    description: v.applied_rule_ids.length ? `규칙 ${v.applied_rule_ids.length}개 적용` : undefined,
                    actor: v.author_kind === "ai" ? { kind: "ai" as const } : { memberId: v.author_id },
                    tone: v.kind === "final" ? "good" as const : v.kind === "ai_draft" ? "info" as const : "neutral" as const,
                  }))}
                />
              ) : <EmptyState kind="empty" compact title="버전 기록이 없어요" />}
              {versions.some((v) => v.author_kind === "ai") && <Caption style={{ marginTop: 16 }}>AI 연결이 만든 초안은 'AI 연결'로 표시해요. 담당자가 확인한 뒤 수정본으로 이어져요.</Caption>}
            </SectionCard>
            <SectionCard title="정보">
              <KeyValue
                items={[
                  ["문서 유형", labelOf("artifacts.doc_type", art.doc_type)],
                  ["담당", <PersonChip memberId={art.owner_id} size="sm" />],
                  ["양식", art._rel?.template ? `${art._rel.template.name} · ${art._rel.template.version}` : "—"],
                  ["파일(회사 저장소)", <ExternalLink href={art.file_ref}>v{art.current_version} 파일 링크</ExternalLink>],
                  ["수정일", formatDate(art.updated_at)],
                ]}
              />
            </SectionCard>
          </div>
        </GridCell>

        <SectionCard title={`비교(${inRange.length})`} span={7}>
          {versions.length < 2 ? (
            <EmptyState kind="empty" compact title="버전이 하나뿐이라 비교할 것이 없어요" description="수정본이 올라오면 바뀐 곳을 보여 줘요." />
          ) : (
            <>
              <div className="cb-compare" role="group" aria-label="비교할 버전">
                <Select aria-label="앞 버전" value={String(from)} options={versionOptions} onChange={(v) => setFrom(v)} />
                <SwapRightOutlined aria-hidden />
                <Select aria-label="뒤 버전" value={String(to)} options={versionOptions} onChange={(v) => setTo(v)} />
              </div>
              {from >= to ? (
                <EmptyState kind="empty" compact title="앞 버전을 뒤 버전보다 먼저로 골라 주세요" />
              ) : inRange.length === 0 ? (
                <EmptyState kind="empty" compact title="고친 내용이 없어요" description="이 두 버전 사이에 기록된 수정이 없어요." />
              ) : (
                <ul className="cb-rows" aria-label="수정 기록">
                  {inRange.map((c) => {
                    const rule = c.linked_rule_id ? ruleById.get(c.linked_rule_id) : undefined;
                    return (
                      <li key={c.id}>
                        <div className="cb-row">
                          <div className="cb-row__main">
                            <span className="cb-meta">
                              <span className="ws-tag">{DIFF_LABEL[c.diff_kind]}</span>
                              <span className="cb-meta-text">v{c.ai_ver} → v{c.final_ver}</span>
                            </span>
                            <DiffBlock c={c} />
                            <span className="cb-meta-text">
                              범위 제안: {labelOf("corrections.scope", c.scope_suggested)} · 신뢰도 {Math.round(c.scope_confidence * 100)}% · {labelOf("corrections.status", c.status)}
                            </span>
                            {c.reason ? <p className="cb-quote">사유: {c.reason}</p> : <span className="cb-caption">사유가 아직 없어요.</span>}
                          </div>
                          <div className="cb-row__actions">
                            {canReason && (
                              <Button className="ws-rowact" icon={<EditOutlined aria-hidden />} onClick={() => { setReason(c.reason ?? ""); setSelected(c.id); }}>
                                {c.reason ? "사유 고치기" : "사유 남기기"}
                              </Button>
                            )}
                            {rule && <Link to={ruleHref(rule)} className="ws-card__more">{rule.status === "candidate" ? "규칙 후보 보기" : "규칙 보기"}</Link>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Divider />
              <h3 className="cb-section-title">적용된 규칙</h3>
              {appliedIds.length ? (
                <ul className="cb-taglist" aria-label="적용된 규칙">
                  {appliedIds.map((id) => {
                    const r = ruleById.get(id);
                    return (
                      <li key={id}>
                        <Link to={r ? ruleHref(r) : "/docs/rules?tab=rules"} className="ws-tag ws-tag--brand" title={r?.statement}>
                          {ruleCode(id)} {r ? (r.statement.length > 22 ? `${r.statement.slice(0, 22)}…` : r.statement) : ""}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="cb-caption">{art?.ai_generated ? "이 범위의 AI 초안에 적용된 규칙이 없어요." : "사람이 쓴 초안이라 자동으로 적용된 규칙이 없어요."}</p>}
            </>
          )}
          <Caption style={{ marginTop: 16 }}>
            {art?.sensitivity === "L2"
              ? "고친 내용이 쌓이면 규칙 후보가 돼요. 고객 비밀(L2) 문서는 국내 경로가 열리기 전까지 AI 초안 없이 사람이 쓰고, 승인한 규칙은 작성 안내로 보여요."
              : "고친 내용이 쌓이면 규칙 후보가 돼요. 검토자가 승인한 규칙만 다음 AI 초안에 적용돼요."}
          </Caption>
        </SectionCard>
      </CardGrid>

      <DetailDrawer
        open={!!editing && canReason}
        title="수정 사유"
        onClose={() => setSelected(null)}
        footer={
          <Button type="primary" loading={saveReason.isPending} onClick={() => void saveReason.run({ correctionId: editing!.id, reason }).then(() => setSelected(null)).catch(() => undefined)}>
            사유 남기기
          </Button>
        }
      >
        {editing && (
          <div className="cb-stack" style={{ gap: 16 }}>
            <DiffBlock c={editing} />
            <label className="ws-t-label" htmlFor="cb-reason">왜 고쳤나요?</label>
            <Input.TextArea id="cb-reason" rows={4} maxLength={200} showCount value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 첫 장은 고객 문제로 시작해요" />
            <Caption>사유가 있으면 규칙 후보를 만들 때 근거로 써요. 고객 이름·금액은 적지 않아요.</Caption>
          </div>
        )}
      </DetailDrawer>
    </>
  );
}
