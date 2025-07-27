// biome-ignore assist/source/organizeImports: better for docs
import { useState } from 'react';
import { Btn } from '../common';
// ---cut-before---
import { nook } from 'react-nook';
import { useTimer } from './use-timer';

// Turn any hook into a ✨ nook ✨
const $timer = nook(useTimer);

// Nooks are just functions that can use other nooks, so they can also be components
const Timer = nook(() => {
  const [active, setActive] = useState(false);
  const toggle = () => setActive((prev) => !prev);

  return (
    <div className="grid gap-2 max-w-sm place-items-center place-content-center mx-auto grid-cols-2 m-12">
      {/* Only using `$timer` when active, directly in markup */}
      <p className="min-w-[5rem]">Time: {active ? $timer``(100) : 0}</p>
      <Btn onClick={toggle} highlighted={active}>
        {active ? 'Stop' : 'Start'}
      </Btn>
    </div>
  );
});

// ---cut-after---
export default Timer;
