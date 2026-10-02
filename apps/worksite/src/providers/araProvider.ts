// ARA 공급자(P 영역, 빌드 스펙 5.9절). 회사 공급자와 다른 인스턴스·다른 저장 키(ws:v1:{tenantId}:ara:{memberId}).
// 현재 페르소나 본인 데이터만 있습니다. 관리자로 바꿔도 남의 ARA를 볼 길이 없습니다. 회사 감사 로그에 남기지 않습니다.
// 쓰는 법: useList({ resource: "ara_card_sentences", dataProviderName: "ara" })
// 동작: custom({ url: "rpc:clear_messages", dataProviderName: "ara" }) 대화 지우기 · "rpc:wipe" 내 ARA 데이터 모두 지우기(동의 철회)
import type { BaseRecord, CrudFilter, CrudSort, DataProvider } from "@refinedev/core";
import type { TenantConfig } from "@/tenants/types";
import type { AraResourceName, AraRowMap } from "@/types/entities";
import type { AraSeed, Persona } from "@/data/seed/types";
import type { Clock } from "@/lib/clock";
import { addDays, kstIso } from "@/lib/clock";
import { createRng } from "@/lib/rng";
import { araKey, readJson, removeKey, writeJson } from "@/lib/storage";
import { applyFilters, applySorters, ProviderError } from "./filters";

type AnyAraRow = AraRowMap[AraResourceName] & Record<string, unknown>;
type Data = Record<AraResourceName, AnyAraRow[]>;
const RESOURCES: AraResourceName[] = ["ara_profile", "ara_card_sentences", "ara_messages"];
const PREFIX: Record<AraResourceName, string> = { ara_profile: "profile", ara_card_sentences: "acs", ara_messages: "am" };

export interface AraProviderOptions {
  tenant: TenantConfig;
  persona: Persona;
  clock: Clock;
  seed?: AraSeed;
  persist: boolean;
  latencyMs: [number, number];
}

/** ARA 공급자 + 저장 켜기/끄기(사용자 메뉴 '변경 내용 이 브라우저에 저장'과 함께 움직임) */
export type AraDataProvider = DataProvider & { setPersist: (on: boolean) => void };

export function createAraProvider(o: AraProviderOptions): AraDataProvider {
  const key = araKey(o.tenant.tenantId, o.persona.memberId);
  const me = o.persona.memberId;
  let seq = 0;

  const fromSeed = (): Data => {
    const out: Data = { ara_profile: [], ara_card_sentences: [], ara_messages: [] };
    if (!o.seed) return out;
    const base = o.seed({
      tenant: o.tenant, persona: o.persona, today: o.clock.today,
      rng: (s) => createRng(`${o.tenant.slug}:ara:${me}:${s}`),
      at: (n, time = "09:00") => kstIso(addDays(o.clock.today, n), time),
    });
    const t = kstIso(o.clock.today, "08:00");
    for (const r of RESOURCES) {
      out[r] = ((base[r] ?? []) as Record<string, unknown>[]).map((row) => ({ created_at: t, updated_at: t, ...row, member_id: me }) as AnyAraRow);
    }
    return out;
  };

  let persist = o.persist;
  let data: Data = (persist ? readJson<Data | null>(key, null) : null) ?? fromSeed();
  const save = () => { if (persist) writeJson(key, data); };
  /** 끄면 지금까지 이 브라우저에 남은 ARA 기록도 지워요(개인 영역이라 '저장 안 함'이 실제로 저장하지 않아야 해요) */
  const setPersist = (on: boolean) => {
    persist = on;
    if (on) save(); else removeKey(key);
  };

  const delay = async () => {
    const [lo, hi] = o.latencyMs;
    if (hi > 0) await new Promise((r) => setTimeout(r, lo + Math.random() * (hi - lo)));
  };
  const res = (resource: string): AraResourceName => {
    if (!RESOURCES.includes(resource as AraResourceName)) throw new ProviderError(400, `ARA 공급자에 없는 리소스예요: ${resource}`);
    return resource as AraResourceName;
  };
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));

  return {
    setPersist,
    getApiUrl: () => "memory://ara",
    getList: async <TData extends BaseRecord = BaseRecord>({ resource, filters, sorters, pagination }: { resource: string; filters?: CrudFilter[]; sorters?: CrudSort[]; pagination?: { currentPage?: number; pageSize?: number; mode?: string } }) => {
      await delay();
      const rows = applySorters(applyFilters(data[res(resource)], filters), sorters);
      const mode = pagination?.mode ?? "off";
      const size = pagination?.pageSize ?? 50;
      const page = mode === "server" ? rows.slice(((pagination?.currentPage ?? 1) - 1) * size, (pagination?.currentPage ?? 1) * size) : rows;
      return { data: copy(page) as unknown as TData[], total: rows.length };
    },
    getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id }: { resource: string; id: string | number }) => {
      await delay();
      const row = data[res(resource)].find((r) => r.id === String(id));
      if (!row) throw new ProviderError(404, "찾는 항목이 없어요");
      return { data: copy(row) as unknown as TData };
    },
    getMany: async <TData extends BaseRecord = BaseRecord>({ resource, ids }: { resource: string; ids: (string | number)[] }) => {
      await delay();
      return { data: copy(data[res(resource)].filter((r) => ids.map(String).includes(r.id))) as unknown as TData[] };
    },
    create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, variables }: { resource: string; variables: TVariables }) => {
      await delay();
      const r = res(resource);
      seq += 1;
      const now = o.clock.now();
      const input = variables as Record<string, unknown>;
      const row = { ...input, id: (input.id as string) ?? `${PREFIX[r]}-${o.clock.nowMs().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`, member_id: me, created_at: now, updated_at: now } as AnyAraRow;
      data[r] = [...data[r].filter((x) => x.id !== row.id), row];
      save();
      return { data: copy(row) as unknown as TData };
    },
    update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id, variables }: { resource: string; id: string | number; variables: TVariables }) => {
      await delay();
      const r = res(resource);
      const i = data[r].findIndex((x) => x.id === String(id));
      if (i < 0) throw new ProviderError(404, "찾는 항목이 없어요");
      const row = { ...data[r][i]!, ...(variables as Record<string, unknown>), id: String(id), member_id: me, updated_at: o.clock.now() } as AnyAraRow;
      data[r] = data[r].map((x, j) => (j === i ? row : x));
      save();
      return { data: copy(row) as unknown as TData };
    },
    deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id }: { resource: string; id: string | number; variables?: TVariables }) => {
      await delay();
      const r = res(resource);
      const row = data[r].find((x) => x.id === String(id));
      if (!row) throw new ProviderError(404, "찾는 항목이 없어요");
      data[r] = data[r].filter((x) => x.id !== String(id));
      save();
      return { data: copy(row) as unknown as TData };
    },
    custom: async <TData extends BaseRecord = BaseRecord>({ url }: { url: string }) => {
      await delay();
      if (url === "rpc:clear_messages") { data.ara_messages = []; save(); return { data: { ok: true } as unknown as TData }; }
      if (url === "rpc:wipe") { data = { ara_profile: [], ara_card_sentences: [], ara_messages: [] }; save(); return { data: { ok: true } as unknown as TData }; }
      throw new ProviderError(400, `ARA 공급자에 없는 동작이에요: ${url}`);
    },
  } as AraDataProvider;
}
