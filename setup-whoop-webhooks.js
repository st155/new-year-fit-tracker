// Скрипт для регистрации вебхуков Whoop
async function setupWhoopWebhooks() {
  try {
    console.log('🔗 Запуск регистрации вебхуков Whoop...');
    
    const response = await fetch('https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
      },
      body: JSON.stringify({
        action: 'setup-webhooks'
      })
    });

    const result = await response.json();
    console.log('✅ Результат регистрации вебхуков:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('❌ Ошибка:', result.error);
      if (result.message) {
        console.error('📝 Сообщение:', result.message);
      }
    } else {
      console.log('🎉 Вебхуки зарегистрированы!');
      result.results?.forEach((r) => {
        if (r.status === 'success') {
          console.log(`  ✅ ${r.event}: успешно`);
        } else {
          console.log(`  ❌ ${r.event}: ${r.error || 'ошибка'}`);
        }
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка при регистрации вебхуков:', error);
    return { error: error.message };
  }
}

// Запуск регистрации
setupWhoopWebhooks().then(result => {
  console.log('📋 Финальный результат:', result);
});
