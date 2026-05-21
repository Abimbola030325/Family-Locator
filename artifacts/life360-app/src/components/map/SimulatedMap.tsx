import React from "react";
import { Member } from "@workspace/api-client-react/src/generated/api.schemas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SimulatedMapProps {
  members: Member[];
}

// Nigeria bounding box: lat 4.27–13.89, lng 2.67–14.68
// We map those ranges onto the 0–100% canvas
const NG_LAT_MIN = 4.0;
const NG_LAT_MAX = 14.0;
const NG_LNG_MIN = 2.5;
const NG_LNG_MAX = 15.0;

const CITIES = [
  { name: "Lagos", lat: 6.524, lng: 3.379 },
  { name: "Abuja", lat: 9.076, lng: 7.399 },
  { name: "Kano", lat: 12.0, lng: 8.516 },
  { name: "Port Harcourt", lat: 4.815, lng: 7.049 },
  { name: "Ibadan", lat: 7.388, lng: 3.9 },
  { name: "Enugu", lat: 6.441, lng: 7.499 },
  { name: "Kaduna", lat: 10.516, lng: 7.433 },
];

function toPercent(lat: number, lng: number) {
  const x = ((lng - NG_LNG_MIN) / (NG_LNG_MAX - NG_LNG_MIN)) * 100;
  const y = ((NG_LAT_MAX - lat) / (NG_LAT_MAX - NG_LAT_MIN)) * 100;
  return {
    left: `${Math.min(Math.max(x, 5), 95)}%`,
    top: `${Math.min(Math.max(y, 5), 95)}%`,
  };
}

// Spread members across Lagos/Abuja/PH if no real coordinates
const FALLBACK_POSITIONS = [
  { lat: 6.524, lng: 3.379 },   // Lagos Island
  { lat: 6.601, lng: 3.351 },   // Ikeja
  { lat: 9.076, lng: 7.399 },   // Abuja
  { lat: 4.815, lng: 7.049 },   // Port Harcourt
  { lat: 7.388, lng: 3.9 },     // Ibadan
];

export default function SimulatedMap({ members }: SimulatedMapProps) {
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* City labels as background landmarks */}
      {CITIES.map(city => {
        const pos = toPercent(city.lat, city.lng);
        return (
          <div
            key={city.name}
            className="absolute pointer-events-none"
            style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -50%)" }}
          >
            <div className="w-2 h-2 rounded-full bg-primary/30 border border-primary/50" />
            <span className="block text-[10px] text-muted-foreground/60 font-medium mt-0.5 whitespace-nowrap -translate-x-1/4">
              {city.name}
            </span>
          </div>
        );
      })}

      {/* Member pins */}
      {members.map((member, i) => {
        const loc = member.lastLocation;
        const fallback = FALLBACK_POSITIONS[i % FALLBACK_POSITIONS.length];
        const coords = loc
          ? toPercent(loc.latitude, loc.longitude)
          : toPercent(fallback.lat, fallback.lng);

        return (
          <div
            key={member.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={coords}
          >
            <div className="relative group">
              <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping opacity-75" />
              <Avatar className="h-14 w-14 border-4 border-background shadow-lg relative z-10">
                <AvatarImage src={member.user.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                  {member.user.firstName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                {member.user.firstName}
              </div>
            </div>
            <div className="mt-1 bg-background/90 backdrop-blur px-2 py-0.5 rounded-full shadow-sm text-xs font-semibold text-foreground border border-border">
              {member.user.firstName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
