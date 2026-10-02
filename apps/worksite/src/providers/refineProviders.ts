// Refine 공급자 묶음: i18n(한국어 + 용어 치환) · 접근 제어 · 데모 인증 · 감사 로그 읽기 · 토스트 알림
import { App } from "antd";
import type { AccessControlProvider, AuditLogProvider, AuthProvider, I18nProvider, NotificationProvider } from "@refinedev/core";
import { KO } from "@/i18n/ko";
import type { Persona } from "@/data/seed/types";
import type { TenantConfig } from "@/tenants/types";
import type { Policy } from "./policy";
import type { MemoryStore } from "./store";
import { NOT_FOUND_MESSAGE } from "./mockDataProvider";

const interpolate = (s: string, opts?: Record<string, unknown>) => (opts ? s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? "")) : s);

/** i18n: Refine 키는 한국어로, 화면 용어 키(term.*·nav.*)는 회사 용어로 */
export function createI18nProvider(t: (key: string, fallback?: string) => string): I18nProvider {
  return {
    translate: (key: string, options?: unknown, defaultMessage?: string) => {
      const opts = (typeof options === "object" && options ? options : undefined) as Record<string, unknown> | undefined;
      if (key.startsWith("term.") || key.startsWith("nav.")) return t(key, defaultMessage);
      const hit = KO[key];
      if (hit != null) return interpolate(hit, opts);
      return interpolate(defaultMessage ?? (typeof options === "string" ? options : key), opts);
    },
    changeLocale: async () => {},
    getLocale: () => "ko",
  };
}

/** 접근 제어: useCan({ resource, action, params: { row } }) — resource는 리소스 이름 또는 모듈 id */
export function createAccessControlProvider(policy: Policy): AccessControlProvider {
  return {
    can: async ({ resource, action, params }) => {
      if (!resource) return { can: true };
      const row = (params as { row?: Record<string, unknown> } | undefined)?.row;
      const r = policy.can(resource, action, row);
      return { can: r.can, reason: r.reason };
    },
    options: { buttons: { enableAccessControl: true, hideIfUnauthorized: false } },
  };
}

/** 데모 인증: 늘 로그인됨. 신원은 현재 페르소나(2단계에서 Supabase Auth로 바꿈) */
export function createDemoAuthProvider(tenant: TenantConfig, persona: Persona): AuthProvider {
  return {
    login: async () => ({ success: true, redirectTo: "/" }),
    logout: async () => ({ success: true, redirectTo: "/login" }),
    check: async () => ({ authenticated: true }),
    onError: async () => ({}),
    getIdentity: async () => ({ id: persona.memberId, name: persona.displayName, roleCode: persona.roleCode, unitId: persona.unitId, tenant: tenant.slug }),
    getPermissions: async () => persona.role,
  };
}

/** 감사 로그: 쓰기는 메모리 공급자가 직접 남깁니다(2단계 DB 트리거와 같은 위치). 여기서는 읽기(useLogList)만 */
export function createAuditLogProvider(store: MemoryStore, policy: Policy): AuditLogProvider {
  return {
    create: async () => ({}),
    get: async ({ resource, meta }) => {
      const id = (meta as { id?: string } | undefined)?.id;
      return policy.scope("audit_events", store.rows("audit_events"))
        .filter((e) => e.resource === resource && (!id || e.resource_id === id))
        .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    },
    update: async () => ({}),
  };
}

/** 토스트 알림(해요체). 404는 화면이 EmptyState로 그리므로 토스트를 띄우지 않습니다 */
export function useToastNotificationProvider(): NotificationProvider {
  const { message } = App.useApp();
  return {
    open: ({ type, message: title, description, key }) => {
      // 오류는 원인(공급자 메시지)이 설명에 있고, 성공은 제목이 "등록했어요"처럼 일어난 일입니다
      const desc = description && String(description).trim() ? String(description) : "";
      const text = type === "error" ? desc || String(title ?? "") : String(title ?? "") || desc;
      if (type === "error" && text === NOT_FOUND_MESSAGE) return;
      const fn = type === "error" ? message.error : type === "success" ? message.success : message.info;
      fn({ content: text, key, duration: type === "error" ? 4 : 2.5 });
    },
    close: (key) => message.destroy(key),
  };
}
