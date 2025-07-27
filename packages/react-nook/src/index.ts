import { useCallback, useState } from 'react';
import type { Scope, Setter } from './types';

let parentScope: Scope | undefined;
let RERENDER: ((...args: never[]) => unknown) | undefined;

function createScope(): Scope {
  return {
    stateStores: new Map(),
    nested: new Map(),
    stateStoresToUnmount: new Set(),
    nestedToUnmount: new Set(),
  };
}

function setupScope<T>(cb: () => T): T {
  if (!parentScope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }

  parentScope.stateStoresToUnmount = new Set(parentScope.stateStores.keys());
  parentScope.nestedToUnmount = new Set(parentScope.nested.keys());

  const result = cb();

  // Deleting all stores that have not checked in
  for (const callId of parentScope.stateStoresToUnmount) {
    parentScope.stateStores.delete(callId);
  }
  for (const callId of parentScope.nestedToUnmount) {
    parentScope.nested.delete(callId);
  }

  return result;
}

function useTopLevelScope<T>(cb: () => T): T {
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [, rerender] = useState(0);
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  RERENDER = useCallback(() => {
    rerender((prev) => 1 - prev);
  }, []);

  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [scope] = useState(createScope);
  parentScope = scope;

  const result = setupScope(cb);

  // Cleanup
  parentScope = undefined;
  RERENDER = undefined;

  return result;
}

function withScope<T>(callId: object, callback: () => T): T {
  if (!parentScope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }
  let scope = parentScope.nested.get(callId);
  if (!scope) {
    scope = createScope();
    parentScope.nested.set(callId, scope);
  } else {
    // Please don't delete me during this render
    parentScope.nestedToUnmount.delete(callId);
  }
  const prevParentScope = parentScope;
  parentScope = scope;
  const result = setupScope(callback);
  parentScope = prevParentScope;
  return result;
}

function askState<T>(callId: object, initial: T): readonly [T, Setter<T>] {
  const rerender = RERENDER;

  if (!parentScope) {
    throw new Error('Invalid state');
  }

  let store = parentScope.stateStores.get(callId);
  if (!store) {
    const newStore = {
      value: initial,
      setter: (newValue: T) => {
        newStore.value = newValue;
        rerender?.();
      },
    };
    store = newStore;
    parentScope.stateStores.set(callId, newStore);
  } else {
    // Please don't delete me during this render
    parentScope.stateStoresToUnmount.delete(callId);
  }

  return [store.value, store.setter];
}

export const nookState =
  (strings: TemplateStringsArray) =>
  <T>(initial: T) =>
    askState(strings, initial);

interface Nook<TArgs extends unknown[], TReturn> {
  (strings: TemplateStringsArray): (...args: TArgs) => TReturn;
  (...args: TArgs): TReturn;
}

export const nook = <TArgs extends unknown[], TReturn>(
  def: (...args: TArgs) => TReturn,
): Nook<TArgs, TReturn> => {
  return ((maybeStrings: unknown) => {
    if (Array.isArray(maybeStrings)) {
      // Calling it as a nook inside another nook, with the foo``() syntax
      // ---

      return (...args: TArgs) =>
        withScope(maybeStrings, () => {
          return def(...args);
        });
    }

    // Calling it as a component
    // ---

    // @ts-ignore: let's assume that if not called using the foo``() syntax, it's being called as a component
    // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
    return useTopLevelScope(() => def(maybeStrings));
  }) as Nook<TArgs, TReturn>;
};
