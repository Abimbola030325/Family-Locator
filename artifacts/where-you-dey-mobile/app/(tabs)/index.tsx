import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import {
  useGetCircleMemberLocations,
  useListCircles,
  useUpdateMyLocation,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const { height: SCREEN_H } = Dimensions.get("window");
const PANEL_COLLAPSED = 120;
const PANEL_EXPANDED = SCREEN_H * 0.45;

type MemberLocation = {
  userId: string;
  userName?: string | null;
  profileImageUrl?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  battery?: number | null;
  timestamp: string;
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function batteryColor(pct?: number | null): string {
  if (pct == null) return "#6b7c94";
  if (pct < 20) return "#ef4444";
  if (pct < 40) return "#f59d07";
  return "#22c55e";
}

function batteryIcon(pct?: number | null): keyof typeof Ionicons.glyphMap {
  if (pct == null) return "battery-dead-outline";
  if (pct < 20) return "battery-dead";
  if (pct < 50) return "battery-half";
  return "battery-full";
}

function MemberCard({
  member,
  isMe,
  colors,
  onPress,
}: {
  member: MemberLocation;
  isMe: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const initials = (member.userName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity
      style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "22" }]}>
        <Text style={[styles.memberInitials, { color: colors.primary }]}>{initials}</Text>
        {isMe && (
          <View style={[styles.meBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.meBadgeText}>You</Text>
          </View>
        )}
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
          {member.userName ?? "Unknown"}
        </Text>
        <Text style={[styles.memberMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {timeAgo(member.timestamp)}
          {member.speed != null && member.speed > 2
            ? ` · ${(member.speed * 3.6).toFixed(0)} km/h`
            : ""}
        </Text>
      </View>
      <View style={styles.memberRight}>
        {member.battery != null && (
          <View style={styles.batteryRow}>
            <Ionicons name={batteryIcon(member.battery)} size={14} color={batteryColor(member.battery)} />
            <Text style={[styles.batteryText, { color: batteryColor(member.battery) }]}>
              {Math.round(member.battery)}%
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

function MapPlaceholder({
  members,
  colors,
}: {
  members: MemberLocation[];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.mapPlaceholder, { backgroundColor: colors.secondary }]}>
      <Ionicons name="map-outline" size={48} color={colors.primary} />
      <Text style={[styles.mapPlaceholderText, { color: colors.mutedForeground }]}>
        {members.length > 0
          ? `${members.length} member${members.length !== 1 ? "s" : ""} in this circle`
          : "No members sharing location"}
      </Text>
      {members.length > 0 && (
        <View style={styles.mapPins}>
          {members.slice(0, 5).map((m) => {
            const initials = (m.userName ?? "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            return (
              <View key={m.userId} style={[styles.mapPin, { backgroundColor: colors.primary }]}>
                <Text style={styles.mapPinText}>{initials}</Text>
              </View>
            );
          })}
          {members.length > 5 && (
            <View style={[styles.mapPin, { backgroundColor: colors.muted }]}>
              <Text style={[styles.mapPinText, { color: colors.mutedForeground }]}>
                +{members.length - 5}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedCircleIdx, setSelectedCircleIdx] = useState(0);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelAnim = useRef(new Animated.Value(PANEL_COLLAPSED)).current;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const { data: circles, isLoading: circlesLoading } = useListCircles();
  const selectedCircle = circles?.[selectedCircleIdx];
  const { data: members, isLoading: membersLoading, refetch } = useGetCircleMemberLocations(
    selectedCircle?.id ?? 0,
    { query: { enabled: !!selectedCircle, refetchInterval: 30000 } as any },
  );
  const { mutate: updateLocation } = useUpdateMyLocation();

  const togglePanel = () => {
    const toValue = panelExpanded ? PANEL_COLLAPSED : PANEL_EXPANDED;
    setPanelExpanded(!panelExpanded);
    Animated.spring(panelAnim, { toValue, useNativeDriver: false, tension: 65, friction: 11 }).start();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
        (loc) => {
          updateLocation({
            data: {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy ?? undefined,
              speed: loc.coords.speed ?? undefined,
            },
          });
        },
      );
    })();
    return () => { sub?.remove(); };
  }, []);

  if (circlesLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!circles?.length) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <Ionicons name="map-outline" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No circles yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Create a circle in the Circles tab to start tracking
          </Text>
        </View>
      </View>
    );
  }

  const typedMembers = (members as MemberLocation[] | undefined) ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MapPlaceholder members={typedMembers} colors={colors} />

      <View style={[styles.topOverlay, { top: topPad + 8, paddingHorizontal: 16 }]}>
        <FlatList
          horizontal
          data={circles}
          keyExtractor={(c) => String(c.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item, index }) => {
            const active = index === selectedCircleIdx;
            return (
              <TouchableOpacity
                style={[
                  styles.circleChip,
                  {
                    backgroundColor: active ? item.color : colors.card,
                    borderColor: active ? item.color : colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedCircleIdx(index);
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.circleChipText, { color: active ? "#fff" : colors.foreground }]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <Animated.View
        style={[
          styles.panel,
          {
            height: panelAnim,
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: bottomPad + 80,
          },
        ]}
      >
        <TouchableOpacity style={styles.panelHandle} onPress={togglePanel} activeOpacity={0.7}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.panelHeaderRow}>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>
              {selectedCircle?.name ?? "Circle"}
            </Text>
            <Text style={[styles.panelSub, { color: colors.mutedForeground }]}>
              {typedMembers.length} {typedMembers.length === 1 ? "member" : "members"}
            </Text>
          </View>
        </TouchableOpacity>

        {membersLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : typedMembers.length === 0 ? (
          <View style={styles.panelEmpty}>
            <Text style={[styles.panelEmptyText, { color: colors.mutedForeground }]}>
              No location data yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={typedMembers}
            keyExtractor={(m) => m.userId}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={panelExpanded}
            renderItem={({ item }) => (
              <MemberCard
                member={item}
                isMe={item.userId === user?.id}
                colors={colors}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  Alert.alert(
                    item.userName ?? "Member",
                    `Last seen: ${timeAgo(item.timestamp)}\nLat: ${item.latitude.toFixed(5)}\nLng: ${item.longitude.toFixed(5)}${item.battery != null ? `\nBattery: ${Math.round(item.battery)}%` : ""}`,
                  );
                }}
              />
            )}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 40 },
  mapPlaceholder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 12 },
  mapPlaceholderText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  mapPins: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 280 },
  mapPin: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  mapPinText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  topOverlay: { position: "absolute", left: 0, right: 0 },
  circleChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  circleChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  panel: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8, overflow: "hidden" },
  panelHandle: { paddingTop: 10, paddingBottom: 8, paddingHorizontal: 16, alignItems: "center" },
  handle: { width: 36, height: 4, borderRadius: 2, marginBottom: 10 },
  panelHeaderRow: { flexDirection: "row", alignItems: "baseline", gap: 8, alignSelf: "flex-start" },
  panelTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  panelSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  panelEmpty: { alignItems: "center", justifyContent: "center", paddingTop: 16 },
  panelEmptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  memberCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", position: "relative" },
  memberInitials: { fontSize: 15, fontFamily: "Inter_700Bold" },
  meBadge: { position: "absolute", bottom: -2, right: -2, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  meBadgeText: { color: "#fff", fontSize: 8, fontFamily: "Inter_700Bold" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  memberRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  batteryRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  batteryText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
