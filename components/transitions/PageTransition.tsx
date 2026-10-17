'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { usePageTransition } from './TransitionContext';

/**
 * PageTransition — Cinematic Directional Sweep
 *
 * Replaces the GPU-heavy feTurbulence SVG filter with a buttery-smooth,
 * hardware-accelerated curtain transition.
 *
 * Sequence:
 *  1. An obsidian veil with a glowing accent-colored leading edge sweeps
 *     upward from bottom to cover the viewport (power3.inOut, ~380ms).
 *  2. While the screen is veiled, Next.js swaps the route and Lenis resets
 *     the scroll position to top=0.
 *  3. The veil continues upward smoothly out of the viewport (power3.inOut, ~380ms),
 *     revealing the newly mounted page without jarring jumps or frame drops.
 */
export function PageTransition() {
  const { transitionProgress, targetHref } = usePageTransition();
  const overlayRef = useRef<HTMLDivElement>(null);
  const leadingLineRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const leadingLine = leadingLineRef.current;
    const hud = hudRef.current;
    if (!overlay || !leadingLine || !hud) return;

    const prefersReduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion fallback: gentle opacity crossfade
    if (prefersReduced) {
      if (transitionProgress === 'animating-in') {
        gsap.set(overlay, { display: 'flex', yPercent: 0, opacity: 0 });
        gsap.to(overlay, { opacity: 1, duration: 0.25, ease: 'power1.out' });
      } else if (transitionProgress === 'animating-out') {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.25,
          ease: 'power1.in',
          onComplete: () => {
            gsap.set(overlay, { display: 'none' });
          },
        });
      } else {
        gsap.set(overlay, { display: 'none' });
      }
      return;
    }

    // ── Phase 1: Curtain sweeps in from bottom ───────────────────────────────
    if (transitionProgress === 'animating-in') {
      gsap.killTweensOf([overlay, hud, leadingLine]);

      gsap.set(overlay, {
        display: 'flex',
        yPercent: 100,
        opacity: 1,
      });
      gsap.set(hud, { opacity: 0, y: 12 });
      gsap.set(leadingLine, {
        top: 0,
        bottom: 'auto',
        opacity: 1,
      });

      const tl = gsap.timeline();
      tl.to(overlay, {
        yPercent: 0,
        duration: 0.38,
        ease: 'power3.inOut',
      }).to(
        hud,
        {
          opacity: 1,
          y: 0,
          duration: 0.18,
          ease: 'power2.out',
        },
        '-=0.12'
      );

    // ── Phase 2: Curtain lifts upward out of the screen ──────────────────────
    } else if (transitionProgress === 'animating-out') {
      gsap.killTweensOf([overlay, hud, leadingLine]);

      gsap.set(leadingLine, {
        top: 'auto',
        bottom: 0,
        opacity: 1,
      });

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(overlay, { display: 'none', yPercent: 100 });
        },
      });

      tl.to(hud, {
        opacity: 0,
        y: -10,
        duration: 0.15,
        ease: 'power2.in',
      }).to(
        overlay,
        {
          yPercent: -100,
          duration: 0.38,
          ease: 'power3.inOut',
        },
        '-=0.08'
      );

    // ── Idle state ────────────────────────────────────────────────────────────
    } else {
      gsap.set(overlay, { display: 'none', yPercent: 100 });
    }
  }, [transitionProgress]);

  // Clean label from target href (e.g., "/work/slopslayer" → "work / slopslayer")
  const formattedRoute = targetHref
    ? targetHref.replace(/^\//, '').replace(/\//g, ' // ') || 'index'
    : 'routing';

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 z-[150] pointer-events-none w-screen h-screen hidden flex-col items-center justify-center bg-canvas-bg transform-gpu will-change-transform"
      style={{
        backgroundColor: 'rgb(8, 8, 8)',
      }}
    >
      {/* Luminous accent leading-edge line */}
      <div
        ref={leadingLineRef}
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        style={{
          backgroundColor: 'var(--color-accent-bright)',
          boxShadow: '0 0 20px 2px var(--color-accent-bright), 0 0 40px 6px var(--color-accent-bright)',
        }}
      />

      {/* Subtle background radial ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 50%, var(--color-accent-bright) 0%, transparent 60%)',
        }}
      />

      {/* Minimal technical HUD readout */}
      <div
        ref={hudRef}
        className="relative z-10 flex flex-col items-center gap-3 select-none"
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-canvas-border/80 bg-canvas-elevated/90 backdrop-blur-md shadow-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-bright animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-canvas-text-secondary">
            // route.dispatch: <span className="text-accent-bright">{formattedRoute}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
