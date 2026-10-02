// 메모리 공급자의 필터·정렬·페이지(빌드 스펙 5.5.1절)
// 연산자: eq ne lt gt lte gte in nin contains ncontains startswith between null nnull + or/and 묶음.
// 배열 필드에서 eq는 "값을 포함", in은 "하나라도 겹침". contains는 NFC 정규화 + 대소문자 무시.
import type { CrudFilter, CrudSort, LogicalFilter } from "@refinedev/core";

export class ProviderError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

/** "a.b.c" 경로 읽기 */
export function getPath(row: unknown, path: string): unknown {
  let cur: unknown = row;
  for (const k of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

const norm = (v: unknown) => String(v ?? "").normalize("NFC").toLowerCase();
const isNil = (v: unknown) => v === null || v === undefined || v === "";

function cmp(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" || typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), "ko");
}

function eqValue(field: unknown, value: unknown): boolean {
  if (Array.isArray(field)) return field.some((x) => x === value || String(x) === String(value));
  if (typeof field === "boolean" && typeof value === "string") return String(field) === value;
  if (typeof field === "number" && typeof value === "string") return field === Number(value);
  return field === value;
}

function matchLogical(row: unknown, f: LogicalFilter): boolean {
  const v = getPath(row, f.field);
  const val = f.value;
  // 값이 비어 있는 필터는 무시(Refine 표 필터가 빈 값을 보낼 때)
  if (f.operator !== "null" && f.operator !== "nnull" && (val === undefined || (Array.isArray(val) && val.length === 0) || val === "")) return true;
  switch (f.operator) {
    case "eq": return eqValue(v, val);
    case "ne": return !eqValue(v, val);
    case "lt": return !isNil(v) && cmp(v, val) < 0;
    case "gt": return !isNil(v) && cmp(v, val) > 0;
    case "lte": return !isNil(v) && cmp(v, val) <= 0;
    case "gte": return !isNil(v) && cmp(v, val) >= 0;
    case "in": {
      const list = Array.isArray(val) ? val : [val];
      return Array.isArray(v) ? v.some((x) => list.some((y) => eqValue(x, y))) : list.some((y) => eqValue(v, y));
    }
    case "nin": {
      const list = Array.isArray(val) ? val : [val];
      return Array.isArray(v) ? !v.some((x) => list.some((y) => eqValue(x, y))) : !list.some((y) => eqValue(v, y));
    }
    case "contains":
    case "containss":
      return Array.isArray(v) ? v.some((x) => norm(x).includes(norm(val))) : norm(v).includes(norm(val));
    case "ncontains":
    case "ncontainss":
      return Array.isArray(v) ? !v.some((x) => norm(x).includes(norm(val))) : !norm(v).includes(norm(val));
    case "startswith":
    case "startswiths":
      return norm(v).startsWith(norm(val));
    case "between": {
      const [lo, hi] = Array.isArray(val) ? val : [undefined, undefined];
      return !isNil(v) && (lo == null || cmp(v, lo) >= 0) && (hi == null || cmp(v, hi) <= 0);
    }
    case "null": return val === false ? !isNil(v) : isNil(v);
    case "nnull": return val === false ? isNil(v) : !isNil(v);
    default:
      throw new ProviderError(400, `지원하지 않는 필터예요: ${f.operator}`);
  }
}

export function matchFilter(row: unknown, f: CrudFilter): boolean {
  if (f.operator === "or") return f.value.length === 0 || f.value.some((x) => matchFilter(row, x));
  if (f.operator === "and") return f.value.every((x) => matchFilter(row, x));
  return matchLogical(row, f as LogicalFilter);
}

export function applyFilters<T>(rows: T[], filters?: CrudFilter[]): T[] {
  if (!filters?.length) return rows;
  return rows.filter((r) => filters.every((f) => matchFilter(r, f)));
}

/** 여러 정렬. 문자열은 localeCompare("ko"), null은 늘 맨 뒤 */
export function applySorters<T>(rows: T[], sorters?: CrudSort[]): T[] {
  if (!sorters?.length) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sorters) {
      const va = getPath(a, s.field);
      const vb = getPath(b, s.field);
      const na = isNil(va);
      const nb = isNil(vb);
      if (na && nb) continue;
      if (na) return 1;
      if (nb) return -1;
      const c = cmp(va, vb);
      if (c !== 0) return s.order === "desc" ? -c : c;
    }
    return 0;
  });
}
