import { nook } from 'react-nook';
import { Btn, useCounter } from './demos/common';

export const DemoHookInANook = nook(() => {
  const [count, increment] = useCounter();

  return (
    <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12 grid-cols-2">
      <p className="col-span-2">Count: {count}</p>
      <Btn className="col-span-2" onClick={increment}>
        Increment
      </Btn>
    </div>
  );
});
