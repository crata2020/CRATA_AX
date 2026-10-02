// 보기 전환(목록 · 보드). W-03 내 업무와 W-04 업무 보드가 함께 씀. 범위 쿼리(?scope=)는 그대로 넘깁니다.
import { useNavigate, useSearchParams } from "react-router";
import { SegmentedPills } from "@/components";

export function ViewSwitch({ current }: { current: "list" | "board" }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const scope = params.get("scope");
  return (
    <SegmentedPills
      ariaLabel="보기"
      value={current}
      options={[{ value: "list", label: "목록" }, { value: "board", label: "보드" }]}
      onChange={(v) => nav(`${v === "board" ? "/work/board" : "/work"}${scope ? `?scope=${scope}` : ""}`)}
    />
  );
}
