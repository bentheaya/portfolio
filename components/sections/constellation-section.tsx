'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { projectsMetadata, ProjectMetadata } from '@/lib/projects';
import { TransitionLink } from '@/components/transitions/TransitionLink';

const ConstellationScene = dynamic(() => import('@/components/three/ConstellationScene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 z-0 bg-canvas-bg flex items-center justify-center pointer-events-none select-none">
      <span className="text-[9px] font-mono text-canvas-text-tertiary uppercase tracking-widest animate-pulse">
        // initializing.3d_work_constellation...
      </span>
    </div>
  ),
});

export function ConstellationSection() {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileOrTablet = window.innerWidth < 1024 || !window.matchMedia('(pointer: fine)').matches;
      setIsMobile(isMobileOrTablet);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filterOptions = [
    { label: 'All Work', value: 'All' },
    { label: 'AI & Models', value: 'AI & Models' },
    { label: 'Spatial & Geometry', value: 'Spatial & Geometry' },
    { label: 'Architectures & Backends', value: 'Architectures & Backends' },
    { label: 'Civic Data & Archives', value: 'Civic Data & Archives' },
  ];

  // Filter projects list for mobile fallback representation
  const filteredProjects = projectsMetadata.filter(
    (p) => activeFilter === 'All' || p.track === activeFilter
  );

  return (
    <section 
      id="constellation-section" 
      className="relative w-full py-16 px-6 flex flex-col justify-between overflow-hidden border-t border-canvas-border/20 bg-canvas-bg lg:h-[88vh] lg:min-h-[720px] lg:max-h-[960px] lg:py-12 select-none"
    >
      {/* Dynamic 3D interactive browseable node graph (desktop only) */}
      {!isMobile && <ConstellationScene activeFilter={activeFilter} />}

      {/* Edge vignettes to softly blend into adjacent sections */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--color-canvas-bg)_100%)] opacity-85" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-canvas-bg via-canvas-bg/60 to-transparent z-[1]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas-bg via-canvas-bg/60 to-transparent z-[1]" />

      {/* Foreground contents */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col justify-between h-full space-y-6 pointer-events-none">
        
        {/* Track filter HUD header */}
        <div className="space-y-4 pointer-events-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono text-accent-bright">// living systems topology</span>
              <h2 className="text-3xl md:text-5xl font-heading font-bold text-canvas-text leading-none">
                Work Constellation
              </h2>
            </div>
            <p className="text-xs font-mono text-canvas-text-tertiary flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent-bright animate-ping" />
              Click nodes or badges to explore case studies
            </p>
          </div>

          {/* Filter Pills HUD */}
          <div className="flex flex-wrap gap-2 pt-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full font-mono text-xs border transition-all duration-300 pointer-events-auto cursor-pointer ${
                  activeFilter === opt.value
                    ? 'border-accent-bright bg-accent-bright text-canvas-bg shadow-lg shadow-accent-bright/15'
                    : 'border-canvas-border bg-canvas-elevated/40 text-canvas-text-secondary hover:text-canvas-text hover:border-canvas-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile / Fallback representation (pure CSS/interactive list of nodes) */}
        {isMobile ? (
          <div className="grid sm:grid-cols-2 gap-4 w-full pt-6 pointer-events-auto">
            {filteredProjects.map((p) => (
              <TransitionLink
                key={p.slug}
                href={`/work/${p.slug}`}
                className="group p-4 rounded-xl border border-canvas-border bg-canvas-card/30 flex flex-col justify-between gap-3 hover:border-accent-bright/50 transition-colors"
                style={{ '--accent-h': p.accentHue } as React.CSSProperties}
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-accent-bright uppercase tracking-wider">// {p.domain}</span>
                  <h3 className="text-lg font-heading font-bold text-canvas-text group-hover:text-accent-bright transition-colors">
                    {p.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-canvas-elevated border border-canvas-border text-canvas-text-secondary">
                      {t}
                    </span>
                  ))}
                </div>
              </TransitionLink>
            ))}
          </div>
        ) : (
          /* Flexible spacer allowing 3D canvas unobstructed raycasting */
          <div className="flex-1 pointer-events-none min-h-[300px]" />
        )}

        {/* Constellation bottom stats details HUD */}
        <div className="pt-4 border-t border-canvas-border/10 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs text-canvas-text-tertiary pointer-events-auto">
          <div className="flex items-center gap-6">
            <span>// track: {activeFilter === 'All' ? 'Complete Graph' : activeFilter}</span>
            <span>// active_nodes: {filteredProjects.length} / {projectsMetadata.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">// coordinates: riemannian_manifold_s2</span>
            <span className="text-accent-bright">// interactive_manifold: active</span>
          </div>
        </div>
      </div>
    </section>
  );
}
