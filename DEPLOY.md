# Coolify Deployment Guide

## Wymagania wstępne

1. **Konto Coolify** - zarejestruj się na coolify.io lub użyj self-hosted
2. **Repozytorium Git** - projekt musi być w GitHub/GitLab/Bitbucket
3. **Supabase** - działająca baza danych z tabelą car_offers

## Krok po kroku - Deployment

### 1. Przygotowanie repozytorium

```bash
# Upewnij się że wszystko jest zcommitowane
git status

# Jeśli masz zmiany:
git add .
git commit -m "Ready for Coolify deployment"

# Push na GitHub
git push origin main
```

### 2. Konfiguracja w Coolify

1. **Zaloguj się do Coolify Dashboard**
2. **Kliknij "+ Create"** → "Application"
3. **Wybierz Źródło**:
   - GitHub / GitLab / Bitbucket
   - Wybierz repozytorium `car-showroom`
4. **Wybierz Branch**: `main`

### 3. Ustawienia Build

Coolify automatycznie wykryje Next.js przez Nixpacks.

**Build Command** (jeśli nie wykryte automatycznie):
```
npm ci && npm run build
```

**Start Command**:
```
npm start
```

### 4. Zmienne Środowiskowe (WAŻNE!)

W Coolify Dashboard → Twoja aplikacja → "Environment Variables":

```
NEXT_PUBLIC_SUPABASE_URL=https://krqwvegfxnlwdhgjuflh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twój_klucz_anon
```

**Jak znaleźć wartości:**
1. Wejdź w Supabase Dashboard
2. Project Settings → API
3. Skopiuj `URL` i `anon public`

### 5. Ustawienia zaawansowane

W Coolify:
- **Port**: 3000 (domyślny dla Next.js)
- **Healthcheck**: `/` (strona główna)
- **Build Pack**: Nixpacks (automatycznie)

### 6. Deploy

Kliknij **"Deploy"** i poczekaj na zakończenie buildu (2-5 minut).

## Rozwiązywanie problemów

### Problem: "Cannot find module"
```bash
# W Coolify przebuduj z czystym cache:
# Dashboard → Application → "Restart" z opcją "Clear Build Cache"
```

### Problem: Brak dostępu do Supabase
Sprawdź czy zmienne środowiskowe są poprawnie ustawione w Coolify.

### Problem: Favicon nie działa
Upewnij się że favicon_url w tabeli app_settings w Supabase wskazuje na publiczny URL.

## Po wdrożeniu

1. **Ustaw domenę**:
   - Coolify → Application → Domains
   - Dodaj swoją domenę lub użyj domyślnej z Coolify

2. **Włącz HTTPS**:
   - Automatycznie przez Let's Encrypt

3. **Skonfiguruj filtry** (opcjonalnie):
   - Wejdź na `/admin/filters`
   - Dodaj marki które chcesz wyświetlać

4. **Skonfiguruj ustawienia**:
   - Ustaw logo, favicon, dane kontaktowe w tabeli `app_settings` w Supabase

## Linki

- Coolify Dashboard: https://app.coolify.io
- Twoja aplikacja: https://<nazwa>.coolify.app (lub Twoja domena)
- Panel admina: https://<nazwa>.coolify.app/pl/admin/filters

## Aktualizacje

Aby zaktualizować aplikację:
1. Zrób zmiany lokalnie
2. `git commit` i `git push`
3. Coolify automatycznie zdeployuje nową wersję (webhook)

Lub ręcznie w Coolify: Dashboard → Application → "Restart"
