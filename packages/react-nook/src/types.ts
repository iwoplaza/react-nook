export type Setter<T> = ((value: T) => void) &
  ((compute: (prev: T) => T) => void);

export type EffectCleanup = () => void;

export type AnyFn = (...args: never[]) => unknown;

// biome-ignore lint/suspicious/noExplicitAny: contravariance
export interface StateStore<T = any> {
  value: T;
  setter: Setter<T>;
  unmount?: undefined;
}

export interface EffectStore {
  deps: unknown[] | undefined;
  cleanup: EffectCleanup | undefined;
  unmount(): void;
}

export interface CallbackStore<T = unknown> {
  callback: T;
  deps: unknown[] | undefined;
  unmount?: undefined;
}

export type Store = StateStore | EffectStore | CallbackStore;

export interface Scope {
  scopes: Map</* call id */ object, Scope>;
  children: Map</* call id */ object, Scope | Store>;

  // Since we allow (some) standard React hooks to be used within nooks, we need order tracking for them
  lastHookIndex: number;
  hookStores: Store[];
  effectsToFlush: (() => void)[];

  /**
   * Reset before every render to be keys of `stores`, then
   * each custom nook call takes itself out of this set.
   *
   * At the end of the scope, those that have not reported are
   * unmounted (cleaned-up).
   */
  scheduledUnmounts: Map</* call id */ object, Scope | Store>;

  /**
   * This should call all scheduled unmounts, but not remove the scheduled mounts! That is because
   * React likes to run effects twice to test for side-effects.
   */
  unmount(): void;
}
