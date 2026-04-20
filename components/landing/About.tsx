'use client';

import Image from 'next/image';
import { AnimatedSection, StaggeredChildren, StaggeredChild } from './AnimatedSection';

interface AboutProps {
  title?: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  stats?: { label: string; value: string }[];
}

export function About({
  title = 'Our Story',
  subtitle = 'Rooted in Tradition, Driven by Quality',
  description = 'For years, Sohag Tea has been a trusted name in tea distribution across India. We partner directly with tea gardens to bring you the freshest, most flavorful blends — ensuring quality from garden to cup. Our commitment to excellence and our deep understanding of the tea trade set us apart.',
  image_url,
  stats = [
    { label: 'Years in Business', value: '10+' },
    { label: 'Distributors', value: '50+' },
    { label: 'Products', value: '20+' },
    { label: 'States Served', value: '5+' },
  ],
}: AboutProps) {
  return (
    <section id="about" className="py-24 sm:py-32 bg-landing-cream">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image / visual block */}
          <AnimatedSection delay={0.1}>
            <div className="relative">
              {image_url ? (
                <Image
                  src={image_url}
                  alt="About Sohag Tea"
                  width={560}
                  height={400}
                  className="rounded-2xl object-cover shadow-xl"
                />
              ) : (
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-landing-primary/20 to-landing-accent/20 flex items-center justify-center shadow-xl">
                  <Image
                    src="/logo-light.png"
                    alt="Sohag Tea"
                    width={120}
                    height={120}
                    className="opacity-60 rounded-full"
                  />
                </div>
              )}
              {/* Decorative element */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-xl border-2 border-landing-primary/20 -z-10" />
            </div>
          </AnimatedSection>

          {/* Text content */}
          <div>
            <AnimatedSection delay={0.2}>
              <p className="text-sm font-heading font-semibold text-landing-accent tracking-widest uppercase mb-3">
                {subtitle}
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-landing-dark mb-6">
                {title}
              </h2>
              <div className="w-16 h-0.5 bg-landing-primary mb-6" />
              <p className="text-landing-dark/70 leading-relaxed text-base sm:text-lg">
                {description}
              </p>
            </AnimatedSection>

            {/* Stats grid */}
            <StaggeredChildren className="grid grid-cols-2 gap-6 mt-10">
              {stats.map((stat) => (
                <StaggeredChild key={stat.label}>
                  <div className="text-center p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                    <div className="text-2xl sm:text-3xl font-display font-bold text-landing-primary">
                      {stat.value}
                    </div>
                    <div className="text-sm text-landing-dark/60 mt-1 font-medium">
                      {stat.label}
                    </div>
                  </div>
                </StaggeredChild>
              ))}
            </StaggeredChildren>
          </div>
        </div>
      </div>
    </section>
  );
}
