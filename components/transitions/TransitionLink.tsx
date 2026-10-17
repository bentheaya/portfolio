'use client';

import React from 'react';
import { usePageTransition } from './TransitionContext';

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export function TransitionLink({ href, children, onClick, ...props }: TransitionLinkProps) {
  const { startTransition } = usePageTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Invoke custom onClick first if provided (e.g., closing mobile menu)
    onClick?.(e);

    // Let browser handle modifier clicks or external links
    if (
      e.defaultPrevented ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      href.startsWith('http') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      props.target === '_blank'
    ) {
      return;
    }

    e.preventDefault();

    // Capture cursor coordinates for transition origin alignment
    const cursorX = e.clientX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
    const cursorY = e.clientY || (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
    startTransition(href, cursorX, cursorY);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
