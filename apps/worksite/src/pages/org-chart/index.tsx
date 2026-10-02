// 조직도 `/company/org` · C-13 · 깊이 B · 모듈 org-members · 소유: collab 그룹
// 조직 트리(들여쓰기 + 1px 연결선)와 책임자·인원(예시). 키보드: ↑↓ 이동 · → 펼치기/아래로 · ← 접기/위로 · Home·End · Enter 구성원 보기.
// [구성원 보기] → /company/people?unit=<조직 id>
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "antd";
import { DownOutlined, RightOutlined, MinusOutlined } from "@ant-design/icons";
import { EmptyState, PageHeader, PersonChip, SectionCard } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useList } from "@/lib/refine";
import type { Member, OrgUnit } from "@/types/entities";
import { Caption } from "../docs/shared/lib";

interface Node { unit: OrgUnit; children: Node[]; level: number; parentId: string | null }

export default function Page() {
  const { tenant } = useWorksite();
  const nav = useNavigate();
  const unitsQ = useList<OrgUnit>({ resource: "org_units", pagination: { mode: "off" }, sorters: [{ field: "sort_order", order: "asc" }] });
  const membersQ = useList<Member>({ resource: "members", pagination: { mode: "off" }, filters: [{ field: "status", operator: "eq", value: "active" }] });
  usePageReady(!unitsQ.query.isLoading && !membersQ.query.isLoading);
  const units = unitsQ.result?.data ?? [];
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of membersQ.result?.data ?? []) m.set(p.org_unit_id, (m.get(p.org_unit_id) ?? 0) + 1);
    return m;
  }, [membersQ.result]);

  const roots = useMemo(() => {
    const build = (parentId: string | null, level: number): Node[] =>
      units.filter((u) => u.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order).map((u) => ({ unit: u, level, parentId, children: build(u.id, level + 1) }));
    const top = build(null, 1);
    // 부모가 목록에 없는 조직도 위에 둠
    const placed = new Set<string>();
    const walk = (ns: Node[]) => ns.forEach((n) => { placed.add(n.unit.id); walk(n.children); });
    walk(top);
    return [...top, ...units.filter((u) => !placed.has(u.id)).map((u) => ({ unit: u, level: 1, parentId: null, children: [] as Node[] }))];
  }, [units]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const keyMoved = useRef(false);
  const refs = useRef(new Map<string, HTMLLIElement>());

  const visible = useMemo(() => {
    const out: Node[] = [];
    const walk = (ns: Node[]) => ns.forEach((n) => { out.push(n); if (!collapsed.has(n.unit.id)) walk(n.children); });
    walk(roots);
    return out;
  }, [roots, collapsed]);
  const current = focusId && visible.some((n) => n.unit.id === focusId) ? focusId : visible[0]?.unit.id ?? null;

  useEffect(() => {
    if (keyMoved.current && current) refs.current.get(current)?.focus();
    keyMoved.current = false;
  }, [current]);

  const toggle = (id: string, open?: boolean) => setCollapsed((prev) => {
    const next = new Set(prev);
    const isOpen = !next.has(id);
    if (open ?? !isOpen) next.delete(id); else next.add(id);
    return next;
  });

  const onKey = (e: KeyboardEvent<HTMLLIElement>, n: Node) => {
    if (e.target !== e.currentTarget) return;
    const idx = visible.findIndex((v) => v.unit.id === n.unit.id);
    const go = (id: string | undefined) => { if (id) { keyMoved.current = true; setFocusId(id); } };
    const open = !collapsed.has(n.unit.id);
    switch (e.key) {
      case "ArrowDown": go(visible[idx + 1]?.unit.id); break;
      case "ArrowUp": go(visible[idx - 1]?.unit.id); break;
      case "Home": go(visible[0]?.unit.id); break;
      case "End": go(visible[visible.length - 1]?.unit.id); break;
      case "ArrowRight":
        if (n.children.length && !open) toggle(n.unit.id, true);
        else if (n.children.length) go(n.children[0]!.unit.id);
        break;
      case "ArrowLeft":
        if (n.children.length && open) toggle(n.unit.id, false);
        else go(n.parentId ?? undefined);
        break;
      case "Enter": nav(`/company/people?unit=${n.unit.id}`); break;
      default: return;
    }
    e.preventDefault();
  };

  const renderNodes = (ns: Node[]) => ns.map((n, i) => {
    const open = !collapsed.has(n.unit.id);
    const count = counts.get(n.unit.id) ?? 0;
    return (
      <li
        key={n.unit.id}
        role="treeitem"
        aria-level={n.level}
        aria-setsize={ns.length}
        aria-posinset={i + 1}
        aria-expanded={n.children.length ? open : undefined}
        aria-selected={current === n.unit.id}
        aria-label={`${n.unit.name}, ${count}명`}
        tabIndex={current === n.unit.id ? 0 : -1}
        ref={(el) => { if (el) refs.current.set(n.unit.id, el); else refs.current.delete(n.unit.id); }}
        onKeyDown={(e) => onKey(e, n)}
        onFocus={(e) => { if (e.target === e.currentTarget) setFocusId(n.unit.id); }}
      >
        <div className="cb-node">
          {n.children.length ? (
            <button type="button" className="cb-node__toggle" tabIndex={-1} aria-label={open ? `${n.unit.name} 접기` : `${n.unit.name} 펼치기`} onClick={() => toggle(n.unit.id)}>
              {open ? <DownOutlined aria-hidden /> : <RightOutlined aria-hidden />}
            </button>
          ) : <span className="cb-node__toggle cb-node__toggle--leaf" aria-hidden><MinusOutlined /></span>}
          <span className="cb-node__name">{n.unit.name}</span>
          {/* 모바일은 두 줄로 고정: 1줄 조직 이름, 2줄 책임자 · 인원 · [구성원 보기](오른쪽 끝, 줄바꿈 없음) */}
          <span className="cb-node__meta">
            {n.unit.head_member_id && <PersonChip memberId={n.unit.head_member_id} size="sm" />}
            <span className="cb-node__count">{count}명</span>
            <Link className="cb-node__link" tabIndex={-1} to={`/company/people?unit=${n.unit.id}`}>구성원 보기</Link>
          </span>
        </div>
        {n.children.length > 0 && open && <ul role="group">{renderNodes(n.children)}</ul>}
      </li>
    );
  });

  const parentIds = units.filter((u) => units.some((c) => c.parent_id === u.id)).map((u) => u.id);
  const isTr = tenant.packs.includes("manufacturing");

  return (
    <>
      <PageHeader
        title="조직도"
        description="조직과 책임자를 한눈에 봐요. 조직을 고르면 구성원 목록으로 가요."
        actions={units.length > 0 ? (
          // 끈 버튼 두 개 대신 지금 상태에 맞는 버튼 하나(모두 펼쳐져 있으면 '모두 접기')
          collapsed.size === 0
            ? <Button onClick={() => setCollapsed(new Set(parentIds))}>모두 접기</Button>
            : <Button onClick={() => setCollapsed(new Set())}>모두 펼치기</Button>
        ) : undefined}
      />
      {unitsQ.query.isError ? (
        <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void unitsQ.query.refetch() }} />
      ) : unitsQ.query.isLoading ? (
        <div style={{ minHeight: 200 }} aria-busy="true" />
      ) : units.length === 0 ? (
        <EmptyState kind="empty" title="조직 정보가 없어요" description="Company DNA에서 먼저 정해요." />
      ) : (
        <SectionCard
          title={`${tenant.displayName} 조직`}
          demo
          caption={isTr ? "조직 구성은 공개 자료(2016) 기준이에요. 인원은 예시예요." : "조직은 CRATA 내부 적용 가안이에요. 인원은 예시예요."}
        >
          <ul className="cb-tree" role="tree" aria-label="조직도">{renderNodes(roots)}</ul>
          <Caption style={{ marginTop: 12 }}>키보드: 위·아래 화살표로 이동, 오른쪽·왼쪽 화살표로 펼치고 접어요. 엔터 키를 누르면 구성원을 봐요.</Caption>
        </SectionCard>
      )}
    </>
  );
}
