// TopBar(빌드 스펙 2.4절): [회사 ▾][누구로 보기 ▾] …… [검색 Ctrl K][AI 연결 n][종][사용자][예시 데이터]
// 모바일(56): [메뉴][모노그램·회사명][예시 데이터] …… (검색)(종)(사용자 → 사용자 시트)
// 스크롤되면 아래 1px 선. 아이콘만 있는 버튼은 aria-label + 툴팁. Ctrl/Cmd+K → CommandMenu(pages/search/CommandMenu.tsx).
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Drawer, Dropdown, Popover, Select, Switch, Tooltip } from "antd";
import { ApiOutlined, BellOutlined, MenuOutlined, SearchOutlined, DownOutlined } from "@ant-design/icons";
import { useWorksite } from "@/app/TenantBoundary";
import { TENANTS, TENANT_ORDER } from "@/tenants";
import { labelOf } from "@/lib/status";
import { formatRelative, initialsOf } from "@/lib/format";
import { useList, useSelector, useUpdate } from "@/lib/refine";
import type { Notification } from "@/types/entities";
import { DemoDataBadge, CountBadge } from "@/components/basics";
import { ListRows } from "@/components/ListRow";
import { PersonChip } from "@/components/PersonChip";
import { useConfirm } from "@/components/DetailDrawer";
import { useNavBadges } from "./useNavBadges";
import type { Breakpoint } from "@/lib/useBreakpoint";

const CommandMenu = lazy(() => import("@/pages/search/CommandMenu"));

// ───────── 데모 전환기
export function TenantSwitcher({ block }: { block?: boolean }) {
  const { tenant, switchTenant } = useWorksite();
  return (
    <Select
      aria-label="회사"
      value={tenant.slug}
      style={{ width: block ? "100%" : 200 }}
      popupMatchSelectWidth={false}
      options={TENANT_ORDER.map((s) => ({ value: s, label: `${TENANTS[s].displayName}(예시)` }))}
      onChange={(v) => switchTenant(v)}
    />
  );
}

export function PersonaSwitcher({ block }: { block?: boolean }) {
  const { tenant, persona, personas, switchPersona } = useWorksite();
  return (
    <Select
      aria-label="누구로 보기"
      value={persona.roleCode}
      style={{ width: block ? "100%" : "clamp(180px, 18vw, 240px)" }}
      popupMatchSelectWidth={false}
      options={personas.map((p) => {
        const role = tenant.roles.find((r) => r.code === p.roleCode)!;
        return { value: p.roleCode, label: `${p.displayName} · ${role.title} · ${labelOf("platform_role", role.platformRole)}` };
      })}
      onChange={(v) => switchPersona(v)}
    />
  );
}

// ───────── AI 연결 상태
export function AiStatusChip() {
  const nav = useNavigate();
  const { data } = useSelector<{ enabled: boolean; count: number }>("me.ai");
  const enabled = data?.enabled ?? true;
  const count = data?.count ?? 0;
  const text = !enabled ? "회사에서 AI 연결을 꺼 두었어요" : count > 0 ? `AI 연결 ${count}` : "AI 연결 전";
  return (
    <button type="button" className="ws-aichip" data-tone={enabled && count > 0 ? "good" : "neutral"} onClick={() => nav("/me/ai")} aria-label={`${text}. 내 AI 연결 열기`}>
      <ApiOutlined aria-hidden />{text}
    </button>
  );
}

// ───────── 알림 종
function NotificationPopover({ onClose }: { onClose: () => void }) {
  const { clock, persona } = useWorksite();
  const nav = useNavigate();
  const { mutate } = useUpdate();
  const { result, query } = useList<Notification>({
    resource: "notifications",
    filters: [{ field: "recipient_id", operator: "eq", value: persona.memberId }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { currentPage: 1, pageSize: 5 },
  });
  const rows = result?.data ?? [];
  return (
    <div className="ws-pop">
      <div className="ws-pop__head"><strong className="ws-t-label">알림</strong></div>
      {query.isLoading ? <p className="ws-t-caption" style={{ padding: 8 }}>불러오는 중이에요</p> : (
        <ListRows
          rows={rows.map((n) => ({
            key: n.id,
            title: n.title,
            subtitle: `${labelOf("notifications.kind", n.kind)} · ${formatRelative(n.created_at, clock.now())}`,
            unread: !n.read_at,
            onClick: () => {
              if (!n.read_at) mutate({ resource: "notifications", id: n.id, values: { read_at: clock.now() }, successNotification: false });
              onClose();
              if (n.link) nav(n.link);
            },
          }))}
          empty={<p className="ws-t-body ws-ink-2" style={{ padding: "12px 4px" }}>새 알림이 없어요.</p>}
        />
      )}
      <div className="ws-pop__foot"><Link to="/notifications" onClick={onClose}>모두 보기</Link></div>
    </div>
  );
}

function NotificationBell({ mobile }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const badges = useNavBadges();
  const count = badges.unreadNotifications ?? 0;
  const btn = (
    <button type="button" className="ws-iconbtn" aria-label={count ? `알림, 안 읽음 ${count}건` : "알림"} onClick={mobile ? () => nav("/notifications") : undefined}>
      <BellOutlined aria-hidden />
      <CountBadge count={count} />
    </button>
  );
  if (mobile) return btn;
  return (
    <Popover open={open} onOpenChange={setOpen} trigger="click" placement="bottomRight" content={<NotificationPopover onClose={() => setOpen(false)} />} arrow={false}>
      <Tooltip title="알림" open={open ? false : undefined}>{btn}</Tooltip>
    </Popover>
  );
}

// ───────── 사용자 메뉴·시트
function useResetDemo() {
  const { resetDemo } = useWorksite();
  const confirm = useConfirm();
  return async () => {
    const ok = await confirm({
      title: "데모 데이터를 처음 상태로 돌릴까요?",
      content: "이 회사의 데모 데이터를 처음 상태로 돌려요. 내가 바꾼 내용이 모두 사라져요.",
      okText: "데모 초기화",
      danger: true,
    });
    if (ok) await resetDemo();
  };
}

function UserMenu() {
  const { persona, persist, setPersist } = useWorksite();
  const nav = useNavigate();
  const reset = useResetDemo();
  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        items: [
          { key: "me", label: "내 정보" },
          { key: "ai", label: "내 AI 연결" },
          { key: "notif", label: "알림 설정" },
          { type: "divider" },
          { key: "persist", label: <span className="ws-usersheet__row" style={{ minHeight: 0 }}>변경 내용 이 브라우저에 저장 <Switch size="small" checked={persist} aria-label="변경 내용 이 브라우저에 저장" /></span> },
          { key: "reset", label: "데모 초기화", danger: true },
          { key: "login", label: "데모 시작 화면" },
        ],
        onClick: ({ key }) => {
          if (key === "me") nav("/me");
          if (key === "ai") nav("/me/ai");
          if (key === "notif") nav("/me/notifications");
          if (key === "persist") setPersist(!persist);
          if (key === "reset") void reset();
          if (key === "login") nav("/login");
        },
      }}
    >
      <button type="button" className="ws-userbtn" aria-label={`사용자 메뉴: ${persona.displayName}`}>
        <span className="ws-avatar" aria-hidden>{initialsOf(persona.displayName)}</span>
        <span className="ws-userbtn__name">{persona.displayName}</span>
        <DownOutlined aria-hidden style={{ fontSize: 10, color: "var(--ws-muted)" }} />
      </button>
    </Dropdown>
  );
}

/** 모바일 사용자 시트(바텀시트): 나 · 회사·인물 전환 · AI 연결 상태 · 바로가기 · 저장 스위치 · 데모 초기화 */
export function UserSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { persona, tenant, role, persist, setPersist } = useWorksite();
  const reset = useResetDemo();
  return (
    <Drawer open={open} onClose={onClose} placement="bottom" height="auto" title="내 계정과 데모" className="ws-drawer ws-drawer--sheet" styles={{ wrapper: { maxHeight: "90vh" } }}>
      <div className="ws-usersheet__section">
        <PersonChip memberId={persona.memberId} showUnit />
        <span className="ws-t-caption">{role.title} · {labelOf("platform_role", persona.role)} · {tenant.displayName}</span>
        <AiStatusChip />
        <div className="ws-row">
          <Link to="/me" onClick={onClose}><Button>내 정보</Button></Link>
          <Link to="/me/notifications" onClick={onClose}><Button>알림 설정</Button></Link>
        </div>
      </div>
      <div className="ws-usersheet__section">
        <label className="ws-t-label">회사</label>
        <TenantSwitcher block />
        <label className="ws-t-label">누구로 보기</label>
        <PersonaSwitcher block />
        <div className="ws-usersheet__row">
          <span className="ws-t-body">변경 내용 이 브라우저에 저장</span>
          <Switch checked={persist} onChange={setPersist} aria-label="변경 내용 이 브라우저에 저장" />
        </div>
        <Button danger onClick={() => void reset()}>데모 초기화</Button>
        <p className="ws-t-caption">모든 숫자와 사람은 예시예요. 실제 회사 값이 아니에요.</p>
      </div>
    </Drawer>
  );
}

// ───────── 상단 바
export function TopBar({ bp, navOpen = false, onOpenNav }: { bp: Breakpoint; navOpen?: boolean; onOpenNav: () => void }) {
  const { tenant, persona } = useWorksite();
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [cmd, setCmd] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mobile = bp === "mobile";
  const menuBtn = (
    <Tooltip title="전체 메뉴">
      <button type="button" className="ws-iconbtn" aria-label="전체 메뉴 열기" aria-haspopup="dialog" aria-expanded={navOpen} aria-controls={navOpen ? "ws-nav-drawer" : undefined} onClick={onOpenNav}><MenuOutlined aria-hidden /></button>
    </Tooltip>
  );

  return (
    <header className={`ws-topbar${scrolled ? " is-scrolled" : ""}`}>
      {mobile ? (
        <>
          {menuBtn}
          <Link to="/" className="ws-mobile-brand" aria-label={`${tenant.displayName} 홈`}>
            <span className="ws-monogram ws-monogram--sm" aria-hidden>{tenant.monogram}</span>
            <span className="ws-brand__name">{tenant.shortName ?? tenant.displayName}</span>
          </Link>
          {/* 좁은 화면: 회사 이름이 잘리지 않게 짧은 이름 + 짧은 '예시' 배지 */}
          <DemoDataBadge variant="topbar" compact />
          <div className="ws-topbar__right" style={{ gap: 0 }}>
            <button type="button" className="ws-iconbtn" aria-label="검색" onClick={() => nav("/search")}><SearchOutlined aria-hidden /></button>
            <NotificationBell mobile />
            <button type="button" className="ws-iconbtn" aria-label={`사용자 메뉴: ${persona.displayName}`} onClick={() => setSheet(true)}>
              <span className="ws-avatar" aria-hidden>{initialsOf(persona.displayName)}</span>
            </button>
          </div>
          <UserSheet open={sheet} onClose={() => setSheet(false)} />
        </>
      ) : (
        <>
          <div className="ws-topbar__left">
            {bp === "tablet" && menuBtn}
            {tenant.isDemo && (
              <>
                <div className="ws-topbar__field"><span className="ws-topbar__label" aria-hidden>회사</span><TenantSwitcher /></div>
                <div className="ws-topbar__field"><span className="ws-topbar__label" aria-hidden>누구로 보기</span><PersonaSwitcher /></div>
              </>
            )}
          </div>
          <div className="ws-topbar__right">
            <button type="button" className="ws-searchbtn" onClick={() => setCmd(true)} aria-label="검색(Ctrl K)">
              <SearchOutlined aria-hidden />
              <span className="ws-searchbtn__text">검색</span>
              <span className="ws-kbd" aria-hidden>Ctrl K</span>
            </button>
            <AiStatusChip />
            <NotificationBell />
            <UserMenu />
            <DemoDataBadge variant="topbar" />
          </div>
        </>
      )}
      {cmd && (
        <Suspense fallback={null}>
          <CommandMenu open={cmd} onClose={() => setCmd(false)} />
        </Suspense>
      )}
    </header>
  );
}
