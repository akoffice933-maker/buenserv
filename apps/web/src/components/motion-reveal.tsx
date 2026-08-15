'use client';

import {useEffect, useRef, type CSSProperties, type ReactNode} from 'react';

type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms (max practical ~200). */
  delay?: number;
  /** Intersection root margin — show a bit early. */
  rootMargin?: string;
  as?: 'div' | 'section' | 'li' | 'article';
};

/**
 * Scroll reveal aligned with ANIMATION_SPEC:
 * 260ms easeOutCubic, opacity 0→1, Y 18px→0.
 * Fully disabled under prefers-reduced-motion.
 */
export function MotionReveal({
  children,
  className = '',
  delay = 0,
  rootMargin = '0px 0px -8% 0px',
  as: Tag = 'div'
}: MotionRevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      node.dataset.revealed = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.dataset.revealed = 'true';
            observer.unobserve(node);
          }
        }
      },
      {threshold: 0.12, rootMargin}
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  const style = {
    '--bs-reveal-delay': `${Math.max(0, delay)}ms`
  } as CSSProperties;

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`bs-reveal ${className}`.trim()}
      style={style}
      data-revealed="false"
    >
      {children}
    </Tag>
  );
}
