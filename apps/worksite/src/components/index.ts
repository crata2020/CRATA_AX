// 공통 컴포넌트 창구(Foundation 소유). 페이지는 여기서 가져다 쓰고 고치지 않습니다(빌드 스펙 4.9·7.3절).
// 예시 props와 모양은 개발 모드의 #/__kit 화면에서 볼 수 있어요.
export { PageHeader, LinkTabs, type PageHeaderProps, type LinkTab } from "./PageHeader";
export { SectionCard, HeroCard, CardGrid, GridCell, Divider, spanStyle, useInsideCard, type SectionCardProps, type CardSize } from "./SectionCard";
export { SegmentedPills, type SegmentedPillsProps } from "./SegmentedPills";
export { StatusTag, TONE_ICON, toneMarkVar, type StatusTagProps, type Tone } from "./StatusTag";
export { StatTile, StatRow, BigNumber, DeltaText, type StatTileProps, type BigNumberProps, type DeltaTextProps } from "./figures";
export { SimpleBarChart, StackedShareBar, LineSpark, Meter, ChartFrame, niceTicks, type SimpleBarChartProps, type StackedShareBarProps, type LineSparkProps, type MeterProps, type ChartFrameProps } from "./charts";
export { PersonChip, type PersonChipProps } from "./PersonChip";
export { EmptyState, type EmptyStateProps, type EmptyKind } from "./EmptyState";
export { ListRow, ListRows, type ListRowProps } from "./ListRow";
export { KanbanBoard, type KanbanBoardProps, type KanbanColumn } from "./KanbanBoard";
export { Timeline, type TimelineProps, type TimelineItem } from "./Timeline";
export { FilterBar, useFilterBarState, type FilterBarProps, type FilterChipGroup, type FilterSelect } from "./FilterBar";
export { DataTable, type DataTableProps, type ColumnDef, type ColumnKind } from "./DataTable";
export { DetailDrawer, ConfirmDialog, useConfirm, type DetailDrawerProps, type ConfirmOptions } from "./DetailDrawer";
export { CopyField, type CopyFieldProps } from "./CopyField";
export { WidgetSlot, type WidgetDef, type WidgetContext, type WidgetSlotProps } from "./WidgetSlot";
export {
  PillLabel, DemoDataBadge, DdayBadge, SensitivityTag, AiTag, PriceGate, MaterialGradeTag, Banner, PrivateZone, CountBadge, DemoOnlyLink,
} from "./basics";
export { PageGuard, type PageGuardProps } from "@/layout/PageGuard";
export { RightRail, useRailVisible, type RightRailProps } from "@/layout/RightRail";
