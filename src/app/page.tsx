import { redirect } from 'next/navigation';

// This page redirects to the default locale
export default function RootPage() {
  redirect('/pl');
}
