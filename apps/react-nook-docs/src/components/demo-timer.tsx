import { useEffect, useState } from 'react';
import { nook } from 'react-nook';
import { Btn } from './common';

// A custom React hook, nothing fancy here
function useTimer(interval: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setValue((prev) => prev + 1);
    }, interval);

    return () => clearInterval(handle);
  }, [interval]);

  return value;
}

// Turn any hook into a ✨ nook ✨
const $timer = nook(useTimer);

// Nooks are just functions that can use other nooks, so they can also be components
const DemoTimer = nook(() => {
  const [active, setActive] = useState(false);

  // Only using `$timer` when active
  const timeDisplay = <p>Time: {active ? $timer``(100) : 0}</p>;

  return (
    <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12 grid-cols-2">
      {timeDisplay}
      <Btn onClick={() => setActive((prev) => !prev)} highlighted={active}>
        {active ? 'Stop' : 'Start'}
      </Btn>
    </div>
  );
});

export default DemoTimer;
