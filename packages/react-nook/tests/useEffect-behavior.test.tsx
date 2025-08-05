import { render } from '@testing-library/react';
import { StrictMode, useEffect, useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { nook, useNook } from '../src/index.ts';

/**
 * REACT STRICT MODE vs NON-STRICT MODE BEHAVIOR DIFFERENCES
 *
 * This test file documents and verifies the behavior differences between React's
 * Strict Mode and non-strict mode, particularly focusing on useEffect lifecycle.
 *
 * NOTE: These tests run in jsdom environment, which may exhibit different behavior
 * than browser environments regarding Strict Mode double invocation patterns.
 *
 * KEY DIFFERENCES:
 *
 * 1. STRICT MODE DOUBLE INVOCATION:
 *    - In Strict Mode, React intentionally double-invokes effects during development
 *    - Pattern: mount → unmount → mount (for initial render)
 *    - This helps detect side effects that aren't properly cleaned up
 *    - Only happens in development builds, not production
 *    - NOTE: jsdom environment may not fully replicate browser Strict Mode behavior
 *
 * 2. NON-STRICT MODE BEHAVIOR:
 *    - Effects run once per mount/dependency change
 *    - Pattern: mount (for initial render)
 *    - More predictable but may hide cleanup issues
 *
 * 3. CLEANUP VERIFICATION:
 *    - Strict Mode's double invocation helps catch:
 *      * Memory leaks from uncleaned event listeners
 *      * Uncanceled network requests
 *      * Uncleared timers/intervals
 *      * Resource leaks
 *
 * 4. DEPENDENCY ARRAY BEHAVIOR:
 *    - Both modes respect dependency arrays equally
 *    - Strict Mode still double-invokes on dependency changes
 *
 * 5. NOOK-SPECIFIC BEHAVIOR:
 *    - Nooks follow React's effect lifecycle
 *    - Conditional nook mounting also exhibits Strict Mode behavior
 *    - Nook cleanup happens during React's cleanup phase
 */

describe('useEffect behavior tracking with snapshots', () => {
  let events: string[] = [];

  // Helper to create trackable state
  function createTrackableState(name: string) {
    // biome-ignore lint/complexity/noUselessTypeConstraint: Useful to differentiate from JSX
    return <T extends unknown>(initial: T) => {
      return useState(() => {
        events.push(`${name}:init`);
        return initial;
      });
    };
  }

  // Helper to create trackable effects
  function createTrackableEffect(name: string) {
    return (deps?: unknown[]) => {
      useEffect(() => {
        events.push(`${name}:mount`);
        return () => {
          events.push(`${name}:cleanup`);
        };
        // biome-ignore lint/correctness/useExhaustiveDependencies: it's a special helper, shh
      }, deps);
    };
  }

  // Helper to create trackable nook effects
  function createTrackableNookEffect(name: string) {
    return nook((deps?: unknown[]) => {
      useEffect(() => {
        events.push(`nook-${name}:mount`);
        return () => {
          events.push(`nook-${name}:cleanup`);
        };
        // biome-ignore lint/correctness/useExhaustiveDependencies: it's a special helper, shh
      }, deps);
    });
  }

  beforeEach(() => {
    events = [];
  });

  describe('Standard React useEffect behavior', () => {
    const useBasicEffect = createTrackableEffect('basic');

    function BasicEffectComponent() {
      events.push('render');
      useBasicEffect();
      return <div>Basic Effect Component</div>;
    }

    it('should track initial mount behavior in Strict Mode', () => {
      /**
       * STRICT MODE EXPECTATION:
       * React Strict Mode will cause the following sequence:
       * 1. Component mounts → effect runs → "basic:mount"
       * 2. Component unmounts (Strict Mode) → cleanup runs → "basic:cleanup"
       * 3. Component mounts again → effect runs → "basic:mount"
       *
       * This double mount/unmount cycle helps detect side effects that
       * aren't properly cleaned up.
       */
      const result = render(
        <StrictMode>
          <BasicEffectComponent />
        </StrictMode>,
      );

      // In Strict Mode, we expect the mount-unmount-mount pattern
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "render",
          "basic:mount",
          "basic:cleanup",
          "basic:mount",
        ]
      `);

      events = [];
      result.unmount();

      // Final cleanup when component actually unmounts
      expect(events).toMatchInlineSnapshot(`
        [
          "basic:cleanup",
        ]
      `);
    });

    it('should track initial mount behavior without Strict Mode', () => {
      /**
       * NON-STRICT MODE EXPECTATION:
       * Without Strict Mode, the effect runs only once:
       * 1. Component mounts → effect runs → "basic:mount"
       *
       * No double invocation occurs, which may hide cleanup issues
       * but provides more predictable behavior.
       */
      const result = render(<BasicEffectComponent />);

      // Without Strict Mode, only single mount
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "basic:mount",
        ]
      `);

      events = [];
      result.unmount();

      // Cleanup on actual unmount
      expect(events).toMatchInlineSnapshot(`
        [
          "basic:cleanup",
        ]
      `);
    });
  });

  describe('useEffect with dependencies', () => {
    const useDependentEffect = createTrackableEffect('dependent');

    function DependentEffectComponent({ value }: { value: number }) {
      events.push('render');
      useDependentEffect([value]);
      return <div>Dependent Effect Component: {value}</div>;
    }

    it('should track dependency change behavior in Strict Mode', () => {
      /**
       * STRICT MODE WITH DEPENDENCIES:
       * Initial render follows the same mount-unmount-mount pattern.
       * When dependencies change, the effect cleanup and re-runs, but
       * Strict Mode also applies its double invocation to the new effect.
       */
      const result = render(
        <StrictMode>
          <DependentEffectComponent value={1} />
        </StrictMode>,
      );

      // Initial Strict Mode pattern
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "render",
          "dependent:mount",
          "dependent:cleanup",
          "dependent:mount",
        ]
      `);

      events = [];
      result.rerender(
        <StrictMode>
          <DependentEffectComponent value={2} />
        </StrictMode>,
      );

      // Dependency change triggers single cleanup and remount
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "render",
          "dependent:cleanup",
          "dependent:mount",
        ]
      `);
    });

    it('should track dependency change behavior without Strict Mode', () => {
      /**
       * NON-STRICT MODE WITH DEPENDENCIES:
       * Dependencies work normally - effect cleanup and re-runs once
       * when dependencies change, without double invocation.
       */
      const result = render(<DependentEffectComponent value={1} />);

      // Single mount without Strict Mode
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "dependent:mount",
        ]
      `);

      events = [];
      result.rerender(<DependentEffectComponent value={2} />);

      // Single cleanup and remount on dependency change
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "dependent:cleanup",
          "dependent:mount",
        ]
      `);
    });
  });

  describe('Multiple effects interaction', () => {
    const useFirstEffect = createTrackableEffect('first');
    const useThirdEffect = createTrackableEffect('third');

    function MultiEffectComponent({ showSecond }: { showSecond: boolean }) {
      events.push('render');
      useFirstEffect();

      // Always call the hook, but conditionally execute the effect
      useEffect(() => {
        if (showSecond) {
          events.push('second:mount');
          return () => {
            events.push('second:cleanup');
          };
        }
      }, [showSecond]);

      useThirdEffect([showSecond]);

      return <div>Multi Effect Component</div>;
    }

    it('should track multiple effects in Strict Mode', () => {
      /**
       * MULTIPLE EFFECTS IN STRICT MODE:
       * All effects follow the Strict Mode pattern independently.
       * Conditional effects also get the double invocation when they
       * first appear or when their dependencies change.
       */
      const result = render(
        <StrictMode>
          <MultiEffectComponent showSecond={false} />
        </StrictMode>,
      );

      // All effects get Strict Mode treatment
      // (all effects mount, then all effects unmount, then all effects mount again)
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "render",
          "first:mount",
          "third:mount",
          "first:cleanup",
          "third:cleanup",
          "first:mount",
          "third:mount",
        ]
      `);

      events = [];
      result.rerender(
        <StrictMode>
          <MultiEffectComponent showSecond={true} />
        </StrictMode>,
      );

      // New conditional effect and dependency change both get Strict Mode treatment
      // (first cleanup all effects, then mount all effects)
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "render",
          "first:cleanup",
          "third:cleanup",
          "first:mount",
          "second:mount",
          "third:mount",
        ]
      `);
    });
  });

  describe('Nook effects behavior', () => {
    const nookBasicEffect = createTrackableNookEffect('basic');
    const nookConditionalEffect = createTrackableNookEffect('conditional');

    function NookEffectComponent(props: { showConditional: boolean }) {
      events.push('render');
      useNook(() => {
        nookBasicEffect``();
        if (props.showConditional) {
          nookConditionalEffect``();
        }
      });
      return <div>Nook Effect Component</div>;
    }

    it('should track nook effects in Strict Mode', () => {
      /**
       * NOOK EFFECTS IN STRICT MODE:
       * Nook effects follow React's useEffect lifecycle, so they also
       * exhibit Strict Mode behavior. This is important because it means
       * nook-based effects are subject to the same cleanup verification
       * that regular React effects receive.
       */
      const result = render(
        <StrictMode>
          <NookEffectComponent showConditional={false} />
        </StrictMode>,
      );

      // Nook effects also get Strict Mode double invocation
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "render",
          "nook-basic:mount",
          "nook-basic:cleanup",
          "nook-basic:mount",
        ]
      `);

      events = [];
      result.rerender(
        <StrictMode>
          <NookEffectComponent showConditional={true} />
        </StrictMode>,
      );

      // Conditional nook mounting also exhibits Strict Mode behavior
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "render",
          "nook-basic:mount",
          "nook-conditional:mount",
        ]
      `);
    });

    it('should track nook effects without Strict Mode', () => {
      /**
       * NOOK EFFECTS WITHOUT STRICT MODE:
       * Without Strict Mode, nook effects behave like regular effects -
       * they mount once and cleanup once, providing predictable behavior.
       */
      const result = render(<NookEffectComponent showConditional={false} />);

      // Single mount for nook effects
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "nook-basic:mount",
        ]
      `);

      events = [];
      result.rerender(<NookEffectComponent showConditional={true} />);

      // Conditional nook mounts once
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "nook-basic:cleanup",
          "nook-basic:mount",
          "nook-basic:mount",
          "nook-conditional:mount",
        ]
      `);
    });
  });

  describe('State updates and effect interactions', () => {
    const useStateDependentEffect = createTrackableEffect('state-dependent');
    const useMyState = createTrackableState('state');

    function StateEffectComponent() {
      events.push('render');
      const [count, setCount] = useMyState(0);

      // Effect that depends on state
      useStateDependentEffect([count]);

      // Effect that updates state (with proper cleanup)
      useEffect(() => {
        events.push('state-updater:mount');
        const timer = setTimeout(() => {
          if (count < 2) {
            setCount((c) => c + 1);
          }
        }, 10);

        return () => {
          events.push('state-updater:cleanup');
          clearTimeout(timer);
        };
      }, [count, setCount]);

      return (
        <div>
          State Effect Component - Count: {count}
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            Increment
          </button>
        </div>
      );
    }

    it('should track state-effect interactions in Strict Mode', async () => {
      /**
       * STATE-EFFECT INTERACTIONS IN STRICT MODE:
       * When effects update state, they can trigger re-renders and new
       * effect cycles. Strict Mode's double invocation applies to each
       * effect cycle, which can help catch issues with:
       * - Infinite update loops
       * - Race conditions
       * - Improper cleanup of async operations
       */
      const result = render(
        <StrictMode>
          <StateEffectComponent />
        </StrictMode>,
      );

      // Initial Strict Mode pattern for both effects
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "state:init",
          "state:init",
          "render",
          "state-dependent:mount",
          "state-updater:mount",
          "state-dependent:cleanup",
          "state-updater:cleanup",
          "state-dependent:mount",
          "state-updater:mount",
        ]
      `);
      events = [];

      // Wait for state update to trigger
      await new Promise((resolve) => setTimeout(resolve, 20));

      // State change triggers new effect cycle with Strict Mode behavior
      expect(events).toMatchInlineSnapshot(`
        [
          "render",
          "render",
          "state-dependent:cleanup",
          "state-updater:cleanup",
          "state-dependent:mount",
          "state-updater:mount",
        ]
      `);

      result.unmount();
    });
  });
});
