import { useCallback, useEffect, useState } from 'react';

export function useModuloCounter(mod: number) {
  const [value, setValue] = useState(0);

  const increment = useCallback(
    () => setValue((prev) => (prev + 1) % mod),
    [mod],
  );

  return [value, increment] as const;
}

export function useToggle(initial: boolean) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((prev) => !prev), []);

  return [value, toggle] as const;
}

export function useInterval(callback: () => unknown, interval: number) {
  // We can use vanilla React hooks inside "nooks", and resort to builtin nooks
  // when we need to call something conditionally
  useEffect(() => {
    const handle = window.setInterval(callback, interval);
    return () => window.clearInterval(handle);
  }, [interval, callback]);
}
