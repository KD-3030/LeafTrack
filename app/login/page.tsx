import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In | SohagTea Manage',
  description: 'Sign in to SohagTea Manage — your enterprise tea distribution platform.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
