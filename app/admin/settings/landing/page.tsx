'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save, RefreshCw, Eye, Plus, Trash2, Upload, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface CMSSection {
  section_key: string;
  content: Record<string, unknown>;
  is_active: boolean;
}

interface ProductItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_featured?: boolean;
  display_order?: number;
}

type TabKey = 'hero' | 'about' | 'features' | 'products' | 'contact' | 'footer';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'hero', label: 'Hero' },
  { key: 'about', label: 'About' },
  { key: 'features', label: 'Features' },
  { key: 'products', label: 'Products' },
  { key: 'contact', label: 'Contact' },
  { key: 'footer', label: 'Footer' },
];

export default function LandingCMSPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [sections, setSections] = useState<Record<string, CMSSection>>({});
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem('leaftrack_token') || localStorage.getItem('token') || '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cmsRes, prodRes] = await Promise.all([
        fetch('/api/cms'),
        fetch('/api/products', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      if (cmsRes.ok) {
        const data = await cmsRes.json();
        const mapped: Record<string, CMSSection> = {};
        for (const [key, val] of Object.entries(data.sections || {})) {
          mapped[key] = val as CMSSection;
        }
        setSections(mapped);
      }

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : prodData.products || []);
      }
    } catch {
      toast.error('Failed to load CMS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveSection = async (sectionKey: string, content: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/cms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ section_key: sectionKey, content }),
      });
      if (res.ok) {
        toast.success(`${sectionKey} section saved`);
        setSections((prev) => ({
          ...prev,
          [sectionKey]: { ...prev[sectionKey], section_key: sectionKey, content, is_active: true },
        }));
      } else {
        const err = await res.json();
        toast.error(err.error || 'Save failed');
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleProductFeatured = async (productId: string, featured: boolean) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ is_featured: featured }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_featured: featured } : p))
        );
        toast.success(featured ? 'Product featured' : 'Product unfeatured');
      }
    } catch {
      toast.error('Failed to update product');
    }
  };

  const updateProduct = async (productId: string, fields: Partial<ProductItem>) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, ...fields } : p))
        );
        toast.success('Product updated');
      }
    } catch {
      toast.error('Failed to update product');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading CMS content...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Landing Page CMS</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage what visitors see on sohagtea.in
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-4 w-4" />
          Preview
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-background border border-b-background -mb-px text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'hero' && (
        <HeroEditor
          content={(sections.hero?.content || {}) as Record<string, string>}
          onSave={(content) => saveSection('hero', content)}
          saving={saving}
        />
      )}
      {activeTab === 'about' && (
        <AboutEditor
          content={(sections.about?.content || {}) as Record<string, unknown>}
          onSave={(content) => saveSection('about', content)}
          saving={saving}
        />
      )}
      {activeTab === 'features' && (
        <FeaturesEditor
          content={(sections.features?.content || {}) as Record<string, unknown>}
          onSave={(content) => saveSection('features', content)}
          saving={saving}
        />
      )}
      {activeTab === 'products' && (
        <ProductsEditor
          products={products}
          headingContent={(sections.products_heading?.content || {}) as Record<string, string>}
          onSaveHeading={(content) => saveSection('products_heading', content)}
          onToggleFeatured={toggleProductFeatured}
          onUpdateProduct={updateProduct}
          saving={saving}
        />
      )}
      {activeTab === 'contact' && (
        <ContactEditor
          content={(sections.contact?.content || {}) as Record<string, string>}
          onSave={(content) => saveSection('contact', content)}
          saving={saving}
        />
      )}
      {activeTab === 'footer' && (
        <FooterEditor
          content={(sections.footer?.content || {}) as Record<string, string>}
          onSave={(content) => saveSection('footer', content)}
          saving={saving}
        />
      )}
    </div>
  );
}

/* ─── Section Editors ────────────────────────────────────────────── */

function HeroEditor({
  content,
  onSave,
  saving,
}: {
  content: Record<string, string>;
  onSave: (c: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: content.title || 'Sohag Tea',
    subtitle: content.subtitle || 'Premium Tea Distribution',
    description: content.description || '',
    cta_text: content.cta_text || 'Explore Our Products',
    cta_link: content.cta_link || '#products',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section</CardTitle>
        <CardDescription>The first thing visitors see — make it count.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />
        <div>
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>
        <Field label="CTA Button Text" value={form.cta_text} onChange={(v) => setForm({ ...form, cta_text: v })} />
        <Field label="CTA Link (e.g. #products)" value={form.cta_link} onChange={(v) => setForm({ ...form, cta_link: v })} />
        <SaveButton saving={saving} onClick={() => onSave(form)} />
      </CardContent>
    </Card>
  );
}

function AboutEditor({
  content,
  onSave,
  saving,
}: {
  content: Record<string, unknown>;
  onSave: (c: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: (content.title as string) || 'Our Story',
    subtitle: (content.subtitle as string) || 'Rooted in Tradition, Driven by Quality',
    description: (content.description as string) || '',
    image_url: (content.image_url as string) || '',
  });

  const [stats, setStats] = useState<{ label: string; value: string }[]>(
    (content.stats as { label: string; value: string }[]) || [
      { label: 'Years in Business', value: '10+' },
      { label: 'Distributors', value: '50+' },
      { label: 'Products', value: '20+' },
      { label: 'States Served', value: '5+' },
    ]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>About Section</CardTitle>
        <CardDescription>Tell your brand story.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />
        <div>
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
        </div>
        <ImageUpload
          label="About Image"
          currentUrl={form.image_url}
          field="landing"
          onUploaded={(url) => setForm({ ...form, image_url: url })}
        />

        <div>
          <Label className="mb-2 block">Stats</Label>
          <div className="space-y-2">
            {stats.map((stat, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={stat.label}
                  onChange={(e) => {
                    const s = [...stats];
                    s[i] = { ...s[i], label: e.target.value };
                    setStats(s);
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={stat.value}
                  onChange={(e) => {
                    const s = [...stats];
                    s[i] = { ...s[i], value: e.target.value };
                    setStats(s);
                  }}
                  className="w-24"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStats(stats.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStats([...stats, { label: '', value: '' }])}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Stat
            </Button>
          </div>
        </div>

        <SaveButton saving={saving} onClick={() => onSave({ ...form, stats })} />
      </CardContent>
    </Card>
  );
}

function FeaturesEditor({
  content,
  onSave,
  saving,
}: {
  content: Record<string, unknown>;
  onSave: (c: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: (content.title as string) || 'Why Choose Us',
    subtitle: (content.subtitle as string) || 'What Sets Sohag Tea Apart',
  });

  const [items, setItems] = useState<{ icon: string; title: string; description: string }[]>(
    (content.items as { icon: string; title: string; description: string }[]) || [
      { icon: 'leaf', title: 'Premium Quality', description: '' },
      { icon: 'truck', title: 'Reliable Distribution', description: '' },
      { icon: 'package', title: 'Wide Range', description: '' },
      { icon: 'shield', title: 'Trusted Partner', description: '' },
    ]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features / Why Choose Us</CardTitle>
        <CardDescription>USPs and differentiators. Icons: leaf, truck, package, shield.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Section Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />

        <div>
          <Label className="mb-2 block">Feature Items</Label>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Icon (leaf, truck, package, shield)"
                    value={item.icon}
                    onChange={(e) => {
                      const upd = [...items];
                      upd[i] = { ...upd[i], icon: e.target.value };
                      setItems(upd);
                    }}
                    className="w-40"
                  />
                  <Input
                    placeholder="Title"
                    value={item.title}
                    onChange={(e) => {
                      const upd = [...items];
                      upd[i] = { ...upd[i], title: e.target.value };
                      setItems(upd);
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    const upd = [...items];
                    upd[i] = { ...upd[i], description: e.target.value };
                    setItems(upd);
                  }}
                  rows={2}
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems([...items, { icon: 'leaf', title: '', description: '' }])}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Feature
            </Button>
          </div>
        </div>

        <SaveButton saving={saving} onClick={() => onSave({ ...form, items })} />
      </CardContent>
    </Card>
  );
}

function ProductsEditor({
  products,
  headingContent,
  onSaveHeading,
  onToggleFeatured,
  onUpdateProduct,
  saving,
}: {
  products: ProductItem[];
  headingContent: Record<string, string>;
  onSaveHeading: (c: Record<string, string>) => void;
  onToggleFeatured: (id: string, featured: boolean) => void;
  onUpdateProduct: (id: string, fields: Partial<ProductItem>) => void;
  saving: boolean;
}) {
  const [heading, setHeading] = useState({
    title: headingContent.title || 'Our Products',
    subtitle: headingContent.subtitle || 'Handpicked Blends for Every Palate',
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Products Section Heading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title" value={heading.title} onChange={(v) => setHeading({ ...heading, title: v })} />
          <Field label="Subtitle" value={heading.subtitle} onChange={(v) => setHeading({ ...heading, subtitle: v })} />
          <SaveButton saving={saving} onClick={() => onSaveHeading(heading)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Featured Products</CardTitle>
          <CardDescription>
            Toggle featured status, add images and descriptions. Click a product to expand its editor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-muted-foreground text-sm">No products found.</p>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  isExpanded={expandedId === product.id}
                  onToggleExpand={() => setExpandedId(expandedId === product.id ? null : product.id)}
                  onToggleFeatured={onToggleFeatured}
                  onUpdateProduct={onUpdateProduct}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProductRow({
  product,
  isExpanded,
  onToggleExpand,
  onToggleFeatured,
  onUpdateProduct,
}: {
  product: ProductItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleFeatured: (id: string, featured: boolean) => void;
  onUpdateProduct: (id: string, fields: Partial<ProductItem>) => void;
}) {
  const [description, setDescription] = useState(product.description || '');
  const [descDirty, setDescDirty] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} width={40} height={40} className="rounded object-cover w-10 h-10" />
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <span className="font-medium">{product.name}</span>
            {product.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-muted-foreground">
            {product.is_featured ? 'Featured' : 'Hidden'}
          </span>
          <Switch
            checked={!!product.is_featured}
            onCheckedChange={(checked) => onToggleFeatured(product.id, checked)}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t pt-3 space-y-3 bg-muted/20">
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setDescDirty(true); }}
              rows={2}
              placeholder="Short description for the landing page"
            />
            {descDirty && (
              <Button
                size="sm"
                className="mt-1"
                onClick={() => { onUpdateProduct(product.id, { description }); setDescDirty(false); }}
              >
                <Save className="h-3 w-3 mr-1" /> Save Description
              </Button>
            )}
          </div>
          <ImageUpload
            label="Product Image"
            currentUrl={product.image_url || ''}
            field="product"
            onUploaded={(url) => onUpdateProduct(product.id, { image_url: url })}
          />
        </div>
      )}
    </div>
  );
}

function ContactEditor({
  content,
  onSave,
  saving,
}: {
  content: Record<string, string>;
  onSave: (c: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: content.title || 'Get in Touch',
    subtitle: content.subtitle || "We'd Love to Hear from You",
    email: content.email || 'contact@sohagtea.in',
    phone: content.phone || '',
    address: content.address || '',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Section Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div>
          <Label>Address</Label>
          <Textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
          />
        </div>
        <SaveButton saving={saving} onClick={() => onSave(form)} />
      </CardContent>
    </Card>
  );
}

function FooterEditor({
  content,
  onSave,
  saving,
}: {
  content: Record<string, string>;
  onSave: (c: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    tagline: content.tagline || 'Premium Tea Distribution',
    copyright: content.copyright || '',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer</CardTitle>
        <CardDescription>Leave copyright blank to auto-generate with current year.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Tagline" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />
        <Field label="Copyright (optional)" value={form.copyright} onChange={(v) => setForm({ ...form, copyright: v })} />
        <SaveButton saving={saving} onClick={() => onSave(form)} />
      </CardContent>
    </Card>
  );
}

/* ─── Shared helpers ─────────────────────────────────────────────── */

function ImageUpload({
  label,
  currentUrl,
  field,
  onUploaded,
}: {
  label: string;
  currentUrl: string;
  field: string;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', field);

      const token = localStorage.getItem('leaftrack_token') || localStorage.getItem('token') || '';
      const res = await fetch('/api/settings/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onUploaded(data.url);
        toast.success('Image uploaded');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex items-start gap-4">
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={label}
            width={80}
            height={80}
            className="rounded-lg object-cover w-20 h-20 border"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            {uploading ? 'Uploading...' : currentUrl ? 'Change Image' : 'Upload Image'}
          </Button>
          <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP. Max 2 MB.</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={saving} className="mt-2">
      {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
      Save
    </Button>
  );
}
