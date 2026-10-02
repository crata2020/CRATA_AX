// 모바일 사용자 시트(바텀시트) — TopBar가 처음 열 때 불러와요(lazyDrawer)
import { Link } from "react-router";
import { Button, Drawer, Switch } from "antd";
import { useWorksite } from "@/app/TenantBoundary";
import { labelOf } from "@/lib/status";
import { PersonChip } from "@/components/PersonChip";
import { AiStatusChip, PersonaSwitcher, TenantSwitcher, useResetDemo } from "./TopBar";

/** 모바일 사용자 시트(바텀시트): 나 · 회사·인물 전환 · AI 연결 상태 · 바로가기 · 저장 스위치 · 데모 초기화 */
export function UserSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { persona, tenant, role, persist, setPersist } = useWorksite();
  const reset = useResetDemo();
  return (
    <Drawer open={open} onClose={onClose} placement="bottom" height="auto" title="내 계정과 데모" className="ws-drawer ws-drawer--sheet" styles={{ wrapper: { maxHeight: "90vh" } }}>
      <div className="ws-usersheet__section">
        <PersonChip memberId={persona.memberId} showUnit />
        <span className="ws-t-caption">{role.title} · {labelOf("platform_role", persona.role)} · {tenant.displayName}</span>
        <AiStatusChip />
        <div className="ws-row">
          <Link to="/me" onClick={onClose}><Button>내 정보</Button></Link>
          <Link to="/me/notifications" onClick={onClose}><Button>알림 설정</Button></Link>
        </div>
      </div>
      <div className="ws-usersheet__section">
        <label className="ws-t-label">회사</label>
        <TenantSwitcher block />
        <label className="ws-t-label">누구로 보기</label>
        <PersonaSwitcher block />
        <div className="ws-usersheet__row">
          <span className="ws-t-body">변경 내용 이 브라우저에 저장</span>
          <Switch checked={persist} onChange={setPersist} aria-label="변경 내용 이 브라우저에 저장" />
        </div>
        <Button danger onClick={() => void reset()}>데모 초기화</Button>
        <p className="ws-t-caption">모든 숫자와 사람은 예시예요. 실제 회사 값이 아니에요.</p>
      </div>
    </Drawer>
  );
}

