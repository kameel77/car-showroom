import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Car, 
  Users, 
  DollarSign, 
  Shield, 
  Mail,
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Car Showroom - Exclusive Vehicle Offers',
  description: 'Access curated vehicle offers with special pricing. Simple, elegant presentation and private access to your personalized showroom.',
};

export default function LandingPage() {
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
              href="/pro"
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              For Dealers →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm mb-6">
              <Lock className="h-4 w-4" />
              <span>Private Access Only</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Exclusive Vehicle Offers
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Discover carefully selected vehicles with special pricing, tailored just for you
            </p>
            <div className="bg-white/10 rounded-lg p-4 max-w-lg mx-auto">
              <p className="text-sm text-blue-100">
                <strong>Have a dedicated link?</strong> Use it to access your personalized showroom with exclusive offers.
              </p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Benefits For You */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              For You
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to find your perfect vehicle
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Benefit 1 - Selected Offers */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Selected Offers
              </h3>
              <p className="text-gray-600 text-sm">
                Hand-picked, high-quality vehicles that meet our strict standards
              </p>
            </div>

            {/* Benefit 2 - Special Prices */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Special Prices
              </h3>
              <p className="text-gray-600 text-sm">
                Exclusive pricing you won't find anywhere else
              </p>
            </div>

            {/* Benefit 3 - Simple Presentation */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Simple Presentation
              </h3>
              <p className="text-gray-600 text-sm">
                Clean, elegant design that makes browsing a pleasure
              </p>
            </div>

            {/* Benefit 4 - Private Access */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Private Access
              </h3>
              <p className="text-gray-600 text-sm">
                Your personal showroom, accessible only through your dedicated link
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Access */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How to Access Your Offers
              </h2>
              <p className="text-lg text-gray-600">
                Getting started is simple
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Receive Your Dedicated Link</h3>
                    <p className="text-gray-600 text-sm">
                      Your partner or dealer will provide you with a personalized link to your showroom
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Browse Exclusive Offers</h3>
                    <p className="text-gray-600 text-sm">
                      Explore carefully selected vehicles with special pricing just for you
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Contact Your Dealer</h3>
                    <p className="text-gray-600 text-sm">
                      Found something you like? Reach out directly to your dealer to proceed
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  <p>
                    <strong>Don't have a link yet?</strong> Contact your dealer or partner to receive access to exclusive offers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Dealers Section */}
      <section className="py-16 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Are you a dealer or sales professional?
              </h2>
              <p className="text-gray-600">
                Create your own branded showroom with custom pricing for your clients
              </p>
            </div>
            <Link
              href="/pro"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              Learn More
              <Car className="h-5 w-5" />
            </Link>
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
              © {new Date().getFullYear()} Car Showroom. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
