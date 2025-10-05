// Принудительное обновление токенов Whoop
async function refreshWhoopTokens() {
  try {
    console.log('🔄 Запуск обновления токенов Whoop...');
    
    const response = await fetch('https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/whoop-token-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
      }
    });

    const result = await response.json();
    console.log('✅ Результат обновления токенов:', result);
    
    if (result.error) {
      console.error('❌ Ошибка:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении токенов:', error);
    return { error: error.message };
  }
}

// Запуск обновления
refreshWhoopTokens().then(result => {
  console.log('📋 Финальный результат:', result);
});
