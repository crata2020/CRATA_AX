// StatusTag: 상태는 늘 아이콘 + 글자(색만으로 표시하지 않음, 빌드 스펙 4.1.2·4.10절).
// 쓰는 법: <StatusTag {...statusOf("tasks.status", row.status)} />  ·  <StatusTag tone="warning" label="확인 필요" />
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, MinusCircleOutlined, RightCircleOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import type { Tone } from "@/theme/tokens";

export type { Tone };

/** tone 기본 아이콘(4.1.2절) */
export const TONE_ICON: Record<Tone, ReactNode> = {
  good: <CheckCircleOutlined aria-hidden />,
  warning: <ClockCircleOutlined aria-hidden />,
  serious: <ExclamationCircleOutlined aria-hidden />,
  critical: <CloseCircleOutlined aria-hidden />,
  // 진행 상태(진행 중·검토 대기·제안)라 '정보(i)'가 아니라 앞으로 가는 화살표
  info: <RightCircleOutlined aria-hidden />,
  neutral: <MinusCircleOutlined aria-hidden />,
};

/** 차트 점·범례 등 마크 색(CSS 변수) */
export const toneMarkVar = (tone: Tone) => `var(--ws-${tone}-mark)`;

export interface StatusTagProps {
  tone: Tone;
  label: string;
  /** 기본은 tone 아이콘. 다른 아이콘이 필요할 때만 */
  icon?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function StatusTag({ tone, label, icon, size = "sm", className }: StatusTagProps) {
  return (
    <span className={`ws-status${size === "md" ? " ws-status--md" : ""}${className ? ` ${className}` : ""}`} data-tone={tone}>
      {icon ?? TONE_ICON[tone]}
      <span>{label}</span>
    </span>
  );
}
