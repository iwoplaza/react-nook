export type Setter<T> = ((value: T) => void) &
  ((compute: (prev: T) => T) => void);

export type EffectCleanup = () => void;

export interface StateStore<T> {
  value: T;
  setter: Setter<T>;
}

export interface EffectStore {
  deps: unknown[] | undefined;
  cleanup: EffectCleanup | undefined;
}

export interface Scope {
  nested: Map</* call id */ object, Scope>;
  // biome-ignore lint/suspicious/noExplicitAny: contravariance
  stateStores: Map</* call id */ object, StateStore<any>>;
  effectStores: Map</* call id */ object, EffectStore>;

  /**
   * Reset before every render to be keys of `nested`, then
   * each custom nook call takes itself out of this set.
   *
   * At the end of the scope, those that have not reported are
   * unmounted (cleaned-up).
   */
  nestedToUnmount: Set</* call id */ object>;
  /**
   * Reset before every render to be keys of `stateStores`, then
   * each nookState takes itself out of this set.
   *
   * At the end of the scope, those that have not reported are
   * unmounted (cleaned-up).
   */
  stateStoresToUnmount: Set</* call id */ object>;
  /**
   * Reset before every render to be keys of `effectStores`, then
   * each nookEffect takes itself out of this set.
   *
   * At the end of the scope, those that have not reported are
   * unmounted (cleaned-up).
   */
  effectStoresToUnmount: Set</* call id */ object>;
}
