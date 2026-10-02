// 데이터 등급·권한 `/admin/data` · A-10 · 깊이 C · 모듈 admin-settings · 소유: ara_settings 그룹(owner·admin만)
// 무엇을 어디에 두고 누가 볼 수 있는지 정리한 읽기 전용 안내입니다. 바꾸기는 계약 사항이라 CRATA 운영자와 함께 해요.
// 데이터: TenantConfig.facts.dataClasses(L0~L3) + P 영역(ARA) · 레지스트리 permissions(모듈 × 역할) · TenantConfig.permissionBundles
import { LockOutlined } from "@ant-design/icons";
import { Banner, CardGrid, PageHeader, SectionCard } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { MODULES, permissionLevel, type PermissionLevel } from "@/modules";
import type { PermissionBundle } from "@/tenants/types";
import { ResponsiveTable, ROLES, roleLabel } from "../admin-company/shared/lib";
import { YesNoList } from "../ara-home/shared/ara";

const LEVEL_LABEL: Record<PermissionLevel, string> = { manage: "관리", approve: "승인", edit: "작성", own: "본인", view: "조회", aggregate: "집계만", none: "없음" };
const LEVEL_NOTE: [PermissionLevel, string][] = [
  ["manage", "보기·만들기·고치기·지우기·승인·내보내기"],
  ["approve", "보기·만들기·고치기·승인"],
  ["edit", "보기·만들기·고치기"],
  ["own", "내 것만 보기·만들기·고치기"],
  ["view", "보기만"],
  ["aggregate", "10명 이상 집계만"],
];
const BUNDLE_LABEL: Record<PermissionBundle, { name: string; what: string }> = {
  view_prices: { name: "금액 보기", what: "단가·수주 금액·견적 금액·할인율·원재료 가격. 묶음이 없으면 금액 칸이 비어서 와요." },
};
interface ClassRow { level: string; meaning: string; examples: string[]; storage: string; aiRoute: string }

export default function Page() {
  const { tenant, enabledModules } = useWorksite();
  const classes: ClassRow[] = [
    ...tenant.facts.dataClasses,
    { level: "P", meaning: "개인 영역(ARA)", examples: ["ARA와 나눈 대화·요약", "진단 원점수", "'나만'으로 둔 카드 문장"], storage: "ARA 전용 저장소(사람마다 따로)", aiRoute: "본인이 동의한 경로만. 회사·관리자 접근 불가" },
  ];
  const modules = MODULES.filter((m) => enabledModules.has(m.id));
  const roleTitle = (code: string) => tenant.roles.find((r) => r.code === code)?.title ?? code;

  return (
    <>
      <PageHeader title="데이터 등급·권한" description="무엇을 어디에 두고, 누가 볼 수 있는지 정리했어요." />
      <Banner tone="info" title="읽기 전용">계약 사항이에요. 바꾸려면 CRATA 운영자와 함께 바꿔요.</Banner>
      <CardGrid>
        <SectionCard span={12} title="데이터 등급" caption="L2는 국내 경로가 열리기 전까지 AI 기능을 꺼 둬요. L3는 받지도 저장하지도 않아요.">
          <ResponsiveTable<ClassRow>
            ariaLabel="데이터 등급"
            rows={classes}
            rowKey={(r) => r.level}
            columns={[
              { key: "level", title: "등급", render: (r) => <span className="ws-tag">{(r.level === "L2" || r.level === "P") && <LockOutlined aria-hidden />}{r.level === "P" ? "P 영역" : r.level}</span> },
              { key: "meaning", title: "뜻", render: (r) => <b>{r.meaning}</b> },
              { key: "examples", title: "예", render: (r) => <span style={{ display: "inline-block", maxWidth: 280, whiteSpace: "normal" }}>{r.examples.join(", ") || "없음"}</span> },
              { key: "storage", title: "저장 위치", render: (r) => <span style={{ display: "inline-block", maxWidth: 220, whiteSpace: "normal" }}>{r.storage}</span> },
              { key: "ai", title: "AI 처리 경로", render: (r) => <span style={{ display: "inline-block", maxWidth: 260, whiteSpace: "normal" }}>{r.aiRoute}</span> },
            ]}
            mobile={(r) => ({
              title: <><span className="ws-tag">{r.level === "P" ? "P 영역" : r.level}</span>{r.meaning}</>,
              lines: [["예", r.examples.join(", ") || "없음"], ["저장", r.storage], ["AI 경로", r.aiRoute]],
            })}
          />
        </SectionCard>

        <SectionCard span={12} title="권한 표" caption={`켜진 모듈 ${modules.length}개 기준이에요. ARA는 두 갈래예요: 내 ARA는 누구나 본인만 쓰고, 다른 사람 것은 소유자·관리자만 10명 이상 집계로 봐요.`}>
          <div className="as-scroll-x" tabIndex={0} role="region" aria-label="권한 표, 가로로 밀어서 볼 수 있어요">
            <table className="as-perm">
              <caption>모듈 × 역할. 칸의 글자가 권한 등급이에요.</caption>
              <thead>
                <tr><th scope="col">모듈</th>{ROLES.map((r) => <th key={r} scope="col">{roleLabel(r)}</th>)}</tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m.id}>
                    <th scope="row">{m.nameKo}</th>
                    {ROLES.map((r) => {
                      const lv = permissionLevel(m.id, r);
                      // ARA는 두 갈래: 내 ARA는 누구나 본인, 다른 사람 것은 소유자·관리자만 집계(10명 이상)
                      const text = m.id === "ara-wellbeing" ? (lv === "aggregate" ? "본인 + 집계만" : lv === "own" ? "본인" : LEVEL_LABEL[lv]) : LEVEL_LABEL[lv];
                      return <td key={r} data-level={lv}>{text}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="as-subhead as-mt-lg">등급 뜻</div>
          <ul className="as-bullets">
            {LEVEL_NOTE.map(([lv, note]) => <li key={lv}><span><b>{LEVEL_LABEL[lv]}</b> · {note}</span></li>)}
          </ul>
        </SectionCard>

        <SectionCard span={6} title="권한 묶음">
          {(Object.entries(tenant.permissionBundles) as [PermissionBundle, string[]][]).map(([b, codes]) => (
            <div key={b} className="as-stack">
              <div className="as-subhead" style={{ marginBottom: 0 }}>{BUNDLE_LABEL[b]?.name ?? b}</div>
              <p className="as-text-2">{BUNDLE_LABEL[b]?.what}</p>
              <div className="as-row">
                {codes.map((c) => <span key={c} className="ws-tag">{roleTitle(c)}</span>)}
              </div>
              <p className="as-caption">역할코드 {codes.join(", ")}</p>
            </div>
          ))}
        </SectionCard>

        <SectionCard span={6} title="지키는 것">
          <YesNoList
            kind="yes"
            srPrefix={null}
            items={[
              { text: "개인을 평가하는 데 쓰지 않아요", sub: "AI 사용량·ARA 기록을 사람별 점수로 만들지 않아요." },
              { text: "10명 미만이면 집계를 숨겨요" },
              { text: "5명 미만 팀은 다른 팀과 합쳐서 세요" },
              { text: "L3 등급 정보는 받지도 저장하지도 않아요" },
              { text: "AI는 제출까지만 해요", sub: "완료는 검토자가 웹에서 승인해요." },
            ]}
          />
        </SectionCard>
      </CardGrid>
    </>
  );
}
