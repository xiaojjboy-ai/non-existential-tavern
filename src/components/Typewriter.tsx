'use client';

import { useEffect, useState } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export const Typewriter = ({
  text,
  speed = 30,
  onComplete,
}: TypewriterProps) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const isComplete = visibleCount >= text.length;

  useEffect(() => {
    if (text.length === 0) {
      onComplete?.();
      return;
    }

    const timer = window.setInterval(() => {
      setVisibleCount((current) => {
        const next = Math.min(current + 1, text.length);
        if (next === text.length) {
          window.clearInterval(timer);
          window.setTimeout(() => onComplete?.(), 0);
        }
        return next;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [onComplete, speed, text.length]);

  return (
    <div className="whitespace-pre-wrap">
      {text.slice(0, visibleCount)}
      {!isComplete && <span className="ml-1 inline-block h-5 w-1 animate-pulse bg-amber-400" />}
    </div>
  );
};
