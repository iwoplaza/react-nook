import { useCallback, useState } from 'react';
import { nook } from 'react-nook';
import { Btn } from '../common';

function useIncrement(initial: number) {
  const [value, setValue] = useState(initial);
  const increment = useCallback(() => setValue((prev) => prev + 1), []);

  return [value, increment] as const;
}

function useDecrement(initial: number) {
  const [value, setValue] = useState(initial);
  const increment = useCallback(() => setValue((prev) => prev - 1), []);

  return [value, increment] as const;
}

const $increment = nook(useIncrement);
const $decrement = nook(useDecrement);

// Nooks are just functions that can use other nooks, so they can also be components!
const DemoSwappingBehavior = nook(() => {
  const [mode, setMode] = useState<'increment' | 'decrement'>('increment');
  const [count, action] =
    mode === 'increment' ? $increment``(0) : $decrement``(100);

  return (
    <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12 grid-cols-2">
      <Btn
        highlighted={mode === 'increment'}
        onClick={() => setMode('increment')}
      >
        Increment behavior
      </Btn>
      <Btn
        highlighted={mode === 'decrement'}
        onClick={() => setMode('decrement')}
      >
        Decrement behavior
      </Btn>
      <p className="col-span-2">Count: {count}</p>
      <Btn className="col-span-2" onClick={action}>
        Action
      </Btn>
    </div>
  );
});

export default DemoSwappingBehavior;
