// 메모리 저장소 + 변경분 기록(op log) 저장(빌드 스펙 5.5.2절).
// 시드는 고정 난수로 늘 같게 만들고, 사용자가 만든 변경(create·update·delete·rpc 안의 쓰기)만 localStorage["ws:v1:{tenantId}:ops"]에
// 순서대로 남겨 시작할 때 시드 위에 다시 적용합니다. 최대 1,000건(넘으면 오래된 것부터 지움).
import type { ResourceName, Row } from "@/types/entities";
import type { SeedRegistry } from "@/data/seed";
import { readJson, writeJson, removeKey } from "@/lib/storage";

export type Op = { t: "c" | "u" | "d"; r: ResourceName; id: string; d?: Record<string, unknown> };
interface Persisted { v: number; ops: Op[] }
export type StoreListener = (resources: Set<ResourceName>) => void;

const MAX_OPS = 1000;

export class MemoryStore {
  private live = new Map<ResourceName, Row[]>();
  private pending = new Map<ResourceName, Op[]>();
  private log: Op[] = [];
  private listeners = new Set<StoreListener>();
  private batch: Set<ResourceName> | null = null;
  /** 트랜잭션 안에서 처음 건드린 리소스의 배열 사본(되돌리기용). 행 객체는 바꾸지 않고 갈아 끼우므로 얕은 사본이면 충분 */
  private snapshot: Map<ResourceName, Row[]> | null = null;
  private batchOps = 0;
  private persist: boolean;
  /** 시작할 때 사용자에게 알릴 말(버전이 바뀌어 초기화 등) */
  notices: string[] = [];

  constructor(
    private seeds: SeedRegistry,
    private opts: { key: string; seedVersion: number; persist: boolean },
  ) {
    this.persist = opts.persist;
    const saved = readJson<Persisted | null>(opts.key, null);
    if (saved && Array.isArray(saved.ops)) {
      if (saved.v !== opts.seedVersion) {
        removeKey(opts.key);
        this.notices.push("데모 데이터가 새 버전이라 처음 상태로 돌아갔어요");
      } else {
        this.log = saved.ops;
        for (const op of this.log) {
          const list = this.pending.get(op.r) ?? [];
          list.push(op);
          this.pending.set(op.r, list);
        }
      }
    }
  }

  get persistEnabled() { return this.persist; }
  get opCount() { return this.log.length; }

  setPersist(on: boolean) {
    this.persist = on;
    if (on) this.save(); else removeKey(this.opts.key);
  }

  /** 리소스 행 전체(살아 있는 배열 — 바꾸지 말고 읽기만) */
  rows(resource: ResourceName): Row[] {
    let list = this.live.get(resource);
    if (!list) {
      list = this.seeds.materialize(resource).map((r) => ({ ...r }));
      for (const op of this.pending.get(resource) ?? []) this.applyOp(list, op);
      this.pending.delete(resource);
      this.live.set(resource, list);
    }
    return list;
  }

  find(resource: ResourceName, id: string): Row | undefined {
    return this.rows(resource).find((r) => r.id === id);
  }

  insert(resource: ResourceName, row: Row): Row {
    const copy = { ...row };
    this.commit({ t: "c", r: resource, id: copy.id, d: copy });
    return copy;
  }

  patch(resource: ResourceName, id: string, patch: Record<string, unknown>): Row | undefined {
    if (!this.find(resource, id)) return undefined;
    this.commit({ t: "u", r: resource, id, d: { ...patch } });
    return this.find(resource, id);
  }

  remove(resource: ResourceName, id: string): boolean {
    if (!this.find(resource, id)) return false;
    this.commit({ t: "d", r: resource, id });
    return true;
  }

  /** 여러 쓰기를 한 트랜잭션으로(rpc): 끝까지 성공하면 한 번에 저장·알림, 도중에 오류(ctx.fail 포함)가 나면
   *  이 안에서 바꾼 행과 변경 기록을 모두 되돌리고 오류를 그대로 던집니다(반쯤 바뀐 상태가 저장되지 않게). */
  transaction<T>(fn: () => T): T {
    if (this.batch) return fn();
    this.batch = new Set();
    this.snapshot = new Map();
    this.batchOps = 0;
    try {
      const result = fn();
      const touched = this.batch;
      this.batch = null;
      if (touched.size) { this.save(); this.emit(touched); }
      return result;
    } catch (err) {
      for (const [resource, copy] of this.snapshot) {
        const live = this.live.get(resource);
        if (live) live.splice(0, live.length, ...copy);
      }
      if (this.batchOps) this.log.splice(this.log.length - this.batchOps, this.batchOps);
      throw err;
    } finally {
      this.batch = null;
      this.snapshot = null;
      this.batchOps = 0;
    }
  }

  /** 이 테넌트의 변경분을 모두 지움(데모 초기화). 새로고침해서 반영합니다 */
  clearSaved() {
    this.log = [];
    removeKey(this.opts.key);
  }

  subscribe(fn: StoreListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit(op: Op) {
    const list = this.rows(op.r);
    if (this.snapshot && !this.snapshot.has(op.r)) this.snapshot.set(op.r, list.slice());
    this.applyOp(list, op);
    this.log.push(op);
    if (this.batch) this.batchOps += 1;
    if (this.log.length > MAX_OPS) {
      this.log.splice(0, this.log.length - MAX_OPS);
      if (!this.notices.includes("저장된 변경 기록이 많아 오래된 것부터 지웠어요")) this.notices.push("저장된 변경 기록이 많아 오래된 것부터 지웠어요");
    }
    if (this.batch) this.batch.add(op.r);
    else { this.save(); this.emit(new Set([op.r])); }
  }

  private applyOp(list: Row[], op: Op) {
    const i = list.findIndex((r) => r.id === op.id);
    if (op.t === "c") {
      if (i >= 0) list[i] = { ...(op.d as Row) }; else list.push({ ...(op.d as Row) });
    } else if (op.t === "u") {
      if (i >= 0) list[i] = { ...list[i]!, ...(op.d ?? {}) } as Row;
    } else if (i >= 0) {
      list.splice(i, 1);
    }
  }

  private save() {
    if (!this.persist) return;
    writeJson(this.opts.key, { v: this.opts.seedVersion, ops: this.log } satisfies Persisted);
  }

  private emit(resources: Set<ResourceName>) {
    for (const fn of this.listeners) {
      try { fn(resources); } catch (e) { console.error(e); }
    }
  }
}
