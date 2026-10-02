// KanbanBoard: 열은 틴트 패널 위의 레인(카드 아님), 카드는 흰 면(라운드 12, 그림자 없음).
// 끌어놓기 없이 카드의 [이동] 메뉴로 옮깁니다(키보드 가능). canMove가 막으면 메뉴 항목을 끄고 이유를 보여 줍니다.
// 모바일(≤767)은 열 선택 세그먼트 + 한 열. 데스크톱(≥1280)은 모든 열이 패널 폭 안에 들어가고(스크롤 없음),
// 태블릿은 가로 스크롤 + 오른쪽 끝 흐림 + 키보드로 스크롤할 수 있게 영역에 초점이 갑니다.
import { useState, type CSSProperties, type ReactNode } from "react";
import { Button, Dropdown, Tooltip } from "antd";
import { DownOutlined, RightOutlined } from "@ant-design/icons";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { useScrollFade } from "@/lib/useScrollFade";
import type { Tone } from "@/theme/tokens";
import { SegmentedPills } from "./SegmentedPills";

export interface KanbanColumn { key: string; label: string; tone?: Tone; collapsed?: boolean; /** 열 점 색(직접 CSS 색). tone보다 우선 */ color?: string }

export interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: T[];
  getColumn: (item: T) => string;
  getId: (item: T) => string;
  /** 카드 안 내용만. 바깥 틀은 보드가 그림 */
  renderCard: (item: T) => ReactNode;
  canMove?: (item: T, to: string) => { ok: true } | { ok: false; reason: string };
  /** 카드의 [이동] 메뉴에서 호출 */
  onMove?: (item: T, to: string) => Promise<void> | void;
  /** 열이 비었을 때 문장(기본 "{열} 항목이 없어요") */
  emptyColumnText?: string | ((column: KanbanColumn) => string);
  ariaLabel: string;
  /** 카드 이름(이동 메뉴 접근성 이름) */
  getTitle?: (item: T) => string;
}

export function KanbanBoard<T>({ columns, items, getColumn, getId, renderCard, canMove, onMove, emptyColumnText, ariaLabel, getTitle }: KanbanBoardProps<T>) {
  const bp = useBreakpoint();
  const fade = useScrollFade();
  const emptyText = (c: KanbanColumn) =>
    typeof emptyColumnText === "function" ? emptyColumnText(c) : emptyColumnText ?? `${c.label} 항목이 없어요`;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [mobileCol, setMobileCol] = useState(columns[0]?.key ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const byCol = (key: string) => items.filter((it) => getColumn(it) === key);

  const moveMenu = (item: T) => {
    const from = getColumn(item);
    const id = getId(item);
    return (
      <Dropdown
        trigger={["click"]}
        menu={{
          items: columns.filter((c) => c.key !== from).map((c) => {
            const check = canMove ? canMove(item, c.key) : { ok: true as const };
            return {
              key: c.key,
              disabled: !check.ok || !onMove,
              label: check.ok ? `${c.label}(으)로` : <Tooltip title={check.reason} placement="left"><span>{c.label}(으)로 · 안 돼요</span></Tooltip>,
              title: check.ok ? undefined : check.reason,
            };
          }),
          onClick: async ({ key }) => {
            if (!onMove) return;
            setBusy(id);
            // 실패 안내(토스트)는 공급자가 이미 띄워요. 여기서는 처리되지 않은 거부만 막습니다.
            try { await onMove(item, key); } catch { /* 공급자가 알림 */ } finally { setBusy(null); }
          },
        }}
      >
        <Button size="small" loading={busy === id} aria-label={`${getTitle ? getTitle(item) : "카드"} 이동`}>
          이동 <DownOutlined aria-hidden style={{ fontSize: 10 }} />
        </Button>
      </Dropdown>
    );
  };

  const lane = (c: KanbanColumn, forceOpen = false) => {
    const list = byCol(c.key);
    const collapsed = !forceOpen && c.collapsed && !open[c.key];
    return (
      <section key={c.key} className={`ws-lane${collapsed ? " ws-lane--collapsed" : ""}`} aria-label={`${c.label} ${list.length}건`}>
        <div className="ws-lane__head">
          {(c.color || c.tone) && <span className="ws-lane__dot" style={{ background: c.color ?? `var(--ws-${c.tone}-mark)` }} aria-hidden />}
          <span>{c.label}</span>
          <span className="ws-lane__count">{list.length}</span>
          {c.collapsed && !forceOpen && (
            <Button size="small" type="text" aria-expanded={!collapsed} onClick={() => setOpen((o) => ({ ...o, [c.key]: !o[c.key] }))} icon={collapsed ? <RightOutlined /> : <DownOutlined />}>
              {collapsed ? "펼치기" : "접기"}
            </Button>
          )}
        </div>
        {!collapsed && (
          list.length ? (
            <ul className="ws-lane__list">
              {list.map((it) => (
                <li key={getId(it)} className="ws-kcard">
                  {renderCard(it)}
                  {onMove && <div className="ws-kcard__foot">{moveMenu(it)}</div>}
                </li>
              ))}
            </ul>
          ) : <p className="ws-lane__empty">{emptyText(c)}</p>
        )}
      </section>
    );
  };

  if (bp === "mobile") {
    const current = columns.find((c) => c.key === mobileCol) ?? columns[0];
    return (
      <div aria-label={ariaLabel} role="region">
        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <SegmentedPills ariaLabel="열 고르기" value={current?.key ?? ""} onChange={setMobileCol} options={columns.map((c) => ({ value: c.key, label: `${c.label} ${byCol(c.key).length}` }))} />
        </div>
        {current && lane(current, true)}
      </div>
    );
  }
  const template = columns.map((c) => (c.collapsed && !open[c.key] ? "auto" : "minmax(0, 1fr)")).join(" ");
  return (
    <div className="ws-scroll-fade" ref={fade.wrapRef}>
      <div
        ref={fade.scrollerRef}
        className="ws-kanban"
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        style={{ ["--lanes" as string]: columns.length, gridTemplateColumns: bp === "desktop" || bp === "wide" ? template : undefined } as CSSProperties}
      >
        {columns.map((c) => lane(c))}
      </div>
    </div>
  );
}
