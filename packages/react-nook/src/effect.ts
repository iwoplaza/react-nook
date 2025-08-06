import { CTX } from './ctx.ts';
import { DEBUG } from './debug.ts';
import type { EffectCleanup, EffectStore } from './types.ts';

export function callExpressionTrackedEffect(
  callId: object,
  callback: () => EffectCleanup,
  deps: unknown[] | undefined,
): void {
  if (typeof window === 'undefined') {
    // We're on the server, no need to do anything
    return;
  }

  const scope = CTX.parentScope;
  const rootScope = CTX.rootScope;
  if (!scope || !rootScope) {
    throw new Error('Invalid state');
  }

  let store = scope.children.get(callId) as EffectStore | undefined;

  if (!store) {
    // First time mounting this effect!
    let cleanup: EffectCleanup | undefined;

    store = {
      deps,
      mount() {
        this.unmount();
        DEBUG('mounting');
        cleanup = callback();
      },
      unmount() {
        if (cleanup) {
          cleanup();
          cleanup = undefined;
        }
      },
      destroy() {
        rootScope.effects.delete(this);
        this.unmount();
      },
    };
    rootScope.effects.add(store);
    rootScope.dirtyEffects.add(store);
    rootScope.effectsFlushed = false;
    scope.children.set(callId, store);
  } else {
    // Please don't destroy me during this render
    scope.scheduledDestroys.delete(callId);
  }

  // Comparing with the previous render
  if (
    !store.deps ||
    !deps ||
    store.deps.length !== deps.length ||
    store.deps.some((v, idx) => deps[idx] !== v)
  ) {
    rootScope.dirtyEffects.add(store);
    rootScope.effectsFlushed = false;
  }

  // Update deps for next comparison
  store.deps = deps;
}

export function callOrderTrackedEffect(
  callback: () => EffectCleanup,
  deps: unknown[] | undefined,
) {
  if (typeof window === 'undefined') {
    // We're on the server, no need to do anything
    return;
  }

  const scope = CTX.parentScope;
  const rootScope = CTX.rootScope;
  if (!scope || !rootScope) {
    throw new Error('Invalid state');
  }

  const hookIdx = ++scope.lastHookIndex;
  let store = scope.hookStores[hookIdx] as EffectStore | undefined;
  if (!store) {
    // First time mounting this effect!
    let cleanup: EffectCleanup | undefined;
    store = {
      deps,
      mount() {
        this.unmount();
        DEBUG('mounting');
        cleanup = callback();
      },
      unmount() {
        if (cleanup) {
          cleanup();
          cleanup = undefined;
        }
      },
      destroy() {
        DEBUG('destroying effect');
        this.unmount();
      },
    };
    rootScope.dirtyEffects.add(store);
    rootScope.effectsFlushed = false;
    scope.hookStores[hookIdx] = store;
  }

  // Comparing with the previous render
  if (
    !store.deps ||
    !deps ||
    store.deps.length !== deps.length ||
    store.deps.some((v, idx) => deps[idx] !== v)
  ) {
    rootScope.dirtyEffects.add(store);
    rootScope.effectsFlushed = false;
  }

  // Update deps for next comparison
  store.deps = deps;
}
