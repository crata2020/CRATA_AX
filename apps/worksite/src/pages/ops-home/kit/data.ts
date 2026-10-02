// industry 그룹 화면이 함께 쓰는 데이터 도우미(소유: industry 그룹). Refine 훅(@/lib/refine)만 씁니다.
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { BaseRecord, CrudFilter, CrudSort } from "@refinedev/core";
import { useList } from "@/lib/refine";
import { useWorksite } from "@/app/TenantBoundary";
import { addDays } from "@/lib/clock";
import type { ModuleId } from "@/modules/registry.generated";
import type { Equipment, Item, Partner, ProcessStep } from "@/types/entities";

const EMPTY: never[] = [];

/** 한 리소스 전체(페이지 나눔 없음). enabled=false면 요청하지 않고 빈 목록 */
export function useRows<T extends BaseRecord>(
  resource: string,
  opts: { filters?: CrudFilter[]; sorters?: CrudSort[]; enabled?: boolean; meta?: Record<string, unknown> } = {},
) {
  const enabled = opts.enabled ?? true;
  const { result, query } = useList<T>({
    resource,
    filters: opts.filters,
    sorters: opts.sorters,
    pagination: { mode: "off" },
    meta: opts.meta,
    queryOptions: { enabled },
  });
  const rows = useMemo(() => ((result?.data ?? EMPTY) as T[]), [result]);
  return { rows, isLoading: enabled ? query.isLoading : false, isError: query.isError, isFetching: query.isFetching, refetch: query.refetch };
}

/** id → 행 */
export function useIndex<T extends { id?: string | number }>(rows: T[]) {
  return useMemo(() => new Map(rows.map((r) => [String(r.id), r])), [rows]);
}

/** 모듈이 켜져 있을 때만 읽기 */
export function useModuleRows<T extends BaseRecord>(moduleId: ModuleId, resource: string, opts: Parameters<typeof useRows>[1] = {}) {
  const { isModuleOn } = useWorksite();
  return useRows<T>(resource, { ...opts, enabled: (opts.enabled ?? true) && isModuleOn(moduleId) });
}

/** 제조 기준정보 묶음(품목·공정·설비·거래처) */
export function useMfgLookups() {
  const items = useModuleRows<Item>("mfg-master-data", "items");
  const steps = useModuleRows<ProcessStep>("mfg-master-data", "process_steps", { sorters: [{ field: "sequence", order: "asc" }] });
  const equipment = useModuleRows<Equipment>("mfg-equipment", "equipment", { sorters: [{ field: "equipment_no", order: "asc" }] });
  const partners = useModuleRows<Partner>("partners", "partners");
  const item = useIndex(items.rows);
  const step = useIndex(steps.rows);
  const eq = useIndex(equipment.rows);
  const partner = useIndex(partners.rows);
  return {
    items: items.rows, steps: steps.rows, equipment: equipment.rows, partners: partners.rows,
    item, step, eq, partner,
    isLoading: items.isLoading || steps.isLoading || equipment.isLoading || partners.isLoading,
  };
}

/** 현재 근무조(08~20시 주간, 나머지 야간. 자정~08시는 전날 야간조) */
export function shiftAt(nowIso: string): { date: string; shift: "day" | "night" } {
  const kst = new Date(Date.parse(nowIso) + 9 * 3_600_000);
  const h = kst.getUTCHours();
  const date = kst.toISOString().slice(0, 10);
  if (h >= 8 && h < 20) return { date, shift: "day" };
  return { date: h < 8 ? addDays(date, -1) : date, shift: "night" };
}

/** 이번 주 월요일 ~ 토요일 */
export function weekDays(today: string): string[] {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const mon = addDays(today, dow === 0 ? -6 : 1 - dow);
  return [0, 1, 2, 3, 4, 5].map((i) => addDays(mon, i));
}

/** 기간 시작일: week(이번 주 월) · month(이번 달 1일) · quarter(이번 분기 1일) · 3m(석 달 전 1일) */
export function periodStart(today: string, period: string): string {
  if (period === "today") return today;
  if (period === "week") return weekDays(today)[0]!;
  const [y, m] = today.split("-").map(Number) as [number, number];
  if (period === "quarter") return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
  if (period === "3m") { const t = new Date(Date.UTC(y, m - 3, 1)); return t.toISOString().slice(0, 10); }
  return `${today.slice(0, 7)}-01`;
}

/** 품목 단위 붙이기 */
export const qtyText = (n: number | null | undefined, unit?: string | null) => (n == null ? "—" : `${new Intl.NumberFormat("ko-KR").format(n)}${unit ? (unit === "개" ? "개" : ` ${unit}`) : ""}`);

/** 쿼리 여러 개를 한 번에 바꾸기(서랍 닫기 + 모드 지우기 등). null이면 지움 */
export function usePatchParams() {
  const [, setParams] = useSearchParams();
  return useCallback((patch: Record<string, string | null>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) { if (v == null || v === "") next.delete(k); else next.set(k, v); }
      return next;
    }, { replace: true });
  }, [setParams]);
}

/** can(resource, action, row)에 타입 있는 행을 넘길 때 */
export const asRow = (r: object) => r as unknown as Record<string, unknown>;
