// Принудительная синхронизация данных Whoop через Terra API
async function forceWhoopSync() {
  const TERRA_API_KEY = 'MzD8ZUjfmcHdTj6C5w1TZ0wS0TGsN4bY'; // Terra API Key
  const TERRA_DEV_ID = 'elite10-prod-c5pEdCVIav';
  
  try {
    console.log('🔄 Запуск принудительной синхронизации Whoop...');
    
    // Получаем terra_user_id для Whoop
    const supabaseUrl = 'https://ueykmmzmguzjppdudvef.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94';
    
    const tokenResponse = await fetch(`${supabaseUrl}/rest/v1/terra_tokens?provider=eq.WHOOP&select=terra_user_id,user_id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const tokens = await tokenResponse.json();
    console.log('📊 Найдено Whoop токенов:', tokens.length);
    
    if (tokens.length === 0) {
      console.log('❌ Нет подключенных Whoop аккаунтов');
      return;
    }
    
    // Запрашиваем данные для каждого пользователя
    for (const token of tokens) {
      console.log(`\n👤 Синхронизация для пользователя: ${token.user_id}`);
      console.log(`   Terra User ID: ${token.terra_user_id}`);
      
      // Получаем данные за последние 7 дней для всех типов
      const dataTypes = ['activity', 'body', 'daily', 'sleep', 'nutrition'];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      for (const dataType of dataTypes) {
        try {
          const url = `https://api.tryterra.co/v2/${dataType}?user_id=${token.terra_user_id}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`;
          
          console.log(`   📥 Запрос ${dataType}...`);
          const response = await fetch(url, {
            headers: {
              'dev-id': TERRA_DEV_ID,
              'x-api-key': TERRA_API_KEY
            }
          });
          
          const data = await response.json();
          console.log(`   ✅ ${dataType}: ${JSON.stringify(data).substring(0, 200)}...`);
          
          // Задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`   ❌ Ошибка при запросе ${dataType}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Синхронизация завершена!');
    console.log('💡 Проверьте данные в приложении через несколько минут');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Запуск
forceWhoopSync();
