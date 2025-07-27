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

let WARNED = false;

export function mockHooks() {
  const scope = CTX.parentScope;
  if (!scope || !ReactSecretInternals || !ReactSecretInternals.H) {
    // Let's just not mock anything
    if (!WARNED) {
      console.warn(
        'Cannot nook-ify hooks in this environment. Please file an issue on GitHub',
      );
      console.dir(ReactSecretInternals);
      WARNED = true;
    }
    return () => {};
  }

  const originals = Object.entries(ReactSecretInternals.H);
  for (const key of Object.keys(ReactSecretInternals.H)) {
    ReactSecretInternals.H[key] = () => {
      throw new Error(
        `Cannot use '${key}' inside nooks yet. Please file an issue and tell us about your use-case.`,
      );
    };
  }

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
    for (const [key, value] of originals) {
      ReactSecretInternals.H[key] = value;
    }
  };
}
