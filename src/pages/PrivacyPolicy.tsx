import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');

  const content = {
    ru: {
      title: "Политика конфиденциальности",
      lastUpdated: "Последнее обновление:",
      sections: {
        intro: {
          title: "1. Введение",
          content: "Настоящая Политика конфиденциальности описывает, как мы собираем, используем, храним и защищаем вашу личную информацию при использовании нашего фитнес-приложения. Мы обязуемся защищать вашу конфиденциальность и обеспечивать безопасность ваших персональных данных."
        },
        dataCollection: {
          title: "2. Собираемая информация",
          personalInfo: {
            title: "2.1 Личная информация",
            items: [
              "Адрес электронной почты для регистрации и авторизации",
              "Профильная информация (имя, возраст, пол)",
              "Фитнес-цели и предпочтения"
            ]
          },
          fitnessData: {
            title: "2.2 Фитнес-данные",
            items: [
              "Данные о физической активности (тренировки, шаги, калории)",
              "Биометрические показатели (вес, процент жира, VO2 Max)",
              "Данные о восстановлении и сне",
              "Фотографии прогресса (при вашем согласии)"
            ]
          },
          deviceIntegration: {
            title: "2.3 Интеграция с устройствами",
            items: [
              "Данные с устройств Garmin, Apple Health, Whoop, Withings",
              "Синхронизированная информация о тренировках и здоровье"
            ]
          }
        },
        dataUsage: {
          title: "3. Использование информации",
          intro: "Мы используем собранную информацию для:",
          items: [
            "Предоставления персонализированного фитнес-опыта",
            "Отслеживания прогресса в достижении ваших целей",
            "Анализа и визуализации ваших фитнес-данных",
            "Улучшения качества наших услуг",
            "Обеспечения безопасности и предотвращения мошенничества",
            "Связи с вами по вопросам, касающимся сервиса"
          ]
        },
        dataSecurity: {
          title: "4. Безопасность данных",
          content: "Мы применяем современные технические и организационные меры безопасности для защиты ваших персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения. Все данные передаются и хранятся в зашифрованном виде."
        },
        dataSharing: {
          title: "5. Передача данных третьим лицам",
          intro: "Мы НЕ продаем, НЕ сдаем в аренду и НЕ передаем ваши персональные данные третьим лицам, за исключением:",
          items: [
            "Интеграций с фитнес-платформами (с вашего явного согласия)",
            "Случаев, требуемых законодательством",
            "Защиты наших прав и безопасности пользователей"
          ]
        },
        userRights: {
          title: "6. Ваши права",
          intro: "У вас есть право:",
          items: [
            "Получать доступ к своим персональным данным",
            "Исправлять неточные или неполные данные",
            "Удалять свои персональные данные",
            "Ограничивать обработку ваших данных",
            "Переносить данные в другой сервис",
            "Отозвать согласие на обработку данных"
          ]
        },
        cookies: {
          title: "7. Файлы cookie",
          content: "Мы используем файлы cookie для улучшения работы приложения, запоминания ваших предпочтений и обеспечения безопасности. Вы можете управлять настройками cookie в своем браузере."
        },
        policyChanges: {
          title: "8. Изменения в политике",
          content: "Мы можем обновлять эту Политику конфиденциальности время от времени. О существенных изменениях мы уведомим вас по электронной почте или через уведомления в приложении."
        },
        contact: {
          title: "9. Контактная информация",
          content: "Если у вас есть вопросы о данной Политике конфиденциальности или вы хотите воспользоваться своими правами, свяжитесь с нами по адресу: privacy@fitnessapp.com"
        },
        dataRetention: {
          title: "10. Хранение данных",
          content: "Мы храним ваши персональные данные только в течение времени, необходимого для выполнения целей, указанных в данной политике, или в соответствии с требованиями законодательства."
        }
      }
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated:",
      sections: {
        intro: {
          title: "1. Introduction",
          content: "This Privacy Policy describes how we collect, use, store, and protect your personal information when using our fitness application. We are committed to protecting your privacy and ensuring the security of your personal data."
        },
        dataCollection: {
          title: "2. Information We Collect",
          personalInfo: {
            title: "2.1 Personal Information",
            items: [
              "Email address for registration and authorization",
              "Profile information (name, age, gender)",
              "Fitness goals and preferences"
            ]
          },
          fitnessData: {
            title: "2.2 Fitness Data",
            items: [
              "Physical activity data (workouts, steps, calories)",
              "Biometric indicators (weight, body fat percentage, VO2 Max)",
              "Recovery and sleep data",
              "Progress photos (with your consent)"
            ]
          },
          deviceIntegration: {
            title: "2.3 Device Integration",
            items: [
              "Data from Garmin, Apple Health, Whoop, Withings devices",
              "Synchronized workout and health information"
            ]
          }
        },
        dataUsage: {
          title: "3. How We Use Information",
          intro: "We use the collected information to:",
          items: [
            "Provide personalized fitness experience",
            "Track progress towards your goals",
            "Analyze and visualize your fitness data",
            "Improve the quality of our services",
            "Ensure security and prevent fraud",
            "Communicate with you regarding service matters"
          ]
        },
        dataSecurity: {
          title: "4. Data Security",
          content: "We implement modern technical and organizational security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. All data is transmitted and stored in encrypted form."
        },
        dataSharing: {
          title: "5. Data Sharing with Third Parties",
          intro: "We do NOT sell, rent, or transfer your personal data to third parties, except for:",
          items: [
            "Integrations with fitness platforms (with your explicit consent)",
            "Cases required by law",
            "Protection of our rights and user security"
          ]
        },
        userRights: {
          title: "6. Your Rights",
          intro: "You have the right to:",
          items: [
            "Access your personal data",
            "Correct inaccurate or incomplete data",
            "Delete your personal data",
            "Restrict processing of your data",
            "Port data to another service",
            "Withdraw consent for data processing"
          ]
        },
        cookies: {
          title: "7. Cookies",
          content: "We use cookies to improve app functionality, remember your preferences, and ensure security. You can manage cookie settings in your browser."
        },
        policyChanges: {
          title: "8. Policy Changes",
          content: "We may update this Privacy Policy from time to time. We will notify you of material changes via email or through app notifications."
        },
        contact: {
          title: "9. Contact Information",
          content: "If you have questions about this Privacy Policy or wish to exercise your rights, contact us at: privacy@fitnessapp.com"
        },
        dataRetention: {
          title: "10. Data Retention",
          content: "We retain your personal data only for the time necessary to fulfill the purposes outlined in this policy or as required by law."
        }
      }
    }
  };

  const currentContent = content[language];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-2 mb-6">
            <Button
              variant={language === 'ru' ? 'default' : 'outline'}
              onClick={() => setLanguage('ru')}
              size="sm"
            >
              Русский
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              onClick={() => setLanguage('en')}
              size="sm"
            >
              English
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold">{currentContent.title}</h1>
          <p className="text-muted-foreground">
            {currentContent.lastUpdated} {new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
          </p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.intro.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.sections.intro.content}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.dataCollection.title}</h2>
              <div className="space-y-3">
                <h3 className="text-lg font-medium">{currentContent.sections.dataCollection.personalInfo.title}</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  {currentContent.sections.dataCollection.personalInfo.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
                
                <h3 className="text-lg font-medium">{currentContent.sections.dataCollection.fitnessData.title}</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  {currentContent.sections.dataCollection.fitnessData.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>

                <h3 className="text-lg font-medium">{currentContent.sections.dataCollection.deviceIntegration.title}</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  {currentContent.sections.dataCollection.deviceIntegration.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.dataUsage.title}</h2>
              <p className="text-muted-foreground">{currentContent.sections.dataUsage.intro}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                {currentContent.sections.dataUsage.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.dataSecurity.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.sections.dataSecurity.content}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.dataSharing.title}</h2>
              <p className="text-muted-foreground">{currentContent.sections.dataSharing.intro}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                {currentContent.sections.dataSharing.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.userRights.title}</h2>
              <p className="text-muted-foreground">{currentContent.sections.userRights.intro}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                {currentContent.sections.userRights.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.cookies.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.sections.cookies.content}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.policyChanges.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.sections.policyChanges.content}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.contact.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.sections.contact.content}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{currentContent.sections.dataRetention.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.sections.dataRetention.content}
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}