import { useEffect, useState } from 'react';

export function useInterval(callback: () => unknown, ms: number) {
  useEffect(() => {
    const handle = window.setInterval(callback, ms);
    return () => {
      window.clearInterval(handle);
    };
  }, [callback, ms]);
}

export function useStep() {
  const [step, setStep] = useState(0);

  const next = (force?: number | undefined) => {
    setStep((v) => force ?? v + 1);
  };

  return [step, next] as const;
}
