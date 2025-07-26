import React, { type ReactNode, useCallback, useState } from 'react';

const ReactSecretInternals =
  //@ts-ignore
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  //@ts-ignore
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

type Setter<T> = (value: T) => void;

interface StateStore<T> {
  value: T;
  setter: Setter<T>;
}

interface Scope {
  stateStores: Map</* call id */ object, StateStore<any>>;
  nested: Map</* call id */ object, Scope>;
}

const topLevelScopes = new WeakMap</* fiber node */ object, Scope>();
let parentScope: Scope | undefined;

const getOwnerComponent = () => {
  const fiberNode = ReactSecretInternals.A?.getOwner();
  if (topLevelScopes.has(fiberNode.alternate)) {
    return fiberNode.alternate;
  }
  return fiberNode;
};

let RERENDER: ((...args: never[]) => unknown) | undefined;
function useHuuk() {
  // Required to force re-renders 🫠
  const [, rerender] = useState(0);
  RERENDER = useCallback(() => {
    rerender((prev) => 1 - prev);
  }, []);
  const ownerComponent = getOwnerComponent();
  let scope = topLevelScopes.get(ownerComponent);
  if (!scope) {
    console.log('Creating a top-level scope');
    scope = {
      stateStores: new Map(),
      nested: new Map(),
    } satisfies Scope;
    topLevelScopes.set(ownerComponent, scope);
  }
  parentScope = scope;

  return () => {
    // Cleanup
    parentScope = undefined;
    RERENDER = undefined;
  };
}

function withScope<T>(callId: object, callback: () => T): T {
  if (!parentScope) {
    throw new Error('Invalid state');
  }
  let scope = parentScope.nested.get(callId);
  if (!scope) {
    console.log('Creating a nested scope');
    scope = {
      stateStores: new Map(),
      nested: new Map(),
    } satisfies Scope;
    parentScope.nested.set(callId, scope);
  }
  const prevParentScope = parentScope;
  parentScope = scope;
  const result = callback();
  parentScope = prevParentScope;
  return result;
}

function askState<T>(callId: object, initial: T): readonly [T, Setter<T>] {
  let rerender = RERENDER;

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
        console.log(`Updating to ${newValue}`);
      },
    };
    store = newStore;
    parentScope.stateStores.set(callId, newStore);
  }

  return [store.value, store.setter];
}

// const huuk = {
//   wrap: () => {},
//   use: useHuuk,
//   state(strings: TemplateStringsArray) {
//     function temp<T>(initial: T) {
//       return askState(strings, initial);
//     }
//     return temp;
//   },
// };

interface Huuk1 {
  state: <T>(
    strings: TemplateStringsArray,
    initial: T,
  ) => readonly [T, Setter<T>];
}

interface Huuk2 {
  state: (
    strings: TemplateStringsArray,
  ) => <T>(initial: T) => readonly [T, Setter<T>];
}

const huukInstance: Huuk2 = {
  state:
    (strings: TemplateStringsArray) =>
    <T>(initial: T) =>
      askState(strings, initial),
};

export const nookComponent = <TProps extends Record<string, unknown>>(
  Component: (huuk: Huuk2, props: TProps) => ReactNode,
) => {
  return (props: TProps) => {
    const dehuuk = useHuuk();
    const result = Component(huukInstance, props);
    dehuuk();
    return result;
  };
};

interface Nook<TArgs extends unknown[], TReturn> {
  (strings: TemplateStringsArray): (...args: TArgs) => TReturn;
  (...args: TArgs): TReturn;
}

export const nook = <TArgs extends unknown[], TReturn>(
  def: (huuk: Huuk2, ...args: TArgs) => TReturn,
): Nook<TArgs, TReturn> => {
  return ((maybeStrings: unknown) => {
    if (Array.isArray(maybeStrings)) {
      // Calling it as a nook inside a component or nook

      return (...args: TArgs) =>
        withScope(maybeStrings, () => {
          return def(huukInstance, ...args);
        });
    }

    // Calling it as a component
    // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
    const dehuuk = useHuuk();
    const result = def(huukInstance, ...([maybeStrings] as TArgs));
    dehuuk();
    return result;
  }) as Nook<TArgs, TReturn>;
};
