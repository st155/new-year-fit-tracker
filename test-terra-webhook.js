// Скрипт для проверки работы Terra webhook endpoint
async function testTerraWebhook() {
  try {
    console.log('🔗 Проверка доступности Terra webhook endpoint...');
    
    const webhookUrl = 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/terra-webhooks';
    
    // Тестовые данные вебхука Terra
    const testWebhookData = {
      type: "auth",
      status: "success",
      user: {
        user_id: "test-terra-user-123",
        provider: "GARMIN",
        last_webhook_update: new Date().toISOString(),
        scopes: "athlete,activity,daily,body,sleep,nutrition"
      },
      reference_id: "test-reference-id-456"
    };
    
    console.log('📤 Отправка тестового webhook...');
    console.log('URL:', webhookUrl);
    console.log('Data:', testWebhookData);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // В реальности Terra подписывает запросы через terra-signature header
        // Для теста пропускаем подпись
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
        'Origin': 'https://tryterra.co',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,terra-signature'
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

// Функция для генерации curl команды для тестирования
function generateCurlCommand() {
  const webhookUrl = 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/terra-webhooks';
  const testData = {
    type: "auth",
    status: "success",
    user: {
      user_id: "test-terra-user-123",
      provider: "GARMIN",
      last_webhook_update: new Date().toISOString(),
      scopes: "athlete,activity,daily,body,sleep,nutrition"
    },
    reference_id: "test-reference-id-456"
  };
  
  const curlCommand = `curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(testData, null, 2)}'`;
  
  console.log('\n📋 Curl команда для ручного тестирования:');
  console.log(curlCommand);
  
  return curlCommand;
}

// Запуск теста
testTerraWebhook().then(result => {
  console.log('\n📋 Результат теста:', result);
  console.log('\n💡 Если endpoint работает, но вебхуки не приходят от Terra:');
  console.log('   1. Проверьте настройки в Terra Dashboard (Settings → Webhooks)');
  console.log('   2. Убедитесь, что webhook URL правильно сохранен');
  console.log('   3. Проверьте, что выбраны нужные типы событий (auth, activity, body, daily, sleep, nutrition)');
  console.log('   4. Проверьте логи в Supabase Dashboard → Edge Functions → terra-integration');
  console.log('   5. Попробуйте переподключить устройство через виджет Terra');
  console.log('   6. Убедитесь, что TERRA_SIGNING_SECRET настроен в Edge Function secrets');
  
  console.log('\n🔧 Дополнительные способы проверки:');
  generateCurlCommand();
});
