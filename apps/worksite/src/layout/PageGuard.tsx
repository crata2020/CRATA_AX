// PageGuard: 모듈이 꺼져 있으면 module_off, 권한이 없으면 forbidden을 그 자리에서 보여 줍니다(리디렉션하지 않음, 빌드 스펙 2.6절).
// 막을 때도 PageHeader(페이지 이름, h1)를 먼저 그립니다. 라우트마다 자동으로 한 번 감싸므로,
// 페이지는 더 엄격한 동작이 필요할 때만 씁니다: <PageGuard action="approve">…</PageGuard>
import type { ReactNode } from "react";
import type { ModuleId } from "@/modules/registry.generated";
import { LEVEL_ACTIONS, permissionLevel } from "@/modules";
import type { PlatformRole } from "@/tenants/types";
import { useWorksite } from "@/app/TenantBoundary";
import { useRouteEntry } from "@/app/routeContext";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export interface PageGuardProps {
  /** 기본: 현재 라우트의 모듈 */
  moduleId?: ModuleId;
  /** 기본 "list". 검토함·분류 확인은 "approve" */
  action?: "list" | "show" | "create" | "edit" | "approve" | "export" | "delete";
  /** 이 역할만(예: 관리 화면 ["owner", "admin"]) */
  roles?: PlatformRole[];
  /** 막을 때 머리 제목(기본: 라우트 이름) */
  title?: string;
  children: ReactNode;
}

const ROLE_KO = { owner: "소유자", admin: "관리자", reviewer: "검토자", member: "구성원" } as const;

export function PageGuard({ moduleId, action = "list", roles, title, children }: PageGuardProps) {
  const entry = useRouteEntry();
  const ws = useWorksite();
  const mid = moduleId ?? entry?.moduleId;
  const name = title ?? entry?.nameKo ?? "";
  if (mid && !ws.isModuleOn(mid)) {
    return (
      <>
        <PageHeader title={name} />
        <EmptyState kind="module_off" title="이 회사에서는 쓰지 않는 기능이에요" description="필요하면 관리자에게 모듈을 켜 달라고 요청해 주세요." action={{ label: "홈으로", to: "/" }} />
      </>
    );
  }
  const roleBlocked = roles && !roles.includes(ws.persona.role);
  if (roleBlocked || (mid && !ws.can(mid, action).can)) {
    // 이 화면을 볼 수 있는 플랫폼 역할 → 문장 + 데모에서 바로 바꿔 볼 인물
    const allowed = (["owner", "admin", "reviewer", "member"] as const).filter((r) =>
      (!roles || roles.includes(r)) && (!mid || LEVEL_ACTIONS[permissionLevel(mid, r)].includes(action)));
    const roleText = allowed.map((r) => ROLE_KO[r]).join("·");
    const target = ws.personas.find((p) => {
      const role = ws.tenant.roles.find((x) => x.code === p.roleCode);
      return !!role && allowed.includes(role.platformRole);
    });
    const targetTitle = target ? ws.tenant.roles.find((x) => x.code === target.roleCode)?.title : undefined;
    return (
      <>
        <PageHeader title={name} />
        <EmptyState
          kind="forbidden"
          title="볼 수 있는 권한이 없어요"
          description={roleText ? `${roleText}만 볼 수 있어요. 필요하면 관리자에게 문의해 주세요.` : "필요하면 관리자에게 문의해 주세요."}
          action={{ label: "홈으로", to: "/" }}
          secondaryAction={ws.tenant.isDemo && target ? { label: `${targetTitle ?? "관리자"}로 바꿔 보기`, onClick: () => ws.switchPersona(target.roleCode) } : undefined}
        />
      </>
    );
  }
  return <>{children}</>;
}
