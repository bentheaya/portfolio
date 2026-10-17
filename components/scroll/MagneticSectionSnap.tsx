'use client';

import { useEffect, useRef } from 'react';
import { getLenis } from '@/lib/lenis';

interface MagneticSectionSnapProps {
  /** Selector to query snapping section elements */
  sectionSelector?: string;
  /** Maximum distance in px from a section top to trigger magnetic snap */
  snapThresholdPx?: number;
  /** Rest delay in ms before magnetic snap activates */
  restDelayMs?: number;
}

/**
 * MagneticSectionSnap
 * 
 * Non-intrusive, user-first magnetic section snap engine.
 * 
 * Key behaviors:
 * 1. Zero CSS locking: No scroll-snap-type, allowing free, fluid momentum scrolling.
 * 2. Gentle Magnetic Cushion: Only engages if the user has already naturally decelerated
 *    to within a small distance (snapThresholdPx) of a section top.
 * 3. Neutral Zone Freedom: If the user stops between sections outside the threshold,
 *    NO SNAP occurs — they can leisurely stay and read between sections.
 * 4. Instant User Override: The instant the user moves the wheel, touches the trackpad,
 *    or scrolls while a snap tween is active, the snap halts immediately (lenis.stop()/start()).
 * 5. Persistent Dwell Protection: If the user counter-scrolls or resists a snap, snapping
 *    is disabled for that resting position until the user deliberately navigates away.
 */
export function MagneticSectionSnap({
  sectionSelector = '[data-snap-section="true"]',
  snapThresholdPx = 140,
  restDelayMs = 160,
}: MagneticSectionSnapProps) {
  const isSnappingRef = useRef(false);
  const userResistedRef = useRef(false);
  const resistedScrollRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only enable on desktop with fine pointer and when reduced-motion is not requested
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReduced) return;

    // Interrupt any active snap immediately on user input
    const cancelActiveSnap = () => {
      if (isSnappingRef.current) {
        const lenis = getLenis();
        if (lenis) {
          lenis.stop();
          lenis.start();
        }
        isSnappingRef.current = false;
        userResistedRef.current = true;
        resistedScrollRef.current = window.scrollY;
      }
    };

    const handleWheel = () => cancelActiveSnap();
    const handleTouch = () => cancelActiveSnap();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'].includes(e.code)) {
        cancelActiveSnap();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    const handleScroll = () => {
      const currentY = window.scrollY;

      // If user has moved significantly from the resisted position, reset resistance
      if (userResistedRef.current) {
        const distFromResisted = Math.abs(currentY - resistedScrollRef.current);
        if (distFromResisted > window.innerHeight * 0.35) {
          userResistedRef.current = false;
        }
      }

      // Clear pending evaluation
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // If snap is currently in progress, do not schedule another snap
      if (isSnappingRef.current) return;

      // Schedule evaluation when scroll momentum rests
      scrollTimeoutRef.current = setTimeout(() => {
        // If user resisted in this area, do not snap!
        if (userResistedRef.current) return;

        const lenis = getLenis();
        if (!lenis) return;

        // Query all snap sections dynamically
        const sectionEls = Array.from(document.querySelectorAll<HTMLElement>(sectionSelector));
        if (sectionEls.length === 0) return;

        const currentScroll = window.scrollY;
        const vh = window.innerHeight;
        // Dynamic threshold: smaller of 16% viewport height or snapThresholdPx
        const threshold = Math.min(snapThresholdPx, vh * 0.16);

        let closestSectionTop: number | null = null;
        let minDiff = Infinity;

        sectionEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const targetTop = rect.top + currentScroll;
          const diff = Math.abs(currentScroll - targetTop);

          // Only consider if it's within threshold and NOT already aligned (< 4px)
          if (diff <= threshold && diff > 4 && diff < minDiff) {
            minDiff = diff;
            closestSectionTop = targetTop;
          }
        });

        // Magnetically ease into the section top
        if (closestSectionTop !== null) {
          isSnappingRef.current = true;
          lenis.scrollTo(closestSectionTop, {
            duration: 0.85,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            onComplete: () => {
              isSnappingRef.current = false;
            },
          });
        }
      }, restDelayMs);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [sectionSelector, snapThresholdPx, restDelayMs]);

  return null;
}
