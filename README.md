<div align="center">

# ⚛︎ nook

An alternate reality where React hooks can be called conditionally.

🚧 **Under Construction** 🚧

</div>

## Getting started

```sh
npm install react-nook
```

## Basic recipes

### Turning existing hooks into nooks
```tsx
import { nook } from 'react-nook';

// A custom React hook, nothing fancy here
function useTimer(interval: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const handle = setInterval(() => {
      setValue(prev => prev + 1);
    }, interval);

    return () => clearInterval(handle);
  }, [interval]);
  
  return value;
};

// Turn any hook into a nook!
const $timer = nook(useTimer);

// Either use nooks in vanilla components ...
function App() {
  const [active, setActive] = useState(false);

  // Only using `$timer` when active
  const time = useNook(() => active ? $timer``() : 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setActive(prev => !prev)}
      >
        Toggle
      </button>
      <p>Time: {time}</p>
    </>
  );
}

// ... or make the component a nook!
const App = nook(() => {
  const [active, setActive] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setActive(prev => !prev)}
      >
        Toggle
      </button>
      {/* Only using `$timer` when active */}
      <p>Time: {active ? $timer``() : 0}</p>
    </>
  );
});
```