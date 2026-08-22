type StoreEntry = { value: string; expiresAtMs: number | null };

export function makeMockRedisClient() {
  const store = new Map<string, StoreEntry>();

  function isExpired(entry: StoreEntry | undefined): boolean {
    return !!entry?.expiresAtMs && entry.expiresAtMs < Date.now();
  }

  function get(key: string): StoreEntry | undefined {
    const entry = store.get(key);
    if (isExpired(entry)) {
      store.delete(key);
      return undefined;
    }
    return entry;
  }

  return {
    ping: jest.fn(() => Promise.resolve('PONG')),
    quit: jest.fn(() => Promise.resolve(undefined)),
    on: jest.fn(),
    status: 'ready',

    incr: jest.fn((key: string) => {
      const entry = get(key);
      const next = Number(entry?.value ?? '0') + 1;
      store.set(key, {
        value: String(next),
        expiresAtMs: entry?.expiresAtMs ?? null,
      });
      return Promise.resolve(next);
    }),

    pexpire: jest.fn((key: string, ms: number) => {
      const entry = get(key);
      if (!entry) return Promise.resolve(0);
      entry.expiresAtMs = Date.now() + ms;
      return Promise.resolve(1);
    }),

    psetex: jest.fn((key: string, ms: number, value: string) => {
      store.set(key, { value, expiresAtMs: Date.now() + ms });
      return Promise.resolve('OK');
    }),

    get: jest.fn((key: string) => Promise.resolve(get(key)?.value ?? null)),

    pttl: jest.fn((key: string) => {
      const entry = get(key);
      if (!entry) return Promise.resolve(-2);
      return Promise.resolve(
        Math.max(0, (entry.expiresAtMs ?? 0) - Date.now()),
      );
    }),
  };
}

export type MockRedisClient = ReturnType<typeof makeMockRedisClient>;
