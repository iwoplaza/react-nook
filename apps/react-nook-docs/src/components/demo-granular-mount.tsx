// import { Btn } from './common';

import { useEffect, useState } from 'react';
import { nook, nookState } from 'react-nook';

const FROG_FRAMES = [
  '(◦°^°◦  )',
  '( ◦°^°◦ )',
  '(  ◦°^°◦)',
  '(   ◦°^°)',
  '(|    ◦°)',
  '( |     )',
  '(  |    )',
  '(   |   )',
  '(    |  )',
  '(     | )',
  '(°◦    |)',
  '(°^°◦   )',
];

const CAT_FRAMES = [
  `\
 /\_/\
( o.o )
 > ^ <`,
];

const animatedAscii = nook((frames: string[], interval: number) => {
  const [idx, setIdx] = nookState``(0);

  useEffect(() => {
    console.log('Mounted');
    const handle = window.setInterval(() => {
      setIdx((prev) => {
        return (prev + 1) % frames.length;
      });
    }, interval);

    return () => {
      window.clearInterval(handle);
    };
  }, [interval, setIdx, frames.length]);

  return frames[idx];
});

// Nooks are just functions that can use other nooks, so they can also be components!
const DemoGranularMount = nook(() => {
  const frame = animatedAscii``(FROG_FRAMES, 100);

  return (
    <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12 grid-cols-2">
      <pre>
        <code>{frame}</code>
      </pre>
    </div>
  );
});

export default DemoGranularMount;
