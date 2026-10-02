// 브랜드·테마 `/admin/theme` · A-08 · 깊이 A · 모듈 admin-settings · 소유: ara_settings 그룹(owner·admin만)
// 회사 색 씨앗 2개(브랜드·차트 강조)와 모노그램·밀도만 정합니다. 라운드·간격·글자 크기는 플랫폼 고정이에요.
// 미리보기는 저장 전 미리보기 영역에만 적용하고, 카드·히어로 컴포넌트를 다시 쓰지 않고 견본 블록으로 그립니다(카드 안 카드·히어로 2장 금지).
// 검사(deriveTenantTheme · checkBrand): 흰 글자/브랜드 4.5:1 미만이면 저장을 막고, 흰 바탕 글자 대비·상태색 거리는 경고. 차트 강조는 검사 통과 목록에서만.
// [저장하기] → rpc:save_theme(덮어쓰기 + 감사 기록) → 앱 전체 테마가 바로 바뀜.
import { useMemo, useState, type CSSProperties } from "react";
import { App, Button, ColorPicker, ConfigProvider, Input, Select } from "antd";
import { AppstoreOutlined, CheckSquareOutlined, HomeOutlined, UndoOutlined } from "@ant-design/icons";
import { CardGrid, PageHeader, SectionCard, SegmentedPills, SimpleBarChart, StatusTag, type Tone } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { useRpc } from "@/lib/refine";
import { deriveTenantTheme, checkBrand, type ThemeCheck } from "@/theme/derive";
import { hexToOklch } from "@/theme/color";
import { themeCssVars } from "@/theme/cssVars";
import { antdTheme } from "@/theme/antdTheme";
import { CATEGORICAL_TAIL, CHART_ACCENT_CHOICES } from "@/theme/tokens";
import type { BrandTokens, Density } from "@/tenants/types";
import { DENSITY_LABEL } from "../admin-company/shared/lib";

const ACCENT_NAMES = ["남색", "청록", "파랑"];
const HEX = /^#[0-9A-Fa-f]{6}$/;
const LEVEL: Record<ThemeCheck["level"], { tone: Tone; label: string }> = {
  pass: { tone: "good", label: "통과" },
  warn: { tone: "warning", label: "주의" },
  fail: { tone: "critical", label: "저장할 수 없어요" },
};

function tokensFor(base: BrandTokens, brand: string, accent: string): BrandTokens {
  if (brand.toUpperCase() === base.brand.toUpperCase()) {
    return accent.toUpperCase() === base.chartAccent.toUpperCase() ? base : { ...base, chartAccent: accent.toUpperCase(), chartPalette: [accent.toUpperCase(), ...CATEGORICAL_TAIL] };
  }
  return deriveTenantTheme({ brand, chartAccent: accent });
}

function Preview({ tokens, density, monogram, name }: { tokens: BrandTokens; density: Density; monogram: string; name: string }) {
  const vars = useMemo(() => {
    const all = themeCssVars(tokens);
    return Object.fromEntries(Object.entries(all).filter(([k]) => !k.startsWith("--ws-space") && !k.startsWith("--ws-radius") && !k.startsWith("--ws-w-"))) as CSSProperties;
  }, [tokens]);
  const theme = useMemo(() => antdTheme(tokens, density), [tokens, density]);
  const bars = [
    { key: "w1", label: "1주", value: 12 },
    { key: "w2", label: "2주", value: 15 },
    { key: "w3", label: "3주", value: 11 },
    { key: "w4", label: "4주", value: 17 },
    { key: "w5", label: "5주", value: 14 },
  ];
  return (
    <ConfigProvider theme={theme}>
      <div className="as-preview" style={{ ...vars, fontSize: density === "public" ? 17 : 16 }} aria-label="저장 전 미리보기" role="group">
        <div>
          <div className="as-preview__label">활성 메뉴</div>
          <div className="as-preview__nav">
            <div className="as-preview__navitem"><span className="as-mono" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 12 }} aria-hidden>{monogram}</span>{name}</div>
            <div className="as-preview__navitem" aria-current="true"><HomeOutlined aria-hidden />홈</div>
            <div className="as-preview__navitem"><CheckSquareOutlined aria-hidden />내 업무</div>
            <div className="as-preview__navitem"><AppstoreOutlined aria-hidden />문서·지식</div>
          </div>
        </div>
        <div>
          <div className="as-preview__label">브랜드 면</div>
          <div className="as-preview__surface">
            <div className="as-preview__surface-label">오늘 할 일</div>
            <div><span className="as-preview__surface-value">12</span><span className="as-preview__surface-unit">건</span></div>
          </div>
        </div>
        <div className="as-preview__box">
          <div className="as-preview__label">버튼 · 상태</div>
          <div className="as-row">
            <Button type="primary" tabIndex={-1}>승인하기</Button>
            <Button tabIndex={-1}>수정 요청하기</Button>
            <span style={{ color: "var(--ws-brand)", textDecoration: "underline", fontWeight: 600 }}>글자 링크</span>
          </div>
          <div className="as-row as-mt">
            <StatusTag tone="good" label="완료" />
            <StatusTag tone="warning" label="마감 임박" />
            <StatusTag tone="serious" label="수정 요청" />
            <StatusTag tone="critical" label="기한 지남" />
            <StatusTag tone="info" label="검토 대기" />
          </div>
        </div>
        <div className="as-preview__box">
          <div className="as-preview__label">막대 차트(예시 값)</div>
          <SimpleBarChart data={bars} unit="건" highlightKey="w5" height={140} ariaLabel="미리보기 막대 차트: 주별 처리 건수 예시" tableCaption="주별 처리 건수(예시)" />
        </div>
        <div className="as-preview__box">
          <div className="as-preview__label">표 머리</div>
          <div className="as-preview__th"><span>업무명</span><span>상태</span><span>마감</span></div>
          <div className="as-preview__th as-preview__td"><span>제안서 초안</span><span>진행 중</span><span>D-2</span></div>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default function Page() {
  const { tenant, overrides, tokens: liveTokens, density: liveDensity } = useWorksite();
  const { message } = App.useApp();
  const base = tenant.theme.tokens;
  const saved = {
    brand: (overrides.theme?.brand ?? base.brand).toUpperCase(),
    accent: (overrides.theme?.chartAccent ?? base.chartAccent).toUpperCase(),
    monogram: overrides.theme?.monogram ?? tenant.monogram,
    density: (overrides.theme?.density ?? tenant.theme.density) as Density,
  };
  const [brand, setBrand] = useState(saved.brand);
  const [brandText, setBrandText] = useState(saved.brand);
  const [accent, setAccent] = useState(saved.accent);
  const [monogram, setMonogram] = useState(saved.monogram);
  const [density, setDensity] = useState<Density>(saved.density);
  const { run, isPending } = useRpc("save_theme");

  const preview = useMemo(() => tokensFor(base, brand, accent), [base, brand, accent]);
  const checks = useMemo(() => {
    const list = checkBrand(preview);
    const h = hexToOklch(preview.brand);
    const purple = h.c > 0.05 && h.h >= 280 && h.h <= 320;
    list.push({ key: "purple", label: "흔한 보라 계열 피하기", ok: !purple, level: purple ? "warn" : "pass", note: purple ? "보라 계열은 흔한 'AI 티'로 보일 수 있어요" : "통과" });
    return list;
  }, [preview]);
  const blocked = checks.some((c) => c.level === "fail");
  const monoOk = monogram.trim().length > 0 && [...monogram.trim()].length <= 2;
  const dirty = brand !== saved.brand || accent !== saved.accent || monogram.trim() !== saved.monogram || density !== saved.density;
  const accentChoices = CHART_ACCENT_CHOICES.map((c, i) => ({ value: c.toUpperCase(), name: ACCENT_NAMES[i] ?? "강조" }));

  const applyBrand = (v: string) => {
    const up = v.toUpperCase();
    setBrandText(up);
    if (HEX.test(up)) setBrand(up);
  };
  const resetToDefault = () => {
    applyBrand(base.brand);
    setAccent(base.chartAccent.toUpperCase());
    setMonogram(tenant.monogram);
    setDensity(tenant.theme.density);
    message.info("기본값으로 돌렸어요. 저장하면 적용돼요");
  };
  const save = async () => {
    if (blocked || !monoOk) return;
    try {
      await run({ brand, chartAccent: accent, monogram: monogram.trim(), density });
      message.success("저장했어요. 회사 전체 화면에 바로 적용했어요");
    } catch { /* 토스트는 useRpc */ }
  };

  return (
    <>
      <PageHeader title="브랜드·테마" description="색 두 개만 정하면 나머지는 자동으로 맞춰요. 라운드·간격·글자 크기는 모든 회사가 같아요." />
      <CardGrid>
        <SectionCard span={5} title="설정">
          <div className="as-stack" style={{ gap: 20 }}>
            <div className="as-field">
              <label className="as-field__label" htmlFor="as-brand">브랜드 색</label>
              <div className="as-row">
                <ColorPicker value={brand} format="hex" disabledAlpha disabledFormat onChange={(_, hex) => applyBrand(hex)} />
                <Input id="as-brand" value={brandText} maxLength={7} style={{ width: 120 }} className="as-tabular" onChange={(e) => applyBrand(e.target.value)} status={HEX.test(brandText) ? undefined : "error"} />
              </div>
              <span className="as-field__hint">{HEX.test(brandText) ? "로고나 간판의 대표 색을 넣어요." : "# 다음 여섯 자리로 적어 주세요."}</span>
            </div>
            <div className="as-field">
              <label className="as-field__label" htmlFor="as-accent">차트 강조</label>
              <Select
                id="as-accent"
                value={accent}
                onChange={setAccent}
                style={{ width: "100%" }}
                options={accentChoices.map((c) => ({ value: c.value, label: <span className="as-row"><span className="as-swatch-lg" style={{ background: c.value }} aria-hidden />{c.name}<span className="as-caption">{c.value}</span></span> }))}
              />
              <span className="as-field__hint">색약 검사를 통과한 색만 고를 수 있어요.</span>
            </div>
            <div className="as-field">
              <label className="as-field__label" htmlFor="as-mono">모노그램</label>
              <div className="as-row">
                <span className="as-mono" aria-hidden style={{ background: preview.brand }}>{monogram || "?"}</span>
                <Input id="as-mono" value={monogram} maxLength={2} style={{ width: 96 }} onChange={(e) => setMonogram(e.target.value)} status={monoOk ? undefined : "error"} />
              </div>
              <span className="as-field__hint">로고 이미지 대신 글자 1~2자를 써요.</span>
            </div>
            <div className="as-field">
              <span className="as-field__label" id="as-density">밀도</span>
              <SegmentedPills<Density>
                ariaLabel="밀도"
                value={density}
                onChange={setDensity}
                options={[{ value: "comfortable", label: DENSITY_LABEL.comfortable! }, { value: "compact", label: DENSITY_LABEL.compact! }, { value: "public", label: "공공(본문 17px)" }]}
              />
            </div>
            <div className="as-field">
              <span className="as-field__label">검사</span>
              <ul className="as-check" aria-label="색 검사 결과" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {checks.map((c) => (
                  <li key={c.key}>
                    <span className="as-check__name">{c.label}{c.ratio != null && <span className="as-check__ratio"> {c.ratio.toFixed(2)}:1</span>}</span>
                    <StatusTag tone={LEVEL[c.level].tone} label={c.level === "pass" ? "통과" : c.note} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="as-row as-row--between">
              <Button icon={<UndoOutlined aria-hidden />} onClick={resetToDefault}>기본값으로</Button>
              <Button type="primary" loading={isPending} disabled={blocked || !monoOk || !dirty} onClick={() => void save()}>저장하기</Button>
            </div>
            {blocked && <p className="as-caption" role="alert">흰 글자 대비가 4.5:1보다 낮아 저장할 수 없어요. 더 진한 색을 골라 주세요.</p>}
          </div>
        </SectionCard>
        <SectionCard span={7} title="미리보기" caption={`저장 전 미리보기예요. 지금 적용된 색은 ${liveTokens.brand} · ${DENSITY_LABEL[liveDensity]} 밀도예요.`}>
          <Preview tokens={preview} density={density} monogram={monogram || "?"} name={tenant.displayName} />
        </SectionCard>
      </CardGrid>
    </>
  );
}
