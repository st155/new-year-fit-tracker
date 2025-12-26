import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
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
          Назад
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Политика конфиденциальности</CardTitle>
            <p className="text-muted-foreground">Последнее обновление: 26 декабря 2024</p>
          </CardHeader>
          <CardContent className="space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Введение</h2>
              <p>
                Добро пожаловать в Elite10.club ("Сервис", "мы", "нас"). Мы уважаем вашу 
                конфиденциальность и стремимся защитить ваши персональные данные. Настоящая 
                политика конфиденциальности объясняет, как мы собираем, используем, храним 
                и защищаем вашу информацию.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Какие данные мы собираем</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Данные аккаунта:</strong> email, имя, фотография профиля при регистрации
                </li>
                <li>
                  <strong>Данные о здоровье и фитнесе:</strong> информация с подключенных 
                  устройств и сервисов (Whoop, Apple Health, Garmin, Oura и др.), включая 
                  показатели сна, активности, восстановления, пульса
                </li>
                <li>
                  <strong>Медицинские данные:</strong> результаты анализов и биомаркеры, 
                  которые вы загружаете добровольно
                </li>
                <li>
                  <strong>Данные о тренировках:</strong> информация о ваших тренировках, 
                  целях и прогрессе
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Как мы используем ваши данные</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Предоставление и улучшение наших услуг</li>
                <li>Анализ ваших показателей здоровья и фитнеса</li>
                <li>Персонализация рекомендаций</li>
                <li>Отслеживание прогресса в достижении целей</li>
                <li>Участие в челленджах и соревнованиях (с вашего согласия)</li>
                <li>Связь с вами по вопросам сервиса</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Интеграции с третьими сторонами</h2>
              <p className="mb-3">
                Мы интегрируемся со следующими сервисами для получения данных о вашем здоровье:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Whoop:</strong> данные о восстановлении, сне, нагрузке и пульсе</li>
                <li><strong>Terra API:</strong> агрегатор данных с различных фитнес-устройств</li>
                <li><strong>Apple Health:</strong> данные о здоровье с устройств Apple</li>
                <li><strong>Garmin:</strong> данные о тренировках и активности</li>
                <li><strong>Oura:</strong> данные о сне и восстановлении</li>
                <li><strong>Withings:</strong> данные о весе и составе тела</li>
              </ul>
              <p className="mt-3">
                Вы сами решаете, какие сервисы подключить. Мы получаем только те данные, 
                на доступ к которым вы дали явное согласие.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Хранение и защита данных</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Данные хранятся на защищенных серверах с шифрованием</li>
                <li>Мы используем Supabase для хранения данных с соблюдением стандартов безопасности</li>
                <li>Доступ к данным имеют только авторизованные сотрудники</li>
                <li>Мы не продаем ваши персональные данные третьим лицам</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Ваши права</h2>
              <p className="mb-3">Вы имеете право:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Получить доступ к своим персональным данным</li>
                <li>Исправить неточные данные</li>
                <li>Удалить свои данные ("право на забвение")</li>
                <li>Экспортировать свои данные</li>
                <li>Отозвать согласие на обработку данных</li>
                <li>Отключить любую интеграцию в любое время</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies и аналитика</h2>
              <p>
                Мы используем cookies для обеспечения работы сервиса и улучшения 
                пользовательского опыта. Вы можете отключить cookies в настройках браузера.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Изменения политики</h2>
              <p>
                Мы можем обновлять эту политику конфиденциальности. О существенных 
                изменениях мы уведомим вас по email или через уведомление в сервисе.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Контакты</h2>
              <p>
                Если у вас есть вопросы о нашей политике конфиденциальности, 
                свяжитесь с нами: <a href="mailto:support@elite10.club" className="text-primary hover:underline">support@elite10.club</a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
