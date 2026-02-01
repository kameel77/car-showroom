# Car Showroom

Prosta aplikacja Next.js do wyświetlania ofert pojazdów z Supabase.

## Funkcje

- **Listing Page** - siatka ofert z filtrowaniem
- **Offer Page** - szczegóły pojazdu ze zdjęciami
- **Wielojęzyczność** - wsparcie dla PL, EN, DE
- **Responsywny design** - działa na desktop i mobile
- **Ładowanie danych** - Server Side Rendering z Next.js

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase
- next-intl (i18n)
- Lucide React (ikony)

## Konfiguracja

1. Skopiuj `.env.example` do `.env.local` i uzupełnij dane Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=twoj_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj_supabase_anon_key_here
```

2. Zainstaluj zależności:

```bash
npm install
```

3. Uruchom aplikację:

```bash
npm run dev
```

Aplikacja będzie dostępna pod `http://localhost:3000`

## Struktura projektu

```
src/
├── app/[locale]/          # Strony z i18n
│   ├── page.tsx           # Listing ofert
│   └── offer/[id]/        # Strona oferty
├── components/            # Komponenty React
├── i18n/                  # Konfiguracja i18n
├── lib/                   # Konfiguracja Supabase
├── types/                 # TypeScript types
└── middleware.ts          # Middleware i18n
```

## Baza danych

Aplikacja korzysta z tabeli `car_offers` w Supabase. Schemat znajdziesz w:
`/Users/kamiltonkowicz/Documents/Coding/chrome-ext/chrome-ext-otomoto/supabase_schema.sql`

## Dostępne języki

- Polski (PL) - domyślny
- English (EN)
- Deutsch (DE)

## Deployment

Aplikacja może być wdrożona na Vercel, Netlify lub inną platformę wspierającą Next.js.

```bash
npm run build
```
