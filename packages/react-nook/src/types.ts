export type Setter<T> = (value: T) => void;

export interface StateStore<T> {
  value: T;
  setter: Setter<T>;
}

export interface Scope {
  // biome-ignore lint/suspicious/noExplicitAny: contravariance
  stateStores: Map</* call id */ object, StateStore<any>>;
  nested: Map</* call id */ object, Scope>;

  /**
   * Reset before every render to be keys of `stateStores`, then
   * each nookState takes itself out of this set.
   *
   * At the end of the scope, those that have not reported are
   * unmounted (cleaned-up).
   */
  stateStoresToUnmount: Set</* call id */ object>;
  /**
   * Reset before every render to be keys of `nested`, then
   * each custom nook call takes itself out of this set.
   *
   * At the end of the scope, those that have not reported are
   * unmounted (cleaned-up).
   */
  nestedToUnmount: Set</* call id */ object>;
}
