-- Update get_trainer_clients_enhanced to include whoop_tokens in connected_sources
CREATE OR REPLACE FUNCTION public.get_trainer_clients_enhanced(p_trainer_id uuid)
 RETURNS TABLE(client_id uuid, username text, full_name text, avatar_url text, active_goals_count bigint, recent_measurements_count bigint, last_activity_date date, health_score integer, whoop_recovery_avg numeric, sleep_hours_avg numeric, weight_latest numeric, vo2max_latest numeric, goals_on_track bigint, goals_at_risk bigint, measurements_trend text, sleep_trend text, recovery_trend text, days_since_last_data integer, has_overdue_tasks boolean, low_recovery_alert boolean, poor_sleep_alert boolean, active_challenges_count bigint, top_3_goals jsonb, connected_sources text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH client_data AS (
    SELECT 
      tc.client_id as cid,
      p.username,
      p.full_name,
      p.avatar_url,
      tc.assigned_at
    FROM trainer_clients tc
    JOIN profiles p ON p.user_id = tc.client_id
    WHERE tc.trainer_id = p_trainer_id
      AND tc.active = true
  ),
  goals_stats AS (
    SELECT
      cd.cid,
      COUNT(g.id) as total_goals,
      COUNT(CASE 
        WHEN (
          SELECT (m.value / NULLIF(g.target_value, 0) * 100)
          FROM measurements m 
          WHERE m.goal_id = g.id 
          ORDER BY measurement_date DESC 
          LIMIT 1
        ) >= 80 THEN 1 
      END) as on_track_count,
      COUNT(CASE 
        WHEN (
          SELECT (m.value / NULLIF(g.target_value, 0) * 100)
          FROM measurements m 
          WHERE m.goal_id = g.id 
          ORDER BY measurement_date DESC 
          LIMIT 1
        ) < 50 THEN 1 
      END) as at_risk_count
    FROM client_data cd
    LEFT JOIN goals g ON g.user_id = cd.cid
    GROUP BY cd.cid
  ),
  recent_activity AS (
    SELECT
      cd.cid,
      MAX(um.measurement_date) as last_data_date,
      COUNT(CASE 
        WHEN um.measurement_date >= CURRENT_DATE - INTERVAL '7 days' 
        THEN 1 
      END) as measurements_7d,
      COUNT(CASE 
        WHEN um.measurement_date >= CURRENT_DATE - INTERVAL '14 days' 
          AND um.measurement_date < CURRENT_DATE - INTERVAL '7 days'
        THEN 1 
      END) as measurements_prev_7d
    FROM client_data cd
    LEFT JOIN unified_metrics um ON um.user_id = cd.cid
    GROUP BY cd.cid
  ),
  -- Check both terra_tokens AND whoop_tokens for active integrations
  connected_sources_data AS (
    SELECT
      cd.cid,
      ARRAY_AGG(DISTINCT src) FILTER (WHERE src IS NOT NULL) as sources
    FROM client_data cd
    LEFT JOIN LATERAL (
      -- Terra tokens (OURA, GARMIN, WITHINGS, etc.)
      SELECT UPPER(tt.provider) as src
      FROM terra_tokens tt 
      WHERE tt.user_id = cd.cid AND tt.is_active = true
      UNION
      -- Direct Whoop tokens
      SELECT 'WHOOP'::TEXT as src
      FROM whoop_tokens wt 
      WHERE wt.user_id = cd.cid AND wt.is_active = true
    ) sources_union ON true
    GROUP BY cd.cid
  ),
  health_metrics AS (
    SELECT
      cd.cid,
      AVG(um.value) FILTER (
        WHERE um.metric_name = 'Recovery Score' 
        AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
      ) as recovery_7d,
      AVG(um.value) FILTER (
        WHERE um.metric_name = 'Recovery Score'
        AND um.measurement_date >= CURRENT_DATE - INTERVAL '14 days' 
        AND um.measurement_date < CURRENT_DATE - INTERVAL '7 days'
      ) as recovery_prev_7d,
      AVG(um.value) FILTER (
        WHERE um.metric_name = 'Sleep Duration'
        AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
      ) as sleep_7d,
      AVG(um.value) FILTER (
        WHERE um.metric_name = 'Sleep Duration'
        AND um.measurement_date >= CURRENT_DATE - INTERVAL '14 days' 
        AND um.measurement_date < CURRENT_DATE - INTERVAL '7 days'
      ) as sleep_prev_7d,
      COUNT(DISTINCT um.measurement_date) FILTER (
        WHERE um.metric_name = 'Sleep Duration'
        AND um.value < 6
        AND um.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
      ) as poor_sleep_days,
      (SELECT um2.value 
       FROM unified_metrics um2
       WHERE um2.user_id = cd.cid 
         AND um2.metric_name = 'Recovery Score'
       ORDER BY um2.measurement_date DESC, um2.priority DESC 
       LIMIT 1) as latest_recovery,
      (SELECT um2.value 
       FROM unified_metrics um2
       WHERE um2.user_id = cd.cid 
         AND um2.metric_name = 'Sleep Duration'
       ORDER BY um2.measurement_date DESC, um2.priority DESC 
       LIMIT 1) as latest_sleep,
      (SELECT um2.value 
       FROM unified_metrics um2
       WHERE um2.user_id = cd.cid 
         AND um2.metric_name = 'Weight'
       ORDER BY um2.measurement_date DESC, um2.priority DESC 
       LIMIT 1) as latest_weight,
      (SELECT um2.value 
       FROM unified_metrics um2
       WHERE um2.user_id = cd.cid 
         AND um2.metric_name = 'VO2 Max'
       ORDER BY um2.measurement_date DESC, um2.priority DESC 
       LIMIT 1) as latest_vo2max
    FROM client_data cd
    LEFT JOIN unified_metrics um ON um.user_id = cd.cid
    GROUP BY cd.cid
  ),
  task_stats AS (
    SELECT
      cd.cid,
      EXISTS(
        SELECT 1
        FROM client_tasks ct
        WHERE ct.client_id = cd.cid
          AND ct.status != 'completed'
          AND ct.deadline < CURRENT_DATE
      ) as has_overdue
    FROM client_data cd
  ),
  challenge_stats AS (
    SELECT
      cd.cid,
      COUNT(DISTINCT cp.challenge_id) as active_challenges
    FROM client_data cd
    LEFT JOIN challenge_participants cp ON cp.user_id = cd.cid
    LEFT JOIN challenges c ON c.id = cp.challenge_id
      AND c.is_active = true
      AND c.end_date >= CURRENT_DATE
    GROUP BY cd.cid
  ),
  top_goals AS (
    SELECT
      cd.cid,
      jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'name', g.goal_name,
          'progress', COALESCE(
            (SELECT (m.value / NULLIF(g.target_value, 0) * 100)::INTEGER
             FROM measurements m 
             WHERE m.goal_id = g.id 
             ORDER BY measurement_date DESC 
             LIMIT 1),
            0
          )
        ) ORDER BY (
          SELECT m.measurement_date
          FROM measurements m
          WHERE m.goal_id = g.id
          ORDER BY measurement_date DESC
          LIMIT 1
        ) DESC
      ) FILTER (WHERE g.id IS NOT NULL) as goals_json
    FROM client_data cd
    LEFT JOIN LATERAL (
      SELECT g2.id, g2.goal_name, g2.target_value
      FROM goals g2
      WHERE g2.user_id = cd.cid
      ORDER BY (
        SELECT m.measurement_date
        FROM measurements m
        WHERE m.goal_id = g2.id
        ORDER BY measurement_date DESC
        LIMIT 1
      ) DESC NULLS LAST
      LIMIT 3
    ) g ON true
    GROUP BY cd.cid
  )
  SELECT 
    cd.cid,
    cd.username,
    cd.full_name,
    cd.avatar_url,
    COALESCE(gs.total_goals, 0) as active_goals_count,
    COALESCE(ra.measurements_7d, 0) as recent_measurements_count,
    ra.last_data_date as last_activity_date,
    
    LEAST(100, GREATEST(0,
      CASE 
        WHEN ra.last_data_date >= CURRENT_DATE - INTERVAL '1 day' THEN 30
        WHEN ra.last_data_date >= CURRENT_DATE - INTERVAL '3 days' THEN 20
        WHEN ra.last_data_date >= CURRENT_DATE - INTERVAL '7 days' THEN 10
        ELSE 0
      END +
      CASE 
        WHEN hm.latest_recovery >= 67 THEN 15
        WHEN hm.latest_recovery >= 34 THEN 7
        ELSE 0
      END +
      CASE 
        WHEN hm.latest_sleep >= 7 THEN 10
        WHEN hm.latest_sleep >= 5 THEN 5
        ELSE 0
      END +
      CASE 
        WHEN hm.recovery_7d > hm.recovery_prev_7d THEN 10
        WHEN hm.recovery_7d = hm.recovery_prev_7d THEN 5
        ELSE 2
      END +
      CASE 
        WHEN gs.on_track_count::FLOAT / NULLIF(gs.total_goals, 0) >= 0.8 THEN 15
        WHEN gs.on_track_count::FLOAT / NULLIF(gs.total_goals, 0) >= 0.5 THEN 10
        WHEN gs.total_goals > 0 THEN 5
        ELSE 0
      END +
      CASE 
        WHEN ra.measurements_7d >= 3 THEN 10
        WHEN ra.measurements_7d >= 1 THEN 5
        ELSE 0
      END +
      CASE 
        WHEN NOT ts.has_overdue THEN 10
        ELSE 3
      END
    ))::INTEGER as health_score,
    
    hm.recovery_7d as whoop_recovery_avg,
    hm.sleep_7d as sleep_hours_avg,
    hm.latest_weight as weight_latest,
    hm.latest_vo2max as vo2max_latest,
    
    COALESCE(gs.on_track_count, 0) as goals_on_track,
    COALESCE(gs.at_risk_count, 0) as goals_at_risk,
    
    CASE 
      WHEN ra.measurements_7d > ra.measurements_prev_7d THEN 'up'
      WHEN ra.measurements_7d < ra.measurements_prev_7d THEN 'down'
      ELSE 'stable'
    END as measurements_trend,
    
    CASE 
      WHEN hm.sleep_7d > hm.sleep_prev_7d + 0.5 THEN 'improving'
      WHEN hm.sleep_7d < hm.sleep_prev_7d - 0.5 THEN 'declining'
      ELSE 'stable'
    END as sleep_trend,
    
    CASE 
      WHEN hm.recovery_7d > hm.recovery_prev_7d + 5 THEN 'improving'
      WHEN hm.recovery_7d < hm.recovery_prev_7d - 5 THEN 'declining'
      ELSE 'stable'
    END as recovery_trend,
    
    COALESCE(CURRENT_DATE - ra.last_data_date, 999) as days_since_last_data,
    COALESCE(ts.has_overdue, false) as has_overdue_tasks,
    COALESCE(hm.recovery_7d < 40, false) as low_recovery_alert,
    COALESCE(hm.poor_sleep_days >= 3, false) as poor_sleep_alert,
    COALESCE(cs.active_challenges, 0) as active_challenges_count,
    COALESCE(tg.goals_json, '[]'::jsonb) as top_3_goals,
    COALESCE(csd.sources, ARRAY[]::TEXT[]) as connected_sources
    
  FROM client_data cd
  LEFT JOIN goals_stats gs ON gs.cid = cd.cid
  LEFT JOIN recent_activity ra ON ra.cid = cd.cid
  LEFT JOIN health_metrics hm ON hm.cid = cd.cid
  LEFT JOIN task_stats ts ON ts.cid = cd.cid
  LEFT JOIN challenge_stats cs ON cs.cid = cd.cid
  LEFT JOIN top_goals tg ON tg.cid = cd.cid
  LEFT JOIN connected_sources_data csd ON csd.cid = cd.cid
  ORDER BY 
    CASE 
      WHEN COALESCE(CURRENT_DATE - ra.last_data_date, 999) > 7 THEN 0
      WHEN COALESCE(ts.has_overdue, false) THEN 1
      WHEN COALESCE(hm.recovery_7d < 40, false) OR COALESCE(hm.poor_sleep_days >= 3, false) THEN 2
      ELSE 3
    END,
    ra.last_data_date DESC NULLS LAST,
    cd.full_name;
END;
$function$;