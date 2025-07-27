import { nook, nookState } from 'react-nook';
import { Btn } from './common';

// A custom nook (hook that can be called conditionally)
const counter = nook((initial: number, delta: number) => {
  const [count, setCount] = nookState``(initial);

  const increment = () => {
    setCount(count + delta);
  };

  return [count, increment] as const;
});

// Nooks are just functions that can use other nooks, so they can also be components!
const DemoSwappableStore = nook(() => {
  const [mode, setMode] = nookState``('a');
  const aMode = mode === 'a';
  const bMode = mode === 'b';

  const [count, increment] = aMode ? counter``(0, 1) : counter``(100, -1);

  return (
    <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12 grid-cols-2">
      <Btn highlighted={aMode} onClick={() => setMode('a')}>
        Counter A
      </Btn>
      <Btn highlighted={bMode} onClick={() => setMode('b')}>
        Counter B
      </Btn>
      <p className="col-span-2">Count: {count}</p>
      <Btn className="col-span-2" onClick={increment}>
        Progress chosen counter
      </Btn>
    </div>
  );
});

export default DemoSwappableStore;
