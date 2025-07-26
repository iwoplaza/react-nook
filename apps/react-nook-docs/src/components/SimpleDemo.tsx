import { useState } from "react";

const Widget = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    console.log(`I am clicking...`);
    setCount(count + 1);
  };

  return <div className="grid gap-2 max-w-sm place-items-center mx-auto mt-12">
    <p>Count: {count}</p>
    <button type="button" onClick={increment} className="bg-red-50 active:bg-red-100 rounded-sm px-4 py-1.5">Increment</button>
  </div>
}

export default function SimpleDemo() {
  return <Widget />
}