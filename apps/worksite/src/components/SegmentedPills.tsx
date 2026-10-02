// SegmentedPills: 알약 모양 세그먼트(antd Segmented 기반). 선택 항목은 흰 바탕 + 굵기 700(색만으로 표시하지 않음).
// urlParam을 주면 URL 쿼리와 동기화합니다(예: ?period=week). 페이지당 기간 세그먼트는 PageHeader에 1개만.
import { Segmented } from "antd";
import { useSearchParams } from "react-router";

export interface SegmentedPillsProps<T extends string = string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  /** 있으면 URL 쿼리와 동기화(값이 없으면 value가 기본값) */
  urlParam?: string;
  size?: "middle" | "small" | "large";
  block?: boolean;
}

export function SegmentedPills<T extends string = string>({ options, value, onChange, ariaLabel, urlParam, size = "middle", block }: SegmentedPillsProps<T>) {
  const [params, setParams] = useSearchParams();
  const fromUrl = urlParam ? (params.get(urlParam) as T | null) : null;
  const current = fromUrl && options.some((o) => o.value === fromUrl) ? fromUrl : value;
  return (
    <div className="ws-seg" role="group" aria-label={ariaLabel}>
      <Segmented
        size={size}
        block={block}
        value={current}
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        onChange={(v) => {
          const next = v as T;
          if (urlParam) {
            setParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set(urlParam, next);
              return p;
            }, { replace: true });
          }
          onChange(next);
        }}
      />
    </div>
  );
}
