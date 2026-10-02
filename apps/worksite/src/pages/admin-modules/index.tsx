// 모듈 `/admin/modules` · A-07 · 깊이 A · 모듈 admin-settings · 소유: ara_settings 그룹(owner·admin만)
// 이 회사에서 켤 공통 코어 모듈을 정합니다. 스위치 → rpc:set_module_enabled(덮어쓰기 저장 + 감사 기록) → 메뉴가 바로 바뀜(TenantBoundary가 다시 계산).
// 규칙: 다른 켜진 모듈이 쓰는 모듈은 끌 수 없음(이유 표시), 필요한 모듈이 꺼져 있으면 켤 수 없음, 꼭 필요한 모듈 5개는 잠금. 업종 팩은 보기만.
import { useState } from "react";
import { App, Switch, Tooltip } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { CardGrid, EmptyState, FilterBar, PageHeader, SectionCard, StatTile, StatRow, useConfirm, useFilterBarState, type FilterBarProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useRpc } from "@/lib/refine";
import { LOCKED_MODULES, MODULES, MODULE_BY_ID, NAV_GROUPS, type ModuleId, type RegistryModule } from "@/modules";
import { MANIFEST } from "@/routes/manifest";
import { ResponsiveTable } from "../admin-company/shared/lib";

const MODE_LABEL: Record<string, string> = { build: "직접", integrate: "연동", hybrid: "혼합" };
const PACKS: { id: string; name: string }[] = [
  { id: "manufacturing", name: "제조(생산·품질)" },
  { id: "education_consulting", name: "교육·컨설팅(영업·교육)" },
];
const WITH_SCREEN = new Set<string>(MANIFEST.map((m) => m.moduleId));

export default function Page() {
  const { tenant, enabledModules, t } = useWorksite();
  const { message } = App.useApp();
  const confirm = useConfirm();
  const [pending, setPending] = useState<ModuleId | null>(null);
  const { run } = useRpc("set_module_enabled");

  const fbProps: FilterBarProps = {
    chips: [
      { param: "tier", ariaLabel: "단계", allLabel: "모든 단계", options: [{ value: "P0", label: "P0 기본" }, { value: "P1", label: "P1" }, { value: "P2", label: "P2" }] },
      { param: "state", ariaLabel: "상태", allLabel: "모든 상태", options: [{ value: "on", label: "켜짐" }, { value: "off", label: "꺼짐" }] },
    ],
  };
  const fb = useFilterBarState(fbProps);

  const core = MODULES.filter((m) => m.industry === "core");
  const rows = core.filter((m) => (!fb.values.tier || m.tier === fb.values.tier) && (!fb.values.state || (fb.values.state === "on") === enabledModules.has(m.id)));
  const onCount = core.filter((m) => enabledModules.has(m.id)).length;

  const menuOf = (m: RegistryModule) => {
    if (m.group === "topbar") return "상단 바";
    const g = NAV_GROUPS.find((x) => x.id === m.group);
    return g ? t(`nav.${g.id}`) : "—";
  };
  /** 끌 수 없는 이유(켜진 모듈이 이 모듈을 씀) / 켤 수 없는 이유(필요한 모듈이 꺼짐) */
  const blockReason = (m: RegistryModule): string | null => {
    if (LOCKED_MODULES.includes(m.id)) return "꼭 필요해요";
    const on = enabledModules.has(m.id);
    if (on) {
      const users = [...enabledModules].filter((id) => id !== m.id && MODULE_BY_ID[id]?.dependsOn.includes(m.id)).map((id) => MODULE_BY_ID[id]!.nameKo);
      return users.length ? `${users.join(", ")} 모듈이 이 모듈을 써요` : null;
    }
    const missing = m.dependsOn.filter((d) => !enabledModules.has(d)).map((d) => MODULE_BY_ID[d]?.nameKo ?? d);
    return missing.length ? `먼저 ${missing.join(", ")} 모듈을 켜 주세요` : null;
  };

  const toggle = async (m: RegistryModule, next: boolean) => {
    if (!next) {
      const ok = await confirm({ title: `${m.nameKo} 모듈을 끌까요?`, content: "메뉴와 화면에서 바로 사라져요. 데이터는 지우지 않아서 다시 켜면 그대로 보여요.", okText: "끄기" });
      if (!ok) return;
    }
    setPending(m.id);
    try {
      await run({ moduleId: m.id, enabled: next });
      message.success(next ? `${m.nameKo} 모듈을 켰어요. 메뉴에 바로 반영했어요` : `${m.nameKo} 모듈을 껐어요`);
    } catch { /* 토스트는 useRpc */ } finally {
      setPending(null);
    }
  };

  const stateCell = (m: RegistryModule) => {
    const on = enabledModules.has(m.id);
    const reason = blockReason(m);
    const locked = LOCKED_MODULES.includes(m.id);
    const sw = (
      <Switch
        checked={on}
        disabled={!!reason}
        loading={pending === m.id}
        onChange={(v) => void toggle(m, v)}
        aria-label={`${m.nameKo} ${on ? "끄기" : "켜기"}`}
      />
    );
    return (
      <span className="as-row" style={{ flexWrap: "nowrap" }}>
        {reason ? <Tooltip title={reason}><span tabIndex={0} aria-label={`${m.nameKo}: ${reason}`}>{sw}</span></Tooltip> : sw}
        <span className="as-nowrap">{on ? "켜짐" : "꺼짐"}</span>
        {locked && <span className="ws-tag"><LockOutlined aria-hidden />꼭 필요해요</span>}
      </span>
    );
  };

  const nameCell = (m: RegistryModule) => {
    const reason = blockReason(m);
    return (
      <div style={{ maxWidth: 360 }}>
        <div className="as-row" style={{ gap: 6 }}>
          <b>{m.nameKo}</b>
          {!WITH_SCREEN.has(m.id) && <span className="ws-tag">화면 없음</span>}
        </div>
        {reason && !LOCKED_MODULES.includes(m.id) && <div className="as-caption">{reason}</div>}
      </div>
    );
  };

  const packCounts = PACKS.map((p) => ({ ...p, count: MODULES.filter((m) => m.industry === p.id).length, on: tenant.packs.includes(p.id as never) }));
  // 계약한 팩만 표로. 다른 업종 팩은 이름만 한 줄(이 회사와 상관없는 팩이 같은 무게로 보이지 않게)
  const myPacks = packCounts.filter((p) => p.on);
  const otherPacks = packCounts.filter((p) => !p.on);

  return (
    <>
      <PageHeader title="모듈" description="켜고 끄면 메뉴가 바로 바뀌어요. 꺼도 데이터는 지우지 않아요." />
      <CardGrid>
        <SectionCard span={12} title="공통 코어" demo caption="'화면 없음' 모듈은 이번 빌드에 화면이 없고 다른 화면의 데이터로만 쓰여요.">
          <StatRow>
            <StatTile label="켜진 모듈" value={onCount} unit="개" />
            <StatTile label="꺼진 모듈" value={core.length - onCount} unit="개" />
            <StatTile label="꼭 필요한 모듈" value={LOCKED_MODULES.length} unit="개" />
          </StatRow>
          <div className="as-mt-lg">
            <FilterBar {...fbProps} />
          </div>
          <ResponsiveTable<RegistryModule>
            ariaLabel="공통 코어 모듈"
            rows={rows}
            rowKey={(m) => m.id}
            columns={[
              { key: "name", title: "모듈", render: nameCell },
              { key: "tier", title: "단계", render: (m) => m.tier },
              { key: "mode", title: "방식", render: (m) => MODE_LABEL[m.buildMode] ?? "—" },
              { key: "menu", title: "메뉴 위치", render: menuOf },
              { key: "deps", title: "필요한 모듈", render: (m) => m.dependsOn.map((d) => MODULE_BY_ID[d]?.nameKo ?? d).join(", ") || "—" },
              { key: "state", title: "상태", render: stateCell },
            ]}
            mobile={(m) => ({
              title: <>{m.nameKo}{!WITH_SCREEN.has(m.id) && <span className="ws-tag">화면 없음</span>}</>,
              lines: [
                ["단계·방식", `${m.tier} · ${MODE_LABEL[m.buildMode] ?? "—"}`],
                ["메뉴", menuOf(m)],
                ...(m.dependsOn.length ? [["필요한 모듈", m.dependsOn.map((d) => MODULE_BY_ID[d]?.nameKo ?? d).join(", ")] as [string, string]] : []),
                ...(blockReason(m) && !LOCKED_MODULES.includes(m.id) ? [["안내", blockReason(m)!] as [string, string]] : []),
              ],
              actions: stateCell(m),
            })}
            empty={<EmptyState kind="filtered" action={{ label: "필터 지우기", onClick: fb.clear }} />}
          />
        </SectionCard>
        <SectionCard span={12} title="업종 팩" caption={`업종 팩은 계약 사항이라 CRATA 운영자와 함께 바꿔요.${otherPacks.length ? ` 다른 업종 팩(계약 시): ${otherPacks.map((p) => p.name).join(", ")}` : ""}`}>
          <ResponsiveTable
            ariaLabel="계약한 업종 팩"
            rows={myPacks}
            rowKey={(p) => p.id}
            columns={[
              { key: "name", title: "팩 이름", render: (p) => <b>{p.name}</b> },
              { key: "count", title: "모듈 수", render: (p) => `${p.count}개`, align: "right" },
              { key: "state", title: "상태", render: (p) => <span className="as-row"><Switch checked={p.on} disabled aria-label={`${p.name} 상태`} /><span>{p.on ? "켜짐" : "꺼짐"}</span></span> },
            ]}
            mobile={(p) => ({ title: p.name, lines: [["모듈 수", `${p.count}개`], ["상태", p.on ? "켜짐" : "꺼짐"]] })}
          />
        </SectionCard>
      </CardGrid>
    </>
  );
}
