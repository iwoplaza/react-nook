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
  const recompute = () => {
    (store as EffectStore).cleanup?.(); // cleanup old effect
    (store as EffectStore).cleanup = callback();
  };
  
  if (!store) {
    // First time mounting this effect!
    const newStore: EffectStore = {
      deps,
      cleanup: undefined,
      scheduled: false,
      callback,
      unmount() {
        this.cleanup?.();
      },
    };
    store = newStore;
    DEBUG(`Scheduling effect to flush`, callback);
    scope.effectsToFlush.push(recompute);
    scope.children.set(callId, store);
  } else {
    // Please don't unmount me during this render
    scope.scheduledUnmounts.delete(callId);
  }

  // Always schedule the effect if it doesn't have a cleanup function
  // This handles the case where the effect was cleaned up and needs to re-run
  const shouldSchedule = 
    // Not already scheduled
    !store.scheduled &&
    (
      !store.cleanup || 
      !store.deps ||
      !deps ||
      store.deps.length !== deps.length ||
      store.deps.some((v, idx) => deps[idx] !== v)
    );
    
  if (shouldSchedule) {
    DEBUG(`Scheduling effect to flush (shouldSchedule: ${shouldSchedule}, hasCleanup: ${!!store.cleanup})`);
    store.scheduled = true;
    scope.effectsToFlush.push(() => {
      recompute();
      store.scheduled = false; // Reset after running
    });
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
      scheduled: false,
      callback,
      unmount() {
        this.cleanup?.();
      },
    };
    store = newStore;
    scope.hookStores[hookIdx] = store;
  }

  // Comparing with the previous render
  const shouldSchedule = 
    // Not already scheduled
    !store.scheduled &&
    (
      // First time (no deps set yet)
      store.deps === undefined ||
      // Not tracking deps
      !deps ||
      // Deps changed
      (store.deps && (store.deps.length !== deps.length || store.deps.some((v, idx) => deps[idx] !== v))) ||
      // Effect was cleaned up (no cleanup function)
      !store.cleanup
    );
    
  if (shouldSchedule) {
    DEBUG(`Scheduling order-tracked effect (shouldSchedule: ${shouldSchedule}, hasCleanup: ${!!store.cleanup}, firstTime: ${store.deps === undefined})`);
    store.scheduled = true;
    scope.effectsToFlush.push(() => {
      recompute();
      store.scheduled = false; // Reset after running
    });
  }
  
  // Update deps for next comparison
  store.deps = deps;
}
