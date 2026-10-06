// FilterBar: 콘텐츠 위 한 줄(검색 · 칩 · 선택칸 · 보기 세그먼트). 값은 모두 URL 쿼리에 남깁니다.
// 모바일은 칩 가로 스크롤 + [필터] 바텀시트(선택칸). 표에 거는 조건은 useFilterBarState(props)가 Refine 필터로 바꿔 줍니다.
// 칩 묶음이 둘 이상이면 묶음 사이에 세로 구분선 + 작은 묶음 이름(상태 · 마감 …)을 붙이고, 고른 칩은 브랜드 옅은 바탕 + 체크 표시.
// 데스크톱에서 한 줄에 다 안 들어가면 선택칸을 [필터] 팝오버로 옮깁니다(줄바꿈 없이).
// 태블릿(768~1279)은 바가 여러 줄로 꺾이므로: 검색과 보기 세그먼트를 첫 줄에 함께 두고(혼자 남는 줄이 없게), 묶음 구분선은 그리지 않아요
// (구분선은 한 줄 데스크톱 바에서만 뜻이 있음 — 꺾인 줄 끝·처음에 홀로 남던 문제, 리뷰 5차).
// 칩 묶음은 단일·다중 선택 모두 '전체' 칩으로 시작해요(아무것도 고르지 않은 상태가 눌린 칩으로 보이게).
// 데스크톱·태블릿: 구분선 · 선택칸(또는 [필터]) · 보기 세그먼트 · right는 끝 묶음(.ws-filterbar__end)으로 늘 오른쪽 끝에 — 칩이 한 줄이든
// 꺾이든 [필터]·'내 업무 | 내가 검토'가 모든 목록 화면에서 같은 자리예요(리뷰 6차 — 목록·보드를 오갈 때 212px 뛰던 문제).
// 휴대폰: 가로로 미는 한 줄 + 넘치면 오른쪽 끝 옅은 가림(.ws-scroll-fade, 끝까지 밀면 사라짐) · 밀어 둔 동안 왼쪽 가림.
// 칩 단위로 멈추고(scroll-snap), 처음 그릴 때 고른 칩(URL로 들어온 조건)이 보이게 옮겨 둬요.
//   const fb = useFilterBarState(filterProps);  <FilterBar {...filterProps} />  <DataTable filters={[...base, ...fb.filters]} isFiltered={fb.active} onClearFilters={fb.clear} />
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button, Drawer, Input, Popover, Select } from "antd";
import { CheckOutlined, FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router";
import type { CrudFilter } from "@refinedev/core";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { useScrollFade } from "@/lib/useScrollFade";
import { SegmentedPills, type SegmentedPillsProps } from "./SegmentedPills";
import { useInsideCard } from "./SectionCard";

type Op = "eq" | "in" | "contains" | "gte" | "lte";
export interface FilterChipGroup {
  param: string;
  options: { value: string; label: string }[];
  multiple?: boolean;
  /** 이 칩이 거는 필드(없으면 표 필터로 바꾸지 않음, 페이지가 직접 씀) */
  field?: string;
  operator?: Op;
  /** "전체" 칩 글자(기본 "전체"). 묶음 이름이 이미 필드를 말하면 쓰지 않아요("모든 상태" ✕). 기본값이 '전체'가 아닐 때만(예: "이번 주") */
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
  // 휴대폰 가로 스크롤 줄: 오른쪽 끝 가림(공통 useScrollFade) + 밀어 둔 동안 왼쪽 가림(.is-scrolled)
  const fade = useScrollFade<HTMLDivElement, HTMLDivElement>();
  const inCard = useInsideCard();
  useEffect(() => {
    const el = fade.scrollerRef.current;
    const wrap = fade.wrapRef.current;
    if (bp !== "mobile" || !el || !wrap) return;
    const update = () => wrap.classList.toggle("is-scrolled", el.scrollLeft > 1);
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, [bp]);
  // 처음 그릴 때(휴대폰) 고른 칩이 화면 밖이면 보이게 옮겨요(가로만 — 페이지는 세로로 움직이지 않게 scrollLeft로)
  useLayoutEffect(() => {
    const el = fade.scrollerRef.current;
    if (bp !== "mobile" || !el) return;
    const pressed = el.querySelector<HTMLElement>('.ws-chip[aria-pressed="true"]:not([data-chip-all])');
    if (!pressed) return;
    const box = el.getBoundingClientRect();
    const r = pressed.getBoundingClientRect();
    const fadeW = 40; // 오른쪽 가림 폭만큼 더 옮겨 칩이 가림 밑에 걸리지 않게
    if (r.right > box.right - fadeW) el.scrollLeft += r.right - (box.right - fadeW);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bp]);
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
    <button key={key} type="button" className="ws-chip" aria-pressed={pressed} onClick={onClick} {...(key === "__all" ? { "data-chip-all": "" } : {})}>
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
          {chip("__all", cur.length === 0, g.allLabel ?? "전체", () => setParam(g.param, null))}
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
        <div className="ws-filterbar-wrap ws-scroll-fade" ref={fade.wrapRef} style={{ ["--ws-fade" as string]: inCard ? "var(--ws-surface)" : "var(--ws-panel)" }}>
          <div className="ws-filterbar" ref={fade.scrollerRef}>
            {hasSheet && <Button icon={<FilterOutlined />} onClick={() => setSheet(true)}>필터</Button>}
            {view && <SegmentedPills {...view} />}
            {chipGroups}
            {right && <div className="ws-filterbar__right">{right}</div>}
          </div>
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
  const viewEl = view && <SegmentedPills {...view} />;
  // 태블릿: 검색 + 보기를 한 줄(검색 왼쪽, 보기 오른쪽 끝)로 묶어 맨 위에. DOM 순서도 보이는 순서와 같아요
  const topRow = bp === "tablet" && !!searchEl && !!viewEl;
  // 묶음 구분선은 한 줄 데스크톱 바에서만(태블릿은 바가 꺾여 선이 줄 끝·처음에 홀로 남아요)
  const showSep = (bp === "desktop" || bp === "wide") && chipGroups.length > 0 && (selectEls.length > 0 || !!view);
  return (
    <div className="ws-filterbar" ref={barRef}>
      {topRow ? <div className="ws-filterbar__top">{searchEl}{viewEl}</div> : searchEl}
      {/* 칩 묶음은 한 상자 안에서만 줄바꿈(검색·필터 버튼은 첫 줄에 그대로) */}
      {chipGroups.length > 0 && <div className="ws-filterbar__groups">{chipGroups}</div>}
      {/* 끝 묶음: 구분선 · 선택칸(또는 [필터]) · 보기 · right — 늘 바의 오른쪽 끝(칩이 꺾이든 아니든 같은 자리) */}
      {(showSep || selectEls.length > 0 || (!topRow && viewEl) || right) && (
        <div className="ws-filterbar__end">
          {showSep && <span className="ws-filterbar__sep" aria-hidden />}
          {collapsed && selectEls.length > 0 ? (
            <Popover
              trigger="click"
              placement="bottomRight"
              title="필터"
              content={<div className="ws-filterbar__pop">{selectEls}</div>}
            >
              <Button icon={<FilterOutlined />}>필터{activeSelects ? ` ${activeSelects}` : ""}</Button>
            </Popover>
          ) : selectEls}
          {!topRow && viewEl}
          {right && <div className="ws-filterbar__right">{right}</div>}
        </div>
      )}
    </div>
  );
}
