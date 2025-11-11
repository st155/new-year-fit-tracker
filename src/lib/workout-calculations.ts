export function calculatePace(distanceKm: number, durationMin: number): string {
  if (!distanceKm || !durationMin || distanceKm === 0) return "—";
  
  const paceMinPerKm = durationMin / distanceKm;
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function calculateSpeed(distanceKm: number, durationMin: number): number {
  if (!distanceKm || !durationMin || durationMin === 0) return 0;
  
  const hours = durationMin / 60;
  return distanceKm / hours;
}

export interface Split {
  km: number;
  pace: string;
  time: string;
}

export function generateSplits(distanceKm: number, durationMin: number): Split[] {
  if (!distanceKm || !durationMin || distanceKm < 1) return [];
  
  const splits: Split[] = [];
  const totalKm = Math.floor(distanceKm);
  const avgPace = durationMin / distanceKm;
  
  let cumulativeTime = 0;
  
  for (let km = 1; km <= totalKm; km++) {
    // Add slight variation for realism (±2%)
    const variation = 0.98 + Math.random() * 0.04;
    const kmPace = avgPace * variation;
    cumulativeTime += kmPace;
    
    const minutes = Math.floor(kmPace);
    const seconds = Math.round((kmPace - minutes) * 60);
    const pace = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const totalMinutes = Math.floor(cumulativeTime);
    const totalSeconds = Math.round((cumulativeTime - totalMinutes) * 60);
    const time = `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
    
    splits.push({ km, pace, time });
  }
  
  return splits;
}

export interface ZoneChartData {
  zone: string;
  minutes: number;
  color: string;
}

export function transformZoneDurations(zoneData: any): ZoneChartData[] {
  if (!zoneData) return [];
  
  const zones = [
    { key: 'zone_zero_milli', name: 'Зона 0', color: 'hsl(var(--muted))' },
    { key: 'zone_one_milli', name: 'Зона 1', color: 'hsl(142, 76%, 36%)' },
    { key: 'zone_two_milli', name: 'Зона 2', color: 'hsl(45, 93%, 47%)' },
    { key: 'zone_three_milli', name: 'Зона 3', color: 'hsl(25, 95%, 53%)' },
    { key: 'zone_four_milli', name: 'Зона 4', color: 'hsl(0, 72%, 51%)' },
    { key: 'zone_five_milli', name: 'Зона 5', color: 'hsl(330, 81%, 60%)' },
  ];
  
  return zones
    .map(zone => ({
      zone: zone.name,
      minutes: (zoneData[zone.key] || 0) / 60000, // Convert ms to minutes
      color: zone.color
    }))
    .filter(z => z.minutes > 0);
}
