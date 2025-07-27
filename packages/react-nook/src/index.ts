import { type ReactNode, useCallback, useState } from 'react';

type Setter<T> = (value: T) => void;

interface StateStore<T> {
  value: T;
  setter: Setter<T>;
}

interface Scope {
  // biome-ignore lint/suspicious/noExplicitAny: contravariance
  stateStores: Map</* call id */ object, StateStore<any>>;
  nested: Map</* call id */ object, Scope>;
}

let parentScope: Scope | undefined;

let RERENDER: ((...args: never[]) => unknown) | undefined;

function createScope(): Scope {
  return {
    stateStores: new Map(),
    nested: new Map(),
  };
}

function useTopLevelScope() {
  // Required to force re-renders 🫠
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [, rerender] = useState(0);
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  RERENDER = useCallback(() => {
    rerender((prev) => 1 - prev);
  }, []);
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [scope] = useState(createScope);
  parentScope = scope;

  return () => {
    // Cleanup
    parentScope = undefined;
    RERENDER = undefined;
  };
}

function withScope<T>(callId: object, callback: () => T): T {
  if (!parentScope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }
  let scope = parentScope.nested.get(callId);
  if (!scope) {
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
  }

  return [store.value, store.setter];
}

// const huuk = {
//   wrap: () => {},
//   use: useTopLevelScope,
//   state(strings: TemplateStringsArray) {
//     function temp<T>(initial: T) {
//       return askState(strings, initial);
//     }
//     return temp;
//   },
// };

interface NookContext {
  state: (
    strings: TemplateStringsArray,
  ) => <T>(initial: T) => readonly [T, Setter<T>];
}

export const stateNook =
  (strings: TemplateStringsArray) =>
  <T>(initial: T) =>
    askState(strings, initial);

export const $state = stateNook;
export const nookState = stateNook;

const huukInstance: NookContext = {
  state: stateNook,
};

export const nookComponent = <TProps extends Record<string, unknown>>(
  Component: (ctx: NookContext, props: TProps) => ReactNode,
) => {
  return (props: TProps) => {
    const dehuuk = useTopLevelScope();
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
  def: (...args: TArgs) => TReturn,
): Nook<TArgs, TReturn> => {
  return ((maybeStrings: unknown) => {
    if (Array.isArray(maybeStrings)) {
      // Calling it as a nook inside a component or nook
      // ---

      return (...args: TArgs) =>
        withScope(maybeStrings, () => {
          return def(...args);
        });
    }

    // Calling it as a component
    // ---

    // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
    const detach = useTopLevelScope();
    const result = def(...([maybeStrings] as TArgs));
    detach();
    return result;
  }) as Nook<TArgs, TReturn>;
};
