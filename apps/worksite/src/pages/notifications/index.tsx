// 알림 `/notifications` · H-02 · 깊이 A · 모듈 notifications · 소유: home 그룹
// 본인 알림만(공급자가 거름). 칩: 전체 | 안 읽음 | 검토 | 마감 | 공지 | 현장(TR). 오늘 / 이번 주 / 이전으로 묶어 카드 1장에.
// 행을 누르면 read_at을 남기고 link로 이동. [모두 읽음으로] → rpc:mark_all_notifications_read.
import "../home/lib/home.css";
import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button, Skeleton, Tooltip } from "antd";
import {
  AlertOutlined, AuditOutlined, CheckSquareOutlined, FieldTimeOutlined, FileDoneOutlined, FormOutlined, HourglassOutlined,
  ExceptionOutlined, NotificationOutlined, RollbackOutlined, SafetyOutlined, SettingOutlined, TeamOutlined, ToolOutlined, WarningOutlined,
} from "@ant-design/icons";
import { EmptyState, FilterBar, ListRows, PageHeader, SectionCard, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList, useRpc, useUpdate } from "@/lib/refine";
import { useUrlParam } from "@/lib/url";
import { labelOf, type StatusValue } from "@/lib/status";
import { formatRelative } from "@/lib/format";
import { daysBetween, toKstDate, weekStart } from "@/lib/clock";
import type { Notification } from "@/types/entities";

type Kind = StatusValue<"notifications.kind">;

const KIND_ICON: Record<Kind, ReactNode> = {
  task_assigned: <CheckSquareOutlined />,
  review_requested: <AuditOutlined />,
  submission_returned: <RollbackOutlined />,
  submission_approved: <FileDoneOutlined />,
  due_soon: <FieldTimeOutlined />,
  overdue: <HourglassOutlined />,
  notice_must_read: <NotificationOutlined />,
  meeting_review: <TeamOutlined />,
  rule_candidate: <FormOutlined />,
  field_report: <ToolOutlined />,
  safety_due: <SafetyOutlined />,
  claim: <ExceptionOutlined />,
  system: <SettingOutlined />,
};

/** 현장 등록 알림은 등록 종류(제목 앞말)마다 아이콘을 달리해요: 불량 · 아차사고 · 설비 이상·고장 */
function iconOf(n: Notification): ReactNode {
  if (n.kind !== "field_report") return KIND_ICON[n.kind] ?? <SettingOutlined />;
  if (n.title.startsWith("불량")) return <WarningOutlined />;
  if (n.title.startsWith("아차사고")) return <AlertOutlined />;
  if (n.title.startsWith("기타")) return <FormOutlined />;
  return <ToolOutlined />;
}

/** 칩 → 종류 묶음 */
const TABS: Record<string, { label: string; kinds?: Kind[]; unread?: boolean; mfg?: boolean }> = {
  unread: { label: "안 읽음", unread: true },
  review: { label: "검토", kinds: ["review_requested", "submission_returned", "submission_approved", "meeting_review", "rule_candidate"] },
  due: { label: "마감", kinds: ["task_assigned", "due_soon", "overdue", "safety_due"] },
  notice: { label: "공지", kinds: ["notice_must_read", "system"] },
  field: { label: "현장", kinds: ["field_report", "claim"], mfg: true },
};

export default function NotificationsPage() {
  const { persona, clock, today, tenant } = useWorksite();
  const nav = useNavigate();
  const [tab] = useUrlParam("tab");
  const mfg = tenant.packs.includes("manufacturing");
  const filterProps: FilterBarProps = {
    chips: [{
      param: "tab",
      ariaLabel: "알림 종류",
      options: Object.entries(TABS).filter(([, t]) => !t.mfg || mfg).map(([value, t]) => ({ value, label: t.label })),
    }],
  };

  const { result, query } = useList<Notification>({
    resource: "notifications",
    filters: [{ field: "recipient_id", operator: "eq", value: persona.memberId }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "off" },
  });
  usePageReady(!query.isLoading);
  const all = result?.data ?? [];
  const unreadCount = all.filter((n) => !n.read_at).length;

  const { mutate } = useUpdate();
  const { run: markAll, isPending } = useRpc<{ count: number }>("mark_all_notifications_read", { successMessage: "모두 읽음으로 바꿨어요" });

  const active = TABS[tab];
  const rows = useMemo(() => all.filter((n) => {
    if (!active) return true;
    if (active.unread) return !n.read_at;
    return active.kinds!.includes(n.kind);
  }), [all, active]);

  const groups = useMemo(() => {
    const ws = weekStart(today);
    const out: { key: string; title: string; items: Notification[] }[] = [
      { key: "today", title: "오늘", items: [] },
      { key: "week", title: "이번 주", items: [] },
      { key: "older", title: "이전", items: [] },
    ];
    for (const n of rows) {
      const d = toKstDate(n.created_at);
      if (daysBetween(d, today) <= 0) out[0]!.items.push(n);
      else if (d >= ws) out[1]!.items.push(n);
      else out[2]!.items.push(n);
    }
    return out.filter((g) => g.items.length > 0);
  }, [rows, today]);

  const open = (n: Notification) => {
    if (!n.read_at) mutate({ resource: "notifications", id: n.id, values: { read_at: clock.now() }, successNotification: false });
    if (n.link) nav(n.link);
  };

  const markAllBtn = (
    <Tooltip title={unreadCount ? undefined : "안 읽은 알림이 없어요"}>
      <Button onClick={() => void markAll()} loading={isPending} disabled={!unreadCount}>모두 읽음으로</Button>
    </Tooltip>
  );

  return (
    <>
      <PageHeader
        title="알림"
        description={unreadCount ? `안 읽은 알림이 ${unreadCount}건 있어요.` : "새 알림을 모두 확인했어요."}
        actions={<>{markAllBtn}<Button type="text" onClick={() => nav("/me/notifications")}>알림 설정</Button></>}
      />
      <FilterBar {...filterProps} />
      {query.isLoading ? (
        <SectionCard ariaLabel="알림 불러오는 중"><Skeleton active title={false} paragraph={{ rows: 6 }} /></SectionCard>
      ) : query.isError ? (
        <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void query.refetch() }} />
      ) : all.length === 0 ? (
        <EmptyState kind="empty" title="새 알림이 없어요" description="업무가 배정되거나 검토 요청이 오면 알려 드려요." />
      ) : groups.length === 0 ? (
        <EmptyState kind="filtered" title="조건에 맞는 알림이 없어요" description="다른 종류를 골라 보세요." action={{ label: "필터 지우기", onClick: () => nav("/notifications", { replace: true }) }} />
      ) : (
        <SectionCard ariaLabel="알림 목록" className={query.isFetching ? "is-refetching" : undefined}>
          {groups.map((g) => (
            <section key={g.key} className="wh-ngroup" aria-labelledby={`ngroup-${g.key}`}>
              <h2 id={`ngroup-${g.key}`} className="wh-ngroup__title">{g.title}</h2>
              <ListRows
                rows={g.items.map((n) => ({
                  key: n.id,
                  leading: <span className="wh-kindicon">{iconOf(n)}</span>,
                  title: n.title,
                  subtitle: [labelOf("notifications.kind", n.kind), n.body].filter(Boolean).join(" · "),
                  trailing: <span>{formatRelative(n.created_at, clock.now())}</span>,
                  unread: !n.read_at,
                  onClick: () => open(n),
                  ariaLabel: `${labelOf("notifications.kind", n.kind)}: ${n.title}${n.read_at ? "" : ", 안 읽음"}`,
                }))}
              />
            </section>
          ))}
        </SectionCard>
      )}
    </>
  );
}
