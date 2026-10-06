// 홈 위젯 공용 부품(소유: home 그룹). 위젯 파일(src/pages/home/widgets/<id>.tsx)이 함께 씁니다.
//   useWidgetData(id, ctx): sel:widget.<id> 읽기 + 페이지 준비 신호 + 다시 불러올 때 이전 내용 유지(투명도 0.6)
//   WidgetState: 로딩(300ms 뒤 스켈레톤)·오류·빈(null → WidgetSlot의 emptyText) 처리
//   ListHead · WRows · WListBody · WFigureBody: list·figure 템플릿 그리기
//   listWidget · figureWidget: 셀렉터 결과가 WList·WFigure인 위젯을 한 줄로 정의
import "./home.css";
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Button, Skeleton } from "antd";
import {
  AiTag, DdayBadge, ListRows, MaterialGradeTag, StatRow, StatTile, StatusTag,
  type ListRowProps, type WidgetContext, type WidgetDef,
} from "@/components";
import { useSel } from "./useSel";
import { usePageReady } from "@/app/pageReady";
import { formatNumber } from "@/lib/format";
import type { WFigure, WList, WRow } from "./types";

/** 첫 로딩이 300ms를 넘을 때만 스켈레톤(빌드 스펙 3.0절 4번) */
function useLate(ms = 300) {
  const [late, setLate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLate(true), ms); return () => clearTimeout(t); }, [ms]);
  return late;
}

export interface WidgetData<T> {
  data: T | null | undefined;
  isLoading: boolean;
  isError: boolean;
  refetching: boolean;
  refetch: () => void;
}

/** sel:widget.<id>를 읽습니다. periodAware면 머리의 기간(?period)을 함께 보냅니다 */
export function useWidgetData<T>(id: string, ctx: WidgetContext, opts: { periodAware?: boolean; query?: Record<string, unknown> } = {}): WidgetData<T> {
  const query = { ...(opts.periodAware ? { period: ctx.period } : {}), ...(opts.query ?? {}) };
  const r = useSel<T>(`widget.${id}`, query);
  const last = useRef<T | null | undefined>(undefined);
  if (r.data !== undefined) last.current = r.data;
  usePageReady(!r.isLoading || last.current !== undefined);
  return {
    data: r.data !== undefined ? r.data : last.current,
    isLoading: r.isLoading && last.current === undefined,
    isError: r.isError,
    refetching: r.isLoading && last.current !== undefined,
    refetch: () => { void r.refetch(); },
  };
}

function Loading() {
  const late = useLate();
  return late ? <Skeleton active title={false} paragraph={{ rows: 3 }} /> : <div style={{ minHeight: 72 }} aria-busy="true" />;
}

export function WidgetError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="wh-error" role="alert">
      <span>불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</span>
      {onRetry && <Button size="small" onClick={onRetry}>다시 시도</Button>}
    </div>
  );
}

/** 로딩·오류·빈 상태를 처리하고, 데이터가 있으면 render를 그립니다. 빈 상태는 null(WidgetSlot이 emptyText를 그림) */
export function WidgetState<T>({ state, render, isEmpty }: { state: WidgetData<T>; render: (data: T) => ReactNode; isEmpty?: (data: T) => boolean }): ReactElement | null {
  if (state.isLoading) return <Loading />;
  if (state.isError && state.data == null) return <WidgetError onRetry={state.refetch} />;
  const d = state.data;
  if (d == null || (isEmpty && isEmpty(d))) return null;
  return <div className={state.refetching ? "wh-refetch" : undefined}>{render(d)}</div>;
}

/** list 템플릿 머리: 큰 숫자 + 단위 + 라벨 + 보조 문장 */
export function ListHead({ count, unit, label, note, noteClassName }: { count: number; unit: string; label: string; note?: string | null; noteClassName?: string }) {
  return (
    <div className="wh-head">
      <span className="wh-head__num"><span className="ws-t-figure">{formatNumber(count)}</span><span className="wh-head__unit">{unit}</span></span>
      <span className="wh-head__label">{label}</span>
      {note && <p className={noteClassName ? `wh-head__note ${noteClassName}` : "wh-head__note"}>{note}</p>}
    </div>
  );
}

/** 행 태그 중 브랜드 태그로 그리는 것. '필독'은 공지 목록(notices/index.tsx)과 같은 .ws-tag--brand — 홈에서만 흰 태그라 덜 중요해 보이지 않게 */
const BRAND_TAGS = new Set(["필독"]);

/** WRow → ListRowProps(오른쪽: 재질 · 태그 · AI · 상태 · D-day · 작은 글자) */
export function toListRow(r: WRow): ListRowProps & { key: string } {
  const trailing: ReactNode[] = [];
  if (r.material) trailing.push(<MaterialGradeTag key="m" code={r.material} />);
  if (r.tag) trailing.push(<span key="t" className={BRAND_TAGS.has(r.tag) ? "ws-tag ws-tag--brand" : "ws-tag"}>{r.tag}</span>);
  if (r.ai) trailing.push(<AiTag key="a" kind={r.ai} />);
  if (r.status) trailing.push(<StatusTag key="s" tone={r.status.tone} label={r.status.label} />);
  if (r.dday) trailing.push(<DdayBadge key="d" date={r.dday.date} noun={r.dday.noun} />);
  if (r.trailingText) trailing.push(<span key="x">{r.trailingText}</span>);
  return {
    key: r.id,
    title: r.title,
    subtitle: r.subtitle,
    to: r.to,
    unread: r.unread,
    trailing: trailing.length ? <>{trailing.slice(0, 2)}</> : undefined,
  };
}

export function WRows({ rows, ariaLabel }: { rows: WRow[]; ariaLabel?: string }) {
  return <ListRows rows={rows.map(toListRow)} ariaLabel={ariaLabel} />;
}

export function WListBody({ data, title }: { data: WList; title: string }) {
  return (
    <>
      <ListHead count={data.count} unit={data.unit} label={data.label} note={data.note} />
      <WRows rows={data.rows} ariaLabel={title} />
      {data.extra && data.extra.rows.length > 0 && (
        <div className="wh-extra">
          <h3 className="wh-sub">{data.extra.title}</h3>
          <WRows rows={data.extra.rows} ariaLabel={data.extra.title} />
        </div>
      )}
    </>
  );
}

export function WFigureBody({ data }: { data: WFigure }) {
  return (
    <>
      <StatRow>
        {data.stats.map((s) => (
          <StatTile
            key={s.label}
            label={s.label}
            value={s.value}
            unit={s.unit}
            caption={s.caption ?? undefined}
            delta={s.delta ?? undefined}
            trend={s.trend ?? undefined}
            tone={s.tone ?? undefined}
            toneLabel={s.toneLabel ?? undefined}
          />
        ))}
      </StatRow>
      {data.note && <p className="ws-card__caption">{data.note}</p>}
    </>
  );
}

type Meta = Omit<WidgetDef, "Body">;

/** 셀렉터가 WList를 돌려주는 위젯 */
export function listWidget(meta: Meta): WidgetDef {
  function Body({ ctx }: { ctx: WidgetContext }) {
    const state = useWidgetData<WList>(meta.id, ctx, { periodAware: meta.periodAware });
    return <WidgetState state={state} isEmpty={(d) => d.rows.length === 0 && !d.extra?.rows.length} render={(d) => <WListBody data={d} title={meta.title} />} />;
  }
  return { ...meta, Body };
}

/** 셀렉터가 WFigure를 돌려주는 위젯 */
export function figureWidget(meta: Meta): WidgetDef {
  function Body({ ctx }: { ctx: WidgetContext }) {
    const state = useWidgetData<WFigure>(meta.id, ctx, { periodAware: meta.periodAware });
    return <WidgetState state={state} isEmpty={(d) => d.stats.length === 0 || !!d.empty} render={(d) => <WFigureBody data={d} />} />;
  }
  return { ...meta, Body };
}
