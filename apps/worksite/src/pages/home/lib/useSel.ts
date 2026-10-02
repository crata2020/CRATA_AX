// useSelector 감싸기(소유: home 그룹, 공통 승격 후보).
// Refine useCustom은 로딩 중과 결과가 null일 때 data를 빈 객체({})로 돌려줍니다(EMPTY_OBJECT).
// 그래서 로딩 중이면 undefined, 끝났는데 빈 객체면 null로 바꿔서 돌려줍니다.
import { useSelector } from "@/lib/refine";

const isEmptyObject = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0;

export function useSel<T>(name: string, query: Record<string, unknown> = {}, opts: { enabled?: boolean } = {}) {
  const r = useSelector<T>(name, query, opts);
  const data: T | null | undefined = r.isLoading ? undefined : isEmptyObject(r.data) ? (r.isError ? undefined : null) : r.data;
  return { ...r, data };
}
