'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';

interface HeroProps {
  title?: string;
  subtitle?: string;
  description?: string;
  cta_text?: string;
  cta_link?: string;
}

export function Hero({
  title = 'Sohag Tea',
  subtitle = 'Premium Tea Distribution',
  description = 'Crafting excellence in every leaf. Premium quality tea sourced from the finest gardens, delivered with care to distributors across India.',
  cta_text = 'Explore Our Products',
  cta_link = '#products',
}: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const handleCTA = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.querySelector(cta_link);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-landing-bg"
    >
      {/* Subtle decorative circles (organic feel) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full border border-landing-primary/10" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full border border-landing-accent/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-landing-primary/5" />
      </div>

      <motion.div style={{ y, opacity }} className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
          className="flex justify-center mb-8"
        >
          <Image
            src="/logo-light.png"
            alt="Sohag Tea Logo"
            width={140}
            height={140}
            className="rounded-full shadow-lg"
            priority
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-landing-dark tracking-tight mb-4"
        >
          {title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-xl sm:text-2xl font-heading font-medium text-landing-primary tracking-widest uppercase mb-6"
        >
          {subtitle}
        </motion.p>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="w-24 h-0.5 bg-landing-accent mx-auto mb-8"
        />

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-base sm:text-lg text-landing-dark/70 leading-relaxed max-w-xl mx-auto mb-10"
        >
          {description}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <a
            href={cta_link}
            onClick={handleCTA}
            className="inline-block px-8 py-3.5 rounded-full bg-landing-primary text-white font-medium tracking-wide hover:bg-landing-dark transition-all duration-300 shadow-md hover:shadow-lg"
          >
            {cta_text}
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator — anchored to section bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border-2 border-landing-dark/30 flex justify-center pt-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-landing-dark/40" />
          </motion.div>
        </motion.div>
    </section>
  );
}
