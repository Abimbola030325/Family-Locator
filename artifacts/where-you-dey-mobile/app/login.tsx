import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const CLIENT_ID = process.env.EXPO_PUBLIC_REPL_ID ?? "";
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: "whereyoudey" });
const DISCOVERY_URL = "https://replit.com/oidc";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discovery = AuthSession.useAutoDiscovery(DISCOVERY_URL);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      redirectUri: REDIRECT_URI,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery,
  );

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const { code, state } = response.params;
      handleExchange(code, state ?? "");
    } else if (response.type === "error") {
      setError("Authentication failed. Please try again.");
      setLoading(false);
    }
  }, [response]);

  const handleExchange = async (code: string, state: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/mobile-auth/token-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: request?.codeVerifier ?? "",
          redirect_uri: REDIRECT_URI,
          state,
        }),
      });
      const data = await res.json();
      if (data.token) {
        await setToken(data.token);
      } else {
        setError(data.error ?? "Sign in failed. Please try again.");
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!discovery || loading) return;
    setLoading(true);
    setError(null);
    await promptAsync();
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
        },
      ]}
    >
      <View style={styles.hero}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
          <Ionicons name="location" size={60} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Where You Dey?</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Know where your people dey, always.{"  "}🇳🇬
        </Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.features}>
          {[
            { icon: "map-outline" as const, label: "Real-time location sharing" },
            { icon: "people-outline" as const, label: "Family & friend circles" },
            { icon: "notifications-outline" as const, label: "Arrival & departure alerts" },
          ].map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.featureLabel, { color: colors.foreground }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: colors.primary, opacity: !discovery || loading ? 0.6 : 1 },
          ]}
          onPress={handleSignIn}
          disabled={!discovery || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Enter — Make We See You</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Signing in allows your circle members to see your location.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },
  hero: { alignItems: "center", gap: 14 },
  iconWrap: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -1, textAlign: "center" },
  tagline: { fontSize: 16, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  bottom: { gap: 20 },
  features: { gap: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  error: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular" },
  btn: { borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  disclaimer: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
