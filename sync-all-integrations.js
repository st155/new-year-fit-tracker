// Синхронизация всех интеграций
async function syncAllIntegrations() {
  try {
    console.log('🔄 Запуск синхронизации всех интеграций...');
    
    // Синхронизация Withings
    console.log('📊 Синхронизация Withings...');
    const withingsResponse = await fetch('https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/withings-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
      },
      body: JSON.stringify({
        action: 'sync-data'
      })
    });

    const withingsResult = await withingsResponse.json();
    console.log('✅ Результат Withings:', withingsResult);

    // Синхронизация Whoop
    console.log('💪 Синхронизация Whoop...');
    const whoopResponse = await fetch('https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
      },
      body: JSON.stringify({
        action: 'sync'
      })
    });

    const whoopResult = await whoopResponse.json();
    console.log('✅ Результат Whoop:', whoopResult);
    
    console.log('🎉 Синхронизация завершена!');
    return { withings: withingsResult, whoop: whoopResult };
    
  } catch (error) {
    console.error('❌ Ошибка при синхронизации:', error);
    return { error: error.message };
  }
}

// Запуск синхронизации
syncAllIntegrations().then(result => {
  console.log('📋 Финальный результат:', result);
});