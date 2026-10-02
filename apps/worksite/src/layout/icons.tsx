// 레지스트리 아이콘 이름 → @ant-design/icons(Outlined만, 이름 단위 import)
import type { ComponentType } from "react";
import type { AntdIconProps } from "@ant-design/icons/lib/components/AntdIcon";
import {
  HomeOutlined, CheckSquareOutlined, ProjectOutlined, TeamOutlined, FileTextOutlined, BuildOutlined, BankOutlined,
  HeartOutlined, SettingOutlined, BellOutlined, AppstoreOutlined, PlusCircleOutlined,
} from "@ant-design/icons";
import type { RegistryIconName } from "@/modules/registry.generated";

const MAP: Partial<Record<RegistryIconName, ComponentType<AntdIconProps>>> = {
  HomeOutlined, CheckSquareOutlined, ProjectOutlined, TeamOutlined, FileTextOutlined, BuildOutlined, BankOutlined,
  HeartOutlined, SettingOutlined, BellOutlined, AppstoreOutlined, PlusCircleOutlined,
};

export function NavIcon({ name }: { name: RegistryIconName }) {
  const C = MAP[name] ?? AppstoreOutlined;
  return <C aria-hidden />;
}
