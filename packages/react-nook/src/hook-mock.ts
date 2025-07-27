import React from 'react';
import { callOrderTrackedCallback } from './callback.ts';
import { CTX } from './ctx.ts';
import { callOrderTrackedEffect } from './effect.ts';
import { callOrderTrackedState } from './state.ts';
import type { AnyFn, EffectCleanup } from './types.ts';

const ReactSecretInternals =
  //@ts-ignore
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  //@ts-ignore
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

export function mockHooks() {
  const scope = CTX.parentScope;
  if (!scope || !ReactSecretInternals || !ReactSecretInternals.H) {
    // Let's just not mock anything
    return () => {};
  }

  const origUseState = ReactSecretInternals.H.useState;
  const origUseEffect = ReactSecretInternals.H.useEffect;
  const origUseCallback = ReactSecretInternals.H.useCallback;

  ReactSecretInternals.H.useState = (valueOrCompute: unknown) =>
    callOrderTrackedState(valueOrCompute);

  ReactSecretInternals.H.useEffect = (
    cb: () => EffectCleanup,
    deps?: unknown[] | undefined,
  ) => {
    callOrderTrackedEffect(cb, deps);
  };

  ReactSecretInternals.H.useCallback = (
    cb: AnyFn,
    deps?: unknown[] | undefined,
  ) => callOrderTrackedCallback(cb, deps);

  return () => {
    ReactSecretInternals.H.useState = origUseState;
    ReactSecretInternals.H.useEffect = origUseEffect;
    ReactSecretInternals.H.useCallback = origUseCallback;
  };
}
