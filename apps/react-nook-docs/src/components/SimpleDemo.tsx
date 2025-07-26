import { nook } from 'react-nook';

const counter = nook(({ state }) => {
  const [count, setCount] = state``(0);

  const increment = () => {
    setCount(count + 1);
  };

  return [count, increment] as const;
});

const Btn = (props: { onClick: () => unknown; children?: React.ReactNode }) => {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="bg-red-50 active:bg-red-100 rounded-sm px-4 py-1.5"
    >
      {props.children}
    </button>
  );
};

const Widget = nook(({ state }) => {
  const [alternate, setAlternate] = state``(false);
  const [count, increment] = alternate ? counter``() : counter``();

  return (
    <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12">
      <p>Count: {count}</p>
      <Btn onClick={increment}>Increment</Btn>
      <Btn onClick={() => setAlternate(false)}>Use main counter</Btn>
      <Btn onClick={() => setAlternate(true)}>Use alternate counter</Btn>
    </div>
  );
});

export default function SimpleDemo() {
  return <Widget />;
}
