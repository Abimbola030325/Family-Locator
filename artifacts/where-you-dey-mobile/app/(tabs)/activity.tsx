import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useGetCircleActivity, useListCircles } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type ActivityEvent = {
  id: number;
  circleId: number;
  userId: string;
  type: string;
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timestamp: string;
  userName?: string | null;
  userAvatar?: string | null;
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function eventIcon(type: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case "arrival": return { icon: "enter-outline", color: "#22c55e" };
    case "departure": return { icon: "exit-outline", color: "#f59d07" };
    case "checkin": return { icon: "location", color: "#13a591" };
    case "member_joined": return { icon: "person-add-outline", color: "#8b5cf6" };
    case "member_left": return { icon: "person-remove-outline", color: "#ef4444" };
    default: return { icon: "ellipse-outline", color: "#6b7c94" };
  }
}

function eventLabel(type: string, placeName?: string | null): string {
  switch (type) {
    case "arrival": return placeName ? `Arrived at ${placeName}` : "Arrived somewhere";
    case "departure": return placeName ? `Left ${placeName}` : "Left somewhere";
    case "checkin": return placeName ? `Checked in at ${placeName}` : "Checked in";
    case "member_joined": return "Joined the circle";
    case "member_left": return "Left the circle";
    default: return type;
  }
}

function CircleActivityList({ circleId, circleName }: { circleId: number; circleName: string }) {
  const colors = useColors();
  const { data, isLoading, refetch, isRefetching } = useGetCircleActivity(circleId);

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;
  if (!data?.length) return null;

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{circleName}</Text>
      {data.map((event) => {
        const { icon, color } = eventIcon(event.type);
        return (
          <View key={event.id} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.eventIcon, { backgroundColor: color + "20" }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <View style={styles.eventBody}>
              <Text style={[styles.eventUser, { color: colors.foreground }]} numberOfLines={1}>
                {(event as ActivityEvent).userName ?? "Someone"}
              </Text>
              <Text style={[styles.eventAction, { color: colors.mutedForeground }]} numberOfLines={1}>
                {eventLabel(event.type, (event as ActivityEvent).placeName)}
              </Text>
            </View>
            <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
              {timeAgo(event.timestamp ?? "")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const { data: circles, isLoading: circlesLoading, refetch } = useListCircles();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (circlesLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activity</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!circles?.length) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activity</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="flash-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No activity yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Join a circle to see your people's movements
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activity</Text>
      </View>
      <FlatList
        data={circles}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => <CircleActivityList circleId={item.id} circleName={item.name} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 40 },
  list: { padding: 16, gap: 4 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 6, paddingHorizontal: 4 },
  eventCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 6 },
  eventIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  eventBody: { flex: 1 },
  eventUser: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  eventAction: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  eventTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
