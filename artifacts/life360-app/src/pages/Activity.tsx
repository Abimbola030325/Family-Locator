import { useListCircles, useGetCircleActivity } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Users, Star, LogIn, LogOut, Clock, Activity as ActivityIcon, Wifi } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const EVENT_ICON: Record<string, { icon: React.ReactNode; color: string }> = {
  arrival:        { icon: <LogIn className="w-4 h-4" />,         color: "text-emerald-500 bg-emerald-500/10" },
  departure:      { icon: <LogOut className="w-4 h-4" />,        color: "text-rose-500 bg-rose-500/10" },
  checkin:        { icon: <Star className="w-4 h-4" />,          color: "text-amber-500 bg-amber-500/10" },
  location_shared:{ icon: <MapPin className="w-4 h-4" />,        color: "text-primary bg-primary/10" },
  member_joined:  { icon: <Users className="w-4 h-4" />,         color: "text-primary bg-primary/10" },
  member_left:    { icon: <Users className="w-4 h-4" />,         color: "text-muted-foreground bg-secondary" },
};

function CircleActivitySection({ circleId, circleName, circleColor }: { circleId: number; circleName: string; circleColor: string }) {
  const { data: events, isLoading } = useGetCircleActivity(circleId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-16 bg-secondary/50 animate-pulse rounded-lg" />)}
      </div>
    );
  }

  if (!events?.length) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: circleColor }} />
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{circleName}</h3>
      </div>
      {events.map(event => {
        const meta = EVENT_ICON[event.type] || { icon: <Wifi className="w-4 h-4" />, color: "text-muted-foreground bg-secondary" };
        return (
          <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors group">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.color}`}>
              {meta.icon}
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={event.user.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {event.user.firstName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{event.user.firstName} {event.user.lastName}</span>
                  {" "}
                  <span className="text-muted-foreground">{event.description}</span>
                </div>
                {event.placeName && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{event.placeName}
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              <span title={format(new Date(event.timestamp), "PPpp")}>
                {formatDistanceToNow(new Date(event.timestamp))} ago
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Activity() {
  const { data: circles, isLoading: loadingCircles } = useListCircles();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground mt-1">Recent events across all your circles.</p>
      </div>

      {loadingCircles && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-secondary/50 animate-pulse rounded-lg" />)}
        </div>
      )}

      {!loadingCircles && !circles?.length && (
        <div className="text-center py-20 bg-secondary/30 rounded-xl border border-dashed border-border">
          <ActivityIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-medium">No activity yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">Join or create a circle to see events here.</p>
        </div>
      )}

      {circles?.map(circle => (
        <CircleActivitySection
          key={circle.id}
          circleId={circle.id}
          circleName={circle.name}
          circleColor={circle.color}
        />
      ))}
    </div>
  );
}
