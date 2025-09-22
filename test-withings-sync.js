// Тестовый скрипт для проверки данных Withings
async function testWithingsSync() {
  const response = await fetch('https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/withings-integration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWttbXptZ3V6anBwZHVkdmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTAwNjEsImV4cCI6MjA3NDAyNjA2MX0.nSc_MFoU6rAsyw0c8Mv-BD0MPuGAsuDXUckvMUyYX94'
    },
    body: JSON.stringify({
      action: 'check-status'
    })
  });
  
  const result = await response.json();
  console.log('Withings status:', result);
}

testWithingsSync();