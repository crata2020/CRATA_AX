// 구성원·역할 `/admin/members` · A-11 · 깊이 A · 모듈 admin-members · 소유: ara_settings 그룹(owner·admin만)
// 탭(?tab=): 구성원 | 초대 | 직책-역할 매핑. 서랍: ?selected=<구성원 id> 상세 · ?selected=new 초대하기
// 동작: 역할 바꾸기(행의 선택칸 → rpc:change_member_role: role_assignments + members.role + 감사 기록)
//       비활성화(rpc:set_member_status, 삭제하지 않음) · 초대(invitations create, 메일은 보내지 않음) · 다시 보내기·취소 · 직책 기본 역할 바꾸기
// 규칙: owner 지정·해제는 owner만, 마지막 owner는 바꿀 수 없음, admin은 owner를 만들 수 없음(동작 안에서도 다시 확인).
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { App, Button, Form, Input, Select } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import {
  CopyField, DataTable, DetailDrawer, EmptyState, FilterBar, PageHeader, PersonChip, StatusTag, Timeline, useConfirm, useFilterBarState,
  type FilterBarProps, DisabledAction,
} from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useCreate, useList, useOne, useRpc, useUpdate } from "@/lib/refine";
import { useSelectedParam, useUrlParam } from "@/lib/url";
import { formatDate, formatDateTime } from "@/lib/format";
import { addDays, kstIso, toKstDate } from "@/lib/clock";
import { optionsOf, statusOf } from "@/lib/status";
import type { PlatformRole } from "@/tenants/types";
import type { Invitation, Member, PositionRoleMap, RoleAssignment } from "@/types/entities";
import { Caption, KeyValue, ROLES, roleLabel, roleOptions } from "../admin-company/shared/lib";

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** 역할을 바꿀 수 없는 이유(없으면 null) */
function useRoleGuard() {
  const { persona } = useWorksite();
  const all = useList<Member>({ resource: "members", pagination: { mode: "off" } });
  const owners = (all.result?.data ?? []).filter((m) => m.role === "owner" && m.status === "active").length;
  return (m: Member): string | null => {
    if (m.status !== "active") return "비활성 구성원은 역할을 바꿀 수 없어요";
    if (m.role === "owner" && persona.role !== "owner") return "소유자 지정·해제는 소유자만 할 수 있어요";
    if (m.role === "owner" && owners <= 1) return "마지막 소유자는 바꿀 수 없어요";
    return null;
  };
}

function RoleSelect({ m, guard }: { m: Member; guard: (m: Member) => string | null }) {
  const { persona } = useWorksite();
  const { message } = App.useApp();
  const confirm = useConfirm();
  const { run, isPending } = useRpc<{ changed: boolean }>("change_member_role");
  const reason = guard(m);
  const change = async (role: PlatformRole) => {
    if (role === m.role) return;
    const ok = await confirm({
      title: `${m.display_name}의 역할을 바꿀까요?`,
      content: `${roleLabel(m.role)} → ${roleLabel(role)}. 바뀐 역할은 그 사람이 다음에 열 때 적용되고 기록이 남아요.`,
      okText: "바꾸기",
    });
    if (!ok) return;
    try { await run({ memberId: m.id, role }); message.success(`역할을 ${roleLabel(role)}(으)로 바꿨어요`); } catch { /* 토스트 */ }
  };
  const el = (
    <Select<PlatformRole>
      size="small"
      value={m.role}
      disabled={!!reason}
      loading={isPending}
      onChange={(v) => void change(v)}
      options={roleOptions(persona.role)}
      style={{ minWidth: 104 }}
      aria-label={`${m.display_name} 플랫폼 역할`}
    />
  );
  return <span onClick={stop} onKeyDown={stop}>{reason ? <DisabledAction label={`${m.display_name} 플랫폼 역할`} reason={reason}>{el}</DisabledAction> : el}</span>;
}

function StatusButton({ m, size = "small" }: { m: Member; size?: "small" | "middle" }) {
  const { persona } = useWorksite();
  const { message } = App.useApp();
  const confirm = useConfirm();
  const { run, isPending } = useRpc<{ changed: boolean }>("set_member_status");
  const self = m.id === persona.memberId;
  const ownerBlocked = m.role === "owner" && persona.role !== "owner";
  const toggle = async () => {
    if (m.status === "active") {
      const ok = await confirm({ title: `${m.display_name}을(를) 비활성화할까요?`, content: "업무·결정 기록은 그대로 남아요. 이 사람의 AI 연결도 함께 끊겨요. 언제든 다시 활성화할 수 있어요.", okText: "비활성화하기", danger: true });
      if (!ok) return;
    }
    try {
      await run({ memberId: m.id, status: m.status === "active" ? "inactive" : "active" });
      message.success(m.status === "active" ? "비활성화했어요. 기록은 그대로 남아요" : "다시 활성화했어요");
    } catch { /* 토스트 */ }
  };
  const reason = self ? "내 계정은 비활성화할 수 없어요" : ownerBlocked ? "소유자는 소유자만 바꿀 수 있어요" : null;
  const inRow = size === "small";
  const btn = <Button size={size} className={inRow ? "ws-rowact" : undefined} disabled={!!reason} loading={isPending} onClick={(e) => { e.stopPropagation(); void toggle(); }}>{m.status === "active" ? "비활성화" : "다시 활성화"}</Button>;
  return <span onClick={stop} onKeyDown={stop}>{reason ? <DisabledAction label={`${m.display_name} ${m.status === "active" ? "비활성화" : "다시 활성화"}`} reason={reason}>{btn}</DisabledAction> : btn}</span>;
}

function MemberDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { tenant } = useWorksite();
  const guard = useRoleGuard();
  const q = useOne<Member>({ resource: "members", id: id ?? "", queryOptions: { enabled: !!id && id !== "new", retry: false } });
  const hist = useList<RoleAssignment>({
    resource: "role_assignments", pagination: { mode: "off" }, sorters: [{ field: "granted_at", order: "desc" }],
    filters: [{ field: "member_id", operator: "eq", value: id ?? "" }], queryOptions: { enabled: !!id && id !== "new" },
  });
  const m = q.result;
  const open = !!id && id !== "new";
  const notFound = open && q.query.isError;
  return (
    <DetailDrawer open={open} title={m?.display_name ?? "구성원"} onClose={onClose} footer={m ? <StatusButton m={m} size="middle" /> : undefined}>
      {notFound ? <EmptyState kind="not_found" /> : m && (
        <div className="as-stack" style={{ gap: 20 }}>
          <KeyValue items={[
            ["조직", tenant.orgUnits.find((u) => u.id === m.org_unit_id)?.name ?? "—"],
            ["직함", m.job_title],
            ["역할코드", <code className="as-code" translate="no">{m.role_code}</code>],
            ["플랫폼 역할", <RoleSelect m={m} guard={guard} />],
            ["상태", <StatusTag {...statusOf("members.status", m.status)} />],
            ["메일", <CopyField value={m.email} label="메일 주소" />],
            ["업무 전화", <CopyField value={m.phone_work} label="업무 전화" />],
          ]} />
          <div>
            <div className="as-subhead">역할 이력</div>
            {(hist.result?.data ?? []).length ? (
              <Timeline dense ariaLabel="역할 이력" items={(hist.result?.data ?? []).map((r) => ({
                id: r.id, at: r.granted_at, title: `${roleLabel(r.role)}${r.scope_type === "company" ? "" : " · 범위 지정"}`,
                description: r.granted_by ? undefined : "처음 설정", actor: r.granted_by ? { memberId: r.granted_by } : undefined, tone: "info",
              }))} />
            ) : <p className="as-caption">역할 이력이 없어요.</p>}
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}

function InviteDrawer({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { persona, tenant, clock } = useWorksite();
  const { message } = App.useApp();
  const [form] = Form.useForm<{ email: string; position?: string; role: PlatformRole; org_unit_id: string }>();
  const maps = useList<PositionRoleMap>({ resource: "position_role_maps", pagination: { mode: "off" }, queryOptions: { enabled: open } });
  const members = useList<Member>({ resource: "members", pagination: { mode: "off" }, queryOptions: { enabled: open } });
  const invites = useList<Invitation>({ resource: "invitations", pagination: { mode: "off" }, queryOptions: { enabled: open } });
  const { mutateAsync: create, mutation } = useCreate();
  const submit = async () => {
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    const email = v.email.trim().toLowerCase();
    if ((members.result?.data ?? []).some((m) => m.email.toLowerCase() === email)) { message.warning("이미 구성원인 메일이에요"); return; }
    if ((invites.result?.data ?? []).some((i) => i.email.toLowerCase() === email && i.status === "pending")) { message.warning("이미 초대를 보낸 메일이에요. 초대 탭에서 다시 보내기를 눌러 주세요"); return; }
    try {
      await create({
        resource: "invitations",
        values: { email, role: v.role, org_unit_id: v.org_unit_id, invited_by: persona.memberId, expires_at: kstIso(addDays(toKstDate(clock.now()), 7), "23:59"), status: "pending" },
        successNotification: false,
      });
      message.success("초대 링크를 만들었어요(예시). 메일은 보내지 않아요");
      form.resetFields();
      onDone();
    } catch { /* 공급자 오류 토스트 */ }
  };
  return (
    <DetailDrawer open={open} title="초대하기" onClose={onClose} footer={<Button type="primary" icon={<UserAddOutlined aria-hidden />} loading={mutation.isPending} onClick={() => void submit()}>초대 링크 만들기</Button>}>
      <p className="as-text-2" style={{ marginBottom: 16 }}>데모에서는 메일을 보내지 않고 초대 기록만 만들어요. 7일 뒤 만료돼요.</p>
      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ role: "member", org_unit_id: tenant.orgUnits[1]?.id ?? tenant.orgUnits[0]?.id }}>
        <Form.Item name="email" label="메일" rules={[
          { required: true, message: "메일을 적어 주세요" },
          { type: "email", message: "메일 모양을 확인해 주세요" },
          { pattern: /@example\.com$/i, message: "데모에서는 example.com 메일만 쓸 수 있어요" },
        ]}>
          <Input placeholder="new.member@example.com" inputMode="email" autoComplete="off" />
        </Form.Item>
        <Form.Item name="position" label="직책" extra="고르면 직책-역할 매핑의 기본 역할로 채워요.">
          <Select allowClear placeholder="직책 고르기" options={(maps.result?.data ?? []).map((p) => ({ value: p.id, label: `${p.position_or_title} · 기본 ${roleLabel(p.default_role)}` }))}
            onChange={(id: string | undefined) => {
              const p = (maps.result?.data ?? []).find((x) => x.id === id);
              if (p) form.setFieldValue("role", p.default_role === "owner" && persona.role !== "owner" ? "admin" : p.default_role);
            }} />
        </Form.Item>
        <Form.Item name="role" label="역할" rules={[{ required: true, message: "역할을 골라 주세요" }]} extra={persona.role !== "owner" ? "소유자 지정은 소유자만 할 수 있어요." : undefined}>
          <Select options={roleOptions(persona.role)} />
        </Form.Item>
        <Form.Item name="org_unit_id" label="조직" rules={[{ required: true, message: "조직을 골라 주세요" }]}>
          <Select options={[...tenant.orgUnits].sort((a, b) => a.sortOrder - b.sortOrder).map((u) => ({ value: u.id, label: u.name }))} />
        </Form.Item>
      </Form>
    </DetailDrawer>
  );
}

function MembersTab() {
  const { tenant, person } = useWorksite();
  const [, setSelected] = useSelectedParam();
  const guard = useRoleGuard();
  const unitName = useMemo(() => new Map(tenant.orgUnits.map((u) => [u.id, u.name])), [tenant]);
  const fbProps: FilterBarProps = {
    search: { placeholder: "이름·직함 검색", fields: ["display_name", "job_title"] },
    chips: [{ param: "status", field: "status", ariaLabel: "상태", options: [{ value: "active", label: "활성" }, { value: "inactive", label: "비활성" }] }],
    selects: [
      { param: "role", label: "역할", field: "role", options: ROLES.map((r) => ({ value: r, label: roleLabel(r) })) },
      { param: "unit", label: "조직", field: "org_unit_id", options: [...tenant.orgUnits].sort((a, b) => a.sortOrder - b.sortOrder).map((u) => ({ value: u.id, label: u.name })) },
    ],
  };
  const fb = useFilterBarState(fbProps);
  return (
    <>
      <FilterBar {...fbProps} />
      <DataTable<Member>
        resource="members"
        syncWithLocation={false}
        ariaLabel="구성원 목록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "display_name", order: "asc" }]}
        pageSize={30}
        onRowClick={(m) => setSelected(m.id)}
        columns={[
          { key: "display_name", title: "이름", flex: true, render: (m) => <PersonChip memberId={m.id} size="sm" fallbackName={m.display_name} /> },
          { key: "org_unit_id", title: "조직", render: (m) => unitName.get(m.org_unit_id) ?? "—" },
          { key: "job_title", title: "직함" },
          { key: "role_code", title: "역할코드", render: (m) => <code className="as-code" translate="no">{m.role_code}</code> },
          { key: "role", title: "플랫폼 역할", render: (m) => <RoleSelect m={m} guard={guard} /> },
          { key: "status", title: "상태", kind: "status", statusDomain: "members.status" },
          { key: "actions", title: "관리", render: (m) => <StatusButton m={m} /> },
        ]}
        mobileRow={(m) => ({
          title: person(m.id)?.displayName ?? m.display_name,
          subtitle: `${unitName.get(m.org_unit_id) ?? ""} · ${m.job_title} · ${roleLabel(m.role)}`,
          trailing: m.status === "active" ? undefined : <StatusTag {...statusOf("members.status", m.status)} />,
        })}
        empty={{ kind: "empty", title: "구성원이 없어요", description: "초대하기로 구성원을 더해 보세요." }}
      />
      <Caption style={{ marginTop: 12 }}>역할을 바꾸면 그 사람이 다음에 열 때 적용돼요. 데모의 '누구로 보기'는 처음 설정한 역할을 따라요. 모든 사람과 연락처는 예시예요.</Caption>
    </>
  );
}

function InvitesTab() {
  const { tenant, clock } = useWorksite();
  const { message } = App.useApp();
  const confirm = useConfirm();
  const { mutateAsync: update } = useUpdate();
  const unitName = (id: string | null) => tenant.orgUnits.find((u) => u.id === id)?.name ?? "—";
  const fbProps: FilterBarProps = { chips: [{ param: "istatus", field: "status", ariaLabel: "초대 상태", options: optionsOf("invitations.status") }] };
  const fb = useFilterBarState(fbProps);
  const resend = async (i: Invitation) => {
    try {
      await update({ resource: "invitations", id: i.id, values: { status: "pending", expires_at: kstIso(addDays(toKstDate(clock.now()), 7), "23:59") }, successNotification: false });
      message.success("초대 링크를 다시 만들었어요(예시). 7일 뒤 만료돼요");
    } catch { /* 토스트 */ }
  };
  const cancel = async (i: Invitation) => {
    const ok = await confirm({ title: "초대를 취소할까요?", content: `${i.email}로 만든 초대 링크가 더는 열리지 않아요.`, okText: "초대 취소하기", danger: true });
    if (!ok) return;
    try { await update({ resource: "invitations", id: i.id, values: { status: "canceled" }, successNotification: false }); message.success("초대를 취소했어요"); } catch { /* 토스트 */ }
  };
  const actions = (i: Invitation) => i.status === "pending" || i.status === "expired" ? (
    <span className="as-row" onClick={stop} onKeyDown={stop}>
      <Button className="ws-rowact" onClick={() => void resend(i)}>다시 보내기</Button>
      {i.status === "pending" && <Button type="text" className="ws-rowact-text" danger onClick={() => void cancel(i)}>취소</Button>}
    </span>
  ) : null;
  return (
    <>
      <FilterBar {...fbProps} />
      <DataTable<Invitation>
        resource="invitations"
        syncWithLocation={false}
        ariaLabel="초대 목록"
        filters={fb.filters}
        isFiltered={fb.active}
        onClearFilters={fb.clear}
        sorters={[{ field: "created_at", order: "desc" }]}
        columns={[
          { key: "email", title: "메일", flex: true, render: (i) => <span className="ws-cell-name">{i.email}</span> },
          { key: "role", title: "역할", render: (i) => roleLabel(i.role) },
          { key: "org_unit_id", title: "조직", render: (i) => unitName(i.org_unit_id) },
          { key: "invited_by", title: "보낸 사람", kind: "person" },
          { key: "expires_at", title: "만료", render: (i) => formatDate(i.expires_at) },
          { key: "status", title: "상태", kind: "status", statusDomain: "invitations.status" },
          { key: "actions", title: "관리", render: (i) => actions(i) ?? "—" },
        ]}
        mobileRow={(i) => ({
          title: i.email,
          subtitle: `${roleLabel(i.role)} · ${unitName(i.org_unit_id)} · ${formatDate(i.expires_at)} 만료`,
          trailing: i.status === "pending" ? actions(i) : <StatusTag {...statusOf("invitations.status", i.status)} />,
        })}
        empty={{ kind: "empty", title: "보낸 초대가 없어요", description: "초대하기로 새 구성원을 불러 보세요." }}
      />
    </>
  );
}

function MappingTab() {
  const { persona } = useWorksite();
  const { message } = App.useApp();
  const { mutateAsync: update } = useUpdate();
  const change = async (p: PositionRoleMap, role: PlatformRole) => {
    try { await update({ resource: "position_role_maps", id: p.id, values: { default_role: role }, successNotification: false }); message.success(`${p.position_or_title}의 기본 역할을 ${roleLabel(role)}(으)로 바꿨어요`); } catch { /* 토스트 */ }
  };
  return (
    <>
      <DataTable<PositionRoleMap>
        resource="position_role_maps"
        syncWithLocation={false}
        ariaLabel="직책-역할 매핑"
        columns={[
          { key: "position_or_title", title: "직책", kind: "name" },
          {
            key: "default_role", title: "기본 역할", render: (p) => {
              const lock = p.default_role === "owner" && persona.role !== "owner";
              const el = <Select<PlatformRole> size="small" value={p.default_role} disabled={lock} options={roleOptions(persona.role)} onChange={(v) => void change(p, v)} style={{ minWidth: 104 }} aria-label={`${p.position_or_title} 기본 역할`} />;
              return lock ? <DisabledAction label={`${p.position_or_title} 기본 역할`} reason="소유자 매핑은 소유자만 바꿀 수 있어요">{el}</DisabledAction> : el;
            },
          },
          { key: "updated_at", title: "마지막 변경", render: (p) => formatDateTime(p.updated_at) },
        ]}
        mobileRow={(p) => ({ title: p.position_or_title, subtitle: `기본 역할 ${roleLabel(p.default_role)}` })}
        empty={{ kind: "empty", title: "직책-역할 매핑이 없어요", description: "진단에서 직책별 기본 역할을 정해요." }}
      />
      <Caption style={{ marginTop: 12 }}>초대할 때 직책을 고르면 이 기본 역할로 채워요. 이미 있는 구성원의 역할은 바뀌지 않아요.</Caption>
    </>
  );
}

export default function Page() {
  const [, setParams] = useSearchParams();
  const [tab] = useUrlParam("tab", "members");
  const [selected, setSelected] = useSelectedParam();
  const inv = useList<Invitation>({ resource: "invitations", pagination: { mode: "off" }, filters: [{ field: "status", operator: "eq", value: "pending" }] });
  const pending = inv.result?.data?.length ?? 0;
  const current = ["members", "invites", "mapping"].includes(tab) ? tab : "members";
  return (
    <>
      <PageHeader
        title="구성원·역할"
        description="역할을 정하고, 새 구성원을 초대하고, 떠난 사람은 비활성화해요. 기록은 지우지 않아요."
        actions={<Button type="primary" icon={<UserAddOutlined aria-hidden />} onClick={() => setSelected("new")}>초대하기</Button>}
        tabs={[
          { key: "members", label: "구성원", to: "?tab=members" },
          { key: "invites", label: "초대", to: "?tab=invites", badge: pending },
          { key: "mapping", label: "직책-역할 매핑", to: "?tab=mapping" },
        ]}
      />
      {current === "members" && <MembersTab />}
      {current === "invites" && <InvitesTab />}
      {current === "mapping" && <MappingTab />}
      <MemberDrawer id={selected || null} onClose={() => setSelected(null)} />
      <InviteDrawer
        open={selected === "new"}
        onClose={() => setSelected(null)}
        onDone={() => setParams((prev) => { const p = new URLSearchParams(prev); p.delete("selected"); p.set("tab", "invites"); return p; }, { replace: true })}
      />
    </>
  );
}
