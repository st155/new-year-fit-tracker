import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Privacy = () => {
  const { t } = useTranslation('privacy');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>

        <Card>
          <CardHeader>
<CardTitle className="text-2xl">{t('title')}</CardTitle>
            <p className="text-muted-foreground">{t('lastUpdatedFull')}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.intro.title')}</h2>
              <p>{t('sections.intro.content')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.dataCollection.title')}</h2>
              <div className="space-y-3">
                <h3 className="text-lg font-medium">{t('sections.dataCollection.personalInfo.title')}</h3>
                <ul className="list-disc pl-6 space-y-2">
                  {(t('sections.dataCollection.personalInfo.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
                
                <h3 className="text-lg font-medium">{t('sections.dataCollection.fitnessData.title')}</h3>
                <ul className="list-disc pl-6 space-y-2">
                  {(t('sections.dataCollection.fitnessData.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium">{t('sections.dataCollection.deviceIntegration.title')}</h3>
                <ul className="list-disc pl-6 space-y-2">
                  {(t('sections.dataCollection.deviceIntegration.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.dataUsage.title')}</h2>
              <p className="mb-3">{t('sections.dataUsage.intro')}</p>
              <ul className="list-disc pl-6 space-y-2">
                {(t('sections.dataUsage.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.dataSecurity.title')}</h2>
              <p>{t('sections.dataSecurity.content')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.dataSharing.title')}</h2>
              <p className="mb-3">{t('sections.dataSharing.intro')}</p>
              <ul className="list-disc pl-6 space-y-2">
                {(t('sections.dataSharing.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.userRights.title')}</h2>
              <p className="mb-3">{t('sections.userRights.intro')}</p>
              <ul className="list-disc pl-6 space-y-2">
                {(t('sections.userRights.items', { returnObjects: true }) as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.cookies.title')}</h2>
              <p>{t('sections.cookies.content')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.policyChanges.title')}</h2>
              <p>{t('sections.policyChanges.content')}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.contact.title')}</h2>
              <p>
                {t('sections.contact.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">{t('sections.dataRetention.title')}</h2>
              <p>{t('sections.dataRetention.content')}</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
