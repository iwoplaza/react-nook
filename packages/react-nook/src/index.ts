import { useCallback, useEffect, useState } from 'react';
import { callExpressionTrackedCallback } from './callback.ts';
import { CTX } from './ctx.ts';
import { DEBUG } from './debug.ts';
import { callExpressionTrackedEffect } from './effect.ts';
import { mockHooks } from './hook-mock.ts';
import { callExpressionTrackedMemo } from './memo.ts';
import { callExpressionTrackedState } from './state.ts';
import type { AnyFn, EffectCleanup, RootScope, Scope } from './types.ts';

function createRootScope(): RootScope {
  return {
    depth: 0,
    // Expression-tracking
    children: new Map(),
    scopes: new Map(),
    // Order-tracking
    lastHookIndex: -1,
    hookStores: [],

    effectsFlushed: true,
    dirtyEffects: new Set(),
    effects: new Set(),

    scheduledDestroys: new Map(),

    destroy() {
      for (const child of this.children.values()) {
        child.destroy?.();
      }
      this.children.clear();

      for (const store of this.hookStores) {
        store.destroy?.();
      }
      this.hookStores = [];
    },
  };
}

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

    scheduledDestroys: new Map(),

    destroy() {
      for (const child of this.children.values()) {
        child.destroy?.();
      }
      this.children.clear();

      for (const store of this.hookStores) {
        store.destroy?.();
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
  scope.scheduledDestroys = new Map(scope.children.entries());
  scope.lastHookIndex = -1;

  const result = cb();

  return result;
}

function flushScheduledDestroys(scope: Scope) {
  // Doing it recursively for nested scopes
  for (const nested of scope.scopes.values()) {
    flushScheduledDestroys(nested);
  }

  // Deleting all children that have not checked in
  for (const [callId, disposable] of scope.scheduledDestroys.entries()) {
    disposable.destroy?.();
    scope.children.delete(callId);
    scope.scopes.delete(callId); // Might not be a scope, but does not matter
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

  // This useState calls `createRootScope` two times before continuing the render the first
  // time the component is mounted in strict mode.
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [scope] = useState(createRootScope);
  CTX.rootScope = scope;
  CTX.parentScope = scope;
  CTX.rerenderRequested = false;

  if (scope.effectsFlushed) {
    // Resetting the set of dirty effects only if
    // the previous set has already been flushed.
    scope.dirtyEffects = new Set();
  }

  let result: T;
  try {
    result = setupScope(cb);
  } finally {
    // Cleanup
    CTX.rootScope = undefined;
    CTX.parentScope = undefined;
    CTX.rerender = undefined;
  }

  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  useEffect(() => {
    for (const effect of scope.effects) {
      effect.mount();
    }

    return () => {
      for (const effect of scope.effects) {
        effect.unmount();
      }
    };
  });

  // This effect should run after every render
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  useEffect(() => {
    DEBUG('useEffect()');
    flushScheduledDestroys(scope);

    scope.effectsFlushed = true;
    // Cloning the effects here, so that we can unmount
    // exactly those that were mounted before.
    const dirtyEffects = [...scope.dirtyEffects];
    for (const effect of dirtyEffects) {
      effect.mount();
    }

    DEBUG('end of useEffect()');
  });

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
    CTX.parentScope.scheduledDestroys.delete(callId);
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

export const $memo =
  (strings: TemplateStringsArray) =>
  <T>(factory: () => T, deps?: unknown[] | undefined) =>
    callExpressionTrackedMemo(strings, factory, deps);

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
