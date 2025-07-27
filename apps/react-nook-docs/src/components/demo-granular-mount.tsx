import { useCallback, useEffect, useState } from 'react';
import { nook, useNook } from 'react-nook';
import { Btn } from './common';

const WALKING_FRAMES = [
  `\
 /\\_/\\__
(◦°^°◦  )\\
  ' \`\` '`,
  `\
 /\\_/\\__
(◦°^°◦  )\\
  ' \`' \``,
  `\
 /\\_/\\__
(.◦^◦.  )\\
  \` '' \``,
  `\
 _/\\_/\\_
( .◦^◦. )\\
  \` '\` '`,
  `\
 _/\\_/\\_
( ◦°^°◦ )\\
  ' \`\` '`,
  `\
 _/\\_/\\_
( ◦°^°◦ )\\
  ' \`' \``,
  `\
 _/\\_/\\_
( .◦^◦. )\\
  \` '' \``,
  `\
 /\\_/\\__
(.◦^◦.  )\\
  \` '\` '`,
];

const LOOKING_FRAMES = [
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

function useModuloCounter(mod: number) {
  const [value, setValue] = useState(0);

  const increment = useCallback(
    () => setValue((prev) => (prev + 1) % mod),
    [mod],
  );

  return [value, increment] as const;
}

function useToggle(initial: boolean) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((prev) => !prev), []);

  return [value, toggle] as const;
}

function useInterval(callback: () => unknown, interval: number) {
  // We can use vanilla React hooks inside "nooks", and resort to builtin nooks
  // when we need to call something conditionally
  useEffect(() => {
    const handle = window.setInterval(callback, interval);
    return () => window.clearInterval(handle);
  }, [interval, callback]);
}

const $interval = nook(useInterval);

function DemoGranularMount() {
  // Animation state
  const [walkIdx, incrementWalkIdx] = useModuloCounter(WALKING_FRAMES.length);
  const [lookIdx, incrementLookIdx] = useModuloCounter(LOOKING_FRAMES.length);
  const [walkActive, toggleWalk] = useToggle(true);
  const [lookActive, toggleLook] = useToggle(true);

  useNook(() => {
    // Animation behavior
    if (walkActive) {
      $interval``(incrementWalkIdx, 100);
    }
    if (lookActive) {
      $interval``(incrementLookIdx, 100);
    }
  });

  return (
    <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12 grid-cols-2">
      <pre className={walkActive ? '' : 'opacity-50'}>
        <code>{WALKING_FRAMES[walkIdx]}</code>
      </pre>
      <pre className={lookActive ? '' : 'opacity-50'}>
        <code>{LOOKING_FRAMES[lookIdx]}</code>
      </pre>
      <Btn onClick={toggleWalk}>{walkActive ? 'Pause' : 'Play'}</Btn>
      <Btn onClick={toggleLook}>{lookActive ? 'Pause' : 'Play'}</Btn>
    </div>
  );
}

export default DemoGranularMount;
