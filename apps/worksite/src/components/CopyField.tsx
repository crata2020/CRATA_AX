// CopyField: 값 + [복사] 버튼 + 토스트("복사했어요"). 업무 연락처·MCP 주소(예시)에 씁니다.
import { App, Button } from "antd";
import { CopyOutlined } from "@ant-design/icons";

export interface CopyFieldProps {
  value: string;
  /** 접근성 이름 + 토스트에 쓰는 이름(예: "메일 주소") */
  label: string;
  /** 값을 상자 안에(주소처럼 긴 값) */
  boxed?: boolean;
  /** 값은 숨기고 버튼만 */
  buttonOnly?: boolean;
  /** 버튼을 아이콘만(표 칸처럼 좁은 곳). 접근성 이름은 "{label} 복사" */
  iconOnly?: boolean;
}

export function CopyField({ value, label, boxed, buttonOnly, iconOnly }: CopyFieldProps) {
  const { message } = App.useApp();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label}를 복사했어요`);
    } catch {
      message.error("복사하지 못했어요. 직접 선택해서 복사해 주세요");
    }
  };
  return (
    <span className="ws-copy">
      {!buttonOnly && <span className={`ws-copy__value${boxed ? " ws-copy__value--box" : ""}`}>{value}</span>}
      {iconOnly
        ? <Button size="small" type="text" icon={<CopyOutlined aria-hidden />} onClick={copy} aria-label={`${label} 복사`} title={`${label} 복사`} />
        : <Button size="small" icon={<CopyOutlined aria-hidden />} onClick={copy} aria-label={`${label} 복사`}>복사</Button>}
    </span>
  );
}
