import { useState, useEffect } from "react";

// Battery Status API — not in standard TS DOM lib, declared here
interface BatteryManager extends EventTarget {
  charging:        boolean;
  chargingTime:    number;
  dischargingTime: number;
  level:           number; // 0.0 – 1.0
  onchargingchange:        ((this: BatteryManager, ev: Event) => void) | null;
  onchargingtimechange:    ((this: BatteryManager, ev: Event) => void) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => void) | null;
  onlevelchange:           ((this: BatteryManager, ev: Event) => void) | null;
}

declare global {
  interface Navigator {
    getBattery?(): Promise<BatteryManager>;
  }
}

export interface BatteryState {
  level:    number | null; // 0–100 integer, or null if unsupported
  charging: boolean;
}

export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({ level: null, charging: false });

  useEffect(() => {
    if (!navigator.getBattery) return;

    let battery: BatteryManager | null = null;

    const update = () => {
      if (!battery) return;
      setState({
        level:    Math.round(battery.level * 100),
        charging: battery.charging,
      });
    };

    navigator.getBattery().then(batt => {
      battery = batt;
      update();
      batt.addEventListener("levelchange",   update);
      batt.addEventListener("chargingchange", update);
    }).catch(() => {});

    return () => {
      if (battery) {
        battery.removeEventListener("levelchange",   update);
        battery.removeEventListener("chargingchange", update);
      }
    };
  }, []);

  return state;
}
