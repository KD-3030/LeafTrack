'use client';

import { Mail, Phone, MapPin } from 'lucide-react';
import { AnimatedSection, StaggeredChildren, StaggeredChild } from './AnimatedSection';

interface ContactProps {
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function Contact({
  title = 'Get in Touch',
  subtitle = "We'd Love to Hear from You",
  email = 'contact@sohagtea.in',
  phone = '',
  address = '',
}: ContactProps) {
  const contactItems = [
    { icon: Mail, label: 'Email', value: email, href: `mailto:${email}` },
    ...(phone
      ? [{ icon: Phone, label: 'Phone', value: phone, href: `tel:${phone.replace(/\s/g, '')}` }]
      : []),
    ...(address ? [{ icon: MapPin, label: 'Address', value: address, href: '' }] : []),
  ];

  return (
    <section id="contact" className="py-24 sm:py-32 bg-landing-bg">
      <div className="max-w-4xl mx-auto px-6">
        {/* Heading */}
        <AnimatedSection className="text-center mb-16">
          <p className="text-sm font-heading font-semibold text-landing-accent tracking-widest uppercase mb-3">
            {subtitle}
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-landing-dark mb-4">
            {title}
          </h2>
          <div className="w-16 h-0.5 bg-landing-primary mx-auto" />
        </AnimatedSection>

        {/* Contact cards */}
        <StaggeredChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {contactItems.map((item) => (
            <StaggeredChild key={item.label}>
              {item.href ? (
                <a
                  href={item.href}
                  className="flex flex-col items-center text-center p-8 rounded-2xl bg-landing-cream/80 hover:bg-white/80 shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-full bg-landing-primary/10 flex items-center justify-center mb-4 group-hover:bg-landing-primary/20 transition-colors">
                    <item.icon className="w-5 h-5 text-landing-primary" />
                  </div>
                  <div className="text-xs font-heading font-semibold text-landing-dark/50 tracking-widest uppercase mb-1">
                    {item.label}
                  </div>
                  <div className="text-sm text-landing-dark font-medium break-all">
                    {item.value}
                  </div>
                </a>
              ) : (
                <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-landing-cream/80 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-landing-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-landing-primary" />
                  </div>
                  <div className="text-xs font-heading font-semibold text-landing-dark/50 tracking-widest uppercase mb-1">
                    {item.label}
                  </div>
                  <div className="text-sm text-landing-dark font-medium">{item.value}</div>
                </div>
              )}
            </StaggeredChild>
          ))}
        </StaggeredChildren>
      </div>
    </section>
  );
}
