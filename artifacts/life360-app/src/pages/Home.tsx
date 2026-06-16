import React, { useState } from "react";
import { useListCircles, useListCircleMembers, usePingMember, type Member } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation as useWouterLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SimulatedMap from "@/components/map/SimulatedMap";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Battery, MapPin, Phone, Navigation, MessageCircle, RefreshCw, Clock, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function speedKmh(speed: number | null | undefined): number | null {
  if (speed == null || speed < 0) return null;
  const kmh = speed * 3.6;
  return kmh >= 3 ? Math.round(kmh) : null;
}

function speedLabel(kmh: number): string {
  if (kmh >= 25) return `🚗 ${kmh} km/h`;
  if (kmh >= 10) return `🛵 ${kmh} km/h`;
  return `🚶 ${kmh} km/h`;
}

function batteryColorClass(level: number): string {
  if (level <= 10) return "text-red-500";
  if (level <= 25) return "text-orange-500";
  if (level <= 50) return "text-yellow-500";
  return "text-emerald-600 dark:text-emerald-400";
}

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useWouterLocation();
  const { toast } = useToast();

  const { data: circles, isLoading: loadingCircles } = useListCircles();
  const [activeCircleId, setActiveCircleId] = useState<number | null>(null);
  const [sheetMember, setSheetMember] = useState<Member | null>(null);

  const pingMember = usePingMember();

  React.useEffect(() => {
    if (circles && circles.length > 0 && !activeCircleId) {
      setActiveCircleId(circles[0].id);
    }
  }, [circles, activeCircleId]);

  const { data: members, isLoading: loadingMembers } = useListCircleMembers(activeCircleId || 0, {
    query: { enabled: !!activeCircleId, refetchInterval: 30_000 },
  });

  const lowBatteryMembers = (members ?? []).filter(
    m => m.user.id !== user?.id && (m.lastLocation?.batteryLevel ?? 101) <= 20
  );

  const handlePing = () => {
    if (!sheetMember || !activeCircleId) return;
    pingMember.mutate(
      { circleId: activeCircleId, memberId: sheetMember.id },
      {
        onSuccess: () => toast({ title: "Location request sent!", description: `${sheetMember.user.firstName} go receive a notification to share their location.` }),
        onError: () => toast({ title: "Could not send request", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Circle selector */}
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

      {/* Map */}
      <div className="flex-1 map-bg relative">
        <SimulatedMap members={members || []} circleId={activeCircleId ?? undefined} />
      </div>

      {/* Members panel */}
      <div className="absolute bottom-0 left-0 right-0 md:w-80 md:right-auto md:top-20 md:bottom-auto md:left-4 bg-card/95 backdrop-blur border-t md:border border-border rounded-t-xl md:rounded-lg shadow-xl max-h-[50vh] flex flex-col">
        <div className="p-4 border-b border-border font-semibold flex items-center justify-between">
          <span>Your People</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            {members?.length || 0} online
          </span>
        </div>

        {/* Low battery warnings */}
        {lowBatteryMembers.length > 0 && (
          <div className="px-2 pt-2 space-y-1">
            {lowBatteryMembers.map(m => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 px-3 py-1.5 text-xs text-orange-700 dark:text-orange-400">
                <Battery className="h-3 w-3 shrink-0" />
                <span><strong>{m.user.firstName}</strong>'s phone dey at {m.lastLocation?.batteryLevel}% — battery low o!</span>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-y-auto p-2 space-y-1">
          {loadingMembers && <div className="p-4 text-center text-sm text-muted-foreground">Loading members...</div>}
          {!loadingMembers && members?.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No people dey this circle yet.</div>
          )}
          {members?.map((member) => {
            const kmh = speedKmh(member.lastLocation?.speed);
            const battery = member.lastLocation?.batteryLevel ?? null;
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer active:scale-[0.98]"
                onClick={() => setSheetMember(member)}
              >
                <Avatar className="h-11 w-11 border-2 border-background shadow-sm shrink-0">
                  <AvatarImage src={member.user.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                    {member.user.firstName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate text-sm">
                    {member.user.firstName} {member.user.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{member.lastLocation?.address || "Location no show"}</span>
                  </div>
                  {kmh !== null && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                      {speedLabel(kmh)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {battery !== null && (
                    <div className={cn("flex items-center gap-1 text-xs font-medium", batteryColorClass(battery))}>
                      {battery}%
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
            );
          })}
        </div>
      </div>

      {/* Member detail drawer */}
      <Drawer open={!!sheetMember} onOpenChange={(open) => { if (!open) setSheetMember(null); }}>
        <DrawerContent className="max-h-[85vh]">
          {sheetMember && (() => {
            const loc = sheetMember.lastLocation;
            const kmh = speedKmh(loc?.speed);
            const battery = loc?.batteryLevel ?? null;
            const name = [sheetMember.user.firstName, sheetMember.user.lastName].filter(Boolean).join(" ") || "Unknown";
            const phone = (sheetMember.user as any).phone as string | null | undefined;
            const mapsUrl = loc
              ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}&travelmode=driving`
              : null;

            return (
              <>
                <DrawerHeader className="text-left pb-2">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-4 border-primary/20 shadow-md">
                      <AvatarImage src={sheetMember.user.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                        {sheetMember.user.firstName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DrawerTitle className="text-xl">{name}</DrawerTitle>
                      <p className="text-sm text-muted-foreground capitalize">{sheetMember.role} · {sheetMember.circleId && circles?.find(c => c.id === sheetMember.circleId)?.name}</p>
                    </div>
                  </div>
                </DrawerHeader>

                <div className="px-4 pb-6 space-y-4 overflow-y-auto">
                  {/* Location info */}
                  <div className="rounded-xl bg-secondary/50 p-4 space-y-2">
                    {loc ? (
                      <>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{loc.address || `${loc.latitude.toFixed(4)}°N, ${loc.longitude.toFixed(4)}°E`}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              Last seen {formatDistanceToNow(new Date(loc.timestamp))} ago
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pt-1">
                          {battery !== null && (
                            <div className={cn("flex items-center gap-1.5 text-sm font-medium", batteryColorClass(battery))}>
                              <Battery className="h-4 w-4" />
                              {battery}%
                              {battery <= 20 && <span className="text-xs text-orange-500 font-normal">Low!</span>}
                            </div>
                          )}
                          {kmh !== null && (
                            <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                              <Zap className="h-4 w-4" />
                              {speedLabel(kmh)}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Location not available</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {mapsUrl && (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="contents">
                        <Button variant="default" className="w-full gap-2">
                          <Navigation className="h-4 w-4" />
                          Get Directions
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setSheetMember(null);
                        navigate(`/circles/${sheetMember.circleId}`);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </Button>
                    {phone && (
                      <a href={`tel:${phone}`} className="contents">
                        <Button variant="outline" className="w-full gap-2">
                          <Phone className="h-4 w-4" />
                          Call
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handlePing}
                      disabled={pingMember.isPending}
                    >
                      <RefreshCw className={cn("h-4 w-4", pingMember.isPending && "animate-spin")} />
                      Request Location
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
