import { useCallback, useState } from 'react';

export const Btn = (props: {
  onClick: () => unknown;
  className?: string | undefined;
  highlighted?: boolean | undefined;
  children?: React.ReactNode | undefined;
}) => {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`bg-red-50 active:bg-red-100 rounded-sm px-4 py-1.5 ${props.className} ${props.highlighted ? 'outline-2' : ''}`}
    >
      {props.children}
    </button>
  );
};

export function useCounter() {
  const [value, setValue] = useState(0);

  const increment = useCallback(() => {
    setValue((prev) => prev + 1);
  }, []);

  return [value, increment] as const;
}
