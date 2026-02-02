import { redirect } from 'next/navigation';

export default function LocaleRootPage() {
  // In MVP, redirect to landing page
  // Later this can be changed to show offers or partner selection
  redirect('/');
}
