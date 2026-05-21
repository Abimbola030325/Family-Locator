import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Users, LogIn, CheckCircle, XCircle, Loader2 } from "lucide-react";

const PENDING_JOIN_KEY = "wyd_pending_join";

interface InviteInfo {
  valid: boolean;
  circleId: number;
  circleName: string;
  circleColor: string;
  createdByName: string;
  expiresAt: string;
}

export default function Join() {
  const params = useParams<{ token: string }>();
  const token  = params.token;
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();

  const [invite,  setInvite]  = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined,  setJoined]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Fetch invite info (public endpoint)
  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInvite(data);
      })
      .catch(() => setError("Could not load invite — check your connection"))
      .finally(() => setLoading(false));
  }, [token]);

  // After login, check if there's a pending join to process
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    const pending = sessionStorage.getItem(PENDING_JOIN_KEY);
    if (!pending || pending !== token) return;
    sessionStorage.removeItem(PENDING_JOIN_KEY);
    handleJoin();
  }, [isAuthenticated, authLoading]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const res  = await fetch(`/api/invite/${token}/join`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setJoined(true);
        setTimeout(() => navigate(`/circles/${data.circleId}`), 2000);
      } else {
        setError(data.error ?? "Something went wrong");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setJoining(false);
    }
  };

  const handleLoginToJoin = () => {
    sessionStorage.setItem(PENDING_JOIN_KEY, token);
    login();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="absolute inset-0 opacity-40 map-bg pointer-events-none" />

      <Card className="w-full max-w-md z-10 shadow-2xl border-none">
        <CardHeader className="text-center pt-10 pb-6">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: error ? "#fef2f2" : (invite?.circleColor ? `${invite.circleColor}20` : "#f0fdfa") }}>
            {error
              ? <XCircle className="w-8 h-8 text-destructive" />
              : joined
                ? <CheckCircle className="w-8 h-8 text-emerald-500" />
                : <Users className="w-8 h-8" style={{ color: invite?.circleColor ?? "#14b8a6" }} />
            }
          </div>

          {error ? (
            <>
              <CardTitle className="text-xl text-destructive">Link no valid</CardTitle>
              <CardDescription className="mt-1">{error}</CardDescription>
            </>
          ) : joined ? (
            <>
              <CardTitle className="text-xl">You don join! 🎉</CardTitle>
              <CardDescription className="mt-1">Taking you to <strong>{invite?.circleName}</strong>…</CardDescription>
            </>
          ) : invite ? (
            <>
              <div className="text-sm text-muted-foreground mb-1">
                <span className="font-medium">{invite.createdByName}</span> wan add you to
              </div>
              <CardTitle className="text-2xl font-bold">{invite.circleName}</CardTitle>
              <CardDescription className="mt-2 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Location sharing circle on <span className="font-semibold text-primary ml-1">Where You Dey?</span>
              </CardDescription>
            </>
          ) : null}
        </CardHeader>

        {!error && !joined && invite && (
          <CardContent className="pb-10 px-8 space-y-4">
            {isAuthenticated ? (
              <Button
                size="lg"
                className="w-full text-base h-13"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining…</>
                  : "Join Circle"}
              </Button>
            ) : (
              <>
                <Button size="lg" className="w-full text-base h-13" onClick={handleLoginToJoin}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Log in to Join
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  You need a free account to join. Link expires in 7 days.
                </p>
              </>
            )}
          </CardContent>
        )}

        {error && (
          <CardContent className="pb-10 px-8">
            <Button variant="outline" className="w-full" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
