import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function Login() {
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="absolute inset-0 z-0 opacity-40 map-bg"></div>
      <Card className="w-full max-w-md z-10 shadow-2xl border-none">
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-6">
            <MapPin className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">Where You Dey?</CardTitle>
          <CardDescription className="text-base mt-2">
            Know where your people dey, always. 🇳🇬
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <Button
            size="lg"
            className="w-full text-lg h-14"
            onClick={login}
          >
            Enter Make We See You
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
