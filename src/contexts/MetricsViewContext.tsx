import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ViewMode = 'unified' | 'by_device';
type DeviceFilter = 'all' | 'whoop' | 'withings' | 'terra' | 'manual' | 'apple_health' | 'garmin' | 'ultrahuman';

interface MetricsViewContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  deviceFilter: DeviceFilter;
  setDeviceFilter: (device: DeviceFilter) => void;
  toggleViewMode: () => void;
}

const MetricsViewContext = createContext<MetricsViewContextType | undefined>(undefined);

export function MetricsViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('metrics_view_mode');
      return (saved as ViewMode) || 'unified';
    } catch {
      return 'unified';
    }
  });
  
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>(() => {
    try {
      const saved = localStorage.getItem('metrics_device_filter');
      return (saved as DeviceFilter) || 'all';
    } catch {
      return 'all';
    }
  });

  // Сохраняем в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem('metrics_view_mode', viewMode);
    } catch (error) {
      console.warn('[MetricsView] Failed to save view mode:', error);
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('metrics_device_filter', deviceFilter);
    } catch (error) {
      console.warn('[MetricsView] Failed to save device filter:', error);
    }
  }, [deviceFilter]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'unified' ? 'by_device' : 'unified');
  };

  return (
    <MetricsViewContext.Provider value={{
      viewMode,
      setViewMode,
      deviceFilter,
      setDeviceFilter,
      toggleViewMode,
    }}>
      {children}
    </MetricsViewContext.Provider>
  );
}

export function useMetricsView() {
  const context = useContext(MetricsViewContext);
  
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.error('💥 [useMetricsView] Called outside MetricsViewProvider!');
    }
    // Return safe defaults instead of throwing
    return {
      viewMode: 'unified' as ViewMode,
      setViewMode: () => {},
      deviceFilter: 'all' as DeviceFilter,
      setDeviceFilter: () => {},
      toggleViewMode: () => {},
    };
  }
  
  return context;
}
