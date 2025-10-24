# Whoop Integration через Terra API

## ⚠️ Важное обновление

**Прямая интеграция Whoop была заменена на Terra API.**

Whoop теперь подключается через Terra Integration, которая обеспечивает:
- ✅ Более стабильную работу
- ✅ Единый интерфейс для всех устройств
- ✅ Автоматические обновления через webhook
- ✅ Лучшую обработку ошибок

## Как подключить Whoop

1. Перейдите в `/integrations?tab=connections`
2. Найдите секцию **Terra Integration**
3. Нажмите на кнопку **Whoop**
4. Авторизуйтесь через Terra Widget
5. Данные начнут синхронизироваться автоматически

## ⏱️ Важно: Первая синхронизация

После первого подключения Whoop через Terra:
- **Terra требует 15-60 минут** для получения исторических данных от Whoop
- После этого нажмите **"Синхронизировать данные"** в интерфейсе Terra
- Данные появятся в базе и начнут отображаться на дашборде
- Последующие обновления будут приходить через webhook автоматически

## Технические детали

**Используемые компоненты:**
- Frontend: `src/components/integrations/TerraIntegration.tsx`
- Backend: `supabase/functions/terra-integration/index.ts`
- Webhook: `supabase/functions/webhook-terra/index.ts`

**Таблицы базы данных:**
- `terra_tokens` — хранит токены авторизации (provider = 'WHOOP')
- `metric_values` — хранит синхронизированные метрики (source = 'WHOOP')
- `workouts` — хранит тренировки (source = 'WHOOP')

**Метрики Whoop:**
- Recovery Score (%)
- Day Strain
- Workout Strain
- Sleep Performance (%)
- Sleep Efficiency (%)
- Sleep Duration (hours)
- HRV (rMSSD)
- Resting Heart Rate
- Average Heart Rate
- Max Heart Rate
- Workout Calories

## Миграция со старой интеграции

Если вы ранее использовали прямую интеграцию Whoop:
1. Старые токены в `whoop_tokens` были деактивированы
2. Все исторические данные сохранены в `metric_values`
3. Просто подключите Whoop заново через Terra
4. Новые данные начнут синхронизироваться автоматически
5. Подождите 30-60 минут после подключения, затем выполните первую синхронизацию

## Отладка

### Проверить подключение:
```sql
SELECT * FROM terra_tokens 
WHERE provider = 'WHOOP' 
AND is_active = true;
```

### Проверить данные:
```sql
SELECT um.metric_name, um.source, mv.value, mv.measurement_date
FROM metric_values mv
JOIN user_metrics um ON um.id = mv.metric_id
WHERE um.source = 'WHOOP'
ORDER BY mv.measurement_date DESC
LIMIT 20;
```

### Проверить логи:
- Edge function: `terra-integration` logs
- Webhook: `webhook-terra` logs
- Проверьте консоль браузера на наличие ошибок

## Поддержка

При возникновении проблем:
1. Убедитесь, что прошло 30-60 минут после первого подключения
2. Проверьте логи edge function: `terra-integration`
3. Проверьте webhook логи: `webhook-terra`
4. Убедитесь, что `terra_tokens.provider = 'WHOOP'` и `is_active = true`
5. Попробуйте повторно синхронизировать данные через интерфейс
