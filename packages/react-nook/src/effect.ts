import { CTX } from './ctx.ts';
import { DEBUG } from './debug.ts';
import type { EffectCleanup, EffectStore } from './types.ts';

export function destroyEffectStore(store: EffectStore) {
  store.cleanup?.();
}

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
  if (!scope) {
    throw new Error('Invalid state');
  }

  let store = scope.children.get(callId) as EffectStore | undefined;
  if (!store) {
    // First time mounting this effect!
    const cleanup = callback();
    store = {
      deps,
      cleanup,
      unmount() {
        this.cleanup?.();
      },
    };
    scope.children.set(callId, store);
  } else {
    // Please don't unmount me during this render
    scope.scheduledUnmounts.delete(callId);
  }

  // Comparing with the previous render
  if (
    // Not tracking deps?
    !store.deps ||
    !deps ||
    // Deps changed?
    store.deps.length !== deps.length ||
    store.deps.some((v, idx) => deps[idx] !== v)
  ) {
    store.cleanup?.(); // cleanup old effect
    store.cleanup = callback();
  }
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
  if (!scope) {
    throw new Error('Invalid state');
  }

  const hookIdx = ++scope.lastHookIndex;
  let store = scope.hookStores[hookIdx] as EffectStore | undefined;
  const recompute = () => {
    (store as EffectStore).cleanup?.(); // cleanup old effect
    (store as EffectStore).cleanup = callback();
  };
  if (!store) {
    const newStore: EffectStore = {
      deps,
      cleanup: undefined,
      unmount() {
        this.cleanup?.();
      },
    };
    store = newStore;
    DEBUG(`Pushing effect to flush`, callback);
    scope.effectsToFlush.push(recompute);
    scope.hookStores[hookIdx] = store;
  }

  // Comparing with the previous render
  if (
    // Not tracking deps?
    !store.deps ||
    !deps ||
    // Deps changed?
    store.deps.length !== deps.length ||
    store.deps.some((v, idx) => deps[idx] !== v)
  ) {
    scope.effectsToFlush.push(recompute);
  }
}
