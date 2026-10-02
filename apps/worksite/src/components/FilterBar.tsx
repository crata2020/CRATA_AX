// FilterBar: 콘텐츠 위 한 줄(검색 · 칩 · 선택칸 · 보기 세그먼트). 값은 모두 URL 쿼리에 남깁니다.
// 모바일은 칩 가로 스크롤 + [필터] 바텀시트(선택칸). 표에 거는 조건은 useFilterBarState(props)가 Refine 필터로 바꿔 줍니다.
// 칩 묶음이 둘 이상이면 묶음 사이에 세로 구분선 + 작은 묶음 이름(상태 · 마감 …)을 붙이고, 고른 칩은 브랜드 옅은 바탕 + 체크 표시.
// 데스크톱에서 한 줄에 다 안 들어가면 선택칸을 [필터] 팝오버로 옮깁니다(줄바꿈 없이).
//   const fb = useFilterBarState(filterProps);  <FilterBar {...filterProps} />  <DataTable filters={[...base, ...fb.filters]} isFiltered={fb.active} onClearFilters={fb.clear} />
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button, Drawer, Input, Popover, Select } from "antd";
import { CheckOutlined, FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router";
import type { CrudFilter } from "@refinedev/core";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { SegmentedPills, type SegmentedPillsProps } from "./SegmentedPills";

type Op = "eq" | "in" | "contains" | "gte" | "lte";
export interface FilterChipGroup {
  param: string;
  options: { value: string; label: string }[];
  multiple?: boolean;
  /** 이 칩이 거는 필드(없으면 표 필터로 바꾸지 않음, 페이지가 직접 씀) */
  field?: string;
  operator?: Op;
  /** "전체" 칩 글자(단일 선택일 때, 기본 "전체") */
  allLabel?: string;
  /** 묶음 이름(접근성 이름 겸 보이는 작은 이름). 없으면 ariaLabel */
  label?: string;
  ariaLabel?: string;
}
export interface FilterSelect {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  field?: string;
  operator?: Op;
  multiple?: boolean;
}
export interface FilterBarProps {
  search?: { placeholder: string; param?: string; fields?: string[] };
  chips?: FilterChipGroup[];
  selects?: FilterSelect[];
  view?: SegmentedPillsProps<any>;
  right?: ReactNode;
}

const listOf = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

/** URL 쿼리 → Refine 필터 + 활성 여부 + 모두 지우기 */
export function useFilterBarState(props: FilterBarProps): { filters: CrudFilter[]; active: boolean; clear: () => void; values: Record<string, string> } {
  const [params, setParams] = useSearchParams();
  const filters: CrudFilter[] = [];
  const values: Record<string, string> = {};
  const keys: string[] = [];
  const searchParam = props.search?.param ?? "q";
  if (props.search) {
    keys.push(searchParam);
    const q = params.get(searchParam);
    if (q) {
      values[searchParam] = q;
      const fields = props.search.fields ?? [];
      if (fields.length === 1) filters.push({ field: fields[0]!, operator: "contains", value: q });
      else if (fields.length > 1) filters.push({ operator: "or", value: fields.map((f) => ({ field: f, operator: "contains" as const, value: q })) });
    }
  }
  for (const g of [...(props.chips ?? []), ...(props.selects ?? [])]) {
    keys.push(g.param);
    const raw = params.get(g.param);
    if (!raw) continue;
    values[g.param] = raw;
    if (!g.field) continue;
    const list = listOf(raw);
    if (g.multiple || list.length > 1) filters.push({ field: g.field, operator: "in", value: list });
    else filters.push({ field: g.field, operator: g.operator ?? "eq", value: raw });
  }
  const active = Object.keys(values).length > 0;
  const clear = () => setParams((prev) => {
    const p = new URLSearchParams(prev);
    for (const k of keys) p.delete(k);
    p.delete("currentPage");
    return p;
  }, { replace: true });
  return { filters, active, clear, values };
}

export function FilterBar({ search, chips, selects, view, right }: FilterBarProps) {
  const bp = useBreakpoint();
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  // 데스크톱에서 줄이 넘치면 선택칸을 팝오버로(넘친 폭을 기억해 두고, 그보다 넉넉해지면 다시 펼쳐 봄)
  const barRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedAt = useRef(0);
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el || bp === "mobile" || bp === "tablet" || !(selects?.length)) return;
    const check = () => {
      const w = el.clientWidth;
      if (collapsed) {
        if (w > collapsedAt.current + 80) setCollapsed(false);
        return;
      }
      // 줄이 넘치는지: 바 자체가 두 줄이 되거나, 칩 묶음 상자가 두 줄 이상이 되면
      const kids = Array.from(el.children) as HTMLElement[];
      const top = kids[0]?.offsetTop ?? 0;
      const groups = el.querySelector<HTMLElement>(".ws-filterbar__groups");
      const groupsWrap = !!groups && groups.getBoundingClientRect().height > 44;
      if (groupsWrap || kids.some((k) => k.offsetTop > top + 4)) { collapsedAt.current = w; setCollapsed(true); }
    };
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bp, collapsed, selects?.length]);
  const searchParam = search?.param ?? "q";
  const urlQ = params.get(searchParam) ?? "";
  const [text, setText] = useState(urlQ);
  // 마지막으로 이 입력칸이 URL에 쓴 값. URL이 바깥에서 바뀌면(필터 지우기·뒤로 가기) 입력칸을 URL에 맞춥니다.
  const wroteRef = useRef(urlQ);
  useEffect(() => {
    if (urlQ === wroteRef.current) return;
    wroteRef.current = urlQ;
    setText(urlQ);
  }, [urlQ]);

  const setParam = (k: string, v: string | null) => setParams((prev) => {
    const p = new URLSearchParams(prev);
    if (v == null || v === "") p.delete(k); else p.set(k, v);
    p.delete("currentPage");
    return p;
  }, { replace: true });

  // 검색어는 250ms 뒤 URL에
  useEffect(() => {
    if (!search) return;
    const next = text.trim();
    if (next === urlQ.trim()) return;
    const id = setTimeout(() => { wroteRef.current = next; setParam(searchParam, next || null); }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const groups = chips ?? [];
  const showGroupLabels = groups.length > 1;
  const chip = (key: string, pressed: boolean, label: string, onClick: () => void) => (
    <button key={key} type="button" className="ws-chip" aria-pressed={pressed} onClick={onClick}>
      {pressed && <CheckOutlined aria-hidden className="ws-chip__check" />}{label}
    </button>
  );
  const chipGroups = groups.map((g) => {
    const cur = listOf(params.get(g.param));
    const name = g.label ?? g.ariaLabel;
    const toggle = (v: string) => {
      if (g.multiple) setParam(g.param, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(",") || null);
      else setParam(g.param, cur[0] === v ? null : v);
    };
    return (
      <Fragment key={g.param}>
        <div className="ws-chips" role="group" aria-label={name ?? "필터"}>
          {showGroupLabels && name && <span className="ws-chips__label" aria-hidden>{name}</span>}
          {!g.multiple && chip("__all", cur.length === 0, g.allLabel ?? "전체", () => setParam(g.param, null))}
          {g.options.map((o) => chip(o.value, cur.includes(o.value), o.label, () => toggle(o.value)))}
        </div>
      </Fragment>
    );
  });

  const selectEls = (selects ?? []).map((s) => {
    const raw = params.get(s.param);
    return (
      <Select
        key={s.param}
        aria-label={s.label}
        placeholder={s.label}
        allowClear
        mode={s.multiple ? "multiple" : undefined}
        maxTagCount="responsive"
        style={{ minWidth: 160, width: bp === "mobile" || collapsed ? "100%" : undefined }}
        value={s.multiple ? listOf(raw) : raw ?? undefined}
        options={s.options}
        onChange={(v: string | string[] | undefined) => setParam(s.param, Array.isArray(v) ? v.join(",") : v ?? null)}
      />
    );
  });

  const searchEl = search && (
    <Input
      className="ws-filterbar__search"
      aria-label={search.placeholder}
      placeholder={search.placeholder}
      prefix={<SearchOutlined aria-hidden />}
      allowClear
      value={text}
      onChange={(e) => setText(e.target.value)}
      style={bp === "mobile" ? { width: "100%" } : undefined}
    />
  );

  if (bp === "mobile") {
    const hasSheet = !!(selects?.length || search);
    return (
      <>
        <div className="ws-filterbar">
          {hasSheet && <Button icon={<FilterOutlined />} onClick={() => setSheet(true)}>필터</Button>}
          {view && <SegmentedPills {...view} />}
          {chipGroups}
          {right && <div className="ws-filterbar__right">{right}</div>}
        </div>
        <Drawer open={sheet} onClose={() => setSheet(false)} placement="bottom" height="auto" title="필터" className="ws-drawer ws-drawer--sheet" styles={{ body: { display: "flex", flexDirection: "column", gap: 12 } }}
          footer={<div className="ws-drawer__footer-right"><Button type="primary" onClick={() => setSheet(false)}>적용하기</Button></div>}>
          {searchEl}
          {selectEls}
        </Drawer>
      </>
    );
  }
  const activeSelects = (selects ?? []).filter((s) => params.get(s.param)).length;
  return (
    <div className="ws-filterbar" ref={barRef}>
      {searchEl}
      {/* 칩 묶음은 한 상자 안에서만 줄바꿈(검색·필터 버튼은 첫 줄에 그대로) */}
      {chipGroups.length > 0 && <div className="ws-filterbar__groups">{chipGroups}</div>}
      {(chipGroups.length > 0 && (selectEls.length > 0 || view)) && <span className="ws-filterbar__sep" aria-hidden />}
      {collapsed && selectEls.length > 0 ? (
        <Popover
          trigger="click"
          placement="bottomLeft"
          title="필터"
          content={<div className="ws-filterbar__pop">{selectEls}</div>}
        >
          <Button icon={<FilterOutlined />}>필터{activeSelects ? ` ${activeSelects}` : ""}</Button>
        </Popover>
      ) : selectEls}
      {view && <SegmentedPills {...view} />}
      {right && <div className="ws-filterbar__right">{right}</div>}
    </div>
  );
}
