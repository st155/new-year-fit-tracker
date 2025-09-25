// Принудительная синхронизация Withings с обновлением токена
async function forceWithingsSync() {
  try {
    console.log('🔄 Принудительная синхронизация Withings...');
    
    const response = await fetch('https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/withings-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
      },
      body: JSON.stringify({
        action: 'sync-data',
        force_refresh: true
      })
    });

    const result = await response.json();
    console.log('✅ Результат синхронизации Withings:', result);
    
    if (response.ok) {
      console.log('🎉 Синхронизация успешно завершена');
      console.log('📊 Синхронизированы данные:', result.syncResults || result);
      return result;
    } else {
      console.error('❌ Ошибка синхронизации:', result);
      return { error: result };
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка при синхронизации:', error);
    return { error: error.message };
  }
}

// Запуск синхронизации
forceWithingsSync().then(result => {
  console.log('📋 Финальный результат синхронизации:', result);
});