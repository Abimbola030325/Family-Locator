import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [sharing, setSharing] = useState(true);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "You";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await signOut();
        },
      },
    ]);
  };

  const toggleSharing = (val: boolean) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSharing(val);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: insets.bottom + 34 }]}
    >
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>

      <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {user?.profileImageUrl ? (
          <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
          </View>
        )}
        <View style={styles.avatarInfo}>
          <Text style={[styles.userName, { color: colors.foreground }]}>{displayName}</Text>
          {user?.email ? (
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
          ) : null}
          {user?.phone ? (
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.phone}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Privacy</Text>

        <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Share My Location</Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                {sharing ? "Visible to circle members" : "Hidden from all circles"}
              </Text>
            </View>
          </View>
          <Switch
            value={sharing}
            onValueChange={toggleSharing}
            trackColor={{ false: colors.muted, true: colors.primary + "88" }}
            thumbColor={sharing ? colors.primary : colors.mutedForeground}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>

        {user?.id ? (
          <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="id-card-outline" size={18} color={colors.mutedForeground} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>User ID</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {user.id}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.75}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: colors.destructive + "18" }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.destructive }]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>Where You Dey? v1.0.0 🇳🇬</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 6 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 16 },
  avatarCard: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 20, borderWidth: 1, gap: 16, marginBottom: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 24, fontFamily: "Inter_700Bold" },
  avatarInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  section: { marginTop: 20, gap: 8 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, paddingHorizontal: 4 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 4 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 24 },
});
