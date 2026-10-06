// 내 AI 연결 `/me/ai` · A-05 · 깊이 A · 모듈 ai-connect · 소유: ara_settings 그룹
// 내가 쓰는 ChatGPT·Claude·Codex에서 내 업무를 보고·기록하고·제출하게 연결합니다(모듈 ⑦). 모두 본인 연결만 보여요(공급자 범위).
// 동작: [연결 끊기] → rpc:revoke_mcp_connection(확인) · [연결 연습하기] → AI 고르기 → 국외이전 고지 동의 → 예시 연결 1건(mcp_connections create)
import { useState } from "react";
import { App, Button, Checkbox, Modal, Radio, Skeleton } from "antd";
import { ApiOutlined, DisconnectOutlined, ExperimentOutlined } from "@ant-design/icons";
import { Banner, CardGrid, CopyField, EmptyState, GridCell, ListRows, PageHeader, SectionCard, SegmentedPills, useConfirm } from "@/components";
import { YesNoList } from "../ara-home/shared/ara";
import { usePageReady } from "@/app/pageReady";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useList, useRpc } from "@/lib/refine";
import { formatDate } from "@/lib/format";
import { useUrlParam } from "@/lib/url";
import type { McpConnection, McpPolicy } from "@/types/entities";
import { CLIENTS, MCP_TOOLS, OVERSEAS_NOTICE, SCOPE_LABEL, mcpUrl, noticeVersionText, scopeText, type ClientName } from "../admin-company/shared/lib";

const HOWTO: Record<ClientName, string[]> = {
  ChatGPT: [
    "ChatGPT 설정에서 커넥터(앱) 추가 메뉴를 열어요.",
    "아래 MCP 주소를 붙여 넣고 이름을 '회사 업무'처럼 알아보기 쉽게 적어요.",
    "회사 계정으로 로그인하고, 허용 범위(업무 보기·진행 기록·결과 제출)를 확인한 뒤 허용해요.",
  ],
  Claude: [
    "Claude 설정의 커넥터에서 사용자 지정 커넥터 추가를 눌러요.",
    "아래 MCP 주소를 붙여 넣어요.",
    "회사 계정으로 로그인하고, 허용 범위를 확인한 뒤 허용해요.",
  ],
  Codex: [
    "Codex 설정에 MCP 서버를 추가해요(설정 파일 또는 추가 명령).",
    "아래 MCP 주소를 서버 주소로 적어요.",
    "처음 실행할 때 열리는 창에서 회사 계정으로 로그인하고 허용 범위를 확인해요.",
  ],
};

function PracticeModal({ open, onClose, policy, connected }: { open: boolean; onClose: () => void; policy?: McpPolicy; connected: Set<string> }) {
  const { persona } = useWorksite();
  const { message } = App.useApp();
  const [client, setClient] = useState<ClientName | null>(null);
  const [agree, setAgree] = useState(false);
  const { mutateAsync: create, mutation } = useCreate();
  const allowed = (policy?.allowed_clients ?? CLIENTS) as string[];
  const scopes = policy?.read_only ? ["tasks.read"] : policy?.allowed_scopes ?? ["tasks.read", "tasks.progress", "tasks.submit"];
  const reset = () => { setClient(null); setAgree(false); };
  const submit = async () => {
    if (!client) { message.warning("연결할 AI를 골라 주세요"); return; }
    if (!agree) { message.warning("국외이전 안내에 동의해야 연결할 수 있어요"); return; }
    try {
      await create({
        resource: "mcp_connections",
        values: { member_id: persona.memberId, client_name: client, client_id: `demo-practice-${client.toLowerCase()}`, scopes, last_used_at: null, revoked_at: null },
        successNotification: false,
      });
      message.success(`${client} 예시 연결을 만들었어요. 실제로 연결되지는 않아요`);
      reset();
      onClose();
    } catch { /* 오류 토스트는 공급자 문구로 */ }
  };
  return (
    <Modal open={open} title="연결 연습하기" okText="동의하고 연결하기" cancelText="취소" onOk={() => void submit()} onCancel={() => { reset(); onClose(); }} confirmLoading={mutation.isPending} centered destroyOnHidden>
      <div className="as-stack">
        <p className="as-text-2">데모에서는 실제로 연결하지 않고 예시 연결 1건만 만들어요.</p>
        <Radio.Group value={client} onChange={(e) => setClient(e.target.value as ClientName)} aria-label="연결할 AI">
          <div className="as-stack" style={{ gap: 8 }}>
            {CLIENTS.map((c) => {
              const off = !allowed.includes(c);
              const dup = connected.has(c);
              return (
                <Radio key={c} value={c} disabled={off || dup}>
                  {c}{off ? " · 회사에서 허용하지 않았어요" : dup ? " · 이미 연결했어요" : ""}
                </Radio>
              );
            })}
          </div>
        </Radio.Group>
        <div className="as-subhead" style={{ marginTop: 8, marginBottom: 0 }}>허용 범위</div>
        <p className="as-text-2">{scopeText(scopes)}{policy?.read_only ? " (회사에서 읽기만 허용했어요)" : ""}</p>
        <div className="as-subhead" style={{ marginTop: 8, marginBottom: 0 }}>국외이전 안내 {noticeVersionText(policy?.overseas_notice_version)}</div>
        <p className="as-text-2">{OVERSEAS_NOTICE}</p>
        <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)}>국외이전 안내를 읽었고 동의해요</Checkbox>
      </div>
    </Modal>
  );
}

export default function Page() {
  const { persona, tenant } = useWorksite();
  const { message } = App.useApp();
  const confirm = useConfirm();
  const [practice, setPractice] = useState(false);
  const [tab, setTab] = useUrlParam("client", "ChatGPT");
  const pol = useList<McpPolicy>({ resource: "mcp_policies", pagination: { mode: "off" } });
  const conns = useList<McpConnection>({
    resource: "mcp_connections", pagination: { mode: "off" },
    filters: [{ field: "member_id", operator: "eq", value: persona.memberId }],
    sorters: [{ field: "created_at", order: "desc" }],
  });
  const { run: revoke } = useRpc("revoke_mcp_connection");
  usePageReady(!pol.query.isLoading && !conns.query.isLoading);

  const policy = pol.result?.data?.[0];
  const enabled = policy ? policy.enabled : tenant.policies.mcpEnabled;
  const all = conns.result?.data ?? [];
  const active = all.filter((c) => !c.revoked_at);
  const revoked = all.filter((c) => c.revoked_at);
  const client = (CLIENTS as readonly string[]).includes(tab) ? (tab as ClientName) : "ChatGPT";
  const readOnly = !!policy?.read_only;

  const onRevoke = async (c: McpConnection) => {
    const ok = await confirm({ title: `${c.client_name} 연결을 끊을까요?`, content: "이 AI에서 더는 내 업무를 보거나 기록할 수 없어요. 다시 쓰려면 새로 연결해요.", okText: "연결 끊기", danger: true });
    if (!ok) return;
    try { await revoke({ connectionId: c.id }); message.success(`${c.client_name} 연결을 끊었어요`); } catch { /* 토스트는 useRpc */ }
  };

  const can = [
    { text: "내 업무 보기", sub: "나에게 배정된 업무와 기준, 검토 상태" },
    ...(!readOnly ? [{ text: "진행 기록 남기기" }, { text: "결과 제출하기", sub: "제출만 해요. 완료는 검토자가 웹에서 승인해요." }] : []),
  ];
  const cannot = ["승인·완료 처리", "다른 사람 업무 보기·고치기", "고객 비밀(L2) 업무 보기(국내 경로 개통 전)", "회사 설정·구성원 정보 보기", ...(readOnly ? ["진행 기록·제출(회사에서 읽기만 허용)"] : [])];

  return (
    <>
      <PageHeader
        title="내 AI 연결"
        description="내가 쓰는 AI에서 내 업무를 보고, 기록하고, 제출해요."
        actions={<Button type="primary" icon={<ExperimentOutlined aria-hidden />} disabled={!enabled} onClick={() => setPractice(true)}>연결 연습하기</Button>}
      />
      {!pol.query.isLoading && !enabled && <Banner tone="warning" title="AI 연결 꺼짐">회사에서 AI 연결을 꺼 두었어요. 관리자에게 문의해 주세요.</Banner>}
      <CardGrid>
        {/* 왼쪽 줄기: 연결된 AI + 국외이전 안내(오른쪽 'AI가 할 수 있는 것'이 길어서 아래가 패널로 비지 않게 쌓아요) */}
        <GridCell span={5}>
        <div className="ws-stack">
        <SectionCard pill title="연결된 AI" demo caption={revoked.length ? `끊은 연결 ${revoked.length}건은 목록에서 뺐어요.` : undefined}>
          {conns.query.isLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          ) : conns.query.isError ? (
            <EmptyState compact kind="error" action={{ label: "다시 시도", onClick: () => void conns.query.refetch() }} />
          ) : active.length ? (
            <ListRows
              ariaLabel="연결된 AI"
              rows={active.map((c) => ({
                key: c.id,
                leading: <ApiOutlined />,
                title: c.client_name,
                subtitle: `${c.last_used_at ? `${formatDate(c.last_used_at, false)} 사용` : "아직 쓰지 않았어요"} · 범위 ${c.scopes.length}개 · ${formatDate(c.created_at, false)} 연결`,
                trailing: <Button type="text" className="ws-rowact-text" icon={<DisconnectOutlined aria-hidden />} onClick={() => void onRevoke(c)} aria-label={`${c.client_name} 연결 끊기`}>연결 끊기</Button>,
              }))}
            />
          ) : (
            <EmptyState compact kind="empty" title="아직 연결한 AI가 없어요" description="아래 방법대로 연결해 보세요." />
          )}
        </SectionCard>
        {/* 안내 띠는 카드 밖에(카드 안 옅은 상자가 카드 안 카드처럼 보여서) */}
        <Banner tone="info" title={`국외이전 안내 ${noticeVersionText(policy?.overseas_notice_version)}`}>{OVERSEAS_NOTICE}</Banner>
        </div>
        </GridCell>
        <SectionCard span={7} title="AI가 할 수 있는 것">
          <div className="as-subhead">할 수 있어요</div>
          <YesNoList kind="yes" items={can} srPrefix="할 수 있음: " />
          <div className="as-subhead as-mt">할 수 없어요</div>
          <YesNoList kind="no" items={cannot.map((text) => ({ text }))} srPrefix="할 수 없음: " />
        </SectionCard>
        <SectionCard span={12} title="연결 방법" caption="AI 서비스의 메뉴 이름은 바뀔 수 있어요. 그림이 있는 안내는 2단계에서 붙여요.">
          <div className="as-stack" style={{ gap: 20 }}>
            <SegmentedPills<ClientName> ariaLabel="연결할 AI" options={CLIENTS.map((c) => ({ value: c, label: c }))} value={client} onChange={(v) => setTab(v)} />
            <ol className="as-howto" aria-label={`${client} 연결 단계`}>
              {HOWTO[client].map((t) => <li key={t}><span>{t}</span></li>)}
            </ol>
            <div>
              <div className="as-subhead">MCP 주소(예시)</div>
              <CopyField value={mcpUrl(tenant.tenantId)} label="MCP 주소" boxed />
              <p className="as-caption" style={{ marginTop: 6 }}>2단계에서 실제 주소가 생겨요. 지금 주소는 연결되지 않아요.</p>
            </div>
            <div>
              <div className="as-subhead">AI가 쓰는 도구 6개</div>
              {/* 사람이 읽는 이름을 먼저, 프로그램 이름(식별자)은 접힌 '개발자용'에만 */}
              <ul className="as-tools" aria-label="도구 목록">
                {MCP_TOOLS.map((t) => (
                  <li key={t.name}>
                    <span className="as-text"><b>{t.does}</b></span>
                    <span className="ws-tag">{SCOPE_LABEL[t.scope]}</span>
                  </li>
                ))}
              </ul>
              <details className="as-dev">
                <summary>개발자용: 도구 이름</summary>
                <ul className="as-tools as-tools--code" aria-label="도구 이름(개발자용)">
                  {MCP_TOOLS.map((t) => (
                    <li key={t.name}><code className="as-code" translate="no">{t.name}</code><span className="as-caption">{t.does}</span></li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </SectionCard>
      </CardGrid>
      <PracticeModal open={practice} onClose={() => setPractice(false)} policy={policy} connected={new Set(active.map((c) => c.client_name))} />
    </>
  );
}
