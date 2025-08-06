// biome-ignore assist/source/organizeImports: better looking in docs
import { Btn } from '../common';
import { nook, useNook } from 'react-nook';
import { LOOKING_FRAMES, WALKING_FRAMES } from './ascii';
import { useInterval, useModuloCounter, useToggle } from './hooks';

// ---cut-before---
// Turn any hook into a ✨ nook ✨
const mountInterval = nook(useInterval);

function GranularMount() {
  // Animation state
  const [walkIdx, incrementWalkIdx] = useModuloCounter(WALKING_FRAMES.length);
  const [lookIdx, incrementLookIdx] = useModuloCounter(LOOKING_FRAMES.length);
  const [walk, toggleWalk] = useToggle(true);
  const [look, toggleLook] = useToggle(true);

  // You can use nooks inside regular components via
  // the `useNook` hook
  useNook(() => {
    walk && mountInterval``(incrementWalkIdx, 100);
    look && mountInterval``(incrementLookIdx, 100);
  });

  return (
    <div className="grid gap-2 max-w-sm place-items-center place-content-center mx-auto mt-12 grid-cols-2">
      <pre className={walk ? '' : 'opacity-50'}>
        <code>{WALKING_FRAMES[walkIdx]}</code>
      </pre>
      <pre className={look ? '' : 'opacity-50'}>
        <code>{LOOKING_FRAMES[lookIdx]}</code>
      </pre>
      <Btn onClick={toggleWalk}>{walk ? 'Pause' : 'Play'}</Btn>
      <Btn onClick={toggleLook}>{look ? 'Pause' : 'Play'}</Btn>
    </div>
  );
}

// ---cut-after---
export default GranularMount;
