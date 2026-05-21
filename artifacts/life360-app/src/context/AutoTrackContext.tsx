import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAutoTrack, type AutoTrackState } from "@/hooks/useAutoTrack";

const STORAGE_KEY = "wyd_autotrack";

interface AutoTrackContextValue extends AutoTrackState {
  autoTrackEnabled: boolean;
  setAutoTrackEnabled: (v: boolean) => void;
}

const AutoTrackContext = createContext<AutoTrackContextValue>({
  autoTrackEnabled:    false,
  setAutoTrackEnabled: () => {},
  isTracking:          false,
  lastUpdate:          null,
  error:               null,
});

export function AutoTrackProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });

  const setAutoTrackEnabled = (v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem(STORAGE_KEY, String(v)); } catch {}
  };

  const trackState = useAutoTrack(enabled);

  return (
    <AutoTrackContext.Provider value={{ autoTrackEnabled: enabled, setAutoTrackEnabled, ...trackState }}>
      {children}
    </AutoTrackContext.Provider>
  );
}

export function useAutoTrackContext() {
  return useContext(AutoTrackContext);
}
