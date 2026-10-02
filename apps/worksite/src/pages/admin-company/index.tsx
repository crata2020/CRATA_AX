// Company DNA `/admin/settings` · A-06 · 깊이 B · 모듈 admin-settings · 소유: ara_settings 그룹(owner·admin만, 라우트가 막음)
// 회사별 설정(Company DNA Profile)이 적용된 결과를 봅니다. 원본은 CRATA 운영자가 차이(diff)로 고치고, 고객은 변경을 요청합니다.
// 데이터: TenantConfig(정체성·조직·역할·사업 구조·용어·주기·가설) + business_lines·projects + assignment_rules + glossary_terms + audit_events(tenant_settings)
// 동작: [변경 요청하기] 서랍(?selected=new) → rpc:request_profile_change(감사 기록) + 토스트
import { Link } from "react-router";
import { App, Button, Form, Input, Select, Skeleton } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { DetailDrawer, MasonryGrid, EmptyState, ListRows, Meter, PageHeader, SectionCard, Timeline, type TimelineItem } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useRpc } from "@/lib/refine";
import { useSelectedParam } from "@/lib/url";
import { formatDate } from "@/lib/format";
import { WIDGET_BY_ID, homeLayout } from "@/modules";
import type { PermissionBundle } from "@/tenants/types";
import type { AssignmentRule, AuditEvent, BusinessLine, GlossaryTerm, Project } from "@/types/entities";
import { Caption, KeyValue, ResponsiveTable, actionLabel, changeSummary, roleLabel } from "./shared/lib";

const PACK_LABEL: Record<string, string> = { manufacturing: "제조(생산·품질)", education_consulting: "교육·컨설팅(영업·교육)" };
const AREAS = ["정체성", "사업 구조", "조직·역할 매핑", "배분 규칙", "회의·법정 주기", "용어", "근거와 신뢰도", "그 밖의 것"];

function RequestDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ area: string; reason: string }>();
  const { run, isPending } = useRpc("request_profile_change");
  const submit = async () => {
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    try {
      await run(v);
      message.success("CRATA 운영자에게 보냈어요(예시)");
      form.resetFields();
      onClose();
    } catch { /* 토스트는 useRpc */ }
  };
  return (
    <DetailDrawer open={open} title="변경 요청하기" onClose={onClose} footer={<Button type="primary" icon={<SendOutlined aria-hidden />} loading={isPending} onClick={() => void submit()}>보내기</Button>}>
      <p className="as-text-2" style={{ marginBottom: 16 }}>원본 프로파일은 CRATA 운영자가 고쳐요. 무엇을 왜 바꿀지 적어 주면 확인 후 반영해요. 데모에서는 감사 기록만 남겨요.</p>
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ area: AREAS[0] }}>
        <Form.Item name="area" label="무엇을" rules={[{ required: true, message: "바꿀 곳을 골라 주세요" }]}>
          <Select options={AREAS.map((a) => ({ value: a, label: a }))} />
        </Form.Item>
        <Form.Item name="reason" label="왜" rules={[{ required: true, whitespace: true, message: "이유를 적어 주세요" }]}>
          <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} maxLength={200} showCount placeholder="예: 품질보증팀이 신규 품목 개발 검토도 맡게 됐어요" />
        </Form.Item>
      </Form>
    </DetailDrawer>
  );
}

export default function Page() {
  const { tenant, enabledModules, t, today } = useWorksite();
  const [selected, setSelected] = useSelectedParam();
  const lines = useList<BusinessLine>({ resource: "business_lines", pagination: { mode: "off" }, sorters: [{ field: "sort_order", order: "asc" }] });
  const projects = useList<Project>({ resource: "projects", pagination: { mode: "off" } });
  const rules = useList<AssignmentRule>({ resource: "assignment_rules", pagination: { mode: "off" } });
  const terms = useList<GlossaryTerm>({ resource: "glossary_terms", pagination: { mode: "off" } });
  const history = useList<AuditEvent>({
    resource: "audit_events", pagination: { currentPage: 1, pageSize: 20 },
    filters: [{ field: "resource", operator: "eq", value: "tenant_settings" }], sorters: [{ field: "at", order: "desc" }],
  });
  const loading = lines.query.isLoading || projects.query.isLoading || rules.query.isLoading || terms.query.isLoading || history.query.isLoading;
  usePageReady(!loading);

  const unitName = (id: string) => tenant.orgUnits.find((u) => u.id === id)?.name ?? "—";
  const bundlesOf = (code: string) => (Object.entries(tenant.permissionBundles) as [PermissionBundle, string[]][]).filter(([, c]) => c.includes(code)).map(([b]) => b);
  const projCount = (lineId: string) => (projects.result?.data ?? []).filter((p) => p.business_line_id === lineId).length;
  const termList = terms.result?.data ?? [];
  const homeText = (r: (typeof tenant.roles)[number]): string => {
    const ids = homeLayout(tenant, { roleCode: r.code, unitId: r.unitId, homePreset: r.homePreset, bundles: bundlesOf(r.code) }, enabledModules).filter((id) => id !== "greeting");
    const names = ids.map((id) => WIDGET_BY_ID[id]?.nameKo ?? id);
    return names.length > 3 ? `${names.slice(0, 3).join(", ")} 외 ${names.length - 3}개` : names.join(", ") || "기본";
  };

  const historyItems: TimelineItem[] = (history.result?.data ?? []).map((e): TimelineItem => {
    const operator = e.actor_type === "crata_operator";
    return {
      id: e.id,
      at: e.at,
      title: `${operator ? "CRATA 운영자 · " : ""}${actionLabel(e.action)}`,
      description: operator ? `${changeSummary(e)} · ${tenant.profile.sourceNote}` : changeSummary(e),
      tone: operator ? "info" : e.action === "rpc:profile_change_requested" ? "warning" : "neutral",
      actor: e.actor_type === "member" ? { memberId: e.actor_id } : e.actor_type === "system" ? { kind: "system" } : undefined,
    };
  });

  return (
    <>
      <PageHeader
        title="회사 설정(Company DNA)"
        description="회사가 일하는 방식을 담은 설정이에요. 원본은 CRATA 운영자가 고쳐요."
        meta={<><span className="ws-tag">프로파일 {tenant.profile.version}</span><span>{formatDate(tenant.profile.verifiedOn <= today ? tenant.profile.verifiedOn : today, false)} 확인</span><span>· {tenant.profile.sourceNote}</span></>}
        actions={<Button type="primary" onClick={() => setSelected("new")}>변경 요청하기</Button>}
      />
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} title={false} />
      ) : (
        <MasonryGrid
          items={[
            { key: "identity", node: (
              <SectionCard span={6} title="정체성">
                <KeyValue
                  ariaLabel="정체성"
                  items={[
                    ["표시명", tenant.displayName],
                    ["법인명", tenant.legalName ?? "작성 전"],
                    ["모노그램", <span className="as-row"><span className="as-mono" aria-hidden>{tenant.monogram}</span><span>{tenant.monogram}</span><Link to="/admin/theme">바꾸기</Link></span>],
                    ["한 줄 소개", tenant.tagline],
                    ["업종 팩", tenant.packs.map((p) => PACK_LABEL[p] ?? p).join(", ") || "없음"],
                  ]}
                />
              </SectionCard>
            ) },
            { key: "lines", node: (
              <SectionCard span={6} title="사업 구조" more={{ label: `${t("term.project")} 보기`, to: "/projects" }}>
                {lines.query.isError ? (
                  <EmptyState compact kind="error" action={{ label: "다시 시도", onClick: () => void lines.query.refetch() }} />
                ) : (
                  <ListRows
                    ariaLabel="사업 목록"
                    rows={(lines.result?.data ?? []).map((l) => ({
                      key: l.id,
                      title: `${l.name}`,
                      subtitle: `${l.code} · ${t("term.project")} ${projCount(l.id)}개${l.description ? ` · ${l.description}` : ""}`,
                      trailing: l.hypothesis ? <span className="ws-tag">가설</span> : undefined,
                      to: "/projects",
                    }))}
                    empty={<EmptyState compact kind="empty" title="사업 구조가 아직 없어요" description="진단에서 사업과 프로젝트를 정해요." />}
                  />
                )}
              </SectionCard>
            ) },
            { key: "roles", full: true, node: (
              <SectionCard span={12} title="조직·역할 매핑" caption="역할코드마다 플랫폼 역할 하나와 소속 하나를 정해요. 홈 구성은 이 회사 설정으로 계산한 결과예요.">
                <ResponsiveTable
                  ariaLabel="역할 매핑"
                  rows={tenant.roles}
                  rowKey={(r) => r.code}
                  columns={[
                    { key: "code", title: "역할코드", render: (r) => <code className="as-code" translate="no">{r.code}</code> },
                    { key: "title", title: "직함", render: (r) => <b>{r.title}</b> },
                    { key: "unit", title: "소속", render: (r) => unitName(r.unitId) },
                    { key: "role", title: "플랫폼 역할", render: (r) => roleLabel(r.platformRole) },
                    { key: "home", title: "홈 구성", render: (r) => homeText(r) },
                    { key: "hyp", title: "근거", render: (r) => <span className="as-row">{r.hypothesis ? <span className="ws-tag">가설</span> : <span className="ws-tag">확인됨</span>}{bundlesOf(r.code).includes("view_prices") && <span className="ws-tag">금액 보기</span>}</span> },
                  ]}
                  mobile={(r) => ({
                    title: <>{r.title}{r.hypothesis && <span className="ws-tag">가설</span>}</>,
                    lines: [["역할코드", <code className="as-code" translate="no">{r.code}</code>], ["소속", unitName(r.unitId)], ["플랫폼 역할", roleLabel(r.platformRole)], ["홈 구성", homeText(r)]],
                  })}
                />
              </SectionCard>
            ) },
            { key: "rules", node: (
              <SectionCard span={6} title="배분 규칙" more={{ label: "업무 보기", to: "/work" }}>
                <ListRows
                  ariaLabel="배분 규칙"
                  rows={(rules.result?.data ?? []).map((r) => ({ key: r.id, title: r.name, subtitle: `${r.condition} → 담당 ${r.assignee_rule} · 검토 ${r.reviewer_rule}`, trailing: r.active ? undefined : <span className="ws-tag">멈춤</span> }))}
                  empty={<EmptyState compact kind="empty" title="배분 규칙이 아직 없어요" description="진단에서 업무를 누구에게 맡기고 누가 검토할지 정해요." />}
                />
              </SectionCard>
            ) },
            { key: "cadence", node: (
              <SectionCard span={6} title="회의·법정 주기">
                <ListRows
                  ariaLabel="주기"
                  rows={tenant.facts.cadences.map((c) => ({ key: c.name, title: c.name, subtitle: `${c.rule}${c.basis ? ` · ${c.basis}` : ""}` }))}
                  empty={<EmptyState compact kind="empty" title="정한 주기가 아직 없어요" description="회의·보고 주기는 내부 적용을 시작하면서 정해요." />}
                />
              </SectionCard>
            ) },
            { key: "terms", node: (
              <SectionCard span={6} title="용어" more={{ label: "용어집 보기", to: "/docs/glossary" }}>
                <p className="as-text" style={{ marginBottom: 8 }}>회사 용어 <b className="as-tabular">{termList.length}</b>개 · 확인할 업계 용어 <b className="as-tabular">{termList.filter((x) => x.to_confirm).length}</b>개</p>
                <ListRows
                  ariaLabel="자주 쓰는 용어"
                  rows={termList.slice(0, 5).map((g) => ({ key: g.id, title: g.ui_label === g.term ? g.term : `${g.term} → ${g.ui_label}`, subtitle: g.definition, trailing: g.to_confirm ? <span className="ws-tag">확인 필요</span> : undefined }))}
                  empty={<EmptyState compact kind="empty" title="용어가 아직 없어요" />}
                />
              </SectionCard>
            ) },
            { key: "facts", node: (
              <SectionCard span={6} title="근거와 신뢰도" caption="신뢰도는 진단 전 추정이에요. 진단에서 확인하면 '가설' 표시를 지워요.">
                <div className="as-stack">
                  {tenant.facts.hypotheses.map((h) => (
                    <Meter key={h.label} label={h.label} value={Math.round(h.confidence * 100)} max={100} valueText={`신뢰도 ${Math.round(h.confidence * 100)}%`} />
                  ))}
                </div>
                {tenant.facts.todo.length > 0 && (
                  <>
                    <div className="as-subhead as-mt-lg">진단에서 확인할 것</div>
                    <ul className="as-bullets">
                      {tenant.facts.todo.map((x) => <li key={x}><span>{x}</span></li>)}
                    </ul>
                  </>
                )}
              </SectionCard>
            ) },
            { key: "history", full: true, node: (
              <SectionCard span={12} title="변경 이력" demo>
                {history.query.isError ? (
                  <EmptyState compact kind="error" action={{ label: "다시 시도", onClick: () => void history.query.refetch() }} />
                ) : (
                  historyItems.length ? <Timeline items={historyItems} ariaLabel="프로파일 변경 이력" /> : <EmptyState compact kind="empty" title="아직 바뀐 기록이 없어요" description="CRATA 운영자가 프로파일을 적용하면 여기에 남아요." />
                )}
                <Caption style={{ marginTop: 12 }}>모듈·테마를 바꾸거나 변경을 요청하면 여기에 쌓여요. 전체 기록은 <Link to="/admin/audit">감사 로그</Link>에서 봐요.</Caption>
              </SectionCard>
            ) },
          ]}
        />
      )}
      <RequestDrawer open={selected === "new"} onClose={() => setSelected(null)} />
    </>
  );
}

