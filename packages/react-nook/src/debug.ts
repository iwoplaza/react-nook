type ExtGlobal = typeof globalThis & {
  __REACT_NOOK__DBG?: (msg: string, ...args: unknown[]) => void;
};

const extGlobal = globalThis as ExtGlobal;

// Uncomment if you want debug info
// extGlobal.__REACT_NOOK__DBG = (...args) => console.log(...args);

export function DEBUG(msg: string, ...args: unknown[]) {
  extGlobal.__REACT_NOOK__DBG?.(msg, ...args);
}
