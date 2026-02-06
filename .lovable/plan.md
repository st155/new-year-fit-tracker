
## План: Исправление синхронизации данных и Day Strain

### Диагностика

Проанализированы логи и база данных. Выявлено 5 проблем:

---

### Проблема 1: WHOOP webhook signature verification failed

**Симптом:** Webhooks от WHOOP отклоняются с ошибкой `Invalid signature`
```
"Webhook signature verification failed","error":"Invalid signature"
```

**Причина:** Подпись WHOOP webhook не проходит валидацию для некоторых WHOOP user_id (20896393, 498039).

**Решение:** Проверить и обновить WHOOP_WEBHOOK_SECRET в переменных окружения Edge Functions. Возможно, секрет устарел или отличается от настроек в WHOOP Developer Portal.

---

### Проблема 2: echo11-sync вызывается без Authorization header

**Симптом:** 
```
"Echo11 sync invoke error","metadata":{"error":"Edge Function returned a non-2xx status code"}
```

**Причина:** `job-worker` вызывает `echo11-sync` через `supabase.functions.invoke()` без передачи Authorization header. Но `echo11-sync` требует JWT пользователя.

**Решение:** Рефакторинг `echo11-sync` для поддержки service role вызовов:

```typescript
// supabase/functions/echo11-sync/index.ts (строки 32-58)

// Проверяем тип авторизации
const authHeader = req.headers.get("Authorization");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Вариант 1: Service role вызов (от job-worker)
if (authHeader?.includes(serviceRoleKey?.substring(0, 50) || '')) {
  // Parse user_id from body for service role calls
  const body = await req.json();
  const userId = body.user_id;
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "user_id required for service role calls" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // Continue with userId...
}
// Вариант 2: User JWT вызов (от клиента)
else if (authHeader) {
  // Existing auth logic...
}
```

**Альтернатива:** Модифицировать `job-worker` чтобы использовать `sync-echo11` вместо `echo11-sync` (первая поддерживает service role).

---

### Проблема 3: Day Strain fallback отсутствует в useTodayMetrics

**Симптом:** Показывается 0 для strain когда Day Strain отсутствует за сегодня.

**Причина:** `useTodayMetrics.tsx` напрямую читает `'Day Strain'`, без fallback на альтернативные метрики (Activity Score, Active Calories).

**Решение:** Добавить каскадный fallback (как в `useUserWeeklyStrain.tsx`):

```typescript
// src/hooks/metrics/useTodayMetrics.tsx (строки 44-52)

// Strain: Day Strain → Workout Strain → Activity Score (normalized) → Active Calories (normalized)
let strain = grouped.get('Day Strain')?.value || 0;
if (strain === 0) {
  strain = grouped.get('Workout Strain')?.value || 0;
}
if (strain === 0) {
  const activityScore = grouped.get('Activity Score')?.value;
  if (activityScore) {
    // Normalize 0-100 to 0-21 scale (WHOOP strain scale)
    strain = Math.min(21, (activityScore / 100) * 21);
  }
}
if (strain === 0) {
  const activeCalories = grouped.get('Active Calories')?.value;
  if (activeCalories) {
    // Normalize: 2100 kcal ≈ 14 strain, 3150+ = 21
    strain = Math.min(21, activeCalories / 150);
  }
}

return {
  // ...
  strain,
  // ...
};
```

---

### Проблема 4: webhook_logs отсутствует колонка processed_at

**Симптом:**
```
"error":"Could not find the 'processed_at' column of 'webhook_logs' in the schema cache"
```

**Решение:** Добавить миграцию для колонки:

```sql
ALTER TABLE webhook_logs 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
```

---

### Проблема 5: WHOOP токен отсутствует в terra_tokens

**Симптом:** У пользователя нет WHOOP в `terra_tokens` (только OURA, ULTRAHUMAN, GARMIN, WITHINGS, GOOGLE). Day Strain приходит только от WHOOP.

**Причина:** WHOOP интегрирован напрямую (webhook-whoop), а не через Terra API.

**Решение:** 
1. Если WHOOP webhook работает — проблема в signature verification (см. Проблему 1)
2. Либо добавить WHOOP через Terra API (рекомендуется для унификации)

---

### Итоговый список файлов для изменения

**Edge Functions (2 файла):**
1. `supabase/functions/echo11-sync/index.ts` — добавить поддержку service role вызовов
2. `supabase/functions/webhook-whoop/index.ts` — проверить логику signature verification (возможно нужно обновить секрет)

**Frontend Hooks (1 файл):**
1. `src/hooks/metrics/useTodayMetrics.tsx` — добавить fallback для strain

**База данных (1 миграция):**
1. Добавить колонку `processed_at` в `webhook_logs`

---

### Приоритет исправлений

| Приоритет | Проблема | Влияние |
|-----------|----------|---------|
| 🔴 Критический | Day Strain fallback | UI показывает 0 вместо данных |
| 🔴 Критический | echo11-sync auth | Ошибки в логах, Echo11 не синхронизируется |
| 🟡 Важный | WHOOP webhook signature | Новые WHOOP данные не поступают |
| 🟢 Низкий | webhook_logs column | Только логирование |

---

### Ожидаемый результат

После исправлений:
- Day Strain будет показывать значение из Activity Score (Oura/Ultrahuman) или Active Calories когда WHOOP данные недоступны
- Echo11 синхронизация будет работать без ошибок
- WHOOP webhooks будут обрабатываться корректно (после обновления секрета)
