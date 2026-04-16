'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedSection } from './AnimatedSection';

interface ProductItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  hsn_code?: string;
}

interface ProductShowcaseProps {
  heading_title?: string;
  heading_subtitle?: string;
}

export function ProductShowcase({
  heading_title = 'Our Products',
  heading_subtitle = 'Handpicked Blends for Every Palate',
}: ProductShowcaseProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    slidesToScroll: 1,
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/cms/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <section id="products" className="py-24 sm:py-32 bg-landing-bg">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section heading */}
        <AnimatedSection className="text-center mb-16">
          <p className="text-sm font-heading font-semibold text-landing-accent tracking-widest uppercase mb-3">
            {heading_subtitle}
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-landing-dark mb-4">
            {heading_title}
          </h2>
          <div className="w-16 h-0.5 bg-landing-primary mx-auto" />
        </AnimatedSection>

        {loading ? (
          <div className="flex gap-8 justify-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse w-72 shrink-0">
                <div className="aspect-[3/4] rounded-2xl bg-landing-muted/40 mb-4" />
                <div className="h-5 bg-landing-muted/40 rounded w-3/4 mb-2" />
                <div className="h-4 bg-landing-muted/30 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <AnimatedSection>
            <div className="relative">
              {/* Carousel viewport */}
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex-[0_0_280px] sm:flex-[0_0_320px] lg:flex-[0_0_360px] min-w-0"
                    >
                      <div className="group bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                        {/* Product image */}
                        <div className="relative aspect-[3/4] overflow-hidden bg-landing-cream">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-landing-primary/10 to-landing-accent/10">
                              <svg
                                className="w-16 h-16 text-landing-primary/30"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1}
                              >
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Product info */}
                        <div className="p-6">
                          <h3 className="text-lg font-heading font-semibold text-landing-dark group-hover:text-landing-primary transition-colors duration-300">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-sm text-landing-dark/60 mt-2 line-clamp-3">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation arrows */}
              {products.length > 1 && (
                <>
                  <button
                    onClick={() => emblaApi?.scrollPrev()}
                    disabled={!canPrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-landing-dark hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
                    aria-label="Previous product"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => emblaApi?.scrollNext()}
                    disabled={!canNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-landing-dark hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
                    aria-label="Next product"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Dots indicator */}
              {products.length > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {products.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i === selectedIndex
                          ? 'bg-landing-primary w-6'
                          : 'bg-landing-muted hover:bg-landing-primary/50'
                      }`}
                      aria-label={`Go to product ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </AnimatedSection>
        ) : (
          <AnimatedSection className="text-center py-16">
            <p className="text-landing-dark/50 text-lg">Products coming soon.</p>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
}
