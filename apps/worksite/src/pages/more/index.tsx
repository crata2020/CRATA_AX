// 전체 메뉴 `/more` · H-05 · 깊이 B · 모듈 home-dashboard · 소유: home 그룹
// 모바일 하단 탭 '전체': 사용자 영역 + 메뉴 전체(buildNav 결과 그대로) + 데모 전환·저장·초기화.
// 768px 이상에서 열면 RouteFrame이 홈으로 보냅니다.
import "../home/lib/home.css";
import { Link } from "react-router";
import { Button, Switch } from "antd";
import { LockOutlined, RightOutlined } from "@ant-design/icons";
import { CountBadge, ListRows, PageHeader, PersonChip, SectionCard, useConfirm, type ListRowProps } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { labelOf } from "@/lib/status";
import { NavIcon } from "@/layout/icons";
import { AiStatusChip, PersonaSwitcher, TenantSwitcher } from "@/layout/TopBar";
import { useNavBadges } from "@/layout/useNavBadges";
import { NAV_BADGE_LABEL, type NavItem } from "@/modules";

function NavGroup({ item, badges }: { item: NavItem; badges: ReturnType<typeof useNavBadges> }) {
  const rows: (ListRowProps & { key: string; section?: string })[] = item.children.length
    ? item.children.map((c) => ({
      key: c.key,
      title: c.label,
      to: c.to,
      section: c.section,
      trailing: <>{c.badgeKey && <CountBadge count={badges[c.badgeKey]} label={NAV_BADGE_LABEL[c.badgeKey]} />}<RightOutlined aria-hidden style={{ fontSize: 12 }} /></>,
    }))
    : [{ key: item.key, title: item.private ? `${item.label} · ${item.caption ? `${item.caption} · ` : ""}나만 보여요` : `${item.label} 열기`, to: item.to, trailing: <RightOutlined aria-hidden style={{ fontSize: 12 }} /> }];
  // 소제목([현장] 등)마다 끊어서 그림
  const chunks: { section?: string; rows: typeof rows }[] = [];
  for (const r of rows) {
    if (!chunks.length || r.section) chunks.push({ section: r.section, rows: [] });
    chunks[chunks.length - 1]!.rows.push(r);
  }
  return (
    <section className="wh-navgroup" aria-label={item.label}>
      <h3 className="wh-navgroup__title">
        <NavIcon name={item.icon} />
        {item.label}
        {item.private && <LockOutlined aria-label="나만 보여요" />}
      </h3>
      {chunks.map((ch, i) => (
        <div key={i}>
          {ch.section && <p className="wh-navgroup__section">{ch.section}</p>}
          <ListRows rows={ch.rows.map(({ section: _s, ...r }) => r)} />
        </div>
      ))}
    </section>
  );
}

export default function MorePage() {
  const { persona, role, tenant, nav, persist, setPersist, resetDemo } = useWorksite();
  const badges = useNavBadges();
  const confirm = useConfirm();
  usePageReady(true);

  const reset = async () => {
    const ok = await confirm({
      title: "데모 데이터를 처음 상태로 돌릴까요?",
      content: "이 회사의 데모 데이터를 처음 상태로 돌려요. 내가 바꾼 내용이 모두 사라져요.",
      okText: "데모 초기화",
      danger: true,
    });
    if (ok) await resetDemo();
  };

  return (
    <>
      <PageHeader title="전체" description="모든 메뉴와 내 계정, 데모 설정을 한곳에 모았어요." />
      <div className="ws-stack">
        <SectionCard title="나" demo={false}>
          <div className="wh-me">
            <PersonChip memberId={persona.memberId} showUnit />
            <span className="wh-me__line">{role.title} · {labelOf("platform_role", persona.role)} · {tenant.displayName}</span>
            <div><AiStatusChip /></div>
            <div className="ws-row">
              <Link className="wh-linkbtn" to="/me">내 정보</Link>
              <Link className="wh-linkbtn" to="/me/notifications">알림 설정</Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="메뉴" demo={false}>
          {nav.filter((item) => item.key !== "home").map((item) => <NavGroup key={item.key} item={item} badges={badges} />)}
        </SectionCard>

        <SectionCard title="데모" demo={false} caption="모든 숫자와 사람은 예시예요. 실제 회사 값이 아니에요.">
          <div className="wh-field">
            <span className="wh-field__label">회사</span>
            <TenantSwitcher block />
          </div>
          <div className="wh-field" style={{ marginTop: 16 }}>
            <span className="wh-field__label">누구로 보기</span>
            <PersonaSwitcher block />
          </div>
          <div className="wh-setrow" style={{ marginTop: 8 }}>
            <span className="ws-t-body">변경 내용 이 브라우저에 저장</span>
            <Switch checked={persist} onChange={setPersist} aria-label="변경 내용 이 브라우저에 저장" />
          </div>
          <div className="ws-row wh-demo-actions" style={{ marginTop: 8 }}>
            <Button danger onClick={() => void reset()}>데모 초기화</Button>
            <Link className="wh-linkbtn" to="/login">데모 시작 화면</Link>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
