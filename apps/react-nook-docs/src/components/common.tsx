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
