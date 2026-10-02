// Refine 훅 창구(05 문서 7.6절): 화면은 @refinedev/antd 훅을 이 파일에서만 가져옵니다(나중에 패키지를 빼도 고칠 곳이 한 곳).
// + 이름 있는 동작·셀렉터 도우미: useRpc("submit_task") · useSelector("home.today")
import { useCustom, useCustomMutation, useList as useListCore, type BaseRecord, type HttpError, type UseListProps } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// antd 쪽 Refine 훅(useTable·useForm …)은 ./refineAntd.ts에 따로 둬요. 여기서 함께 내보내면 상단 바·메뉴(첫 화면)가
// 이 파일을 쓰는 것만으로 @refinedev/antd 묶음이 첫 화면 JS에 들어가요.
export {
  useOne, useMany, useShow, useCreate, useUpdate, useDelete, useCustom, useCustomMutation, useInvalidate,
  useCan, useGetIdentity, useNavigation, useGo, useParsed, useLogList,
} from "@refinedev/core";
export type { CrudFilter, CrudSort, HttpError, BaseRecord } from "@refinedev/core";

/**
 * 목록 읽기. pagination을 안 주면 쪽 나누기 없이 전부(mode "off")를 읽어요.
 * (Refine 기본은 서버 쪽 나누기 + 10행이라, 생략하면 조용히 10행만 오던 문제를 막아요. 쪽이 필요하면 pagination을 직접 주세요)
 */
export function useList<TQueryFnData extends BaseRecord = BaseRecord, TError extends HttpError = HttpError, TData extends BaseRecord = TQueryFnData>(
  props?: UseListProps<TQueryFnData, TError, TData>,
) {
  return useListCore<TQueryFnData, TError, TData>({ ...props, pagination: props?.pagination ?? { mode: "off" } });
}

/**
 * 이름 있는 동작 실행: const { run, isPending } = useRpc<{ ok: boolean }>("approve_submission", { successMessage: "승인했어요. 담당자에게 알렸어요." })
 * await run({ submissionId }) — 성공하면 모든 목록을 다시 불러옵니다(여러 리소스를 바꾸는 동작이라).
 * 실패하면 공급자 오류 문구(한국어)가 토스트로 뜨고 예외를 다시 던집니다.
 */
export function useRpc<TResult = unknown>(name: string, opts: { successMessage?: string; dataProviderName?: "default" | "ara" } = {}) {
  const { mutateAsync, mutation } = useCustomMutation();
  const qc = useQueryClient();
  const run = useCallback(
    async (payload: Record<string, unknown> = {}): Promise<TResult> => {
      const res = await mutateAsync({
        url: `rpc:${name}`,
        method: "post",
        values: payload,
        dataProviderName: opts.dataProviderName,
        successNotification: opts.successMessage ? () => ({ type: "success", message: opts.successMessage! }) : false,
        errorNotification: (err) => ({ type: "error", message: "처리하지 못했어요", description: (err as { message?: string })?.message ?? "" }),
      });
      await qc.invalidateQueries();
      return res.data as TResult;
    },
    [mutateAsync, qc, name, opts.successMessage, opts.dataProviderName],
  );
  return { run, isPending: mutation.isPending };
}

/**
 * 읽기 전용 셀렉터: const { data, isLoading } = useSelector<HomeToday>("home.today", { period })
 * 셀렉터는 공급자 권한 경로를 거친 행만 씁니다. 데이터가 바뀌면 자동으로 다시 불러옵니다.
 */
export function useSelector<T>(name: string, query: Record<string, unknown> = {}, opts: { enabled?: boolean; dataProviderName?: "default" | "ara" } = {}) {
  const { query: q } = useCustom<any>({
    url: `sel:${name}`,
    method: "get",
    config: { query },
    dataProviderName: opts.dataProviderName,
    queryOptions: { enabled: opts.enabled ?? true },
    errorNotification: false,
  });
  // Refine useCustom의 result.data는 로딩 중·null 결과에서 빈 객체({})라서 쿼리 원값을 씁니다(로딩 중 undefined, null 결과는 null).
  return {
    data: (q.data as { data?: T } | undefined)?.data as T | undefined,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
  };
}
