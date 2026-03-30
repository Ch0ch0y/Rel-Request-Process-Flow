import { useLocation, useOutlet } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';

const EXIT_MS = 180;
const ENTER_MS = 400;

export default function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  const [phase, setPhase] = useState('visible');
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
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setRendered({ outlet, path: location.pathname });
      setPhase('visible');
      return;
    }

    if (location.pathname === rendered.path) {
      setRendered({ outlet, path: location.pathname });
      return;
    }

    clearTimer();
    setPhase('exiting');

    timeoutRef.current = setTimeout(() => {
      setRendered({ outlet, path: location.pathname });
      setPhase('entering');

      timeoutRef.current = setTimeout(() => {
        setPhase('visible');
      }, ENTER_MS);
    }, EXIT_MS);

    return clearTimer;
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
