import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useCreateCircle,
  useListCircles,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const CIRCLE_COLORS = ["#13a591", "#f59d07", "#ef4444", "#8b5cf6", "#3b82f6", "#22c55e"];

export default function CirclesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pickedColor, setPickedColor] = useState(CIRCLE_COLORS[0]);

  const { data: circles, isLoading, refetch } = useListCircles();
  const { mutateAsync: createCircle, isPending } = useCreateCircle();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createCircle({ data: { name: name.trim(), description: desc.trim() || undefined, color: pickedColor } });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setName(""); setDesc(""); setPickedColor(CIRCLE_COLORS[0]);
      setShowCreate(false);
      refetch();
    } catch {
      Alert.alert("Error", "Could not create circle. Try again.");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Circles</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={circles ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          scrollEnabled={!!(circles && circles.length > 0)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No circles yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Create a circle to start sharing locations with your people
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwner = item.ownerId === user?.id;
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/circle/${item.id}`)}
                activeOpacity={0.75}
              >
                <View style={[styles.circleAvatar, { backgroundColor: item.color + "22" }]}>
                  <Ionicons name="people" size={26} color={item.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  {item.description ? (
                    <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  <View style={styles.cardMeta}>
                    <Ionicons name="person-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
                      {item.memberCount} {item.memberCount === 1 ? "member" : "members"}
                    </Text>
                    {isOwner && (
                      <View style={[styles.ownerBadge, { backgroundColor: colors.primary + "22" }]}>
                        <Text style={[styles.ownerBadgeText, { color: colors.primary }]}>Owner</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Circle</Text>
            <TouchableOpacity onPress={handleCreate} disabled={!name.trim() || isPending}>
              {isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.doneText, { color: name.trim() ? colors.primary : colors.mutedForeground }]}>Create</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.modalBody, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Circle Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. Family"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={50}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. Our family group"
              placeholderTextColor={colors.mutedForeground}
              value={desc}
              onChangeText={setDesc}
              maxLength={100}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Color</Text>
            <View style={styles.colorRow}>
              {CIRCLE_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c, borderWidth: pickedColor === c ? 3 : 0, borderColor: colors.foreground }]}
                  onPress={() => setPickedColor(c)}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  empty: { alignItems: "center", gap: 10, marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  circleAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ownerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  ownerBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingTop: 24, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cancelText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  doneText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, fontFamily: "Inter_400Regular", borderWidth: 1, marginTop: 4 },
  colorRow: { flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap" },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
