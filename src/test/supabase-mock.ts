import { vi } from 'vitest';

export type MockTables = Record<string, any[]>;

export function createMockSupabase(initial: MockTables = {}) {
  const tables: MockTables = {};
  for (const k of Object.keys(initial)) tables[k] = [...initial[k]];

  const makeResult = (data: any, error: any = null) => ({ data, error });

  function buildQuery(table: string) {
    const rows = tables[table] ? [...tables[table]] : [];
    const chain: any = {
      // 过滤/排序等方法均为 no-op，返回链式对象
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      ilike: () => chain,
      like: () => chain,
      in: () => chain,
      is: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      single: () => Promise.resolve(makeResult(rows[0] ?? null)),
      maybeSingle: () => Promise.resolve(makeResult(rows[0] ?? null)),
      // 使 `await supabase.from(x).select()...` 可解析为 { data, error }
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(makeResult(rows)).then(onFulfilled, onRejected),
    };
    return chain;
  }

  const from = (table: string) => {
    const q = buildQuery(table);
    q.select = () => q;
    q.insert = (rows: any) => {
      const arr = Array.isArray(rows) ? rows : [rows];
      const withId = arr.map((r, i) => ({ id: `mock-${table}-${i}-${Math.random()}`, ...r }));
      tables[table] = [...(tables[table] ?? []), ...withId];
      return Promise.resolve(makeResult(withId));
    };
    q.update = () => Promise.resolve(makeResult(null));
    q.delete = () => Promise.resolve(makeResult(null));
    return q;
  };

  const supabase = {
    from,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
    storage: {
      from: () => ({
        upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/x.png' } }),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }),
    },
  };

  return { supabase, tables };
}
