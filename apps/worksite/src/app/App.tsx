// 공급자 조립(05 문서 2.2절): TenantBoundary → HashRouter → ConfigProvider(koKR, 테넌트 테마) → AntdApp → Refine → 라우트
import { useEffect } from "react";
import { HashRouter } from "react-router";
import { App as AntdApp, ConfigProvider } from "antd";
// ESM 경로로 가져옵니다. CJS 경로(antd/locale/ko_KR)는 "type": "module" 패키지에서 { default } 객체로 들어와 antd가 영어로 돌아가요.
import koKR from "antd/es/locale/ko_KR";
import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { TenantBoundary, useWorksite } from "./TenantBoundary";
import { AppRoutes } from "./routes";
import { antdTheme } from "@/theme/antdTheme";
import { RESOURCES, RESOURCE_NAMES } from "@/providers/resources";
import {
  createAccessControlProvider, createAuditLogProvider, createDemoAuthProvider, createI18nProvider, useToastNotificationProvider,
} from "@/providers/refineProviders";
import { useMemo } from "react";

dayjs.locale("ko");

/** 저장소가 바뀌면(rpc·다른 화면의 쓰기) 셀렉터(sel:) 질의를 다시 불러옵니다 */
function StoreSync() {
  const { providers } = useWorksite();
  const qc = useQueryClient();
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const off = providers.store.subscribe(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        void qc.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).includes("sel:") });
      }, 30);
    });
    return () => { off(); clearTimeout(t); };
  }, [providers.store, qc]);
  return null;
}

function RefineRoot() {
  const ws = useWorksite();
  const refineProps = useMemo(() => ({
    dataProvider: { default: ws.providers.data, ara: ws.providers.ara },
    accessControlProvider: createAccessControlProvider(ws.providers.policy),
    authProvider: createDemoAuthProvider(ws.tenant, ws.persona),
    auditLogProvider: createAuditLogProvider(ws.providers.store, ws.providers.policy),
    resources: RESOURCE_NAMES.map((name) => ({ name, meta: { label: RESOURCES[name].labelKo, moduleId: RESOURCES[name].module, hide: true } })),
  }), [ws.providers, ws.tenant, ws.persona]);
  const i18nProvider = useMemo(() => createI18nProvider(ws.t), [ws.t]);
  return (
    <Refine
      routerProvider={routerProvider}
      {...refineProps}
      i18nProvider={i18nProvider}
      notificationProvider={useToastNotificationProvider}
      options={{
        syncWithLocation: true,
        disableTelemetry: true,
        warnWhenUnsavedChanges: false,
        reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 5_000 } } } },
        mutationMode: "pessimistic",
      }}
    >
      <StoreSync />
      <AppRoutes />
    </Refine>
  );
}

function Themed() {
  const { tokens, density } = useWorksite();
  const theme = useMemo(() => antdTheme(tokens, density), [tokens, density]);
  return (
    <ConfigProvider locale={koKR} theme={theme} componentSize="middle">
      <AntdApp message={{ top: 72, maxCount: 3 }}>
        <RefineRoot />
      </AntdApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <TenantBoundary>
      <HashRouter>
        <Themed />
      </HashRouter>
    </TenantBoundary>
  );
}
