// 모바일·태블릿 전체 메뉴 서랍 — AppShell이 처음 열 때 불러와요(lazyDrawer, 데스크톱 첫 화면 묶음에 서랍이 들어가지 않게)
import { Drawer } from "antd";
import type { NavItem } from "@/modules";
import { NavTree } from "./SideNav";

export function NavDrawer({ open, onClose, title, items }: { open: boolean; onClose: () => void; title: string; items: NavItem[] }) {
  return (
    <Drawer open={open} onClose={onClose} placement="left" width={300} title={title} className="ws-drawer">
      {/* 메뉴 버튼의 aria-controls 대상 */}
      <div id="ws-nav-drawer"><NavTree items={items} mode="drawer" onNavigate={onClose} /></div>
    </Drawer>
  );
}
