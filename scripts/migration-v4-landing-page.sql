-- V4 Migration: Landing Page CMS
-- Adds landing_content table and product landing fields

-- 1. Landing content CMS table
CREATE TABLE IF NOT EXISTS sohag.landing_content (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key    TEXT UNIQUE NOT NULL,
  content        JSONB NOT NULL DEFAULT '{}',
  is_active      BOOLEAN DEFAULT true,
  display_order  INTEGER DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION sohag.update_landing_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_landing_content_updated ON sohag.landing_content;
CREATE TRIGGER trg_landing_content_updated
  BEFORE UPDATE ON sohag.landing_content
  FOR EACH ROW EXECUTE FUNCTION sohag.update_landing_content_timestamp();

-- 2. Add landing fields to products table
ALTER TABLE sohag.products
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 3. Index for featured products query
CREATE INDEX IF NOT EXISTS idx_products_featured
  ON sohag.products (is_featured, display_order)
  WHERE is_featured = true;

-- 4. Seed default landing content
INSERT INTO sohag.landing_content (section_key, content, display_order) VALUES
  ('hero', '{
    "title": "Sohag Tea",
    "subtitle": "Premium Tea Distribution",
    "description": "Crafting excellence in every leaf. Premium quality tea sourced from the finest gardens, delivered with care to distributors across India.",
    "cta_text": "Explore Our Products",
    "cta_link": "#products"
  }', 1),
  ('about', '{
    "title": "Our Story",
    "subtitle": "A Legacy of Quality",
    "description": "Sohag Tea has been a trusted name in the tea industry, bringing the finest teas from the lush gardens of Assam and Darjeeling to tea lovers everywhere. Our commitment to quality, sustainability, and fair trade practices sets us apart.",
    "image_url": ""
  }', 2),
  ('features', '{
    "title": "Why Choose Sohag Tea",
    "subtitle": "What Sets Us Apart",
    "items": [
      {"title": "Premium Quality", "description": "Handpicked leaves from the finest tea gardens of Assam and Darjeeling", "icon": "leaf"},
      {"title": "Direct Sourcing", "description": "Farm-to-cup freshness with no middlemen, ensuring the best prices", "icon": "truck"},
      {"title": "Wide Selection", "description": "From classic CTC to premium orthodox teas, we have it all", "icon": "package"},
      {"title": "Trusted Partner", "description": "Reliable supply chain and consistent quality for your business", "icon": "shield"}
    ]
  }', 3),
  ('products_heading', '{
    "title": "Our Products",
    "subtitle": "Discover Our Premium Collection"
  }', 4),
  ('contact', '{
    "title": "Get In Touch",
    "subtitle": "We would love to hear from you",
    "phone": "+91 98765 43210",
    "email": "info@sohagtea.in",
    "address": "Tea Estate Road, Bagdogra, Siliguri, West Bengal 734421"
  }', 5),
  ('footer', '{
    "copyright": "Sohag Tea. All rights reserved.",
    "tagline": "Premium Tea Distribution & Wholesale Supply"
  }', 6),
  ('seo', '{
    "title": "Sohag Tea — Premium Tea Distribution & Wholesale Supplier",
    "description": "Sohag Tea is a leading tea distributor and wholesale supplier offering premium quality teas from Assam and Darjeeling. Reliable distribution, competitive pricing, and exceptional quality.",
    "keywords": "sohag, sohag tea, sohagtea, tea distributor, tea wholesale, premium tea, bulk tea, tea supplier, Assam tea, Darjeeling tea"
  }', 7)
ON CONFLICT (section_key) DO NOTHING;
