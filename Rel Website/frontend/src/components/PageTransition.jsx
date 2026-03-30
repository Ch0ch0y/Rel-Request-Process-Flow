import { useLocation, useOutlet } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';

const EXIT_MS = 180;
const ENTER_MS = 400;

/**
 * Smooth page transition on every route change.
 * Two-phase: old page fades/slides out → new page fades/slides in.
 * Uses location.pathname as the transition key for reliability.
 */
export default function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  const [phase, setPhase] = useState('visible');       // visible | exiting | entering
  const [rendered, setRendered] = useState({ outlet, path: location.pathname });
  const timeoutRef = useRef(null);
  const isFirstMount = useRef(true);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // First mount — just appear instantly
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setRendered({ outlet, path: location.pathname });
      setPhase('visible');
      return;
    }

    // Same page — just update outlet content (no animation)
    if (location.pathname === rendered.path) {
      setRendered({ outlet, path: location.pathname });
      return;
    }

    // Route changed — start exit animation
    clearTimer();
    setPhase('exiting');

    timeoutRef.current = setTimeout(() => {
      // Swap to new content and start enter animation
      setRendered({ outlet, path: location.pathname });
      setPhase('entering');

      timeoutRef.current = setTimeout(() => {
        setPhase('visible');
      }, ENTER_MS);
    }, EXIT_MS);

    return clearTimer;
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update outlet content on same-route re-renders without animation
  useEffect(() => {
    if (location.pathname === rendered.path && phase === 'visible') {
      setRendered(prev => ({ ...prev, outlet }));
    }
  }, [outlet]); // eslint-disable-line react-hooks/exhaustive-deps

  const className = {
    visible: 'page-transition page-visible',
    exiting: 'page-transition page-exit',
    entering: 'page-transition page-enter',
  }[phase];

  return (
    <div className={className}>
      {rendered.outlet}
    </div>
  );
}
