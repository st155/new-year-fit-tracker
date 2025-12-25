CREATE OR REPLACE FUNCTION public.update_terra_user_id_history()
RETURNS TRIGGER AS $$
DECLARE
  v_reference_id TEXT;
  v_terra_user_id TEXT;
  v_provider TEXT;
  v_uuid UUID;
BEGIN
  v_reference_id := NULLIF(TRIM(NEW.payload->'user'->>'reference_id'), '');
  v_terra_user_id := NULLIF(TRIM(NEW.payload->'user'->>'user_id'), '');
  v_provider := UPPER(COALESCE(NEW.provider, NEW.payload->'user'->>'provider', 'UNKNOWN'));
  
  IF v_reference_id IS NOT NULL AND v_terra_user_id IS NOT NULL THEN
    BEGIN
      v_uuid := v_reference_id::UUID;
      INSERT INTO public.terra_user_id_history (user_id, terra_user_id, provider, first_seen_at, last_seen_at, webhook_count)
      VALUES (v_uuid, v_terra_user_id, v_provider, now(), now(), 1)
      ON CONFLICT (user_id, terra_user_id) 
      DO UPDATE SET last_seen_at = now(), webhook_count = terra_user_id_history.webhook_count + 1;
    EXCEPTION WHEN invalid_text_representation THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_terra_user_id_history ON public.terra_webhooks_raw;
CREATE TRIGGER trg_update_terra_user_id_history
AFTER INSERT ON public.terra_webhooks_raw
FOR EACH ROW EXECUTE FUNCTION public.update_terra_user_id_history();