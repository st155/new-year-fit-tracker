import { useState } from 'react';
import { InBodyParser, InBodyData } from '@/lib/inbody-parser';

export function useInBodyParser() {
  const [data, setData] = useState<InBodyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const parser = new InBodyParser();
      const result = await parser.parsePDF(file);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return {
    data,
    loading,
    error,
    parseFile,
    reset
  };
}
