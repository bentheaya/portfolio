'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getLenis } from '@/lib/lenis';

interface TransitionContextType {
  isPending: boolean;
  startTransition: (href: string, cursorX: number, cursorY: number) => void;
  transitionProgress: 'idle' | 'animating-in' | 'animating-out';
  setTransitionProgress: (progress: 'idle' | 'animating-in' | 'animating-out') => void;
  cursorX: number;
  cursorY: number;
  targetHref: string;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState<'idle' | 'animating-in' | 'animating-out'>('idle');
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [targetHref, setTargetHref] = useState('');

  const startTransition = (href: string, x: number, y: number) => {
    // If already transitioning or navigating to the exact same route, skip
    if (isPending || transitionProgress !== 'idle' || href === pathname) return;

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = getLenis();
    if (lenis) lenis.stop();

    setCursorX(x);
    setCursorY(y);
    setTargetHref(href);
    setTransitionProgress('animating-in');
    setIsPending(true);

    if (prefersReduced) {
      router.push(href);
      if (lenis) lenis.scrollTo(0, { immediate: true });
      if (typeof window !== 'undefined') window.scrollTo(0, 0);

      setTimeout(() => {
        setIsPending(false);
        setTransitionProgress('idle');
        if (lenis) lenis.start();
      }, 250);
      return;
    }

    // Snappy, realistic sweep: 380ms curtain entry
    setTimeout(() => {
      router.push(href);
      if (lenis) lenis.scrollTo(0, { immediate: true });
      if (typeof window !== 'undefined') window.scrollTo(0, 0);

      // Brief frame settle then smoothly reveal new page
      setTimeout(() => {
        setTransitionProgress('animating-out');

        // Exit reveal completes in 380ms
        setTimeout(() => {
          setIsPending(false);
          setTransitionProgress('idle');
          if (lenis) lenis.start();
        }, 400);
      }, 80);
    }, 400);
  };

  return (
    <TransitionContext.Provider
      value={{
        isPending,
        startTransition,
        transitionProgress,
        setTransitionProgress,
        cursorX,
        cursorY,
        targetHref,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(TransitionContext);
  if (context === undefined) {
    throw new Error('usePageTransition must be used within a TransitionProvider');
  }
  return context;
}
