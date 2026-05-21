import React, { useState } from "react";
import { useListCircles, useListCircleMembers } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SimulatedMap from "@/components/map/SimulatedMap";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Battery, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const { data: circles, isLoading: loadingCircles } = useListCircles();
  const [activeCircleId, setActiveCircleId] = useState<number | null>(null);

  // Auto-select first circle
  React.useEffect(() => {
    if (circles && circles.length > 0 && !activeCircleId) {
      setActiveCircleId(circles[0].id);
    }
  }, [circles, activeCircleId]);

  const { data: members, isLoading: loadingMembers } = useListCircleMembers(activeCircleId || 0, {
    query: { enabled: !!activeCircleId }
  });

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-4 left-4 z-10 w-64 bg-background/90 backdrop-blur rounded-lg shadow-md border border-border">
        {loadingCircles ? (
          <div className="p-3 text-sm text-muted-foreground">Loading circles...</div>
        ) : (
          <Select
            value={activeCircleId?.toString()}
            onValueChange={(val) => setActiveCircleId(Number(val))}
          >
            <SelectTrigger className="border-0 shadow-none focus:ring-0 bg-transparent h-12 font-medium text-base">
              <SelectValue placeholder="Select a circle" />
            </SelectTrigger>
            <SelectContent>
              {circles?.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex-1 map-bg relative">
        <SimulatedMap members={members || []} />
      </div>

      {/* Members Bottom Sheet for Mobile, Side Panel for Desktop */}
      <div className="absolute bottom-0 left-0 right-0 md:w-80 md:right-auto md:top-20 md:bottom-auto md:left-4 bg-card/95 backdrop-blur border-t md:border border-border rounded-t-xl md:rounded-lg shadow-xl max-h-[50vh] flex flex-col">
        <div className="p-4 border-b border-border font-semibold flex items-center justify-between">
          <span>Family Status</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            {members?.length || 0} online
          </span>
        </div>
        <div className="overflow-y-auto p-2 space-y-1">
          {loadingMembers && <div className="p-4 text-center text-sm text-muted-foreground">Loading members...</div>}
          {!loadingMembers && members?.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No members in this circle.</div>
          )}
          {members?.map((member) => (
            <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage src={member.user.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {member.user.firstName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {member.user.firstName} {member.user.lastName}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{member.lastLocation?.address || "Unknown Location"}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {member.lastLocation?.batteryLevel && (
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {member.lastLocation.batteryLevel}%
                    <Battery className="h-3 w-3" />
                  </div>
                )}
                {member.lastLocation?.timestamp && (
                  <div className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(member.lastLocation.timestamp))} ago
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
