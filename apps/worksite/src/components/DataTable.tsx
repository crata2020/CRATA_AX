// DataTable: Refine useTable(src/lib/refine.ts 경유) + antd Table. 첫 열은 사람이 읽는 이름, 숫자 열은 오른쪽 정렬 tabular.
// 페이지·정렬은 URL에 남고(syncWithLocation), 모바일(≤767)은 ListRow 목록으로 바뀝니다(mobileRow).
// 상태: 첫 로딩은 300ms 지나도 없을 때만 스켈레톤, 다시 불러올 때는 이전 화면을 투명도 0.6으로 유지, 빈·필터 결과 없음·오류는 EmptyState.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Form, Pagination, Skeleton, Table, type TableColumnType } from "antd";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { BaseRecord, CrudFilter, CrudSort } from "@refinedev/core";
import { useTable } from "@/lib/refineAntd";
import { useBreakpoint } from "@/lib/useBreakpoint";
import { useScrollFade } from "@/lib/useScrollFade";
import { usePageReady } from "@/app/pageReady";
import { formatDate, formatDateTime, formatQty, formatWon } from "@/lib/format";
import { labelOf, statusOf, type StatusDomain } from "@/lib/status";
import { getPath } from "@/providers/filters";
import { StatusTag } from "./StatusTag";
import { PersonChip } from "./PersonChip";
import { DdayBadge, PriceGate } from "./basics";
import { EmptyState, type EmptyStateProps } from "./EmptyState";
import { ListRows, type ListRowProps } from "./ListRow";
import { useInsideCard } from "./SectionCard";

export type ColumnKind = "name" | "text" | "number" | "date" | "datetime" | "status" | "person" | "dday" | "tag" | "price";

export interface ColumnDef<T> {
  key: string;
  title: string;
  kind?: ColumnKind;
  /** 값 경로(기본 key). "a.b" 가능 */
  field?: string;
  /** 직접 그리기(kind보다 우선) */
  render?: (row: T) => ReactNode;
  /** status·tag 칸의 enum 도메인(src/lib/status.ts) */
  statusDomain?: StatusDomain;
  /** number 칸 단위(예: "개") */
  unit?: string;
  /** 데스크톱 고정 폭(px). 안 주면 종류별 기본 폭(이름·글자 칸은 남는 폭을 나눠 가짐) */
  width?: number | string;
  sortable?: boolean;
  /** 낮은 우선순위 칸: 넓은 화면(1600 이상)에서만 보여요. 좁으면 잘리는 대신 빠집니다(표시·적용 규칙·등급·버전 등) */
  low?: boolean;
  /** 남는 폭을 가져갈 칸(기본: kind "name" 칸). 이름 칸에 width를 주고 다른 칸을 flex로 할 수 있어요 */
  flex?: boolean;
  /** 오른쪽 정렬(숫자 칸은 자동) */
  align?: "left" | "right" | "center";
}

/** 데스크톱 고정 레이아웃의 종류별 기본 폭. name 칸은 비워 두어 남는 폭을 모두 가집니다(말줄임 + 칸 title) */
const KIND_WIDTH: Record<ColumnKind, number | undefined> = { name: undefined, text: 152, number: 112, price: 128, date: 128, datetime: 172, status: 136, person: 176, dday: 132, tag: 148 };
/** 이름 칸이 최소한 가져야 할 폭. 다른 칸 폭의 합이 이걸 남기지 못하면 가로 스크롤(+ 오른쪽 끝 흐림)로 바꿔요 */
const NAME_MIN = 160;
const warnedNoFlex = new Set<string>();
const WIDE_MIN = 1600;

/** 표 상자 폭(고정 레이아웃이 들어가는지 판단). 감싸는 요소가 바뀔 때만 다시 구독해요(로딩 → 표처럼 요소가 새로 생길 때) */
function useBoxWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  const [el, setEl] = useState<HTMLElement | null>(null);
  // 렌더마다 요소가 같은지만 비교(값싼 비교). 구독은 아래 [el] 효과에서 한 번만
  useLayoutEffect(() => { if (ref.current !== el) setEl(ref.current); });
  useEffect(() => {
    if (!el) return;
    const update = () => setW(Math.floor(el.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return w;
}

export interface DataTableProps<T> {
  resource: string;
  columns: ColumnDef<T>[];
  /** 늘 거는 조건(범위·FilterBar 조건) */
  filters?: CrudFilter[];
  /** 처음 정렬 */
  sorters?: CrudSort[];
  meta?: { expand?: string[] };
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  /** ≤767에서 ListRow 목록으로 */
  mobileRow: (row: T) => ListRowProps;
  empty: EmptyStateProps;
  /** 기본 20 */
  pageSize?: number;
  /** FilterBar 조건이 걸려 있는지(빈 결과를 "조건에 맞는 항목이 없어요"로) */
  isFiltered?: boolean;
  onClearFilters?: () => void;
  /** 쪽·정렬을 URL에 남김(기본). 한 화면에 표가 둘 이상이면 false */
  syncWithLocation?: boolean;
  dataProviderName?: string;
  ariaLabel?: string;
}

function useDelayed(flag: boolean, ms: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!flag) { setOn(false); return; }
    const id = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(id);
  }, [flag, ms]);
  return on;
}

export function DataTable<T extends BaseRecord>(props: DataTableProps<T>) {
  const { resource, columns, filters, sorters, meta, onRowClick, rowHref, mobileRow, empty, pageSize = 20, isFiltered, onClearFilters, syncWithLocation = true, dataProviderName, ariaLabel } = props;
  const bp = useBreakpoint();
  const nav = useNavigate();
  const inCard = useInsideCard();
  const fade = useScrollFade<HTMLDivElement>(".ant-table-content, .ant-table-body");
  const boxWidth = useBoxWidth(fade.wrapRef);
  // 쪽·정렬만 URL(?currentPage=2&sort=due_at:asc)에 남기고, 조건은 늘 props.filters(permanent) 하나로 겁니다.
  // (Refine의 syncWithLocation은 조건까지 URL에 써서, 조건이 바뀌면 옛 조건이 함께 걸린 쿼리가 한 번 더 나가요 → 직접 동기화)
  const [params, setParams] = useSearchParams();
  const urlPage = syncWithLocation ? Math.max(1, Number(params.get("currentPage") ?? 1) || 1) : 1;
  const urlSort = syncWithLocation ? params.get("sort") : null;
  const initialSorters: CrudSort[] = urlSort && urlSort.includes(":")
    ? [{ field: urlSort.split(":")[0]!, order: urlSort.split(":")[1] === "desc" ? "desc" : "asc" }]
    : sorters ?? [];
  const { tableProps, tableQuery, currentPage, setCurrentPage, sorters: curSorters, setSorters, result, searchFormProps } = useTable<T>({
    resource,
    syncWithLocation: false,
    pagination: { pageSize, currentPage: urlPage },
    filters: { permanent: filters ?? [] },
    sorters: { initial: initialSorters },
    meta,
    dataProviderName,
  });
  // 조건이 바뀌면 1쪽으로
  const filterKey = JSON.stringify(filters ?? []);
  const firstFilterKey = useRef(filterKey);
  useEffect(() => {
    if (filterKey === firstFilterKey.current) return;
    firstFilterKey.current = filterKey;
    if (currentPage !== 1) setCurrentPage(1);
  }, [filterKey]);
  // 상태 → URL
  const sortText = curSorters[0] ? `${curSorters[0].field}:${curSorters[0].order}` : "";
  const defaultSortText = sorters?.[0] ? `${sorters[0].field}:${sorters[0].order}` : "";
  const wrote = useRef({ page: urlPage, sort: urlSort ?? "" });
  useEffect(() => {
    if (!syncWithLocation) return;
    const page = currentPage ?? 1;
    const sort = sortText === defaultSortText ? "" : sortText;
    if (wrote.current.page === page && wrote.current.sort === sort) return;
    wrote.current = { page, sort };
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (page > 1) p.set("currentPage", String(page)); else p.delete("currentPage");
      if (sort) p.set("sort", sort); else p.delete("sort");
      return p;
    }, { replace: true });
  }, [currentPage, sortText]);
  // URL → 상태(뒤로 가기·필터 지우기로 쪽이 바뀐 경우)
  useEffect(() => {
    if (!syncWithLocation || urlPage === wrote.current.page) return;
    wrote.current = { ...wrote.current, page: urlPage };
    setCurrentPage(urlPage);
  }, [urlPage]);
  // URL → 정렬(같은 화면 안 링크로 ?sort=가 바뀌거나 빠진 경우. 빠지면 기본 정렬로)
  useEffect(() => {
    if (!syncWithLocation) return;
    const s = urlSort ?? "";
    if (s === wrote.current.sort) return;
    wrote.current = { ...wrote.current, sort: s };
    const [field, order] = s.split(":");
    setSorters(field && order ? [{ field, order: order === "desc" ? "desc" : "asc" }] : sorters ?? []);
  }, [urlSort]);
  // useTable이 만든 검색 폼을 화면 요소 없이 연결만 해 둡니다.
  // (연결이 없으면 syncWithLocation 첫 화면에서 antd "useForm is not connected" 콘솔 오류가 나요.)
  const wrap = (content: ReactNode) => <><Form form={searchFormProps.form} component={false} />{content}</>;
  const loading = tableQuery.isLoading;
  usePageReady(!loading);
  const showSkeleton = useDelayed(loading, 300);
  const rows = (result?.data ?? []) as T[];
  const total = result?.total ?? 0;
  // URL에 남은 쪽 번호가 범위를 넘으면(마지막 쪽 행을 지웠거나 옛 북마크) 마지막 쪽으로 옮겨요. 빈 상태를 보여 주지 않아요.
  const outOfRange = !loading && !tableQuery.isError && !rows.length && total > 0 && (currentPage ?? 1) > 1;
  useEffect(() => {
    if (outOfRange) setCurrentPage(Math.max(1, Math.ceil(total / pageSize)));
  }, [outOfRange, total, pageSize]);

  const open = (row: T) => {
    if (onRowClick) onRowClick(row);
    else if (rowHref) nav(rowHref(row));
  };

  if (tableQuery.isError) {
    return wrap(<EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void tableQuery.refetch() }} />);
  }
  if (loading) {
    return wrap(showSkeleton ? <div className={inCard ? undefined : "ws-table-card"} style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 5 }} title={false} /></div> : <div style={{ minHeight: 160 }} aria-busy="true" />);
  }
  if (outOfRange) return wrap(<div style={{ minHeight: 160 }} aria-busy="true" />);
  if (!rows.length) {
    if (isFiltered) return wrap(<EmptyState kind="filtered" action={onClearFilters ? { label: "필터 지우기", onClick: onClearFilters } : undefined} />);
    return wrap(<EmptyState {...empty} />);
  }

  const refetching = tableQuery.isFetching && !loading;

  if (bp === "mobile") {
    return wrap(
      <div className={refetching ? "is-refetching" : undefined}>
        <div className={inCard ? undefined : "ws-mobile-list"}>
          <ListRows ariaLabel={ariaLabel} rows={rows.map((r) => ({ key: String(r.id), ...mobileRow(r), ...(rowHref ? { to: rowHref(r) } : onRowClick ? { onClick: () => onRowClick(r) } : {}) }))} />
        </div>
        {total > pageSize && (
          <div className="ws-pager"><Pagination simple current={currentPage} pageSize={pageSize} total={total} onChange={(p) => setCurrentPage(p)} /></div>
        )}
      </div>,
    );
  }

  // 데스크톱(1280 이상)은 고정 레이아웃: 코드·날짜·상태·사람 칸은 정해진 폭, 이름 칸이 남는 폭 + 말줄임(전체는 칸 title).
  // 태블릿은 내용 폭 + 가로 스크롤 + 오른쪽 끝 흐림.
  const firstIsLink = !!rowHref && columns[0]?.kind === "name" && !columns[0].render;
  const flexIdx = columns.findIndex((c) => c.flex);
  const nameKindIdx = columns.findIndex((c) => c.kind === "name" && c.width == null);
  if (import.meta.env.DEV && flexIdx < 0 && nameKindIdx < 0 && !warnedNoFlex.has(resource)) {
    warnedNoFlex.add(resource);
    console.warn(`[DataTable:${resource}] 남는 폭을 가질 칸(flex 또는 kind "name")이 없어 첫 칸이 대신 가져요. 칸 하나에 flex: true를 주세요.`);
  }
  const nameIdx = flexIdx >= 0 ? flexIdx : Math.max(0, nameKindIdx);
  const widthOf = (c: ColumnDef<T>, i: number) => c.width ?? (i === nameIdx ? undefined : KIND_WIDTH[c.kind ?? "text"]);
  const wideScreen = typeof window !== "undefined" && window.innerWidth >= WIDE_MIN;
  const visible = columns.filter((c) => !c.low || wideScreen);
  const fixedSum = visible.reduce((sum, c) => { const w = widthOf(c, columns.indexOf(c)); return sum + (typeof w === "number" ? w : 0); }, 0);
  const fixedLayout = (bp === "desktop" || bp === "wide") && (boxWidth === 0 || fixedSum + NAME_MIN <= boxWidth - 16);
  const lastIsStatus = columns[columns.length - 1]?.kind === "status";
  const sortOrderOf = (field: string): "ascend" | "descend" | null => {
    const s = curSorters.find((x) => x.field === field);
    return s ? (s.order === "desc" ? "descend" : "ascend") : null;
  };
  const antdColumns: TableColumnType<T>[] = columns.map((c, i) => {
    const field = c.field ?? c.key;
    const numeric = c.kind === "number" || c.kind === "price";
    const width = widthOf(c, i);
    const shrinkable = true;
    return {
      key: field,
      dataIndex: field.includes(".") ? field.split(".") : field,
      title: c.title,
      width: fixedLayout ? width : c.width,
      // 가로 스크롤일 때 마지막 상태 칸은 오른쪽에 붙여 둬요(상태 글자가 잘리지 않게)
      fixed: !fixedLayout && lastIsStatus && i === columns.length - 1 ? "right" : undefined,
      align: c.align ?? (numeric ? "right" : undefined),
      sorter: c.sortable ? true : undefined,
      // 정렬 머리는 늘 현재 정렬(기본 정렬·URL ?sort 포함)을 보여 주고(aria-sort), 눌러도 정렬이 풀리지 않게 오름·내림만 오가요
      sortOrder: c.sortable ? sortOrderOf(field) : undefined,
      // antd는 마지막 방향 다음을 '정렬 없음'으로 넘겨요 → 끝에 ascend를 한 번 더 둬서 오름·내림만 돌게(antd 문서의 방법)
      sortDirections: c.sortable ? ["ascend", "descend", "ascend"] : undefined,
      ellipsis: fixedLayout && shrinkable && !c.render && c.kind !== "status" && c.kind !== "person" && c.kind !== "tag" && c.kind !== "dday" ? { showTitle: true } : undefined,
      responsive: c.low ? ["xxl"] : undefined,
      render: (_: unknown, row: T) => {
        if (c.render) return c.render(row);
        const v = getPath(row, field) as unknown;
        switch (c.kind) {
          case "name": {
            const text = String(v ?? "—");
            return rowHref && i === 0 ? <Link className="ws-cell-name" to={rowHref(row)}>{text}</Link> : <span className="ws-cell-name">{text}</span>;
          }
          case "number": return v == null ? "—" : formatQty(Number(v), c.unit);
          case "date": return formatDate(v as string | null);
          case "datetime": return formatDateTime(v as string | null);
          case "status": return c.statusDomain && v != null ? <StatusTag {...statusOf(c.statusDomain, String(v))} /> : "—";
          case "person": return <PersonChip memberId={v as string | null} size="sm" />;
          case "dday": return <DdayBadge date={v as string | null} />;
          case "tag": {
            const list = Array.isArray(v) ? v : v == null ? [] : [v];
            if (!list.length) return "—";
            return <span className="ws-row">{list.map((x) => <span key={String(x)} className="ws-tag">{c.statusDomain ? labelOf(c.statusDomain, String(x)) : String(x)}</span>)}</span>;
          }
          case "price": return <PriceGate>{v == null ? "—" : formatWon(Number(v))}</PriceGate>;
          default: return v == null || v === "" ? "—" : String(v);
        }
      },
    };
  });

  const clickable = !!(onRowClick || rowHref);
  return wrap(
    <div className={`${inCard ? "" : "ws-table-card "}ws-table ws-scroll-fade${fixedLayout ? " ws-table--fixed" : ""}${refetching ? " is-refetching" : ""}`} data-table={resource} ref={fade.wrapRef} style={{ ["--ws-fade" as string]: "var(--ws-surface)" }}>
      <Table<T>
        {...tableProps}
        aria-label={ariaLabel}
        rowKey={(r) => String(r.id)}
        columns={antdColumns}
        loading={false}
        sticky={{ offsetHeader: 64 }}
        tableLayout={fixedLayout ? "fixed" : "auto"}
        scroll={fixedLayout ? undefined : { x: "max-content" }}
        // pagination=false면 정렬을 눌렀을 때 antd가 빈 쪽 정보를 넘겨 Refine이 쪽 크기를 10으로 바꿔요(11~20행이 사라짐). 늘 넘기고 한 쪽이면 숨깁니다.
        pagination={{ ...(tableProps.pagination || {}), showSizeChanger: false, position: ["bottomRight"], hideOnSinglePage: true }}
        onRow={(row) => clickable ? {
          className: "is-clickable",
          // 첫 칸이 이미 링크면 행에는 초점을 두지 않아요(한 행에 탭 한 번)
          tabIndex: firstIsLink ? undefined : 0,
          onClick: (e) => {
            // 행 안의 링크·버튼(복사 버튼 등)을 누르면 그것만 동작하고 행은 열지 않아요
            if ((e.target as HTMLElement).closest("a, button, input, textarea, [role='button']")) return;
            open(row);
          },
          // 행 자체에 초점이 있을 때만(안쪽 링크·버튼의 Enter가 올라와 두 번 열리지 않게)
          onKeyDown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) open(row); },
        } : {}}
      />
    </div>,
  );
}
