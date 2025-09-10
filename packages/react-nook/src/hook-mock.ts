import React, { use } from 'react';
import { callOrderTrackedCallback } from './callback.ts';
import { CTX } from './ctx.ts';
import { callOrderTrackedEffect } from './effect.ts';
import { callOrderTrackedMemo } from './memo.ts';
import { callOrderTrackedState } from './state.ts';
import type { AnyFn, EffectCleanup } from './types.ts';

const NOOP = () => {};

const ReactSecretInternals =
  //@ts-ignore
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  //@ts-ignore
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

let WARNED = false;

export function mockHooks() {
  if (typeof window === 'undefined') {
    // We're on the server, there's going to be no rerenders, so no problem with
    // conditions in the render function. Skip mocking
    return NOOP;
  }

  const Dispatcher =
    ReactSecretInternals?.H ??
    ReactSecretInternals?.ReactCurrentDispatcher.current;

  const scope = CTX.parentScope;
  if (!scope || !Dispatcher) {
    // Let's just not mock anything
    if (!WARNED) {
      console.warn(
        'Cannot nook-ify hooks in this environment. Please file an issue on GitHub',
      );
      console.dir(ReactSecretInternals);
      WARNED = true;
    }
    return NOOP;
  }

  const originals = Object.entries(Dispatcher).filter(([key]) => key !== 'use');
  for (const [key] of originals) {
    Dispatcher[key] = () => {
      throw new Error(
        `Cannot use '${key}' inside nooks yet. Please file an issue and tell us about your use-case.`,
      );
    };
  }

  Dispatcher.useState = (valueOrCompute: unknown) =>
    callOrderTrackedState(valueOrCompute);

  Dispatcher.useEffect = (
    cb: () => EffectCleanup,
    deps?: unknown[] | undefined,
  ) => {
    callOrderTrackedEffect(cb, deps);
  };

  Dispatcher.useCallback = (cb: AnyFn, deps?: unknown[] | undefined) =>
    callOrderTrackedCallback(cb, deps);

  Dispatcher.useMemo = (cb: AnyFn, deps?: unknown[] | undefined) =>
    callOrderTrackedMemo(cb, deps);

  Dispatcher.useContext = (ctx: React.Context<any>) => {
    return use(ctx);
  };

  return () => {
    for (const [key, value] of originals) {
      Dispatcher[key] = value;
    }
  };
}
