// WidgetSlot: 홈 위젯 카드 틀(제목·알약·예시 배지·더보기)을 그리고, 위젯은 카드 안 내용만 그립니다(카드 중첩 방지).
// 위젯 파일: src/pages/home/widgets/<widget-id>.tsx (home 그룹 소유) — export default WidgetDef.
// Body가 null을 그리면 emptyText를 대신 보여 줍니다. 파일이 없으면 '준비 중'.
import { lazy, Suspense, useMemo, type ComponentType, type ReactElement } from "react";
import { Skeleton } from "antd";
import type { WidgetId, ModuleId } from "@/modules/registry.generated";
import { WIDGET_BY_ID } from "@/modules";
import { useWorksite } from "@/app/TenantBoundary";
import type { TenantConfig, PermissionBundle } from "@/tenants/types";
import type { Persona } from "@/data/seed/types";
import { SectionCard, type CardSize } from "./SectionCard";

export interface WidgetContext {
  /** 머리의 기간 세그먼트(periodAware 위젯만) */
  period: "week" | "month";
  tenant: TenantConfig;
  persona: Persona;
  today: string;
  isModuleOn: (id: ModuleId) => boolean;
  /** 실제 놓인 크기 */
  size: CardSize;
}

export interface WidgetDef {
  id: WidgetId;
  /** 카드 제목(알약 여부는 WidgetSlot이 위치로 정함) */
  title: string;
  /** 데스크톱 4·6·12열, 태블릿 4·8·8열, 모바일 전체 */
  size: CardSize;
  /** 제목 줄 오른쪽 '더보기' */
  link?: { label: string; to: string };
  requires?: { modules?: ModuleId[]; bundle?: PermissionBundle; minPopulation?: number };
  periodAware?: boolean;
  /** 카드 안 내용. null이면 emptyText */
  Body: (p: { ctx: WidgetContext }) => ReactElement | null;
  emptyText: string;
  /** 연동형(결재·메일) 위젯: "연동 미리보기" 캡션 */
  integrationPreview?: boolean;
  /** 카드 아래 캡션(예: "평가용이 아니에요") */
  caption?: string;
  /** 수치 위젯이면 true(기본 true) — 제목 줄 '예시 데이터' 배지 */
  demo?: boolean;
}

const files = import.meta.glob<{ default: WidgetDef }>("../pages/home/widgets/*.tsx");
type Renderer = ComponentType<{ render: (def: WidgetDef) => ReactElement }>;
const lazyCache = new Map<string, Renderer>();

function loaderFor(id: string) {
  const key = `../pages/home/widgets/${id}.tsx`;
  const load = files[key];
  if (!load) return null;
  let C = lazyCache.get(id);
  if (!C) {
    C = lazy(async () => {
      const mod = await load();
      const def = mod.default;
      return { default: ({ render }: { render: (def: WidgetDef) => ReactElement }) => render(def) };
    });
    lazyCache.set(id, C);
  }
  return C;
}

export interface WidgetSlotProps {
  id: WidgetId;
  /** 제목을 검정 알약으로(홈 2·3번째 위젯) */
  pill?: boolean;
  /** 크기 덮어쓰기(히어로 옆 7열 등) */
  span?: number;
  size?: CardSize;
  period?: "week" | "month";
}

export function WidgetSlot({ id, pill, span, size, period = "week" }: WidgetSlotProps) {
  const ws = useWorksite();
  const C = useMemo(() => loaderFor(id), [id]);
  const meta = WIDGET_BY_ID[id];
  const placeholder = (loading: boolean) => (
    <SectionCard title={meta?.nameKo ?? id} pill={pill} size={size ?? "M"} span={span}>
      {loading ? <Skeleton active title={false} paragraph={{ rows: 3 }} /> : <p className="ws-t-body ws-ink-2">준비 중이에요.</p>}
    </SectionCard>
  );
  if (!C) return placeholder(false);
  const render = (def: WidgetDef) => {
    const actual = size ?? def.size;
    const ctx: WidgetContext = { period, tenant: ws.tenant, persona: ws.persona, today: ws.today, isModuleOn: ws.isModuleOn, size: actual };
    const Body = def.Body;
    return (
      <SectionCard
        title={def.title}
        pill={pill}
        demo={def.demo ?? true}
        more={def.link}
        size={actual}
        span={span}
        caption={def.integrationPreview ? `연동 미리보기${def.caption ? ` · ${def.caption}` : ""}` : def.caption}
      >
        <div className="ws-widget-body"><Body ctx={ctx} /></div>
        <p className="ws-widget-empty ws-t-body ws-ink-2">{def.emptyText}</p>
      </SectionCard>
    );
  };
  return (
    <Suspense fallback={placeholder(true)}>
      <C render={render} />
    </Suspense>
  );
}
