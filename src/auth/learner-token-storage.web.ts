export const learnerTokenStorage = {
  getItem: async (name: string) => globalThis.localStorage?.getItem(name) ?? null,
  setItem: async (name: string, value: string) => globalThis.localStorage?.setItem(name, value),
  removeItem: async (name: string) => globalThis.localStorage?.removeItem(name),
};
