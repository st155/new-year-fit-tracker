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
    const saved = localStorage.getItem('metrics_view_mode');
    return (saved as ViewMode) || 'unified';
  });
  
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>(() => {
    const saved = localStorage.getItem('metrics_device_filter');
    return (saved as DeviceFilter) || 'all';
  });

  // Сохраняем в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('metrics_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('metrics_device_filter', deviceFilter);
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
    throw new Error('useMetricsView must be used within a MetricsViewProvider');
  }
  return context;
}
