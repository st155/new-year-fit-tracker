# Настройка Whoop Integration

## Инструкция по настройке Whoop Developer Portal

### 1. NAME (Название приложения)
```
Elite10
```
Это название будет показано пользователю в OAuth flow.

### 2. LOGO
Загрузите логотип вашего приложения (jpg или png, соотношение 1:1).

### 3. CONTACTS (Контактные email'ы)
```
1@ddistrict.io
```
Email для административных уведомлений от Whoop.

### 4. PRIVACY POLICY (Политика конфиденциальности)
**ОБЯЗАТЕЛЬНОЕ ПОЛЕ**

Используйте один из следующих URL'ов:
- Preview URL: `https://ueykmmzmguzjppdudvef.lovableproject.com/privacy-policy`
- Deployed URL: `https://[ваш-домен]/privacy-policy`

### 5. REDIRECT URLS (URL'ы для перенаправления после авторизации)
**ОБЯЗАТЕЛЬНОЕ ПОЛЕ**

Добавьте следующие URL:
```
https://elite10.club/integrations/whoop/callback
https://ueykmmzmguzjppdudvef.lovableproject.com/integrations/whoop/callback
```

### 6. SCOPES (Разрешения для доступа к данным)

Отметьте следующие scope'ы:
- ✅ `read:recovery` - данные о восстановлении
- ✅ `read:cycles` - информация о циклах дня
- ✅ `read:sleep` - данные о сне
- ✅ `read:workout` - информация о тренировках
- ✅ `read:profile` - профильная информация
- ✅ `read:body_measurement` - измерения тела

### 7. WEBHOOKS (URL для получения обновлений от Whoop)

Добавьте следующий webhook URL:
```
https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-webhook
```

Это позволит Whoop автоматически уведомлять ваше приложение об обновлениях данных пользователя.

---

## После создания приложения

1. Скопируйте **Client ID** и **Client Secret**
2. Добавьте их в Supabase Secrets:
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`

## Тестирование

После настройки приложения:
1. Перейдите на страницу Integrations в вашем приложении
2. Нажмите "Подключить Whoop"
3. Авторизуйтесь с вашим Whoop аккаунтом
4. Проверьте, что данные синхронизируются корректно
