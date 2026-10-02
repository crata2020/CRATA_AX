// DetailDrawer: 상세 보기·만들기·고치기 서랍(데스크톱·태블릿 오른쪽 480px, 모바일 바텀시트 최대 90vh).
// 바닥: 왼쪽 [닫기] · 오른쪽 주 버튼(footer). Esc로 닫고, 닫으면 초점을 연 자리로 돌려줍니다.
// 열린 서랍은 ?selected=<id>(만들기는 ?selected=new)로 URL에 남기세요: const [sel, setSel] = useSelectedParam()
// useConfirm: 확인 대화상자(왼쪽 [취소], 오른쪽 주 동작). const ok = await confirm({ title, content, okText })
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { App, Button, Drawer } from "antd";
import { useBreakpoint } from "@/lib/useBreakpoint";

export interface DetailDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** 오른쪽 주 버튼(들) */
  footer?: ReactNode;
  /** 왼쪽 버튼 글자(기본 "닫기") */
  closeLabel?: string;
  /** 제목 줄 오른쪽(상태 태그 등) */
  extra?: ReactNode;
  width?: number;
  children: ReactNode;
}

export function DetailDrawer({ open, title, onClose, footer, closeLabel = "닫기", extra, width = 480, children }: DetailDrawerProps) {
  const bp = useBreakpoint();
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);
  const sheet = bp === "mobile";
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      extra={extra}
      placement={sheet ? "bottom" : "right"}
      width={sheet ? undefined : width}
      height={sheet ? "auto" : undefined}
      className={`ws-drawer${sheet ? " ws-drawer--sheet" : ""}`}
      styles={sheet ? { wrapper: { maxHeight: "90vh" }, body: { paddingBottom: 24 } } : undefined}
      destroyOnHidden
      keyboard
      afterOpenChange={(v) => { if (!v) opener.current?.focus?.(); }}
      footer={
        <>
          <Button onClick={onClose}>{closeLabel}</Button>
          {footer && <div className="ws-drawer__footer-right">{footer}</div>}
        </>
      }
    >
      {children}
    </Drawer>
  );
}

export interface ConfirmOptions { title: string; content?: ReactNode; okText?: string; cancelText?: string; danger?: boolean }

/** 확인 대화상자. true면 확인, false면 취소 */
export function useConfirm() {
  const { modal } = App.useApp();
  return useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        modal.confirm({
          title: o.title,
          content: o.content,
          okText: o.okText ?? "확인",
          cancelText: o.cancelText ?? "취소",
          okButtonProps: { danger: o.danger },
          icon: null,
          centered: true,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      }),
    [modal],
  );
}

/** ConfirmDialog(컴포넌트형이 필요할 때): 버튼을 감싸 누르면 확인 후 onConfirm */
export function ConfirmDialog({ children, onConfirm, ...o }: ConfirmOptions & { children: (open: () => void) => ReactNode; onConfirm: () => void | Promise<void> }) {
  const confirm = useConfirm();
  return <>{children(async () => { if (await confirm(o)) await onConfirm(); })}</>;
}
