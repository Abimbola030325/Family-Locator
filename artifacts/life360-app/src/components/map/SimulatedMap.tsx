import React from "react";
import { Member } from "@workspace/api-client-react/src/generated/api.schemas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SimulatedMapProps {
  members: Member[];
}

export default function SimulatedMap({ members }: SimulatedMapProps) {
  // A crude way to turn lat/lng into percentage coordinates on a simulated view
  const getCoords = (lat: number, lng: number) => {
    // Arbitrary scaling just to place pins nicely across the container
    const x = ((lng + 180) % 360) / 360 * 100;
    const y = ((lat + 90) % 180) / 180 * 100;
    
    // Fallbacks just so they show up somewhere if coordinates are out of bounds
    return { 
      left: `${Math.min(max(x, 10), 90)}%`, 
      top: `${Math.min(max(100 - y, 10), 90)}%` 
    };
  };

  const max = (a: number, b: number) => (a > b ? a : b);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {members.map((member, i) => {
        const loc = member.lastLocation;
        // Mock positions if missing so the UI looks alive
        const left = loc ? getCoords(loc.latitude, loc.longitude).left : `${20 + (i * 20) % 60}%`;
        const top = loc ? getCoords(loc.latitude, loc.longitude).top : `${30 + (i * 15) % 40}%`;

        return (
          <div
            key={member.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left, top }}
          >
            <div className="relative group">
              {/* Pulse effect */}
              <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping opacity-75" />
              
              <Avatar className="h-14 w-14 border-4 border-background shadow-lg relative z-10">
                <AvatarImage src={member.user.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                  {member.user.firstName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>

              {/* Tooltip on hover */}
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
