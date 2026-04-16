'use client';

import Image from 'next/image';

interface LandingFooterProps {
  tagline?: string;
  copyright?: string;
}

export function LandingFooter({
  tagline = 'Premium Tea Distribution',
  copyright,
}: LandingFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-landing-dark text-white/80 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <Image
            src="/logo-dark.png"
            alt="Sohag Tea"
            width={80}
            height={80}
            className="rounded-full mb-4 opacity-90"
          />

          {/* Brand name */}
          <h3 className="text-xl font-display font-bold text-white tracking-wide mb-1">
            Sohag Tea
          </h3>
          <p className="text-sm text-white/50 font-heading tracking-widest uppercase">
            {tagline}
          </p>

          {/* Divider */}
          <div className="w-12 h-px bg-white/20 my-8" />

          {/* Nav links */}
          <nav className="flex flex-wrap justify-center gap-6 mb-8">
            {['About', 'Products', 'Why Us', 'Contact'].map((item) => {
              const href =
                item === 'Why Us'
                  ? '#features'
                  : `#${item.toLowerCase()}`;
              return (
                <a
                  key={item}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-sm text-white/50 hover:text-white transition-colors duration-200"
                >
                  {item}
                </a>
              );
            })}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-white/30">
            {copyright || `© ${year} Sohag Tea. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
