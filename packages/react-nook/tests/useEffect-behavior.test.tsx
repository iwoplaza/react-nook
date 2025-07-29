import { StrictMode, useEffect, useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { nook, useNook } from '../src/index.ts';

/**
 * REACT STRICT MODE vs NON-STRICT MODE BEHAVIOR DIFFERENCES
 * 
 * This test file documents and verifies the behavior differences between React's
 * Strict Mode and non-strict mode, particularly focusing on useEffect lifecycle.
 * 
 * KEY DIFFERENCES:
 * 
 * 1. STRICT MODE DOUBLE INVOCATION:
 *    - In Strict Mode, React intentionally double-invokes effects during development
 *    - Pattern: mount → unmount → mount (for initial render)
 *    - This helps detect side effects that aren't properly cleaned up
 *    - Only happens in development builds, not production
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
  let effectEvents: string[] = [];
  let renderCount = 0;

  // Helper to create trackable effects
  function createTrackableEffect(name: string, deps?: unknown[]) {
    return () => {
      useEffect(() => {
        effectEvents.push(`${name}:mount`);
        return () => {
          effectEvents.push(`${name}:cleanup`);
        };
      }, deps);
    };
  }

  // Helper to create trackable nook effects
  function createTrackableNookEffect(name: string, deps?: unknown[]) {
    return nook(() => {
      useEffect(() => {
        effectEvents.push(`nook-${name}:mount`);
        return () => {
          effectEvents.push(`nook-${name}:cleanup`);
        };
      }, deps);
    });
  }

  beforeEach(() => {
    effectEvents = [];
    renderCount = 0;
  });

  describe('Standard React useEffect behavior', () => {
    function BasicEffectComponent() {
      renderCount++;
      createTrackableEffect('basic')();
      return <div>Basic Effect Component (render #{renderCount})</div>;
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
        </StrictMode>
      );

      // In Strict Mode, we expect the mount-unmount-mount pattern
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "basic:mount",
          "basic:cleanup",
          "basic:mount",
        ]
      `);

      result.unmount();

      // Final cleanup when component actually unmounts
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "basic:mount",
          "basic:cleanup",
          "basic:mount",
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
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "basic:mount",
        ]
      `);

      result.unmount();

      // Cleanup on actual unmount
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "basic:mount",
          "basic:cleanup",
        ]
      `);
    });
  });

  describe('useEffect with dependencies', () => {
    function DependentEffectComponent({ value }: { value: number }) {
      renderCount++;
      createTrackableEffect('dependent', [value])();
      return <div>Dependent Effect Component: {value} (render #{renderCount})</div>;
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
        </StrictMode>
      );

      // Initial Strict Mode pattern
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "dependent:mount",
          "dependent:cleanup",
          "dependent:mount",
        ]
      `);

      effectEvents = [];
      result.rerender(
        <StrictMode>
          <DependentEffectComponent value={2} />
        </StrictMode>
      );

      // Dependency change triggers cleanup and remount with Strict Mode pattern
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "dependent:cleanup",
          "dependent:mount",
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
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "dependent:mount",
        ]
      `);

      effectEvents = [];
      result.rerender(<DependentEffectComponent value={2} />);

      // Single cleanup and remount on dependency change
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "dependent:cleanup",
          "dependent:mount",
        ]
      `);
    });
  });

  describe('Multiple effects interaction', () => {
    function MultiEffectComponent({ showSecond }: { showSecond: boolean }) {
      renderCount++;
      createTrackableEffect('first')();
      if (showSecond) {
        createTrackableEffect('second')();
      }
      createTrackableEffect('third', [showSecond])();
      return <div>Multi Effect Component (render #{renderCount})</div>;
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
        </StrictMode>
      );

      // All effects get Strict Mode treatment
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "first:mount",
          "third:mount",
          "first:cleanup",
          "third:cleanup",
          "first:mount",
          "third:mount",
        ]
      `);

      effectEvents = [];
      result.rerender(
        <StrictMode>
          <MultiEffectComponent showSecond={true} />
        </StrictMode>
      );

      // New conditional effect and dependency change both get Strict Mode treatment
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "second:mount",
          "third:cleanup",
          "third:mount",
          "first:cleanup",
          "second:cleanup",
          "third:cleanup",
          "first:mount",
          "second:mount",
          "third:mount",
        ]
      `);
    });
  });

  describe('Nook effects behavior', () => {
    const $basicNookEffect = createTrackableNookEffect('basic');
    const $conditionalNookEffect = createTrackableNookEffect('conditional');

    function NookEffectComponent({ showConditional }: { showConditional: boolean }) {
      renderCount++;
      useNook(() => {
        $basicNookEffect``();
        if (showConditional) {
          $conditionalNookEffect``();
        }
      });
      return <div>Nook Effect Component (render #{renderCount})</div>;
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
        </StrictMode>
      );

      // Nook effects also get Strict Mode double invocation
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "nook-basic:mount",
          "nook-basic:cleanup",
          "nook-basic:mount",
        ]
      `);

      effectEvents = [];
      result.rerender(
        <StrictMode>
          <NookEffectComponent showConditional={true} />
        </StrictMode>
      );

      // Conditional nook mounting also exhibits Strict Mode behavior
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "nook-conditional:mount",
          "nook-conditional:cleanup",
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
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "nook-basic:mount",
        ]
      `);

      effectEvents = [];
      result.rerender(<NookEffectComponent showConditional={true} />);

      // Conditional nook mounts once
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "nook-conditional:mount",
        ]
      `);
    });
  });

  describe('Effect cleanup timing and order', () => {
    function CleanupOrderComponent({ phase }: { phase: string }) {
      renderCount++;
      
      // Multiple effects to test cleanup order
      createTrackableEffect(`phase-${phase}-effect1`)();
      createTrackableEffect(`phase-${phase}-effect2`)();
      createTrackableEffect(`phase-${phase}-effect3`)();
      
      return <div>Cleanup Order Component - Phase: {phase} (render #{renderCount})</div>;
    }

    it('should track cleanup order in Strict Mode', () => {
      /**
       * CLEANUP ORDER IN STRICT MODE:
       * React cleans up effects in reverse order of their declaration.
       * In Strict Mode, this happens twice - once during the intentional
       * unmount and once during the actual unmount.
       * 
       * Order: effect3 → effect2 → effect1 (reverse of declaration)
       */
      const result = render(
        <StrictMode>
          <CleanupOrderComponent phase="A" />
        </StrictMode>
      );

      // Strict Mode: mount all, cleanup all in reverse order, mount all again
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "phase-A-effect1:mount",
          "phase-A-effect2:mount",
          "phase-A-effect3:mount",
          "phase-A-effect3:cleanup",
          "phase-A-effect2:cleanup",
          "phase-A-effect1:cleanup",
          "phase-A-effect1:mount",
          "phase-A-effect2:mount",
          "phase-A-effect3:mount",
        ]
      `);

      effectEvents = [];
      result.rerender(
        <StrictMode>
          <CleanupOrderComponent phase="B" />
        </StrictMode>
      );

      // Phase change: cleanup old effects, mount new ones with Strict Mode pattern
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "phase-A-effect3:cleanup",
          "phase-A-effect2:cleanup",
          "phase-A-effect1:cleanup",
          "phase-B-effect1:mount",
          "phase-B-effect2:mount",
          "phase-B-effect3:mount",
          "phase-B-effect3:cleanup",
          "phase-B-effect2:cleanup",
          "phase-B-effect1:cleanup",
          "phase-B-effect1:mount",
          "phase-B-effect2:mount",
          "phase-B-effect3:mount",
        ]
      `);
    });

    it('should track cleanup order without Strict Mode', () => {
      /**
       * CLEANUP ORDER WITHOUT STRICT MODE:
       * Same cleanup order (reverse of declaration) but without
       * the double invocation, making the pattern clearer.
       */
      const result = render(<CleanupOrderComponent phase="A" />);

      // Simple mount order
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "phase-A-effect1:mount",
          "phase-A-effect2:mount",
          "phase-A-effect3:mount",
        ]
      `);

      effectEvents = [];
      result.rerender(<CleanupOrderComponent phase="B" />);

      // Clean cleanup and remount pattern
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "phase-A-effect3:cleanup",
          "phase-A-effect2:cleanup",
          "phase-A-effect1:cleanup",
          "phase-B-effect1:mount",
          "phase-B-effect2:mount",
          "phase-B-effect3:mount",
        ]
      `);
    });
  });

  describe('State updates and effect interactions', () => {
    function StateEffectComponent() {
      const [count, setCount] = useState(0);
      renderCount++;

      // Effect that depends on state
      createTrackableEffect('state-dependent', [count])();
      
      // Effect that updates state (with proper cleanup)
      useEffect(() => {
        effectEvents.push('state-updater:mount');
        const timer = setTimeout(() => {
          if (count < 2) {
            setCount(c => c + 1);
          }
        }, 10);
        
        return () => {
          effectEvents.push('state-updater:cleanup');
          clearTimeout(timer);
        };
      }, [count]);

      return (
        <div>
          State Effect Component - Count: {count} (render #{renderCount})
          <button onClick={() => setCount(c => c + 1)}>Increment</button>
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
        </StrictMode>
      );

      // Initial Strict Mode pattern for both effects
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "state-dependent:mount",
          "state-updater:mount",
          "state-dependent:cleanup",
          "state-updater:cleanup",
          "state-dependent:mount",
          "state-updater:mount",
        ]
      `);

      // Wait for state update to trigger
      await new Promise(resolve => setTimeout(resolve, 20));

      // State change triggers new effect cycle with Strict Mode behavior
      expect(effectEvents).toMatchInlineSnapshot(`
        [
          "state-dependent:mount",
          "state-updater:mount",
          "state-dependent:cleanup",
          "state-updater:cleanup",
          "state-dependent:mount",
          "state-updater:mount",
          "state-dependent:cleanup",
          "state-updater:cleanup",
          "state-dependent:mount",
          "state-updater:mount",
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