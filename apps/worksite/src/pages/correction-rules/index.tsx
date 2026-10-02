// 작성 규칙(수정에서 배운 규칙) `/docs/rules` · C-04 · 깊이 A · 모듈 correction-rules · 소유: collab 그룹
// 고친 내용을 범위(양식·작성 규칙·이번 문서만)로 나눠 승인하고(?tab=pending), 규칙 목록(?tab=rules)과 효과(?tab=effect)를 봅니다.
// 동작: [승인하기] rpc:approve_rule · [반려하기] rpc:reject_rule · [근거 보기] ?selected=<규칙 id> 서랍. member는 조회만.
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "antd";
import {
  CardGrid, DataTable, DdayBadge, DetailDrawer, Divider, EmptyState, FilterBar, PageHeader, PersonChip, SectionCard, SimpleBarChart, StackedShareBar,
  StatRow, StatTile, StatusTag, useFilterBarState, type FilterBarProps,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useRpc } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate, formatNumber } from "@/lib/format";
import { addDays } from "@/lib/clock";
import { labelOf, optionsOf, statusOf } from "@/lib/status";
import type { Artifact, Correction, KpiValue, Rule } from "@/types/entities";
import { Caption, DIFF_LABEL, KeyValue, ruleCode, useDocTypeOptions } from "../docs/shared/lib";

type Tab = "pending" | "rules" | "effect";
const overrideRate = (r: Rule) => (r.stats.applied ? Math.round((r.stats.overridden / r.stats.applied) * 100) : 0);
const needsReview = (r: Rule) => r.status === "active" && r.stats.applied >= 10 && overrideRate(r) >= 30;

function useRuleActions() {
  const approve = useRpc("approve_rule", { successMessage: "규칙을 승인했어요. 다음 AI 초안부터 적용돼요" });
  const reject = useRpc("reject_rule", { successMessage: "규칙 후보를 반려했어요. 근거 수정은 '이번만'으로 남겨요" });
  return { approve, reject };
}

/** 근거 보기·규칙 상세 서랍 */
function RuleDrawer({ rule, onClose, canApprove }: { rule: Rule | undefined; onClose: () => void; canApprove: boolean }) {
  const ids = rule?.evidence_ids ?? [];
  const cors = useList<Correction>({ resource: "corrections", pagination: { mode: "off" }, filters: [{ field: "id", operator: "in", value: ids }], queryOptions: { enabled: !!rule && ids.length > 0 } });
  const arts = useList<Artifact>({ resource: "artifacts", pagination: { mode: "off" }, queryOptions: { enabled: !!rule } });
  const artById = new Map((arts.result?.data ?? []).map((a) => [a.id, a]));
  const { approve, reject } = useRuleActions();
  const visible = cors.result?.data ?? [];
  const hidden = ids.length - visible.length;
  const busy = approve.isPending || reject.isPending;
  return (
    <DetailDrawer
      open={!!rule}
      title={rule ? `${ruleCode(rule.id)} 규칙` : "규칙"}
      onClose={onClose}
      extra={rule ? <StatusTag {...statusOf("rules.status", rule.status)} /> : undefined}
      footer={rule?.status === "candidate" && canApprove ? (
        <>
          <Button disabled={busy} onClick={() => void reject.run({ ruleId: rule.id }).then(onClose).catch(() => undefined)}>반려하기</Button>
          <Button type="primary" loading={approve.isPending} disabled={busy} onClick={() => void approve.run({ ruleId: rule.id }).then(onClose).catch(() => undefined)}>승인하기</Button>
        </>
      ) : undefined}
    >
      {rule && (
        <>
          <section className="cb-drawer-section">
            <p className="cb-row__title" style={{ fontSize: 17, lineHeight: "26px" }}>{rule.statement}</p>
            <div className="cb-mt">
              <KeyValue
                items={[
                  ["범위", labelOf("corrections.scope", rule.scope_level)],
                  ["문서 유형", rule.doc_types.map((d) => labelOf("artifacts.doc_type", d)).join(" · ")],
                  ["승인자", rule.approver_id ? <PersonChip memberId={rule.approver_id} size="sm" /> : "—"],
                  ["적용 시작", formatDate(rule.valid_from)],
                  ["재검토일", rule.review_by ? <span className="ws-row">{formatDate(rule.review_by)}<DdayBadge date={rule.review_by} noun="재검토" /></span> : "—"],
                  ["적용 · 무시", rule.stats.applied ? `${formatNumber(rule.stats.applied)}회 · ${formatNumber(rule.stats.overridden)}회(${overrideRate(rule)}%)` : "아직 적용 전이에요"],
                  ["적용 위치", rule.compiled_to ?? "승인하면 작성 규칙에 들어가요"],
                ]}
              />
            </div>
            {rule.examples.length > 0 && (
              <div className="cb-mt">
                {rule.examples.map((ex) => <p key={ex} className="cb-quote">{ex}</p>)}
              </div>
            )}
          </section>
          <section className="cb-drawer-section">
            <h3>근거 수정 {ids.length}건</h3>
            {visible.length ? (
              <ul className="cb-rows">
                {visible.map((c) => (
                  <li key={c.id}>
                    <div className="cb-row">
                      <div className="cb-row__main">
                        <span className="cb-meta">
                          <span className="ws-tag">{DIFF_LABEL[c.diff_kind]}</span>
                          <Link to={`/docs/artifacts/${c.artifact_id}?from=${c.ai_ver}&to=${c.final_ver}`}>{artById.get(c.artifact_id)?.title ?? "산출물"}</Link>
                        </span>
                        <dl className="cb-diff">
                          {c.before != null && <><dt>전</dt><dd>{c.diff_kind === "insert" ? c.before : <span className="cb-del">{c.before}</span>}</dd></>}
                          {c.after != null && <><dt>후</dt><dd><span className="cb-ins">{c.after}</span></dd></>}
                        </dl>
                        <span className="cb-caption">범위 제안 {labelOf("corrections.scope", c.scope_suggested)} · 신뢰도 {Math.round(c.scope_confidence * 100)}%{c.reason ? ` · 사유: ${c.reason}` : ""}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="cb-caption">{ids.length ? "근거 수정을 불러오는 중이거나 볼 수 없는 산출물에 있어요." : "근거로 묶인 수정이 없어요."}</p>}
            {hidden > 0 && visible.length > 0 && <Caption style={{ marginTop: 8 }}>볼 수 없는 산출물(L2)의 수정 {hidden}건은 숨겼어요.</Caption>}
          </section>
        </>
      )}
    </DetailDrawer>
  );
}

function PendingTab({ rules, canApprove, onOpen }: { rules: Rule[]; canApprove: boolean; onOpen: (id: string) => void }) {
  const { approve, reject } = useRuleActions();
  const pending = rules.filter((r) => r.status === "candidate").sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <SectionCard title={`승인 대기(${pending.length})`} caption={canApprove ? "승인하면 오늘부터 적용하고 90일 뒤에 다시 검토해요." : "승인은 검토자가 해요. 근거는 누구나 볼 수 있어요."}>
      {pending.length === 0 ? (
        <EmptyState kind="empty" compact title="승인할 규칙 후보가 없어요" description="같은 수정이 여러 번 나오면 후보가 생겨요." />
      ) : (
        <ul className="cb-rows" aria-label="규칙 후보">
          {pending.map((r) => (
            <li key={r.id}>
              <div className="cb-row">
                <div className="cb-row__main">
                  <span className="cb-row__title">{r.statement}</span>
                  <span className="cb-meta">
                    <span className="ws-tag ws-tag--brand">{labelOf("corrections.scope", r.scope_level)}</span>
                    {r.doc_types.map((d) => <span key={d} className="ws-tag">{labelOf("artifacts.doc_type", d)}</span>)}
                    <span className="cb-meta-text">근거 수정 {r.evidence_ids.length}건</span>
                    <Button type="link" size="small" style={{ paddingInline: 0 }} onClick={() => onOpen(r.id)}>근거 보기</Button>
                  </span>
                </div>
                {canApprove && (
                  <div className="cb-row__actions">
                    <Button disabled={approve.isPending || reject.isPending} onClick={() => void reject.run({ ruleId: r.id }).catch(() => undefined)}>반려하기</Button>
                    <Button type="primary" disabled={approve.isPending || reject.isPending} onClick={() => void approve.run({ ruleId: r.id }).catch(() => undefined)}>승인하기</Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function RulesTab({ onOpen }: { onOpen: (id: string) => void }) {
  const docTypes = useDocTypeOptions();
  const fbProps: FilterBarProps = {
    search: { placeholder: "규칙 검색", fields: ["statement"] },
    chips: [
      { param: "scope", field: "scope_level", options: optionsOf("corrections.scope"), ariaLabel: "범위" },
      { param: "rstatus", field: "status", options: optionsOf("rules.status").filter((o) => o.value !== "candidate"), multiple: true, ariaLabel: "상태" },
    ],
    selects: [{ param: "doc", label: "문서 유형", field: "doc_types", options: docTypes }],
  };
  const fb = useFilterBarState(fbProps);
  return (
    <>
      <FilterBar {...fbProps} />
      <DataTable<Rule>
        syncWithLocation={false}
        resource="rules"
        ariaLabel="규칙 목록"
        filters={[{ field: "status", operator: "ne", value: "candidate" }, ...fb.filters]}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "valid_from", order: "desc" }]}
        onRowClick={(r) => onOpen(r.id)}
        columns={[
          { key: "statement", title: "규칙 문장", flex: true, render: (r) => <span className="ws-cell-name">{ruleCode(r.id)} {r.statement}</span> },
          { key: "scope_level", title: "범위", render: (r) => <span className="ws-tag">{labelOf("corrections.scope", r.scope_level)}</span> },
          { key: "doc_types", title: "문서 유형", kind: "tag", statusDomain: "artifacts.doc_type" },
          { key: "status", title: "상태", kind: "status", statusDomain: "rules.status" },
          { key: "applied", title: "적용 수", render: (r) => <span className="cb-tabular">{formatNumber(r.stats.applied)}회</span> },
          {
            key: "override", title: "무시율",
            render: (r) => (
              <span className="ws-row" style={{ flexWrap: "nowrap" }}>
                <span className="cb-tabular">{r.stats.applied ? `${overrideRate(r)}%` : "—"}</span>
                {needsReview(r) && <StatusTag tone="warning" label="재검토 필요" />}
              </span>
            ),
          },
          { key: "approver_id", title: "승인자", kind: "person" },
          { key: "review_by", title: "재검토일", render: (r) => (r.review_by ? <span className="ws-row" style={{ flexWrap: "nowrap" }}><span className="ws-date">{formatDate(r.review_by, false)}</span><DdayBadge date={r.review_by} noun="재검토" done={r.status !== "active"} /></span> : "—") },
        ]}
        mobileRow={(r) => ({
          title: `${ruleCode(r.id)} ${r.statement}`,
          subtitle: `${labelOf("corrections.scope", r.scope_level)} · ${r.doc_types.map((d) => labelOf("artifacts.doc_type", d)).join("·")} · 적용 ${r.stats.applied}회`,
          trailing: <StatusTag {...statusOf("rules.status", r.status)} />,
        })}
        empty={{ kind: "empty", title: "아직 승인한 규칙이 없어요", description: "승인 대기 탭에서 규칙 후보를 승인하면 여기에 쌓여요." }}
      />
    </>
  );
}

function EffectTab({ weeks, rules }: { weeks: number; rules: Rule[] }) {
  const { can, today, tenant } = useWorksite();
  const allowed = can("kpi_values", "list").can;
  // 범위 3색: validate_palette.js(--pairs all)로 확인한 조합. CRATA 1·2·7 통과, TR 1·2·3 통과(대비 경고 → 범례 + 표로 보기)
  const thirdSlot = tenant.packs.includes("manufacturing") ? 3 : 7;
  const kv = useList<KpiValue>({
    resource: "kpi_values", pagination: { mode: "off" }, sorters: [{ field: "period", order: "asc" }],
    filters: [{ field: "kpi_id", operator: "in", value: ["AX_REPEAT_RATE", "AX_FIRST_PASS", "AX_REVIEW_MIN"] }], queryOptions: { enabled: allowed },
  });
  const cors = useList<Correction>({ resource: "corrections", pagination: { mode: "off" } });
  usePageReady(!allowed || !kv.query.isLoading);
  const series = (id: string) => (kv.result?.data ?? []).filter((v) => v.kpi_id === id);
  const repeat = series("AX_REPEAT_RATE");
  const pass = series("AX_FIRST_PASS");
  const review = series("AX_REVIEW_MIN");
  const scopeCounts = useMemo(() => {
    const m = { template: 0, writing_rule: 0, one_off: 0 } as Record<string, number>;
    for (const c of cors.result?.data ?? []) m[c.scope_suggested] = (m[c.scope_suggested] ?? 0) + 1;
    return m;
  }, [cors.result]);

  if (!allowed) return <EmptyState kind="empty" title="효과 지표는 검토자와 관리자가 봐요" description="승인 대기와 규칙 목록은 누구나 볼 수 있어요." />;
  if (kv.query.isLoading) return <div style={{ minHeight: 200 }} aria-busy="true" />;
  if (repeat.length < 4) return <EmptyState kind="empty" title="수정 기록이 4주 이상 쌓이면 효과가 보여요" description="같은 종류 문서가 쌓일수록 같은 수정이 줄어드는지 봐요." />;

  const last = <T extends { value: number }>(s: T[], back = 0) => s[s.length - 1 - back];
  const d = (s: KpiValue[]) => (s.length > 1 ? Math.round((last(s)!.value - last(s, 1)!.value) * 10) / 10 : 0);
  const shown = repeat.slice(-weeks);
  const shortWeek = (p: string) => { const [, m, dd] = p.split("-").map(Number); return `${m}/${dd}`; };
  const active = rules.filter((r) => r.status === "active");
  const flagged = active.filter((r) => needsReview(r) || (r.review_by != null && r.review_by <= addDays(today, 14)));

  return (
    <>
      <CardGrid>
        <SectionCard title="같은 수정 재발률" pill demo span={6}>
          <StatTile hero label="이번 주" value={last(repeat)!.value} unit="%" delta={{ value: d(repeat), unit: "%p", period: "지난주보다", goodWhen: "down" }} />
          <Divider />
          <StatRow>
            {pass.length > 0 && <StatTile label="1차 통과율" value={last(pass)!.value} unit="%" delta={{ value: d(pass), unit: "%p", period: "지난주보다", goodWhen: "up" }} />}
            {review.length > 0 && <StatTile label="평균 검토 시간" value={last(review)!.value} unit="분" delta={{ value: d(review), unit: "분", period: "지난주보다", goodWhen: "down" }} />}
          </StatRow>
        </SectionCard>
        <SectionCard title={`${weeks}주 추이`} pill demo span={6}>
          <SimpleBarChart
            data={shown.map((v) => ({ key: v.period, label: shortWeek(v.period), value: v.value }))}
            unit="%"
            highlightKey={last(shown)!.period}
            height={200}
            ariaLabel={`같은 수정 재발률 최근 ${shown.length}주, 첫 주 ${shown[0]!.value}%, 이번 주 ${last(shown)!.value}%`}
            tableCaption={`같은 수정 재발률(주 시작일 기준, 최근 ${shown.length}주)`}
          />
        </SectionCard>
        <SectionCard title="규칙 건강도" demo span={12}>
          <StatRow>
            <StatTile label="적용 중" value={active.length} unit="개" />
            <StatTile label="승인 대기" value={rules.filter((r) => r.status === "candidate").length} unit="개" />
            <StatTile label="멈춤" value={rules.filter((r) => r.status === "paused").length} unit="개" />
            <StatTile label="곧 재검토" value={flagged.length} unit="개" caption="무시율 30% 이상이거나 14일 안 재검토" />
          </StatRow>
          <Divider />
          <h3 className="cb-section-title">고친 내용의 범위</h3>
          <StackedShareBar
            unit="건"
            ariaLabel="수정 기록 범위 나눔"
            segments={[
              { key: "writing_rule", label: labelOf("corrections.scope", "writing_rule"), value: scopeCounts.writing_rule ?? 0, slot: 1 },
              { key: "template", label: labelOf("corrections.scope", "template"), value: scopeCounts.template ?? 0, slot: 2 },
              { key: "one_off", label: labelOf("corrections.scope", "one_off"), value: scopeCounts.one_off ?? 0, slot: thirdSlot as 3 | 7 },
            ]}
          />
          {flagged.length > 0 && (
            <>
              <Divider />
              <ul className="cb-rows" aria-label="곧 재검토할 규칙">
                {flagged.map((r) => (
                  <li key={r.id}>
                    <div className="cb-row">
                      <div className="cb-row__main">
                        <Link to={`?tab=rules&selected=${r.id}`} className="cb-row__title">{ruleCode(r.id)} {r.statement}</Link>
                        <span className="cb-caption">무시율 {overrideRate(r)}% · 재검토일 {formatDate(r.review_by)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>
      </CardGrid>
      <Caption style={{ marginTop: 16 }}>같은 종류 문서가 쌓일수록 줄어드는지 봐요. 수정이 0이 되는 것을 약속하지는 않아요.</Caption>
    </>
  );
}

export default function Page() {
  const { can } = useWorksite();
  const [params] = useSearchParams();
  const [selected, setSelected] = useSelectedParam();
  const [period] = useUrlParam("period", "8");
  const rulesQ = useList<Rule>({ resource: "rules", pagination: { mode: "off" } });
  usePageReady(!rulesQ.query.isLoading);
  const rules = rulesQ.result?.data ?? [];
  const tab = ((params.get("tab") as Tab | null) ?? "pending") as Tab;
  const canApprove = can("rules", "approve").can;
  const current = selected ? rules.find((r) => r.id === selected) : undefined;
  const weeks = period === "4" ? 4 : 8;

  return (
    <>
      <PageHeader
        title="작성 규칙"
        description="고친 내용이 쌓이면 회사 규칙이 돼요. 승인한 것만 다음 초안에 적용돼요."
        tabs={[
          { key: "pending", label: "승인 대기", to: "?tab=pending", badge: rules.filter((r) => r.status === "candidate").length },
          { key: "rules", label: `규칙 ${rules.filter((r) => r.status !== "candidate").length}`, to: "?tab=rules" },
          { key: "effect", label: "효과", to: "?tab=effect" },
        ]}
        period={tab === "effect" ? { ariaLabel: "기간", urlParam: "period", value: "8", onChange: () => undefined, options: [{ value: "4", label: "4주" }, { value: "8", label: "8주" }] } : undefined}
      />
      {rulesQ.query.isError ? (
        <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void rulesQ.query.refetch() }} />
      ) : rulesQ.query.isLoading ? (
        <div style={{ minHeight: 200 }} aria-busy="true" />
      ) : tab === "rules" ? (
        <RulesTab onOpen={(id) => setSelected(id)} />
      ) : tab === "effect" ? (
        <EffectTab weeks={weeks} rules={rules} />
      ) : (
        <PendingTab rules={rules} canApprove={canApprove} onOpen={(id) => setSelected(id)} />
      )}
      <RuleDrawer rule={current} onClose={() => setSelected(null)} canApprove={canApprove} />
    </>
  );
}
