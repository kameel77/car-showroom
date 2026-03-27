# Plan Zabezpieczenia i Optymalizacji Aplikacji (Bot Crawl Storms)

Dokument opisuje plan krótko- i długoterminowych działań mających na celu poprawę stabilności środowiska produkcyjnego oraz uodpornienia aplikacji na agresywny ruch zautomatyzowany (boty SEO, scrapper'y), który objawiał się błędami `504 Gateway Timeout`.

---

## 🏗️ 1. Ochrona na krawędzi sieci (Cloudflare WAF)
*Najbardziej efektywna metoda obrony polega na odcinaniu "szkodliwego" ruchu jeszcze zanim dotrze on do infrastruktury aplikacyjnej (Coolify/VPS).*

### Cele:
- Włączenie **Bot Fight Mode** w Cloudflare, aby ukrócić zautomatyzowane ataki i proste scrapery.
- Dodanie reguł **WAF (Web Application Firewall)** w celu odrzucania mało wartościowych botów (np. `MJ12bot`, `AhrefsBot`, agresywne skanery rosyjskie/chińskie).
- Konfiguracja **Rate Limiting** po stronie Cloudflare dla ścieżek `/nowy/*`, `/oferty-samochodow/*` oraz `/api/`, aby wyłapać wolumetryczne piki u typowych botów SEO bez rykoszetów z Nginx.
- Ustawienie wyjątków dla dobrych crawlerów (`Googlebot`, `Bingbot`), by nie psuć SEO.

### Aktualny status: **Do wdrożenia**

---

## ⚡ 2. Poprawa Cache’owania (Krawędź CDN & Reverse Proxy)
*Odciążenie serwera backend z generowania tych samych widoków/odpowiedzi bazodanowych dla powtarzających się zapytań.*

### Cele:
- Zdefiniowanie rozsądnej polityki `Cache-Control` dla publicznych stron bezstanowych (listingi aut, szczegóły ofert).
- Wdrożenie dyrektywy `stale-while-revalidate` co pozwoli użytkownikowi dostać cached HTML, a w tle zaktualizować go w Cloudflare.
- Omijanie cache (bypass cache) wyłącznie w momencie, w którym klient posiada autoryzujące pliki cookie.
- Krótkie TTL ("negative caching") dla radosnych zapytań botów kończących się nagminnie 404 (odpytywanie o nieistniejące pliki, np. `.env`, puste URL-e).

### Aktualny status: **Do wdrożenia**

---

## ⚙️ 3. Strojenie Limitów Proxy i Nginx
*Uzupełnienie ochrony Nginxa ("Warstwy 0"), by sprawniej radził sobie ze skokami obciążenia.*

### Cele:
- Objęcie całego ruchu na Nginxie testowanym modułem **Real IP** (zrealizowane: `10.0.0.0/8`, `$rate_limit_key`).
- Aktualizacja nagłówków proxy limit aby zmniejszyć długie czasy oczekiwania `proxy_read_timeout` i `proxy_connect_timeout` (maks. ok. 30s zamiast defaultowych wartości >60s). Lepiej szybciej odrzucić błąd niż pozwalać na "queueing storm" i zajmowanie RAMu Nginx'a/Traefika.
- Konfiguracja zrzucania długotrwałych/ciężkich żądań z puli, by chronić główne wątki Node.js i uniknąć blokowania event loopa podczas zmasowanego zapytania do bazy danych we frontendzie (Next.js).

### Aktualny status: **Real_IP Wdrożone. Reszta Timeoutów do optymalizacji.**

---

## 🏎️ 4. Optymalizacja Renderewania SSR & Zapytania Bazy Danych
*Aplikacja (Node.js/Next.js/Supabase) musi móc wydajnie i taniej zarządzać skokami na głębokich adresach URL bez zapytań o wszystko do bazy.*

### Cele:
- Wdrożyć technikę **ISR (Incremental Static Regeneration)** lub **SSG (Static Site Generation)** na głównych stronach z ofertami samochodów. Zamiast budować na żądanie (SSR) – renderujemy statycznie w czasie buildu/przy pierwszym odwiedzeniu i co jakiś czas odświeżamy (`revalidate: X`).
- Dodać Lazy Loading dla kosztownych statystyk i danych pobocznych (sekcja FAQ, translacje pobierane przez front), których boty i tak od razu nie potrzebują.
- Audyt `SQL query` – weryfikacja czy widoki wczytywania aut i filtrów korzystają z poprawnych indeksów bazy (np. sortowania po cenie czy marce). Odciążenie samej instancji bazy DaaS (Supabase).

### Aktualny status: **Plan naprawy w kodzie (Next.js / repo car-showroom)**

---

## 🔭 5. Monitoring i Obserwowalność
*Lepsze wglądy biznesowe i deweloperskie pozwolą w przyszłości reagować wcześniej, nim trajektoria obciążenia zepsuje UX dla klientów.*

### Cele:
- Dołożenie prostych statystyk metryk `response time` w ujęciu per endpoint (Dashboard np. w Grafanie powiązanej z Nginx, albo z perspektywy Cloudflare Analytics).
- Proaktywny alerting po przekroczeniu progu p95 (np. gdy >5% zapytań przekracza 3000ms i jest ryzyko timeoutu).
- Oddzielenie analityki typowego usera (Humans) od zautomatyzowanego Crawlingu (Bots).

### Aktualny status: **Do wdrożenia**

---

> **Następne kroki:** Najwcześniej zaleca się zaatakować **Warstwę 1 (Cloudflare WAF)**, która po wyklikaniu na panelu od ręki daje 80% skuteczności odrzucania złego obciążenia. Od razu po tym należy zapoznać się ze specyfiką `page.tsx` w repozytorium **Next.js** w celu dodania rewalidacji i cacheowania (ISR), by ochronić się logiką frontendu.
