'use client';

import React from 'react';
import Link from 'next/link';
import { HomeHero } from '@/components/sections/home-hero';
import { AboutSection } from '@/components/sections/about-section';
import { HueControl } from '@/components/ui/hue-control';
import { TransitionLink } from '@/components/transitions/TransitionLink';
import { MagneticSectionSnap } from '@/components/scroll/MagneticSectionSnap';

export default function TestHeroPage() {
  return (
    <main className="relative min-h-screen bg-canvas-bg text-canvas-text">
      {/* Floating Interactive A/B Comparison HUD */}
      <aside aria-label="Hero visual comparison HUD" className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto bg-[#0a0c10]/90 backdrop-blur-md border border-accent-bright/40 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl shadow-black/80 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-accent-bright animate-ping" />
          <span className="text-canvas-text-tertiary hidden sm:inline">// A/B Test:</span>

          <TransitionLink
            href="/"
            className="px-3 py-1 rounded-full text-canvas-text-secondary hover:text-canvas-text hover:bg-white/5 border border-transparent transition-all"
          >
            ← Direction 1: Ambient Mesh (Home)
          </TransitionLink>

          <span className="text-canvas-border">|</span>

          <span className="px-3 py-1 rounded-full bg-accent-bright text-canvas-bg font-bold shadow-md shadow-accent-bright/20">
            ● Direction 2: Riemannian Flow
          </span>
        </div>
      </aside>

      {/* Hero section rendering Direction 2: The Riemannian Flow Field */}
      <HomeHero
        name="Benaih Shaback."
        tagline="Building at the intersection of mathematics, systems, and learning"
        location="Nairobi, Kenya"
        status="Open to Work"
        variant="flow"
      />

      {/* About Section for testing scroll parallax and fade-out behavior */}
      <AboutSection
        title="About Me"
        paragraphs={[
          "I'm a software developer and mathematics student passionate about crafting performant digital systems and tactile visual experiences. Completing my B.Sc. in Mathematics & Computer Science at Maseno University, I specialize in building robust backend pipelines, logic programming integrations, and interactive mathematical manifolds.",
          "My engineering focus spans low-latency frame extraction engines, spatial databases, and microservices architecture. I believe the best digital environments make complex, abstract ideas feel intuitive and accessible through active exploration."
        ]}
        highlights={['Mathematics', 'Computer Science', 'TypeScript', 'Python', 'Prolog', 'Next.js', 'Three.js', 'PostgreSQL', 'Redis']}
      />

      {/* Floating comparison prompt at bottom */}
      <section className="py-20 px-6 border-t border-canvas-border/20 bg-canvas-card/20 text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3 font-mono">
          <span className="text-xs text-accent-bright">// evaluation telemetry</span>
          <h2 className="text-2xl font-heading font-bold text-canvas-text">
            Comparing the Two Directions
          </h2>
          <p className="text-xs text-canvas-text-secondary leading-relaxed">
            Direction 1 (Home) delivers an organic starfield proximity lattice where lines form and dissolve between drifting nodes. Direction 2 (This page) delivers fluid Riemannian vector streamlines curving around your cursor like geodesics around a gravitational singularity.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <TransitionLink
            href="/"
            className="px-5 py-2.5 rounded-full bg-accent-bright text-canvas-bg font-mono text-xs font-bold shadow-lg shadow-accent-bright/20 hover:scale-105 transition-all"
          >
            Switch to Direction 1 (Live Home) →
          </TransitionLink>
        </div>
      </section>

      {/* Interactive Hue Control for real-time color shifting test */}
      <HueControl />
      <MagneticSectionSnap />
    </main>
  );
}
