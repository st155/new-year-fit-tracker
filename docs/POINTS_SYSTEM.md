# Balanced Performance Score System

## Overview
The Balanced Performance Score system calculates user points (0-1000) based on three key categories:
- **Performance (400 points)**: Training intensity and activity
- **Recovery (400 points)**: Sleep quality and recovery metrics
- **Synergy (200 points)**: Balance between strain and recovery

## Formula Breakdown

### 1. Performance Score (400 points max)

#### Strain Score (220 points max)
- Base: `(avg_strain_last_7d / 21) * 200`
- Consistency Bonus: +20 points if 5+ workouts in last 7 days

#### Activity Volume (150 points max)
- Steps: `(steps_last_7d / 70000) * 100` (max 100 points)
  - Target: 10k steps/day × 7 = 70k weekly
- Workouts: `workouts_last_7d * 10` (max 50 points)

#### Consistency (50 points max)
- `(weekly_consistency / 100) * 50`

### 2. Recovery Score (400 points max)

#### Recovery Quality (200 points max)
- `(avg_recovery_last_7d / 100) * 200`

#### Sleep Quality (150 points max)
- Duration: `(avg_sleep_last_7d / 8) * 100` (max 100 points, can exceed)
- Efficiency: `(avg_sleep_efficiency / 100) * 50` (max 50 points)

#### Heart Health (50 points max)
- `MAX(0, 50 - (avg_resting_hr - 50))` if HR > 0
  - 50 BPM = 50 points (ideal)
  - 60 BPM = 40 points
  - 70 BPM = 30 points

### 3. Synergy Bonus (200 points max)

#### Strain-Recovery Balance (100 points max)
- `100 - ABS(normalized_strain - normalized_recovery) * 100`
- Where:
  - `normalized_strain = avg_strain_last_7d / 21`
  - `normalized_recovery = avg_recovery_last_7d / 100`
- Examples:
  - Strain 15/21 (0.71) + Recovery 70% (0.70) = 99 points ✅
  - Strain 20/21 (0.95) + Recovery 40% (0.40) = 45 points ⚠️
  - Strain 5/21 (0.24) + Recovery 90% (0.90) = 34 points ⚠️

#### Streak Bonus (50 points max)
- `MIN(streak_days * 2, 50)`

#### Badge Bonus (50 points max)
- First 2 badges × 25 points each

## Edge Function

### Endpoint
`POST /functions/v1/calculate-health-points`

### Request Body
```json
{
  "user_id": "uuid",
  "challenge_id": "uuid"
}
```

Or for recalculating all users:
```json
{
  "recalculate_all": true
}
```

### Response
```json
{
  "success": true,
  "total_points": 742,
  "breakdown": {
    "performance": {
      "strain_score": 157,
      "activity_volume": 125,
      "consistency": 50,
      "total": 332
    },
    "recovery": {
      "recovery_quality": 140,
      "sleep_quality": 115,
      "heart_health": 40,
      "total": 295
    },
    "synergy": {
      "balance_bonus": 89,
      "streak_bonus": 14,
      "badge_bonus": 25,
      "total": 128
    }
  }
}
```

## Cron Job

The system automatically recalculates points every 6 hours using a Supabase cron job:

```sql
SELECT cron.schedule(
  'recalculate-challenge-points',
  '0 */6 * * *',
  ...
);
```

## Manual Recalculation

To manually trigger a recalculation for all users, call the edge function with:

```bash
curl -X POST https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/calculate-health-points \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"recalculate_all": true}'
```

## UI Components

### PersonalStatsCard
- Shows total points and breakdown
- Balance indicator with color coding
- "Details" button to view full breakdown

### PointsBreakdownDialog
- Detailed view of all point categories
- Progress bars for each metric
- Tips for improvement

### BalanceIndicator
- Visual representation of Strain-Recovery balance
- Color coding:
  - 🟢 Green (90-100): Excellent balance
  - 🟡 Yellow (70-89): Good balance
  - 🟠 Orange (50-69): Fair balance
  - 🔴 Red (<50): Imbalanced

## Database Schema

### challenge_points table
```sql
- performance_points: INTEGER
- recovery_points: INTEGER
- synergy_points: INTEGER
- points_breakdown: JSONB
```

## Tips for Users

- **High Performance, Low Recovery**: Reduce training intensity or add rest days
- **Low Performance, High Recovery**: Increase training volume while maintaining recovery
- **Low Balance Score**: Focus on matching training intensity with recovery capacity
- **Low Streak**: Maintain daily activity to build consistency bonus
