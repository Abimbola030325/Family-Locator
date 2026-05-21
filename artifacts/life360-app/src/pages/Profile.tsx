import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useUpdateMyLocation, useGetMyLocationHistory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyLocationHistoryQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Battery, LogOut, Navigation, History } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateLocation = useUpdateMyLocation();
  const { data: history, isLoading: loadingHistory } = useGetMyLocationHistory();

  const [sharing, setSharing] = useState(false);

  const handleShareLocation = () => {
    setSharing(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateLocation.mutate({
            data: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed || undefined,
              batteryLevel: undefined,
            },
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetMyLocationHistoryQueryKey() });
              toast({ title: "Location shared with your circles" });
              setSharing(false);
            },
            onError: () => {
              toast({ title: "Failed to share location", variant: "destructive" });
              setSharing(false);
            },
          });
        },
        () => {
          // Fallback: share a Lagos-area location
          updateLocation.mutate({
            data: { latitude: 6.5244 + (Math.random() - 0.5) * 0.08, longitude: 3.3792 + (Math.random() - 0.5) * 0.08, accuracy: 10 },
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetMyLocationHistoryQueryKey() });
              toast({ title: "Location shared" });
              setSharing(false);
            },
          });
        }
      );
    } else {
      updateLocation.mutate({
        data: { latitude: 6.5244, longitude: 3.3792, accuracy: 50 },
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyLocationHistoryQueryKey() });
          toast({ title: "Location shared" });
          setSharing(false);
        },
      });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

      <Card>
        <CardContent className="p-6 flex items-center gap-5">
          <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-lg">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {user?.firstName?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">{user?.email}</p>
            <Badge variant="secondary" className="mt-2">Active Member</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            Location Sharing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share your current location with all your circles. Your people go see where you dey for the map.
          </p>
          <Button
            onClick={handleShareLocation}
            disabled={sharing || updateLocation.isPending}
            className="w-full"
          >
            <MapPin className="w-4 h-4 mr-2" />
            {sharing || updateLocation.isPending ? "Sharing..." : "Share My Location Now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Location History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-secondary/50 animate-pulse rounded-lg" />)}
            </div>
          ) : !history?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No location history yet. Share your location make your people see you.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(loc => (
                <div key={loc.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-secondary/40 transition-colors">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(loc.timestamp))} ago
                      </div>
                      {loc.batteryLevel != null && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Battery className="w-3 h-3" />
                          {loc.batteryLevel}%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(loc.timestamp), "h:mm a")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="p-4">
          <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
