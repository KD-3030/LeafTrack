'use client';

import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { About } from '@/components/landing/About';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { Features } from '@/components/landing/Features';
import { Contact } from '@/components/landing/Contact';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface CMSSection {
  section_key: string;
  content: Record<string, unknown>;
}

interface LandingPageProps {
  sections: Record<string, CMSSection>;
}

export function LandingPage({ sections }: LandingPageProps) {
  const hero = sections.hero?.content || {};
  const about = sections.about?.content || {};
  const features = sections.features?.content || {};
  const productsHeading = sections.products_heading?.content || {};
  const contact = sections.contact?.content || {};
  const footer = sections.footer?.content || {};

  return (
    <div className="min-h-screen bg-landing-bg font-sans antialiased">
      <LandingNav />

      <Hero
        title={hero.title as string}
        subtitle={hero.subtitle as string}
        description={hero.description as string}
        cta_text={hero.cta_text as string}
        cta_link={hero.cta_link as string}
      />

      <About
        title={about.title as string}
        subtitle={about.subtitle as string}
        description={about.description as string}
        image_url={about.image_url as string}
        stats={about.stats as { label: string; value: string }[]}
      />

      <ProductShowcase
        heading_title={productsHeading.title as string}
        heading_subtitle={productsHeading.subtitle as string}
      />

      <Features
        title={features.title as string}
        subtitle={features.subtitle as string}
        features={features.items as { icon: string; title: string; description: string }[]}
      />

      <Contact
        title={contact.title as string}
        subtitle={contact.subtitle as string}
        email={contact.email as string}
        phone={contact.phone as string}
        address={contact.address as string}
      />

      <LandingFooter
        tagline={footer.tagline as string}
        copyright={footer.copyright as string}
      />

      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Sohag Tea',
            url: 'https://sohagtea.in',
            logo: 'https://sohagtea.in/logo-light.png',
            description:
              'Premium tea distribution and wholesale supply across India.',
            contactPoint: {
              '@type': 'ContactPoint',
              email: (contact.email as string) || 'contact@sohagtea.in',
              contactType: 'customer service',
            },
          }),
        }}
      />
    </div>
  );
}
