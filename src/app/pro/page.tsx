import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Car, 
  Users, 
  DollarSign, 
  Shield, 
  ArrowRight, 
  Mail,
  CheckCircle2,
  Building2,
  Percent
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Car Showroom - Profesjonalny showroom samochodowy dla Twojej firmy',
  description: 'Otrzymaj dostęp do wyselekcjonowanych ofert samochodowych z możliwością ustawienia własnych cen i marż. Skontaktuj się z nami już dziś!',
};

export default function ProLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Car Showroom</span>
            </div>
            <Link 
              href="/"
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              ← Back to main page
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Profesjonalny showroom samochodowy dla Twojej firmy
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Otrzymaj dostęp do wyselekcjonowanych ofert samochodowych i prezentuj je swoim klientom z własnymi cenami
            </p>
            <a
              href="mailto:showroom@finarena.pl"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              <Mail className="h-5 w-5" />
              Skontaktuj się z nami
            </a>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Jak to działa?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Trzy proste kroki do własnego showroomu samochodowego
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                1. Wybieramy najlepsze oferty
              </h3>
              <p className="text-gray-600">
                Przygotowujemy wyselekcjonowaną listę pojazdów dostosowaną do profilu Twojej firmy
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Percent className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                2. Ustawiasz własne ceny
              </h3>
              <p className="text-gray-600">
                Definiujesz marżę procentową lub ustalasz indywidualne ceny dla każdego pojazdu
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                3. Otrzymujesz dedykowany link
              </h3>
              <p className="text-gray-600">
                Twoi klienci widzą profesjonalny showroom z Twoimi ofertami i cenami
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Dlaczego warto?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Benefity współpracy z naszym showroomem
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Benefit 1 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <Car className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Wyselekcjonowane oferty
              </h3>
              <p className="text-gray-600 text-sm">
                Dostęp do sprawdzonych, wysokiej jakości pojazdów
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <DollarSign className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Własne ceny i marże
              </h3>
              <p className="text-gray-600 text-sm">
                Pełna kontrola nad cenami - marża procentowa lub ceny indywidualne
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <Users className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Prosta prezentacja
              </h3>
              <p className="text-gray-600 text-sm">
                Profesjonalny wygląd i łatwa nawigacja dla Twoich klientów
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <Shield className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Prywatny dostęp
              </h3>
              <p className="text-gray-600 text-sm">
                Dedykowany link tylko dla Ciebie - bez indeksowania w Google
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Chcesz własny showroom?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Skontaktuj się z nami, aby dowiedzieć się więcej o możliwościach współpracy i otrzymać dostęp do showroomu dla Twojej firmy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:showroom@finarena.pl"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Mail className="h-5 w-5" />
                showroom@finarena.pl
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-blue-500" />
              <span className="text-lg font-semibold text-white">Car Showroom</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Car Showroom. Wszystkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
