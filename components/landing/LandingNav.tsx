'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Products', href: '#products' },
    { label: 'Why Us', href: '#features' },
    { label: 'Contact', href: '#contact' },
  ];

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-landing-cream/95 backdrop-blur-md shadow-sm border-b border-landing-muted/30'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-3"
        >
          <Image
            src="/logo-light.png"
            alt="Sohag Tea"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span
            className={`text-lg font-heading font-semibold tracking-wider transition-colors duration-500 ${
              scrolled ? 'text-landing-dark' : 'text-landing-dark'
            }`}
          >
            SOHAG TEA
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleSmoothScroll(e, link.href)}
              className="text-sm font-medium tracking-wide text-landing-dark/70 hover:text-landing-primary transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className="text-sm font-medium px-5 py-2 rounded-full bg-landing-primary text-white hover:bg-landing-dark transition-colors duration-300"
          >
            Login
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-landing-dark"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-landing-cream/98 backdrop-blur-md border-t border-landing-muted/30"
        >
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="block text-sm font-medium text-landing-dark/70 hover:text-landing-primary py-2"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              className="block text-center text-sm font-medium px-5 py-2.5 rounded-full bg-landing-primary text-white hover:bg-landing-dark transition-colors mt-2"
            >
              Login
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
