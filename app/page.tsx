import { LandingPage } from './LandingClient';

export const dynamic = 'force-dynamic';

interface CMSSections {
  [key: string]: {
    section_key: string;
    content: Record<string, unknown>;
  };
}

async function getCMSContent(): Promise<CMSSections> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(':54321', ':3000') || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/cms`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.sections || {};
    }
  } catch {
    // CMS not set up yet — use defaults
  }
  return {};
}

export default async function Home() {
  const sections = await getCMSContent();
  return <LandingPage sections={sections} />;
}