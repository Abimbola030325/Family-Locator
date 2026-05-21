import React, { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link, useLocation } from "wouter";
import { Map, Users, MapPin, Activity, User, LogOut, AlertTriangle, Loader2, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAutoTrackContext } from "@/context/AutoTrackContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const SOS_COOLDOWN_KEY = "wyd_sos_last";
const SOS_COOLDOWN_MS  = 5 * 60 * 1000;

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
        {lastUpdate ? `Last shared ${formatDistanceToNow(lastUpdate)} ago` : "Waiting for first update…"}
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

function SosButton() {
  const { toast }                     = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending]         = useState(false);
  const [onCooldown, setOnCooldown]   = useState(() => {
    try {
      const last = localStorage.getItem(SOS_COOLDOWN_KEY);
      return last ? Date.now() - Number(last) < SOS_COOLDOWN_MS : false;
    } catch { return false; }
  });

  const handleSend = async () => {
    setSending(true);
    try {
      const res  = await fetch("/api/sos", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(SOS_COOLDOWN_KEY, String(Date.now()));
        setOnCooldown(true);
        setTimeout(() => setOnCooldown(false), SOS_COOLDOWN_MS);
        toast({
          title:       "SOS sent! 🆘",
          description: data.notified > 0
            ? `Alert don reach ${data.notified} person${data.notified > 1 ? "s" : ""} in your circles.`
            : "Alert sent — no push subscribers found, but the event was logged.",
        });
      } else {
        toast({ title: "SOS failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not send SOS.", variant: "destructive" });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => !onCooldown && setConfirmOpen(true)}
            disabled={sending || onCooldown}
            aria-label="Send SOS alert"
            className={cn(
              "fixed z-50 bottom-20 right-4 md:bottom-6 md:right-6",
              "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center",
              "transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400",
              onCooldown
                ? "bg-rose-200 dark:bg-rose-900/50 cursor-not-allowed"
                : "bg-rose-600 hover:bg-rose-700 cursor-pointer"
            )}
          >
            {sending ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <AlertTriangle className="w-6 h-6 text-white" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[180px] text-center">
          {onCooldown ? "SOS sent — wait 5 mins before sending again" : "SOS Emergency Alert"}
        </TooltipContent>
      </Tooltip>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Send SOS Alert?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-1">
              <span className="block">This go immediately send emergency alert to <strong>all your people</strong> in every circle you belong. Your current location go be included.</span>
              <span className="block text-sm font-medium text-foreground">Only use this if you really need help o!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} className="bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-400">
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : "Yes, Send SOS!"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6 space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-primary leading-tight">Where You Dey?</h1>
          <p className="text-xs text-muted-foreground">Know where your people dey</p>
          <div className="pt-1"><TrackingBadge /></div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          {/* Dark mode toggle */}
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={toggleTheme}>
            {theme === "dark"
              ? <><Sun className="mr-2 h-5 w-5" />Light Mode</>
              : <><Moon className="mr-2 h-5 w-5" />Dark Mode</>
            }
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="mr-2 h-5 w-5" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile top bar with theme toggle */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur">
          <span className="text-sm font-bold text-primary">Where You Dey?</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-background">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden border-t border-border bg-card safe-area-bottom">
          <nav className="flex justify-around p-2">
            {navItems.map((item) => {
              const isActive  = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const isProfile = item.href === "/profile";
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center p-2 text-xs font-medium">
                  <div className={cn("flex flex-col items-center justify-center transition-colors relative", isActive ? "text-primary" : "text-muted-foreground")}>
                    <div className="relative">
                      <item.icon className="h-6 w-6 mb-1" />
                      {isProfile && (
                        <span className="absolute -top-0.5 -right-0.5"><MobileTrackingDot /></span>
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

      <SosButton />
    </div>
  );
}
