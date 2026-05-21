import React from "react";
import { Member } from "@workspace/api-client-react/src/generated/api.schemas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BatteryFull, BatteryMedium, BatteryLow, BatteryWarning, Zap, Navigation } from "lucide-react";

interface SimulatedMapProps {
  members: Member[];
}

const NG_LAT_MIN = 4.0;
const NG_LAT_MAX = 14.0;
const NG_LNG_MIN = 2.5;
const NG_LNG_MAX = 15.0;

const CITIES = [
  { name: "Lagos",         lat: 6.524,  lng: 3.379 },
  { name: "Abuja",         lat: 9.076,  lng: 7.399 },
  { name: "Kano",          lat: 12.0,   lng: 8.516 },
  { name: "Port Harcourt", lat: 4.815,  lng: 7.049 },
  { name: "Ibadan",        lat: 7.388,  lng: 3.9   },
  { name: "Enugu",         lat: 6.441,  lng: 7.499 },
  { name: "Kaduna",        lat: 10.516, lng: 7.433 },
];

const FALLBACK_POSITIONS = [
  { lat: 6.524, lng: 3.379 },
  { lat: 6.601, lng: 3.351 },
  { lat: 9.076, lng: 7.399 },
  { lat: 4.815, lng: 7.049 },
  { lat: 7.388, lng: 3.9   },
];

function toPercent(lat: number, lng: number) {
  const x = ((lng - NG_LNG_MIN) / (NG_LNG_MAX - NG_LNG_MIN)) * 100;
  const y = ((NG_LAT_MAX - lat) / (NG_LAT_MAX - NG_LAT_MIN)) * 100;
  return { left: `${Math.min(Math.max(x, 5), 95)}%`, top: `${Math.min(Math.max(y, 5), 95)}%` };
}

// Speed m/s → km/h, threshold 3 km/h to filter GPS noise
function speedKmh(speed: number | null | undefined): number | null {
  if (speed == null || speed < 0) return null;
  const kmh = speed * 3.6;
  return kmh >= 3 ? Math.round(kmh) : null;
}

function speedLabel(kmh: number): string {
  if (kmh >= 25)  return `🚗 ${kmh} km/h`;
  if (kmh >= 10)  return `🛵 ${kmh} km/h`;
  return                 `🚶 ${kmh} km/h`;
}

function speedChipColor(kmh: number): string {
  if (kmh >= 25) return "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300";
  if (kmh >= 10) return "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300";
  return               "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400";
}

function batteryColor(level: number): string {
  if (level <= 10) return "text-red-600 dark:text-red-400";
  if (level <= 25) return "text-amber-500 dark:text-amber-400";
  if (level <= 50) return "text-yellow-500 dark:text-yellow-400";
  return "text-emerald-600 dark:text-emerald-400";
}
function batteryBg(level: number): string {
  if (level <= 10) return "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50";
  if (level <= 25) return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50";
  if (level <= 50) return "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800/50";
  return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50";
}
function BatteryIcon({ level, className }: { level: number; className?: string }) {
  if (level <= 10) return <BatteryWarning className={className} />;
  if (level <= 25) return <BatteryLow     className={className} />;
  if (level <= 60) return <BatteryMedium  className={className} />;
  return                  <BatteryFull    className={className} />;
}

function openGoogleMaps(lat: number, lng: number) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    "_blank",
    "noopener,noreferrer"
  );
}

export default function SimulatedMap({ members }: SimulatedMapProps) {
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* City labels */}
      {CITIES.map(city => {
        const pos = toPercent(city.lat, city.lng);
        return (
          <div key={city.name} className="absolute pointer-events-none"
            style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -50%)" }}>
            <div className="w-2 h-2 rounded-full bg-primary/30 border border-primary/50" />
            <span className="block text-[10px] text-muted-foreground/60 font-medium mt-0.5 whitespace-nowrap -translate-x-1/4">
              {city.name}
            </span>
          </div>
        );
      })}

      {/* Member pins */}
      {members.map((member, i) => {
        const loc      = member.lastLocation;
        const fallback = FALLBACK_POSITIONS[i % FALLBACK_POSITIONS.length];
        const hasReal  = !!loc;
        const coords   = loc
          ? toPercent(loc.latitude, loc.longitude)
          : toPercent(fallback.lat, fallback.lng);
        const battery  = loc?.batteryLevel ?? null;
        const isLow    = battery !== null && battery <= 25;
        const kmh      = hasReal ? speedKmh(loc?.speed) : null;

        return (
          <div key={member.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={coords}
          >
            <div className="relative group">
              <div className={`absolute -inset-2 rounded-full animate-ping opacity-75 ${isLow ? "bg-red-400/40" : "bg-primary/20"}`} />

              {/* Avatar — clickable → Google Maps */}
              <button
                onClick={() => {
                  const lat = loc?.latitude ?? fallback.lat;
                  const lng = loc?.longitude ?? fallback.lng;
                  openGoogleMaps(lat, lng);
                }}
                title={`Navigate to ${member.user.firstName} on Google Maps`}
                className={`relative z-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer`}
              >
                <Avatar className={`h-14 w-14 border-4 shadow-lg ${isLow ? "border-red-300 dark:border-red-700" : "border-background"}`}>
                  <AvatarImage src={member.user.profileImageUrl || undefined} />
                  <AvatarFallback className={`font-bold text-lg ${isLow ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-primary text-primary-foreground"}`}>
                    {member.user.firstName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                {/* Navigate overlay on hover */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-white" />
                </div>
              </button>

              {/* Battery chip — top-right */}
              {battery !== null && (
                <div className="absolute -top-1 -right-1 z-20">
                  <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${batteryColor(battery)} ${batteryBg(battery)}`}>
                    <BatteryIcon level={battery} className="w-2.5 h-2.5 shrink-0" />
                    {battery}%
                  </div>
                </div>
              )}

              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-foreground text-background text-xs px-2 py-1.5 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none space-y-0.5 text-center">
                <div className="font-medium">{member.user.firstName}</div>
                {kmh !== null && <div className="text-emerald-300">{speedLabel(kmh)}</div>}
                {battery !== null && <div className={isLow ? "text-red-300" : "text-emerald-300"}>{battery}% battery</div>}
                <div className="text-background/60 text-[10px]">Tap to navigate →</div>
              </div>
            </div>

            {/* Name badge + speed chip */}
            <div className="mt-1 flex flex-col items-center gap-0.5">
              <div className="bg-background/90 backdrop-blur px-2 py-0.5 rounded-full shadow-sm text-xs font-semibold text-foreground border border-border">
                {member.user.firstName}
              </div>
              {kmh !== null && (
                <div className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${speedChipColor(kmh)}`}>
                  {speedLabel(kmh)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
