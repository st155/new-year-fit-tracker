// Тест синхронизации Whoop с автообновлением токенов
async function testWhoopSync() {
  try {
    console.log('🔄 Тестирование синхронизации Whoop...');
    
    const response = await fetch('https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
      },
      body: JSON.stringify({
        action: 'sync'
      })
    });

    const result = await response.json();
    console.log('✅ Результат синхронизации:', result);
    
    if (result.error) {
      console.error('❌ Ошибка:', result.error);
      if (result.message) {
        console.error('📝 Сообщение:', result.message);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    return { error: error.message };
  }
}

// Запуск теста
testWhoopSync().then(result => {
  console.log('📋 Финальный результат:', result);
});