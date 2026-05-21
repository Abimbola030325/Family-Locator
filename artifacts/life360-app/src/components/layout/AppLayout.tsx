import React from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link, useLocation } from "wouter";
import { Map, Users, MapPin, Activity, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutoTrackContext } from "@/context/AutoTrackContext";
import { formatDistanceToNow } from "date-fns";

const navItems = [
  { href: "/",         label: "Map",      icon: Map },
  { href: "/circles",  label: "Circles",  icon: Users },
  { href: "/places",   label: "Places",   icon: MapPin },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile",  label: "Profile",  icon: User },
];

function TrackingBadge() {
  const { isTracking, lastUpdate, error } = useAutoTrackContext();

  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-amber-500 cursor-default select-none">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            Location off
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{error}</TooltipContent>
      </Tooltip>
    );
  }

  if (!isTracking) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 cursor-default select-none">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live tracking
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        {lastUpdate
          ? `Last shared ${formatDistanceToNow(lastUpdate)} ago`
          : "Waiting for first update…"}
      </TooltipContent>
    </Tooltip>
  );
}

function MobileTrackingDot() {
  const { isTracking, error } = useAutoTrackContext();
  if (error) return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
  if (!isTracking) return null;
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6 space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-primary leading-tight">Where You Dey?</h1>
          <p className="text-xs text-muted-foreground">Know where your people dey</p>
          <div className="pt-1">
            <TrackingBadge />
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="mr-2 h-5 w-5" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-auto bg-background">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden border-t border-border bg-card safe-area-bottom">
          <nav className="flex justify-around p-2">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const isProfile = item.href === "/profile";
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center p-2 text-xs font-medium">
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center transition-colors relative",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <div className="relative">
                      <item.icon className="h-6 w-6 mb-1" />
                      {isProfile && (
                        <span className="absolute -top-0.5 -right-0.5">
                          <MobileTrackingDot />
                        </span>
                      )}
                    </div>
                    <span className="scale-90">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </main>
    </div>
  );
}
