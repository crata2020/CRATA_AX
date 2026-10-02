// 검색 `/search` · H-04 · 깊이 A · 모듈 search · 소유: home 그룹
// 사람 → 프로젝트 → 거래처 → 업무 → 회의 → 문서 → 지식·용어 → 공지 (TR: 품목 · LOT · 클레임) 순서. 권한 안의 행만(sel:search가 공급자 경로를 거침).
// 그룹당 5건, [더보기]로 20건(?more=<그룹>). 검색어는 ?q=. 일치 글자는 굵게. 최근 검색어 5개는 이 브라우저에만 남깁니다.
import "../home/lib/home.css";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { App, Button, Input, Skeleton } from "antd";
import { MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { DdayBadge, EmptyState, PageHeader, SectionCard, StatusTag } from "@/components";
import { useWorksite } from "@/app/TenantBoundary";
import { usePageReady } from "@/app/pageReady";
import { useSel } from "../home/lib/useSel";
import { useUrlParam } from "@/lib/url";
import { initialsOf, formatNumber } from "@/lib/format";
import type { SearchGroup, SearchItem, SearchResult } from "../home/lib/types";
import { EXAMPLE_QUERIES, Highlight, clearRecentSearches, recentSearches, rememberSearch } from "./Highlight";

function CopyBtn({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  const { message } = App.useApp();
  return (
    <Button
      size="small"
      icon={icon}
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); message.success(`${label}를 복사했어요`); } catch { message.error("복사하지 못했어요. 직접 선택해서 복사해 주세요"); }
      }}
      aria-label={`${label} 복사: ${value}`}
    >
      {label === "메일 주소" ? "메일 복사" : "전화 복사"}
    </Button>
  );
}

function ResultRow({ item, q }: { item: SearchItem; q: string }) {
  if (item.person) {
    return (
      <div className="wh-person">
        <div className="wh-person__main">
          <Link className="wh-person__name" to={item.to}>
            <span className="ws-avatar" aria-hidden>{initialsOf(item.title)}</span>
            <span><Highlight text={item.title} q={q} /></span>
          </Link>
          {item.subtitle && <span className="wh-result__sub">{item.subtitle}</span>}
        </div>
        <div className="wh-person__copy">
          {item.person.email && <CopyBtn value={item.person.email} label="메일 주소" icon={<MailOutlined aria-hidden />} />}
          {item.person.phone && <CopyBtn value={item.person.phone} label="업무 전화" icon={<PhoneOutlined aria-hidden />} />}
        </div>
      </div>
    );
  }
  return (
    <Link className="wh-result" to={item.to}>
      <span className="wh-result__main">
        <span className="wh-result__title"><Highlight text={item.title} q={q} /></span>
        {item.subtitle && <span className="wh-result__sub">{item.subtitle}</span>}
      </span>
      {(item.status || item.dday) && (
        <span className="wh-result__trail">
          {item.status && <StatusTag tone={item.status.tone} label={item.status.label} />}
          {item.dday && <DdayBadge date={item.dday} />}
        </span>
      )}
    </Link>
  );
}

function GroupCard({ g, q, expanded, onMore }: { g: SearchGroup; q: string; expanded: boolean; onMore: (key: string | null) => void }) {
  return (
    <SectionCard title={`${g.label}(${formatNumber(g.total)})`} demo={false} ariaLabel={`${g.label} 검색 결과 ${g.total}건`}>
      <ul className="ws-list">
        {g.items.map((it) => <li key={`${g.key}-${it.id}`}><ResultRow item={it} q={q} /></li>)}
      </ul>
      {(g.total > g.items.length || expanded) && (
        <div className="wh-more">
          {expanded ? (
            <>
              {g.total > g.items.length && <span className="ws-t-caption" style={{ marginRight: "auto", alignSelf: "center" }}>{formatNumber(g.items.length)}건까지 보여요. 검색어를 더 자세히 적어 보세요.</span>}
              <Button onClick={() => onMore(null)}>접기</Button>
            </>
          ) : (
            <Button onClick={() => onMore(g.key)}>{g.label} 더보기</Button>
          )}
        </div>
      )}
    </SectionCard>
  );
}

export default function SearchPage() {
  const { tenant } = useWorksite();
  const [q, setQ] = useUrlParam("q");
  const [more, setMore] = useUrlParam("more");
  const [text, setText] = useState(q);
  const [recent, setRecent] = useState<string[]>(recentSearches);
  useEffect(() => { setText(q); }, [q]);

  const query = q.trim();
  const res = useSel<SearchResult>("search", { q: query, limit: 5, group: more || undefined }, { enabled: query.length > 0 });
  usePageReady(!query || !res.isLoading);

  const run = (v: string) => {
    const t = v.trim();
    setMore(null);
    setQ(t || null);
    if (t) { rememberSearch(t); setRecent(recentSearches()); }
  };
  const examples = EXAMPLE_QUERIES[tenant.slug] ?? [];

  return (
    <>
      <PageHeader title="검색" description="사람, 프로젝트, 업무, 회의, 문서를 한곳에서 찾아요. 볼 수 있는 것만 나와요." />
      <div className="wh-searchbox" role="search">
        <Input.Search
          autoFocus
          size="large"
          allowClear
          value={text}
          onChange={(e) => setText(e.target.value)}
          onSearch={run}
          placeholder={tenant.packs.includes("manufacturing") ? "이름, 업무, 품번, LOT, 클레임 번호로 찾아요" : "이름, 프로젝트, 업무, 회의, 문서로 찾아요"}
          aria-label="검색어"
          enterButton="검색"
          maxLength={60}
        />
      </div>

      {!query ? (
        <div className="ws-stack">
          {recent.length > 0 && (
            <SectionCard title="최근 검색어" demo={false} actions={<Button type="text" size="small" onClick={() => { clearRecentSearches(); setRecent([]); }}>모두 지우기</Button>}>
              <div className="wh-chiprow">
                {recent.map((r) => <button key={r} type="button" className="ws-chip" onClick={() => run(r)}>{r}</button>)}
              </div>
            </SectionCard>
          )}
          <SectionCard title="이렇게 찾아 보세요" demo={false}>
            <div className="wh-chiprow">
              {examples.map((r) => <button key={r} type="button" className="ws-chip" onClick={() => run(r)}>{r}</button>)}
            </div>
            <p className="ws-card__caption">어디서든 Ctrl K(맥은 Cmd K)를 누르면 바로 찾을 수 있어요.</p>
          </SectionCard>
        </div>
      ) : res.isLoading ? (
        <SectionCard ariaLabel="검색 중"><Skeleton active title={false} paragraph={{ rows: 5 }} /></SectionCard>
      ) : res.isError ? (
        <EmptyState kind="error" action={{ label: "다시 시도", onClick: () => void res.refetch() }} />
      ) : !res.data || res.data.groups.length === 0 ? (
        <EmptyState kind="empty" title={`‘${query}’에 맞는 결과가 없어요`} description="철자를 확인하거나 더 짧게 검색해 보세요." />
      ) : (
        <div className={`ws-stack${res.isFetching ? " is-refetching" : ""}`}>
          <p className="ws-t-caption" aria-live="polite">‘{query}’ 검색 결과 {formatNumber(res.data.total)}건</p>
          {res.data.groups.map((g) => <GroupCard key={g.key} g={g} q={query} expanded={more === g.key} onMore={(k) => setMore(k)} />)}
        </div>
      )}
    </>
  );
}
