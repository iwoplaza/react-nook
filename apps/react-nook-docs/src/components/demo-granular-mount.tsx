import { useCallback, useEffect, useState } from 'react';
import { nook } from 'react-nook';
import { Btn } from './common';

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
 /\\_/\\
( o.o )
 > ^ <`,
  `\
 /\\_/\\
( -.- )
 > ^ <`,
  `\
 /\\_/\\
(o.o  )
 > ^ <`,
  `\
 /\\_/\\
(o.o  )
 > ^ <`,
  `\
 /\\_/\\
(o.o  )
 > ^ <`,
  `\
 /\\_/\\
(-.-  )
 > ^ <`,
  `\
 /\\_/\\
( -.- )
 > ^ <`,
  `\
 /\\_/\\
(  o.o)
 > ^ <`,
  `\
 /\\_/\\
(  o.o)
 > ^ <`,
  `\
 /\\_/\\
(  o.o)
 > ^ <`,
];

const $modCounter = nook((mod: number) => {
  const [value, setValue] = useState(0);

  const increment = useCallback(
    () =>
      setValue((prev) => {
        return (prev + 1) % mod;
      }),
    [mod],
  );

  return [value, increment] as const;
});

const $toggle = nook((initial: boolean) => {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((prev) => !prev), []);

  return [value, toggle] as const;
});

const $interval = nook((callback: () => unknown, interval: number) => {
  // We can use vanilla React hooks inside "nooks", and resort to builtin nooks
  // when we need to call something conditionally
  useEffect(() => {
    const handle = window.setInterval(callback, interval);
    return () => window.clearInterval(handle);
  }, [interval, callback]);
});

// Nooks are just functions that can use other nooks, so they can also be components!
const DemoGranularMount = nook(() => {
  // Animation state
  const [frogIdx, incrementFrogIdx] = $modCounter``(FROG_FRAMES.length);
  const [catIdx, incrementCatIdx] = $modCounter``(CAT_FRAMES.length);
  const [frogActive, toggleFrog] = $toggle``(true);
  const [catActive, toggleCat] = $toggle``(true);

  // Animation behavior
  if (frogActive) {
    $interval``(incrementFrogIdx, 50);
  }
  if (catActive) {
    $interval``(incrementCatIdx, 100);
  }

  return (
    <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12 grid-cols-2">
      <pre className={frogActive ? '' : 'opacity-50'}>
        <code>{FROG_FRAMES[frogIdx]}</code>
      </pre>
      <pre className={catActive ? '' : 'opacity-50'}>
        <code>{CAT_FRAMES[catIdx]}</code>
      </pre>
      <Btn onClick={toggleFrog}>{frogActive ? 'Pause' : 'Play'}</Btn>
      <Btn onClick={toggleCat}>{catActive ? 'Pause' : 'Play'}</Btn>
    </div>
  );
});

export default DemoGranularMount;
