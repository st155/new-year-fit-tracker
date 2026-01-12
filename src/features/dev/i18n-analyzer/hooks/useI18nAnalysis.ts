import { useState, useEffect, useCallback } from 'react';
import type { AnalysisReport } from '../types';
import { analyzeLocales } from '../utils/analyzer-logic';
import i18n from '@/i18n';

export function useI18nAnalysis() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await analyzeLocales();
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('common:devTools.analysisError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    analyze();
  }, [analyze]);

  return { report, loading, error, refresh: analyze };
}
