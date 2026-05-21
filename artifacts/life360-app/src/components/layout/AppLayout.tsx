import React from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link, useLocation } from "wouter";
import { Map, Users, MapPin, Activity, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Map", icon: Map },
  { href: "/circles", label: "Circles", icon: Users },
  { href: "/places", label: "Places", icon: MapPin },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-primary">CircleTrack</h1>
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
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center p-2 text-xs font-medium">
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-6 w-6 mb-1" />
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
