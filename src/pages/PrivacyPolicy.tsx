import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t, i18n } = useTranslation('privacy');
  const [language, setLanguage] = useState<'ru' | 'en'>(i18n.language === 'en' ? 'en' : 'ru');

  const handleLanguageChange = (lang: 'ru' | 'en') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Навигация */}
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <Home className="h-4 w-4" />
            {t('nav.home')}
          </Link>
          <span>/</span>
          <span className="text-foreground">
            {t('title')}
          </span>
        </nav>
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-2 mb-6">
            <Button
              variant={language === 'ru' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('ru')}
              size="sm"
            >
              {t('languageSwitch.ru')}
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('en')}
              size="sm"
            >
              {t('languageSwitch.en')}
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('lastUpdated')} {new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
          </p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.intro.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('sections.intro.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.dataCollection.title')}</h2>
              <div className="space-y-3">
                <h3 className="text-lg font-medium">{t('sections.dataCollection.personalInfo.title')}</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  {(t('sections.dataCollection.personalInfo.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
                
                <h3 className="text-lg font-medium">{t('sections.dataCollection.fitnessData.title')}</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  {(t('sections.dataCollection.fitnessData.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium">{t('sections.dataCollection.deviceIntegration.title')}</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  {(t('sections.dataCollection.deviceIntegration.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.dataUsage.title')}</h2>
              <p className="text-muted-foreground">{t('sections.dataUsage.intro')}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                {(t('sections.dataUsage.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.dataSecurity.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('sections.dataSecurity.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.dataSharing.title')}</h2>
              <p className="text-muted-foreground">{t('sections.dataSharing.intro')}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                {(t('sections.dataSharing.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.userRights.title')}</h2>
              <p className="text-muted-foreground">{t('sections.userRights.intro')}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                {(t('sections.userRights.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.cookies.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('sections.cookies.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.policyChanges.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('sections.policyChanges.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.contact.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('sections.contact.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('sections.dataRetention.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('sections.dataRetention.content')}
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
