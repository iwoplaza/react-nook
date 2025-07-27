import { useCallback, useState } from 'react';
import { CTX } from './ctx.ts';
import { callExpressionTrackedEffect } from './effect.ts';
import { mockHooks } from './hook-mock.ts';
import { callExpressionTrackedState } from './state.ts';
import type { EffectCleanup, Scope } from './types.ts';

function createScope(): Scope {
  return {
    // Expression-tracking
    stores: new Map(),
    // Order-tracking
    lastHookIndex: -1,
    hookStores: [],

    scheduledUnmounts: new Map(),

    destroy() {
      for (const store of this.stores.values()) {
        store.destroy?.();
      }
      for (const store of this.hookStores) {
        store.destroy?.();
      }
    },

    // flushEffects() {

    // },

    // unmount() {

    // },
  };
}

function setupScope<T>(cb: () => T): T {
  const scope = CTX.parentScope;
  if (!scope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }

  scope.scheduledUnmounts = new Map(scope.stores.entries());
  scope.lastHookIndex = -1;

  const result = cb();

  // Deleting all stores that have not checked in
  for (const [callId, disposable] of scope.scheduledUnmounts.entries()) {
    disposable.destroy?.();
    scope.stores.delete(callId);
  }

  return result;
}

function useTopLevelScope<T>(cb: () => T): T {
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [, rerender] = useState(0);
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  CTX.rerender = useCallback(() => {
    if (CTX.rerenderRequested) return;

    rerender((prev) => 1 - prev);
    CTX.rerenderRequested = true;
  }, []);

  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [scope] = useState(createScope);
  CTX.parentScope = scope;
  CTX.rerenderRequested = false;

  const result = setupScope(cb);

  // Cleanup
  CTX.parentScope = undefined;
  CTX.rerender = undefined;

  // // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  // useEffect(() => {
  //   return () => {
  //     // Cleaning up the top-level scope when the component gets unmounted
  //     scope.destroy();
  //   };
  // });

  return result;
}

function withScope<T>(callId: object, callback: () => T): T {
  if (!CTX.parentScope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }
  const stores = CTX.parentScope.stores;

  let scope = stores.get(callId) as Scope | undefined;
  if (!scope) {
    scope = createScope();
    stores.set(callId, scope);
  } else {
    // Please don't delete me during this render
    CTX.parentScope.scheduledUnmounts.delete(callId);
  }
  const prevParentScope = CTX.parentScope;
  CTX.parentScope = scope;
  const unmock = mockHooks();
  const result = setupScope(callback);
  unmock();
  CTX.parentScope = prevParentScope;
  return result;
}

export const nookState =
  (strings: TemplateStringsArray) =>
  <T>(initial: T) =>
    callExpressionTrackedState(strings, initial);

export const nookEffect =
  (strings: TemplateStringsArray) =>
  (callback: () => EffectCleanup, deps?: unknown[] | undefined) =>
    callExpressionTrackedEffect(strings, callback, deps);

export const $state = nookState;
export const $effect = nookEffect;

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
