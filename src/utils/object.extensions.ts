// Extend Object prototype with utility method
Object.defineProperty(Object.prototype, 'removeUndefined', {
  value: function <T extends object>(this: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(this).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  },
  writable: true,
  configurable: true,
  enumerable: false, // Don't show up in for...in loops
});

// TypeScript declaration
declare global {
  interface Object {
    removeUndefined<T extends object>(this: T): Partial<T>;
  }
}

export {};
