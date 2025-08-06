import { nook } from 'react-nook';
import { Btn } from '../common';
import { useInterval, useStep } from './hooks';

// ---cut-before---
// Turn any hook into a ✨ nook ✨
const mountInterval = nook(useInterval);

// Nooks are just functions that can use other nooks, so they can also be components
const DeleteWithNevermind = nook(() => {
  const [step, next] = useStep();

  if (step === 0) {
    // Not deleting...
    return <Btn onClick={() => next()}>Delete</Btn>;
  }

  if (step < 3) {
    // Mounting the interval nook conditionally, which
    // will call `next` every second
    mountInterval``(next, 1000);

    return (
      <>
        <Btn onClick={() => next(0)} highlighted>
          Bring it back!
        </Btn>
        <p>{step === 1 ? 'Deleting...' : 'You can still stop this...'}</p>
      </>
    );
  }

  return (
    <>
      <Btn onClick={() => next(0)}>Restore</Btn>
      <p>Deleted</p>
    </>
  );
});

// ---cut-after---
export default () => {
  return (
    <div className="grid gap-2 content-center place-items-center place-content-center mx-auto m-12">
      <div className="flex flex-col items-center min-h-32">
        <DeleteWithNevermind />
      </div>
    </div>
  );
};
