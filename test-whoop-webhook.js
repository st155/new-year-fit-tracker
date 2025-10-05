// Скрипт для проверки работы Whoop webhook endpoint
async function testWhoopWebhook() {
  try {
    console.log('🔗 Проверка доступности Whoop webhook endpoint...');
    
    const webhookUrl = 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-webhooks';
    
    // Тестовые данные вебхука (формат v2)
    const testWebhookData = {
      user_id: 123456, // Тестовый Whoop user ID
      id: "550e8400-e29b-41d4-a716-446655440000", // UUID для v2
      type: "sleep.updated",
      trace_id: "test-trace-id-123"
    };
    
    console.log('📤 Отправка тестового webhook...');
    console.log('URL:', webhookUrl);
    console.log('Data:', testWebhookData);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Пропускаем подпись для теста
      },
      body: JSON.stringify(testWebhookData)
    });
    
    console.log('📥 Ответ получен:');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook endpoint доступен и отвечает!');
    } else {
      console.log('❌ Endpoint вернул ошибку:', response.status);
    }
    
    // Проверяем OPTIONS (CORS preflight)
    console.log('\n🔍 Проверка CORS preflight...');
    const corsResponse = await fetch(webhookUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://developer.whoop.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-whoop-signature,x-whoop-signature-timestamp'
      }
    });
    
    console.log('CORS Status:', corsResponse.status);
    console.log('CORS Headers:', Object.fromEntries(corsResponse.headers.entries()));
    
    if (corsResponse.ok) {
      console.log('✅ CORS настроен правильно');
    } else {
      console.log('⚠️ Возможны проблемы с CORS');
    }
    
    return { success: response.ok, status: response.status };
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании webhook:', error);
    return { success: false, error: error.message };
  }
}

// Запуск теста
testWhoopWebhook().then(result => {
  console.log('\n📋 Результат теста:', result);
  console.log('\n💡 Если endpoint работает, но вебхуки не приходят от Whoop:');
  console.log('   1. Убедитесь, что в Whoop Developer Dashboard сохранены настройки');
  console.log('   2. Попробуйте создать/изменить тренировку или сон в приложении Whoop');
  console.log('   3. Проверьте, что у пользователя есть активная авторизация');
  console.log('   4. Проверьте логи в Supabase Dashboard -> Edge Functions -> whoop-webhooks');
});
