// biome-ignore assist/source/organizeImports: better looking in docs
import { Btn } from '../common';
// ---cut-before---
import { nook, useNook } from 'react-nook';
import { LOOKING_FRAMES, WALKING_FRAMES } from './ascii';
import { useInterval, useModuloCounter, useToggle } from './hooks';

// Turn any hook into a ✨ nook ✨
const $interval = nook(useInterval);

function GranularMount() {
  // Animation state
  const [walkIdx, incrementWalkIdx] = useModuloCounter(WALKING_FRAMES.length);
  const [lookIdx, incrementLookIdx] = useModuloCounter(LOOKING_FRAMES.length);
  const [walkActive, toggleWalk] = useToggle(true);
  const [lookActive, toggleLook] = useToggle(true);

  // You can use nooks inside regular components via
  // the `useNook` hook
  useNook(() => {
    walkActive && $interval``(incrementWalkIdx, 100);
    lookActive && $interval``(incrementLookIdx, 100);
  });

  return (
    <div className="grid gap-2 max-w-sm place-items-center place-content-center mx-auto mt-12 grid-cols-2">
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

// ---cut-after---
export default GranularMount;
