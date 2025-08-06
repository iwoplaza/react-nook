'use client';

import { useCallback, useEffect } from 'react';
import { nook } from 'react-nook';

const mountInterval = nook((callback: () => unknown, interval: number) => {
  useEffect(() => {
    console.log('Mounted the callback');
    const handle = setInterval(callback, interval);
    return () => clearInterval(handle);
  }, [callback, interval]);
});

const Counter = nook(() => {
  const foo = useCallback(() => {
    console.log('Hello');
  }, []);

  mountInterval``(foo, 1000);

  return <p>Hello</p>;
});

export default Counter;
