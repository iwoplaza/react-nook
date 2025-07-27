const ReactSecretInternals =
  //@ts-ignore
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  //@ts-ignore
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

function mockUseState() {
  const original = ReactSecretInternals.H.useState;
  console.log(ReactSecretInternals);

  ReactSecretInternals.H.useState = (...args: unknown[]) => {
    const [value, setValue] = original(...args);

    return [Math.random(), setValue];
  };

  return () => {
    ReactSecretInternals.H.useState = original;
  };
}
