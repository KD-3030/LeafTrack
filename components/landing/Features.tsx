'use client';

import { Leaf, Truck, Package, Shield } from 'lucide-react';
import { AnimatedSection, StaggeredChildren, StaggeredChild } from './AnimatedSection';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesProps {
  title?: string;
  subtitle?: string;
  features?: Feature[];
}

const iconMap: Record<string, React.ElementType> = {
  leaf: Leaf,
  truck: Truck,
  package: Package,
  shield: Shield,
};

export function Features({
  title = 'Why Choose Us',
  subtitle = 'What Sets Sohag Tea Apart',
  features = [
    {
      icon: 'leaf',
      title: 'Premium Quality',
      description: 'Sourced from top tea gardens, every blend is tested for consistency and taste.',
    },
    {
      icon: 'truck',
      title: 'Reliable Distribution',
      description: 'Efficient supply chain ensuring timely delivery to every distributor and retailer.',
    },
    {
      icon: 'package',
      title: 'Wide Range',
      description: 'From CTC to specialty blends, a comprehensive catalog tailored to market demand.',
    },
    {
      icon: 'shield',
      title: 'Trusted Partner',
      description: 'Transparent pricing, GST-compliant invoicing, and dedicated support for all partners.',
    },
  ],
}: FeaturesProps) {
  return (
    <section id="features" className="py-24 sm:py-32 bg-landing-cream">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section heading */}
        <AnimatedSection className="text-center mb-16">
          <p className="text-sm font-heading font-semibold text-landing-accent tracking-widest uppercase mb-3">
            {subtitle}
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-landing-dark mb-4">
            {title}
          </h2>
          <div className="w-16 h-0.5 bg-landing-primary mx-auto" />
        </AnimatedSection>

        {/* Feature cards */}
        <StaggeredChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon] || Leaf;
            return (
              <StaggeredChild key={feature.title}>
                <div className="group text-center p-8 rounded-2xl bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-landing-primary/10 text-landing-primary mb-6 group-hover:bg-landing-primary group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-landing-dark mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-landing-dark/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </StaggeredChild>
            );
          })}
        </StaggeredChildren>
      </div>
    </section>
  );
}
