import { useCallback, useEffect, useState } from 'react';
import { callExpressionTrackedCallback } from './callback.ts';
import { CTX } from './ctx.ts';
import { DEBUG } from './debug.ts';
import { callExpressionTrackedEffect } from './effect.ts';
import { mockHooks } from './hook-mock.ts';
import { callExpressionTrackedState } from './state.ts';
import type { AnyFn, EffectCleanup, Scope } from './types.ts';

function createScope(depth: number = 0): Scope {
  DEBUG(`Creating scope of depth ${depth}`);
  return {
    depth,
    // Expression-tracking
    children: new Map(),
    scopes: new Map(),
    // Order-tracking
    lastHookIndex: -1,
    hookStores: [],
    effectsToFlush: [],

    scheduledUnmounts: new Map(),

    unmount() {
      for (const child of this.children.values()) {
        child.unmount?.();
      }
      this.children.clear();

      for (const store of this.hookStores) {
        store.unmount?.();
      }
      this.hookStores = [];
    },
  };
}

function setupScope<T>(cb: () => T): T {
  const scope = CTX.parentScope;
  if (!scope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }

  DEBUG(`Setting up scope of depth ${scope.depth}`);
  scope.scheduledUnmounts = new Map(scope.children.entries());
  scope.lastHookIndex = -1;

  const result = cb();

  return result;
}

function flushScheduledEffects(scope: Scope) {
  DEBUG('Flushing effects', scope.effectsToFlush.length);
  for (const effect of scope.effectsToFlush) {
    effect();
  }
  scope.effectsToFlush = [];

  for (const nested of scope.scopes.values()) {
    flushScheduledEffects(nested);
  }
}

function flushScheduledUnmounts(scope: Scope) {
  // Deleting all stores that have not checked in
  for (const [callId, disposable] of scope.scheduledUnmounts.entries()) {
    disposable.unmount?.();
    scope.children.delete(callId);
    scope.scopes.delete(callId); // Might now be a scope, but does not matter
  }

  // Doing it recursively for nested scopes (those that have not been unmounted)
  for (const nested of scope.scopes.values()) {
    flushScheduledUnmounts(nested);
  }
}

function useTopLevelScope<T>(cb: () => T): T {
  DEBUG('useTopLevelScope()');
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [, rerender] = useState(0);
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  CTX.rerender = useCallback(() => {
    if (CTX.rerenderRequested) return;

    rerender((prev) => 1 - prev);
    CTX.rerenderRequested = true;
  }, []);

  // This useState calls `createScope` two times before continuing the render the first
  // time the component is mounted in strict mode.
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [scope] = useState(createScope);
  CTX.parentScope = scope;
  CTX.rerenderRequested = false;

  let result: T;
  try {
    result = setupScope(cb);
  } finally {
    // Cleanup
    CTX.parentScope = undefined;
    CTX.rerender = undefined;
  }

  // This effect should run after every render
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  useEffect(() => {
    flushScheduledEffects(scope);

    return () => {
      flushScheduledUnmounts(scope);
    };
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  useEffect(() => {
    return () => {
      // Cleaning up the top-level scope when the component gets unmounted
      scope.unmount();
    };
  }, [scope]);

  return result;
}

function withScope<T>(callId: object, callback: () => T): T {
  if (!CTX.parentScope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }
  let scope = CTX.parentScope.children.get(callId) as Scope | undefined;
  if (!scope) {
    scope = createScope(CTX.parentScope.depth + 1);
    CTX.parentScope.children.set(callId, scope);
    CTX.parentScope.scopes.set(callId, scope);
  } else {
    // Please don't delete me during this render
    CTX.parentScope.scheduledUnmounts.delete(callId);
  }

  const prevParentScope = CTX.parentScope;
  CTX.parentScope = scope;
  const unmock = mockHooks();

  let result: T;
  try {
    result = setupScope(callback);
  } finally {
    unmock();
    CTX.parentScope = prevParentScope;
  }

  return result;
}

export const $state =
  (strings: TemplateStringsArray) =>
  <T>(initial: T) =>
    callExpressionTrackedState(strings, initial);

export const $effect =
  (strings: TemplateStringsArray) =>
  (callback: () => EffectCleanup, deps?: unknown[] | undefined) =>
    callExpressionTrackedEffect(strings, callback, deps);

export const $callback =
  (strings: TemplateStringsArray) =>
  <T extends AnyFn>(callback: T, deps?: unknown[] | undefined) =>
    callExpressionTrackedCallback(strings, callback, deps);

interface Nook<TArgs extends unknown[], TReturn> {
  (strings: TemplateStringsArray): (...args: TArgs) => TReturn;
  (...args: TArgs): TReturn;
}

export function nook<TArgs extends unknown[], TReturn>(
  def: (...args: TArgs) => TReturn,
): Nook<TArgs, TReturn> {
  return ((maybeStrings: unknown) => {
    if (Array.isArray(maybeStrings)) {
      // Calling it as a nook inside another nook, with the foo``() syntax
      // ---

      return (...args: TArgs) => withScope(maybeStrings, () => def(...args));
    }

    // Calling it as a component
    // ---

    // @ts-ignore: let's assume that if not called using the foo``() syntax, it's being called as a component
    // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
    return useTopLevelScope(() => def(maybeStrings));
  }) as Nook<TArgs, TReturn>;
}

export function useNook<T>(callback: () => T): T {
  if (CTX.parentScope) {
    // We're already inside of a nook, noop
    return callback();
  }
  // biome-ignore lint/correctness/useHookAtTopLevel: the order will not change during rendering, it's stable
  return useTopLevelScope(callback);
}
