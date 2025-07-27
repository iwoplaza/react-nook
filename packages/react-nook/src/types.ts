export type Setter<T> = ((value: T) => void) &
  ((compute: (prev: T) => T) => void);

export type EffectCleanup = () => void;

// biome-ignore lint/suspicious/noExplicitAny: contravariance
export interface StateStore<T = any> {
  value: T;
  setter: Setter<T>;
  destroy?: undefined;
}

export interface EffectStore {
  deps: unknown[] | undefined;
  cleanup: EffectCleanup | undefined;
  destroy(): void;
}

export interface CallbackStore<T = unknown> {
  value: T;
  deps: unknown[] | undefined;
  destroy?: undefined;
}

export type Store = StateStore | EffectStore | CallbackStore;

export interface Scope {
  stores: Map</* call id */ object, Scope | Store>;
  // Since we allow (some) standard React hooks to be used within nooks, we need order tracking for them
  lastHookIndex: number;
  hookStores: Store[];

  /**
   * Reset before every render to be keys of `stores`, then
   * each custom nook call takes itself out of this set.
   *
   * At the end of the scope, those that have not reported are
   * unmounted (cleaned-up).
   */
  scheduledUnmounts: Map</* call id */ object, Scope | Store>;

  destroy(): void;
  // flushEffects(): void;
  // unmount(): void;
}
