// AI 연결 정책 `/admin/ai-policy` · A-09 · 깊이 B · 모듈 ai-connect · 소유: ara_settings 그룹(owner·admin만)
// 직원이 자기 AI(ChatGPT·Claude·Codex)로 회사 업무를 다루는 범위를 정합니다.
// 데이터: mcp_policies(1행) · mcp_connections(회사 전체, 대화 내용 없는 메타데이터)
// 동작: 정책 저장(mcp_policies update + 감사 기록) · [모든 연결 끊기] → 확인 → rpc:revoke_all_mcp
import { useEffect, useState } from "react";
import { App, Button, Checkbox, Skeleton, Switch } from "antd";
import { DisconnectOutlined } from "@ant-design/icons";
import { CardGrid, CopyField, DataTable, EmptyState, FilterBar, PageHeader, SectionCard, StatRow, StatTile, StatusTag, useConfirm, useFilterBarState, type FilterBarProps } from "@/components";
import { usePageReady } from "@/app/pageReady";
import { useWorksite } from "@/app/TenantBoundary";
import { useList, useRpc, useUpdate } from "@/lib/refine";
import { formatDate, formatDateTime } from "@/lib/format";
import type { McpConnection, McpPolicy } from "@/types/entities";
import { CLIENTS, KeyValue, SCOPE_LABEL, mcpUrl, noticeVersionText, scopeText } from "../admin-company/shared/lib";

const SCOPES = Object.keys(SCOPE_LABEL);

function PolicyForm({ policy }: { policy: McpPolicy }) {
  const { persona } = useWorksite();
  const { message } = App.useApp();
  const [v, setV] = useState({ enabled: policy.enabled, read_only: policy.read_only, allowed_clients: [...policy.allowed_clients] as string[], allowed_scopes: [...policy.allowed_scopes] });
  useEffect(() => {
    setV({ enabled: policy.enabled, read_only: policy.read_only, allowed_clients: [...policy.allowed_clients], allowed_scopes: [...policy.allowed_scopes] });
  }, [policy]);
  const { mutateAsync: update, mutation } = useUpdate();
  const dirty = v.enabled !== policy.enabled || v.read_only !== policy.read_only
    || [...v.allowed_clients].sort().join() !== [...policy.allowed_clients].sort().join()
    || [...v.allowed_scopes].sort().join() !== [...policy.allowed_scopes].sort().join();

  const save = async () => {
    if (v.enabled && !v.allowed_clients.length) { message.warning("허용할 AI를 하나 이상 골라 주세요"); return; }
    const scopes = v.read_only ? ["tasks.read"] : Array.from(new Set(["tasks.read", ...v.allowed_scopes]));
    try {
      await update({ resource: "mcp_policies", id: policy.id, values: { ...v, allowed_scopes: scopes, updated_by: persona.memberId }, successNotification: false });
      message.success(v.enabled ? "정책을 저장했어요. 다음 연결부터 적용돼요" : "회사 AI 연결을 껐어요. 직원 화면에 안내가 보여요");
    } catch { /* 공급자 오류 토스트 */ }
  };

  return (
    <div className="as-stack" style={{ gap: 18 }}>
      <label className="as-row as-row--between">
        <span className="as-field__label">회사 전체 AI 연결</span>
        <span className="as-row"><Switch checked={v.enabled} onChange={(x) => setV({ ...v, enabled: x })} aria-label="회사 전체 AI 연결" /><span>{v.enabled ? "켜짐" : "꺼짐"}</span></span>
      </label>
      <label className="as-row as-row--between">
        <span className="as-field__label">읽기만 허용<span className="as-field__hint" style={{ display: "block", fontWeight: 400 }}>켜면 진행 기록·제출을 막고 업무 보기만 돼요.</span></span>
        <span className="as-row"><Switch checked={v.read_only} disabled={!v.enabled} onChange={(x) => setV({ ...v, read_only: x })} aria-label="읽기만 허용" /><span>{v.read_only ? "켜짐" : "꺼짐"}</span></span>
      </label>
      <div className="as-field">
        <span className="as-field__label" id="as-clients">허용 AI</span>
        <Checkbox.Group aria-labelledby="as-clients" disabled={!v.enabled} value={v.allowed_clients} onChange={(x) => setV({ ...v, allowed_clients: x as string[] })} options={CLIENTS.map((c) => ({ value: c, label: c }))} />
      </div>
      <div className="as-field">
        <span className="as-field__label" id="as-scopes">허용 범위</span>
        <Checkbox.Group
          aria-labelledby="as-scopes"
          disabled={!v.enabled}
          value={v.read_only ? ["tasks.read"] : v.allowed_scopes}
          onChange={(x) => setV({ ...v, allowed_scopes: x as string[] })}
          options={SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s]!, disabled: s === "tasks.read" || v.read_only }))}
        />
        <span className="as-field__hint">업무 보기는 늘 포함돼요. 완료 처리는 어떤 경우에도 AI에 열지 않아요.</span>
      </div>
      <KeyValue items={[["국외이전 안내", noticeVersionText(policy.overseas_notice_version)], ["마지막 저장", formatDateTime(policy.updated_at)]]} />
      <div className="as-row as-row--end">
        <Button type="primary" disabled={!dirty} loading={mutation.isPending} onClick={() => void save()}>저장하기</Button>
      </div>
    </div>
  );
}

export default function Page() {
  const { tenant, person } = useWorksite();
  const { message } = App.useApp();
  const confirm = useConfirm();
  const pol = useList<McpPolicy>({ resource: "mcp_policies", pagination: { mode: "off" } });
  const live = useList<McpConnection>({ resource: "mcp_connections", pagination: { mode: "off" }, filters: [{ field: "revoked_at", operator: "null", value: true }] });
  const { run: revokeAll, isPending } = useRpc<{ ok: boolean; revoked: number; people: number }>("revoke_all_mcp");
  usePageReady(!pol.query.isLoading && !live.query.isLoading);
  const policy = pol.result?.data?.[0];
  const active = live.result?.data ?? [];
  const people = new Set(active.map((c) => c.member_id)).size;
  const byClient = (c: string) => active.filter((x) => x.client_name === c).length;

  const fbProps: FilterBarProps = {
    chips: [{ param: "state", ariaLabel: "연결 상태", allLabel: "연결 중", options: [{ value: "revoked", label: "끊은 연결" }] }],
    selects: [{ param: "client", label: "AI", field: "client_name", options: CLIENTS.map((c) => ({ value: c, label: c })) }],
  };
  const fb = useFilterBarState(fbProps);
  const showRevoked = fb.values.state === "revoked";
  const tableFilters = [{ field: "revoked_at", operator: showRevoked ? "nnull" : "null", value: true } as const, ...fb.filters];

  const onRevokeAll = async () => {
    const ok = await confirm({ title: "모든 AI 연결을 끊을까요?", content: `직원 ${people}명의 연결 ${active.length}건이 끊겨요. 직원은 다시 연결해야 해요.`, okText: "모두 끊기", danger: true });
    if (!ok) return;
    try {
      const r = await revokeAll();
      message.success(`연결 ${r.revoked}건을 끊었어요. 직원에게 알렸어요`);
    } catch { /* 토스트는 useRpc */ }
  };

  return (
    <>
      <PageHeader title="AI 연결 정책" description="직원이 자기 AI로 회사 업무를 다루는 범위를 정해요." />
      <CardGrid>
        <SectionCard span={6} title="정책">
          {pol.query.isLoading ? <Skeleton active paragraph={{ rows: 5 }} title={false} />
            : pol.query.isError ? <EmptyState compact kind="error" action={{ label: "다시 시도", onClick: () => void pol.query.refetch() }} />
            : policy ? <PolicyForm policy={policy} />
            : <EmptyState compact kind="empty" title="정책이 아직 없어요" description="CRATA 운영자가 연결을 열 때 기본 정책을 만들어요." />}
        </SectionCard>
        <SectionCard span={6} title="연결 방식">
          <ul className="as-bullets as-bullets--yes">
            <li><span>직원이 자기 회사 계정으로 로그인해서 연결해요(OAuth 2.1).<span className="as-bullets__sub">직원에게 키를 나눠 주지 않아요. 연결은 언제든 끊을 수 있어요.</span></span></li>
            <li><span>회사마다 데이터를 나눠서 다른 회사 업무는 보이지 않아요.</span></li>
            <li><span>AI는 제출까지만 해요. 완료는 검토자가 웹에서 승인해요.</span></li>
            <li><span>고객 비밀(L2) 업무는 AI 연결에 보이지 않아요(국내 경로 개통 전).<span className="as-bullets__sub">8D·고객 도면·고객 품번이 붙은 업무는 웹에서 사람이 쓰고 제출해요.</span></span></li>
          </ul>
          <div className="as-mt-lg as-stack">
            <div className="as-row"><span className="as-field__label">MCP 서버</span><StatusTag tone="neutral" label="2단계 예정" /></div>
            <CopyField value={mcpUrl(tenant.tenantId)} label="MCP 주소" boxed />
            <span className="as-caption">예시 주소예요. 2단계에서 실제 주소가 생겨요.</span>
          </div>
        </SectionCard>
        <SectionCard
          span={12}
          title="연결 현황"
          demo
          actions={<Button danger icon={<DisconnectOutlined aria-hidden />} disabled={!active.length} loading={isPending} onClick={() => void onRevokeAll()}>모든 연결 끊기</Button>}
          caption="관리자도 AI와 나눈 대화 내용은 볼 수 없어요. 저장하지 않아요."
        >
          <StatRow>
            <StatTile label="연결한 사람" value={people} unit="명" />
            {CLIENTS.map((c) => <StatTile key={c} label={c} value={byClient(c)} unit="건" />)}
          </StatRow>
          <div className="as-mt-lg"><FilterBar {...fbProps} /></div>
          <DataTable<McpConnection>
            resource="mcp_connections"
            syncWithLocation={false}
            ariaLabel="AI 연결 목록"
            filters={tableFilters}
            isFiltered={!!fb.values.client}
            onClearFilters={fb.clear}
            sorters={[{ field: "last_used_at", order: "desc" }]}
            columns={[
              { key: "member_id", title: "구성원", kind: "person" },
              { key: "client_name", title: "AI", render: (c) => <span className="ws-cell-name">{c.client_name}</span> },
              { key: "created_at", title: "연결일", kind: "date" },
              { key: showRevoked ? "revoked_at" : "last_used_at", title: showRevoked ? "끊은 날" : "마지막 사용", kind: "datetime" },
              { key: "scopes", title: "범위", flex: true, render: (c) => scopeText(c.scopes) },
            ]}
            mobileRow={(c) => ({
              title: `${person(c.member_id)?.displayName ?? "구성원"} · ${c.client_name}`,
              subtitle: `${formatDate(c.created_at)} 연결 · ${showRevoked ? `${formatDate(c.revoked_at)} 끊음` : c.last_used_at ? `${formatDateTime(c.last_used_at)} 사용` : "아직 안 씀"}`,
            })}
            empty={showRevoked ? { kind: "empty", title: "끊은 연결이 없어요" } : { kind: "empty", title: "연결한 직원이 아직 없어요", description: "직원이 내 AI 연결 화면에서 연결하면 여기에 보여요." }}
          />
        </SectionCard>
      </CardGrid>
    </>
  );
}
