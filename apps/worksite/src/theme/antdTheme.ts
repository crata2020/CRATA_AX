// antd ConfigProvider 테마(05 문서 5.6절 + 빌드 스펙 4장, 시각 값은 07 Orbix 명세 4.7절).
// 카드·버튼·표는 그림자 없음, 떠 있는 층(팝오버·드롭다운·모달)만 그림자. 컨트롤 라운드 8, 카드 12.
// hover는 무채(panel), 선택·켜짐만 brandWeak.
import type { ThemeConfig } from "antd";
import type { BrandTokens, Density } from "@/tenants/types";
import { FONT_STACK, STATUS_COLORS } from "./tokens";
import { rgbTriplet } from "./color";

export function antdTheme(t: BrandTokens, density: Density = "comfortable"): ThemeConfig {
  const inkRgb = rgbTriplet(t.ink);
  // cssVars.ts의 --ws-shadow-raise와 같은 값(세그먼트 선택 칸)
  const shadowRaise = `0 0 0 1px rgba(${inkRgb},0.06), 0 1px 2px rgba(${inkRgb},0.06)`;
  return {
    cssVar: true,
    hashed: false,
    token: {
      colorPrimary: t.brand,
      colorInfo: t.info.mark,
      colorLink: t.brandText,
      colorLinkHover: t.brandText,
      colorLinkActive: t.brand,
      colorSuccess: STATUS_COLORS.good.mark,
      colorWarning: STATUS_COLORS.warning.mark,
      colorError: STATUS_COLORS.critical.mark,
      colorErrorText: STATUS_COLORS.critical.fg,
      colorWarningText: STATUS_COLORS.warning.fg,
      colorSuccessText: STATUS_COLORS.good.fg,
      colorText: t.ink,
      colorTextHeading: t.ink,
      colorTextSecondary: t.ink2,
      colorTextTertiary: t.muted,
      colorTextQuaternary: t.muted,
      colorTextPlaceholder: t.muted,
      colorTextDescription: t.ink2,
      colorBorder: t.controlLine,
      colorBorderSecondary: t.line,
      // 서랍 머리·꼬리 선은 --ws-line 그대로. 표 행 선은 Table borderColor(sunken)로 따로
      colorSplit: t.line,
      colorBgLayout: t.panel,
      colorBgContainer: t.surface,
      colorBgElevated: t.surface,
      colorBgMask: `rgba(${inkRgb},0.32)`,
      colorFillAlter: t.panel,
      // 비활성 버튼·입력칸 바탕은 테넌트 panel(antd 기본 #F5F5F5 아님). 글자는 colorTextDisabled 그대로
      colorBgContainerDisabled: t.panel,
      controlItemBgHover: t.panel,
      controlItemBgActive: t.brandWeak,
      fontFamily: FONT_STACK,
      fontSize: 14,
      fontWeightStrong: 600,
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
      borderRadiusXS: 4,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      boxShadow: t.shadowPop,
      boxShadowSecondary: t.shadowPop,
      boxShadowTertiary: "none",
      motionDurationMid: "0.2s",
      motionDurationSlow: "0.2s",
      wireframe: false,
    },
    components: {
      // 기본 버튼은 400·흰 바탕·line 테두리, 주 버튼만 600(global.css). 알약 모양은 문맥 CSS(layout.css·components.css)가 줘요
      Button: {
        primaryShadow: "none", defaultShadow: "none", dangerShadow: "none",
        borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 6,
        fontWeight: 400, paddingInline: 16, paddingInlineSM: 12,
        defaultBorderColor: t.line, defaultHoverBorderColor: t.controlLine, defaultHoverBg: t.panel, defaultHoverColor: t.ink,
        defaultActiveBg: t.sunken, defaultActiveBorderColor: t.controlLine, defaultActiveColor: t.ink,
        textHoverBg: t.panel,
        // 비활성 버튼은 panel 바탕 + 옅은 line 테두리(입력칸 테두리 controlLine보다 진하게 보이지 않게)
        borderColorDisabled: t.line,
      },
      Card: { borderRadiusLG: 12, colorBorderSecondary: t.sunken, boxShadowTertiary: "none" },
      Modal: { borderRadiusLG: 12, titleFontSize: 18 },
      // size="large" 입력칸·선택 상자도 8(전역 borderRadiusLG 12로 떨어지면 버튼 8과 모서리가 달라져요)
      Input: {
        borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 6, hoverBorderColor: t.ink2, activeBorderColor: t.brand,
        activeShadow: "none", errorActiveShadow: "none", warningActiveShadow: "none",
      },
      InputNumber: { borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 6, hoverBorderColor: t.ink2, activeBorderColor: t.brand, activeShadow: "none" },
      DatePicker: { borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 6, hoverBorderColor: t.ink2, activeBorderColor: t.brand, activeShadow: "none" },
      Select: {
        borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 6,
        optionSelectedBg: t.brandWeak, optionSelectedColor: t.brandText, optionSelectedFontWeight: 600, optionActiveBg: t.panel,
        // 상단 바 variant="filled" 선택 상자: 바탕 panel, hover sunken
        colorFillTertiary: t.panel, colorFillSecondary: t.sunken,
      },
      Menu: { itemSelectedBg: t.brandWeak, itemSelectedColor: t.brandText, itemHoverBg: t.panel, itemBorderRadius: 8 },
      Segmented: {
        trackBg: t.sunken, itemSelectedBg: t.surface, itemSelectedColor: t.ink, itemColor: t.ink2,
        itemHoverColor: t.ink, itemHoverBg: "transparent",
        borderRadius: 999, borderRadiusSM: 999, trackPadding: 4,
        boxShadowTertiary: shadowRaise,
      },
      Table: {
        // 머리는 네 모서리 둥근 회색 띠(아래 선 없음), 행 선은 sunken으로 옅게
        headerBg: t.panel, headerColor: t.ink2, headerBorderRadius: 8, headerSplitColor: "transparent",
        rowHoverBg: t.panel, rowSelectedBg: t.brandWeak, rowSelectedHoverBg: t.brandWeak, borderColor: t.sunken,
        cellPaddingBlock: density === "compact" ? 8 : 14, cellPaddingInline: 16, cellFontSize: 14,
        // App이 componentSize="middle"을 주므로 antd는 MD 토큰(기본 12/8)을 써요 → 같은 값으로 맞춤
        cellPaddingBlockMD: density === "compact" ? 8 : 14, cellPaddingInlineMD: 16,
        // 정렬한 칸 전체에 색 띠를 깔지 않아요(정렬 상태는 머리의 화살표가 보여 줌)
        bodySortBg: t.surface, headerSortActiveBg: t.panel, headerSortHoverBg: t.sunken,
      },
      // 쪽 넘김: 원형, 현재 쪽은 회색(브랜드 채움 없음)
      Pagination: { itemSize: 32, itemSizeSM: 28, itemActiveBg: t.sunken, borderRadius: 999 },
      Layout: { bodyBg: t.panel, siderBg: t.surface, headerBg: t.surface },
      Drawer: { footerPaddingBlock: 16, footerPaddingInline: 24 },
      Tabs: {
        inkBarColor: t.brand, itemSelectedColor: t.ink, itemActiveColor: t.ink, itemHoverColor: t.ink, itemColor: t.ink2,
        titleFontSize: 14, horizontalItemGutter: 24,
      },
      Tag: { defaultBg: t.panel, defaultColor: t.ink2, borderRadiusSM: 999 },
      Tooltip: { colorBgSpotlight: t.ink, borderRadius: 8 },
      Switch: { colorPrimary: t.brand, colorPrimaryHover: t.brand },
      Tree: { nodeSelectedBg: t.brandWeak, nodeHoverBg: t.panel },
      Dropdown: { controlItemBgHover: t.panel },
      Checkbox: { borderRadiusSM: 4 },
      Badge: { colorError: t.ink, textFontWeight: "700" },
      Calendar: { itemActiveBg: t.brandWeak },
    },
  };
}
