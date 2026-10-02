// EmptyState: 빈·필터 결과 없음·오류·권한 없음·모듈 꺼짐·없음 상태를 한 모양으로(그림 없이 작은 선 아이콘 하나, 주 버튼 1개 + 보조 버튼 1개까지).
// 문구: "무엇이 없고 + 무엇을 하면 되는지" 두 문장 이내(해요체). 기본 문구는 kind별로 채워 둡니다.
import type { ReactNode } from "react";
import { Button } from "antd";
import { AppstoreOutlined, FilterOutlined, InboxOutlined, LockOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router";

export type EmptyKind = "empty" | "filtered" | "error" | "forbidden" | "module_off" | "not_found";

export interface EmptyStateProps {
  kind: EmptyKind;
  title?: string;
  description?: string;
  action?: { label: string; to?: string; onClick?: () => void };
  /** 보조 버튼(예: 데모에서 '관리자로 바꿔 보기') */
  secondaryAction?: { label: string; to?: string; onClick?: () => void };
  /** 카드 안 작은 빈 상태 */
  compact?: boolean;
  /** 페이지 제목 역할이면 1(H-07) */
  headingLevel?: 1 | 2 | 3;
}

const DEFAULTS: Record<EmptyKind, { title: string; description?: string }> = {
  empty: { title: "아직 항목이 없어요" },
  filtered: { title: "조건에 맞는 항목이 없어요", description: "필터를 바꾸거나 지워 보세요." },
  error: { title: "불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." },
  forbidden: { title: "볼 수 있는 권한이 없어요", description: "필요하면 관리자에게 문의해 주세요." },
  module_off: { title: "이 회사에서는 쓰지 않는 기능이에요" },
  not_found: { title: "찾는 항목이 없어요", description: "주소를 확인하거나 목록에서 다시 찾아 주세요." },
};
const ICON: Record<EmptyKind, ReactNode> = {
  empty: <InboxOutlined />, filtered: <FilterOutlined />, error: <WarningOutlined />, forbidden: <LockOutlined />, module_off: <AppstoreOutlined />, not_found: <SearchOutlined />,
};

export function EmptyState({ kind, title, description, action, secondaryAction, compact, headingLevel = 2 }: EmptyStateProps) {
  const nav = useNavigate();
  const d = DEFAULTS[kind];
  const H = (`h${headingLevel}`) as "h1" | "h2" | "h3";
  const act = action ?? (kind === "module_off" || kind === "forbidden" ? { label: "홈으로", to: "/" } : undefined);
  return (
    <div className={`ws-empty${compact ? " ws-empty--compact" : ""}`} data-empty-kind={kind} role={kind === "error" ? "alert" : undefined}>
      {!compact && <span className="ws-empty__icon" aria-hidden>{ICON[kind]}</span>}
      <H className={`ws-empty__title${headingLevel === 1 ? " ws-empty__title--h1" : ""}`}>{title ?? d.title}</H>
      {(description ?? d.description) && <p className="ws-empty__desc">{description ?? d.description}</p>}
      {(act || secondaryAction) && (
        <div className="ws-empty__action">
          {act && (
            <Button type={kind === "error" || kind === "filtered" ? "default" : "primary"} onClick={() => (act.onClick ? act.onClick() : act.to ? nav(act.to) : undefined)}>
              {act.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={() => (secondaryAction.onClick ? secondaryAction.onClick() : secondaryAction.to ? nav(secondaryAction.to) : undefined)}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
