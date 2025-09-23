import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Политика конфиденциальности</h1>
          <p className="text-muted-foreground">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Введение</h2>
              <p className="text-muted-foreground leading-relaxed">
                Настоящая Политика конфиденциальности описывает, как мы собираем, используем, храним и защищаем 
                вашу личную информацию при использовании нашего фитнес-приложения. Мы обязуемся защищать вашу 
                конфиденциальность и обеспечивать безопасность ваших персональных данных.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Собираемая информация</h2>
              <div className="space-y-3">
                <h3 className="text-lg font-medium">2.1 Личная информация</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Адрес электронной почты для регистрации и авторизации</li>
                  <li>Профильная информация (имя, возраст, пол)</li>
                  <li>Фитнес-цели и предпочтения</li>
                </ul>
                
                <h3 className="text-lg font-medium">2.2 Фитнес-данные</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Данные о физической активности (тренировки, шаги, калории)</li>
                  <li>Биометрические показатели (вес, процент жира, VO2 Max)</li>
                  <li>Данные о восстановлении и сне</li>
                  <li>Фотографии прогресса (при вашем согласии)</li>
                </ul>

                <h3 className="text-lg font-medium">2.3 Интеграция с устройствами</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Данные с устройств Garmin, Apple Health, Whoop, Withings</li>
                  <li>Синхронизированная информация о тренировках и здоровье</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Использование информации</h2>
              <p className="text-muted-foreground">Мы используем собранную информацию для:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Предоставления персонализированного фитнес-опыта</li>
                <li>Отслеживания прогресса в достижении ваших целей</li>
                <li>Анализа и визуализации ваших фитнес-данных</li>
                <li>Улучшения качества наших услуг</li>
                <li>Обеспечения безопасности и предотвращения мошенничества</li>
                <li>Связи с вами по вопросам, касающимся сервиса</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Безопасность данных</h2>
              <p className="text-muted-foreground leading-relaxed">
                Мы применяем современные технические и организационные меры безопасности для защиты ваших 
                персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения. 
                Все данные передаются и хранятся в зашифрованном виде.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Передача данных третьим лицам</h2>
              <p className="text-muted-foreground">Мы НЕ продаем, НЕ сдаем в аренду и НЕ передаем ваши персональные данные третьим лицам, за исключением:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Интеграций с фитнес-платформами (с вашего явного согласия)</li>
                <li>Случаев, требуемых законодательством</li>
                <li>Защиты наших прав и безопасности пользователей</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Ваши права</h2>
              <p className="text-muted-foreground">У вас есть право:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Получать доступ к своим персональным данным</li>
                <li>Исправлять неточные или неполные данные</li>
                <li>Удалять свои персональные данные</li>
                <li>Ограничивать обработку ваших данных</li>
                <li>Переносить данные в другой сервис</li>
                <li>Отозвать согласие на обработку данных</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Файлы cookie</h2>
              <p className="text-muted-foreground leading-relaxed">
                Мы используем файлы cookie для улучшения работы приложения, запоминания ваших предпочтений 
                и обеспечения безопасности. Вы можете управлять настройками cookie в своем браузере.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Изменения в политике</h2>
              <p className="text-muted-foreground leading-relaxed">
                Мы можем обновлять эту Политику конфиденциальности время от времени. О существенных изменениях 
                мы уведомим вас по электронной почте или через уведомления в приложении.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Контактная информация</h2>
              <p className="text-muted-foreground leading-relaxed">
                Если у вас есть вопросы о данной Политике конфиденциальности или вы хотите воспользоваться 
                своими правами, свяжитесь с нами по адресу: privacy@fitnessapp.com
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Хранение данных</h2>
              <p className="text-muted-foreground leading-relaxed">
                Мы храним ваши персональные данные только в течение времени, необходимого для выполнения 
                целей, указанных в данной политике, или в соответствии с требованиями законодательства.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}