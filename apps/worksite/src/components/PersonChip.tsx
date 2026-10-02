// PersonChip: 사람은 늘 이 칩으로(이니셜 원 + 이름, 사진 없음). AI 연결이 한 일은 kind="ai"("AI 연결 · Claude"), 시스템은 kind="system".
import { ApiOutlined, SettingOutlined } from "@ant-design/icons";
import { useWorksite } from "@/app/TenantBoundary";
import { initialsOf } from "@/lib/format";

export interface PersonChipProps {
  memberId?: string | null;
  kind?: "member" | "ai" | "system";
  /** kind="ai"일 때 클라이언트 이름(Claude·ChatGPT·Codex) */
  clientName?: string | null;
  size?: "sm" | "md";
  /** 이름 옆에 소속 조직 */
  showUnit?: boolean;
  /** 이름 대신 직접 글자(예: "이름 없음") */
  fallbackName?: string;
}

export function PersonChip({ memberId, kind = "member", clientName, size = "md", showUnit, fallbackName }: PersonChipProps) {
  const { person, tenant } = useWorksite();
  const av = `ws-avatar${size === "sm" ? " ws-avatar--sm" : ""}`;
  if (kind === "ai") {
    return (
      <span className="ws-person">
        <span className={`${av} ws-avatar--ai`} aria-hidden><ApiOutlined /></span>
        <span className="ws-person__name">AI 연결{clientName ? ` · ${clientName}` : ""}</span>
      </span>
    );
  }
  if (kind === "system") {
    return (
      <span className="ws-person">
        <span className={`${av} ws-avatar--ai`} aria-hidden><SettingOutlined /></span>
        <span className="ws-person__name">시스템</span>
      </span>
    );
  }
  const p = person(memberId);
  const name = p?.displayName ?? fallbackName ?? (memberId ? "알 수 없는 사람" : "—");
  const unit = showUnit && p ? tenant.orgUnits.find((u) => u.id === p.unitId)?.name : undefined;
  return (
    <span className="ws-person" title={p ? `${p.displayName} · ${p.jobTitle}` : undefined}>
      <span className={av} aria-hidden>{initialsOf(name)}</span>
      <span className="ws-person__name">{name}</span>
      {unit && <span className="ws-person__unit">{unit}</span>}
    </span>
  );
}
