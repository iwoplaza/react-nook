import { useEffect, useState } from 'react';

// A custom React hook, nothing fancy here
export function useTimer(interval: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setValue((prev) => prev + 1);
    }, interval);

    return () => clearInterval(handle);
  }, [interval]);

  return value;
}
