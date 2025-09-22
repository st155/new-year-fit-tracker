// Синхронизация данных Withings
async function syncWithingsData() {
  try {
    console.log('Starting Withings sync...');
    
    const response = await fetch('https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/withings-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
      },
      body: JSON.stringify({
        action: 'sync-data'
      })
    });

    const result = await response.json();
    console.log('Withings sync result:', result);
    
    if (response.ok) {
      console.log('✅ Синхронизация успешно завершена');
      return result;
    } else {
      console.error('❌ Ошибка синхронизации:', result);
      return { error: result };
    }
  } catch (error) {
    console.error('❌ Ошибка при вызове синхронизации:', error);
    return { error: error.message };
  }
}

// Запуск синхронизации
syncWithingsData().then(result => {
  console.log('Финальный результат:', result);
});