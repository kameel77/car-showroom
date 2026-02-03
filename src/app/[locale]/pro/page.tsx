import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import {
    Car,
    Users,
    DollarSign,
    Shield,
    Mail,
    CheckCircle2,
    Building2,
    Percent
} from 'lucide-react';
import { Metadata } from 'next';

interface ProLandingPageProps {
    params: Promise<{
        locale: string;
    }>;
}

export async function generateMetadata({ params }: ProLandingPageProps): Promise<Metadata> {
    const t = await getTranslations('pro.metadata');

    return {
        title: t('title'),
        description: t('description'),
    };
}

export default async function ProLandingPage({ params }: ProLandingPageProps) {
    const { locale } = await params;
    const t = await getTranslations('pro');

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
                            href={`/${locale}`}
                            className="text-sm text-gray-600 hover:text-blue-600"
                        >
                            {t('nav.backToMain')}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 lg:py-32">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                            {t('hero.title')}
                        </h1>
                        <p className="text-xl text-blue-100 mb-8">
                            {t('hero.subtitle')}
                        </p>
                        <a
                            href="mailto:showroom@finarena.pl"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                        >
                            <Mail className="h-5 w-5" />
                            {t('hero.cta')}
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
                            {t('howItWorks.title')}
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            {t('howItWorks.subtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Step 1 */}
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {t('howItWorks.step1.title')}
                            </h3>
                            <p className="text-gray-600">
                                {t('howItWorks.step1.description')}
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Percent className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {t('howItWorks.step2.title')}
                            </h3>
                            <p className="text-gray-600">
                                {t('howItWorks.step2.description')}
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                {t('howItWorks.step3.title')}
                            </h3>
                            <p className="text-gray-600">
                                {t('howItWorks.step3.description')}
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
                            {t('benefits.title')}
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            {t('benefits.subtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {/* Benefit 1 */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <Car className="h-10 w-10 text-blue-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {t('benefits.item1.title')}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {t('benefits.item1.description')}
                            </p>
                        </div>

                        {/* Benefit 2 */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <DollarSign className="h-10 w-10 text-blue-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {t('benefits.item2.title')}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {t('benefits.item2.description')}
                            </p>
                        </div>

                        {/* Benefit 3 */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <Users className="h-10 w-10 text-blue-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {t('benefits.item3.title')}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {t('benefits.item3.description')}
                            </p>
                        </div>

                        {/* Benefit 4 */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <Shield className="h-10 w-10 text-blue-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {t('benefits.item4.title')}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {t('benefits.item4.description')}
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
                            {t('cta.title')}
                        </h2>
                        <p className="text-lg text-gray-600 mb-8">
                            {t('cta.description')}
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
                            © {new Date().getFullYear()} Car Showroom. {t('footer.allRightsReserved')}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
