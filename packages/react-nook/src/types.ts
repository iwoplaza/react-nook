export type EffectCleanup = () => void;

export type Setter<T> = ((value: T) => void) &
  ((compute: (prev: T) => T) => void);

export type AnyFn = (...args: never[]) => unknown;

// biome-ignore lint/suspicious/noExplicitAny: contravariance
export interface StateStore<T = any> {
  value: T;
  setter: Setter<T>;
  destroy?: undefined;
}

export interface EffectStore {
  deps: unknown[] | undefined;
  /**
   * To be called in a useEffect
   */
  mount(): void;
  /**
   * To be called in the cleanup function of a useEffect
   */
  unmount(): void;
  /**
   * To be called in a useEffect, before mounting dirty effects
   */
  destroy(): void;
}

export interface CallbackStore<T = unknown> {
  callback: T;
  deps: unknown[] | undefined;
  destroy?: undefined;
}

export interface MemoStore<T = unknown> {
  value: T;
  deps: unknown[] | undefined;
  destroy?: undefined;
}

export type Store = StateStore | EffectStore | CallbackStore | MemoStore;

export interface Scope {
  /**
   * How nested this scope is. Used only for debugging.
   */
  depth: number;
  scopes: Map</* call id */ object, Scope>;
  children: Map</* call id */ object, Scope | Store>;

  // Since we allow (some) standard React hooks to be used within nooks, we need order tracking for them
  lastHookIndex: number;
  hookStores: Store[];

  /**
   * Reset before every render to be keys of `children`, then
   * each nook call takes itself out of this set.
   *
   * At the end of the scope, those that have not reported are
   * destroyed (cleaned-up).
   */
  scheduledDestroys: Map</* call id */ object, Scope | Store>;

  destroy(): void;
}

export interface RootScope extends Scope {
  /**
   * Set to false when an effect is considered dirty during
   * rendering, set to true when dirty effects were remounted.
   *
   * This can be used to track whether or not to reset `dirtyEffects`
   * at the beginning of a render. We don't want to reset dirtyEffects
   * if the effects that were marked last rendered didn't have a chance
   * to be flushed. We also don't want to reset `dirtyEffects` right after
   * mounting, as Strict Mode can force us to mount, unmount, then mount again.
   */
  effectsFlushed: boolean;
  dirtyEffects: Set<EffectStore>;
  /**
   * All reachable effects
   */
  effects: Set<EffectStore>;
}
