import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useCreatePlace,
  useDeletePlace,
  useGetCircleActivity,
  useInviteMember,
  useListCircleMembers,
  useListCircleMessages,
  useListPlaces,
  usePingMember,
  useSendCircleMessage,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

type Tab = "members" | "messages" | "places" | "activity";

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TabButton({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabBtnText, { color: active ? colors.primary : colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const circleId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("members");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [msgText, setMsgText] = useState("");
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [placeAddr, setPlaceAddr] = useState("");
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = useListCircleMembers(circleId);
  const { data: messages, isLoading: msgsLoading, refetch: refetchMsgs } = useListCircleMessages(circleId);
  const { data: places, isLoading: placesLoading, refetch: refetchPlaces } = useListPlaces(circleId);
  const { data: activity, isLoading: activityLoading } = useGetCircleActivity(circleId);
  const { mutateAsync: inviteMember, isPending: inviting } = useInviteMember();
  const { mutateAsync: sendMsg, isPending: sending } = useSendCircleMessage();
  const { mutateAsync: pingMember } = usePingMember();
  const { mutateAsync: createPlace, isPending: creatingPlace } = useCreatePlace();
  const { mutateAsync: deletePlace } = useDeletePlace();

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember({ circleId, data: { email: inviteEmail.trim() } });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInviteEmail("");
      setShowInvite(false);
      refetchMembers();
    } catch {
      Alert.alert("Error", "Could not invite member. Check the email address.");
    }
  };

  const handlePing = async (memberId: number, name: string) => {
    try {
      await pingMember({ circleId, memberId });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Pinged!", `${name} will be asked to share their location.`);
    } catch {
      Alert.alert("Error", "Could not send ping.");
    }
  };

  const handleSendMsg = async () => {
    if (!msgText.trim()) return;
    try {
      await sendMsg({ circleId, data: { content: msgText.trim() } });
      setMsgText("");
      refetchMsgs();
    } catch {
      Alert.alert("Error", "Could not send message.");
    }
  };

  const handleAddPlace = async () => {
    if (!placeName.trim() || !placeAddr.trim()) return;
    try {
      await createPlace({ circleId, data: { name: placeName.trim(), latitude: 0, longitude: 0, radius: 200 } });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPlaceName(""); setPlaceAddr("");
      setShowAddPlace(false);
      refetchPlaces();
    } catch {
      Alert.alert("Error", "Could not add place.");
    }
  };

  const handleDeletePlace = (placeId: number, name: string) => {
    Alert.alert("Delete Place", `Remove "${name}" from this circle?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deletePlace({ circleId, placeId }); refetchPlaces(); }
          catch { Alert.alert("Error", "Could not delete place."); }
        }
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Circle Details", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.primary, headerShadowVisible: false }} />

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(["members", "messages", "places", "activity"] as Tab[]).map((t) => (
          <TabButton key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onPress={() => setTab(t)} colors={colors} />
        ))}
      </View>

      {tab === "members" && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]} onPress={() => setShowInvite(true)} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Invite by email</Text>
          </TouchableOpacity>
          {membersLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
            <FlatList
              data={members ?? []}
              keyExtractor={(m) => String(m.id)}
              contentContainerStyle={[styles.listPad, { paddingBottom: bottomPad + 16 }]}
              scrollEnabled={!!(members && members.length > 0)}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No members yet</Text>}
              renderItem={({ item }) => {
                const isMe = (item as { userId?: string }).userId === user?.id;
                const name = (item as { userName?: string | null }).userName ?? `Member ${item.id}`;
                return (
                  <View style={[styles.memberRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.memberInitials, { color: colors.primary }]}>
                        {name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.foreground }]}>{name}{isMe ? " (You)" : ""}</Text>
                      <Text style={[styles.memberRole, { color: colors.mutedForeground }]}>{(item as { role?: string }).role ?? "member"}</Text>
                    </View>
                    {!isMe && (
                      <TouchableOpacity style={[styles.pingBtn, { backgroundColor: colors.primary + "18" }]} onPress={() => handlePing(item.id, name)} activeOpacity={0.8}>
                        <Ionicons name="radio-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
          <Modal visible={showInvite} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowInvite(false)}>
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowInvite(false)}><Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text></TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Invite Member</Text>
                <TouchableOpacity onPress={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                  {inviting ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.doneText, { color: inviteEmail.trim() ? colors.primary : colors.mutedForeground }]}>Invite</Text>}
                </TouchableOpacity>
              </View>
              <View style={[styles.modalBody, { paddingBottom: insets.bottom + 24 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="friend@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
            </View>
          </Modal>
        </View>
      )}

      {tab === "messages" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {msgsLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
            <FlatList
              data={[...(messages ?? [])].reverse()}
              keyExtractor={(m) => String(m.id)}
              inverted
              contentContainerStyle={[styles.listPad, { paddingBottom: 8 }]}
              ListEmptyComponent={<View style={styles.center}><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages yet — say hello!</Text></View>}
              renderItem={({ item }) => {
                const isMe = (item as { userId?: string }).userId === user?.id;
                return (
                  <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                    <View style={[styles.msgBubble, { backgroundColor: isMe ? colors.primary : colors.card, borderColor: colors.border }]}>
                      {!isMe && <Text style={[styles.msgUser, { color: colors.primary }]}>{(item as { userName?: string | null }).userName ?? "Member"}</Text>}
                      <Text style={[styles.msgText, { color: isMe ? "#fff" : colors.foreground }]}>{item.content}</Text>
                      <Text style={[styles.msgTime, { color: isMe ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>{timeAgo(item.createdAt ?? "")}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
          <View style={[styles.msgInput, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
            <TextInput
              style={[styles.msgField, { backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.mutedForeground}
              value={msgText}
              onChangeText={setMsgText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: !msgText.trim() || sending ? 0.5 : 1 }]} onPress={handleSendMsg} disabled={!msgText.trim() || sending} activeOpacity={0.8}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {tab === "places" && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "55" }]} onPress={() => setShowAddPlace(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
            <Text style={[styles.inviteBtnText, { color: colors.accent }]}>Add place</Text>
          </TouchableOpacity>
          {placesLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
            <FlatList
              data={places ?? []}
              keyExtractor={(p) => String(p.id)}
              contentContainerStyle={[styles.listPad, { paddingBottom: bottomPad + 16 }]}
              scrollEnabled={!!(places && places.length > 0)}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No saved places yet</Text>}
              renderItem={({ item }) => (
                <View style={[styles.placeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.placeIcon, { backgroundColor: colors.accent + "20" }]}>
                    <Ionicons name="location" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.placeInfo}>
                    <Text style={[styles.placeName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.placeRadius, { color: colors.mutedForeground }]}>Radius: {item.radius}m</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeletePlace(item.id, item.name)} style={styles.deleteBtn} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
          <Modal visible={showAddPlace} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddPlace(false)}>
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowAddPlace(false)}><Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text></TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Place</Text>
                <TouchableOpacity onPress={handleAddPlace} disabled={!placeName.trim() || !placeAddr.trim() || creatingPlace}>
                  {creatingPlace ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.doneText, { color: placeName.trim() && placeAddr.trim() ? colors.primary : colors.mutedForeground }]}>Add</Text>}
                </TouchableOpacity>
              </View>
              <View style={[styles.modalBody, { paddingBottom: insets.bottom + 24 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Place Name</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} placeholder="e.g. Home" placeholderTextColor={colors.mutedForeground} value={placeName} onChangeText={setPlaceName} autoFocus />
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Address</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} placeholder="e.g. 1 Victoria Island, Lagos" placeholderTextColor={colors.mutedForeground} value={placeAddr} onChangeText={setPlaceAddr} />
              </View>
            </View>
          </Modal>
        </View>
      )}

      {tab === "activity" && (
        activityLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
          <FlatList
            data={activity ?? []}
            keyExtractor={(a) => String(a.id)}
            contentContainerStyle={[styles.listPad, { paddingBottom: bottomPad + 16 }]}
            scrollEnabled={!!(activity && activity.length > 0)}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No activity yet</Text>}
            renderItem={({ item }) => (
              <View style={[styles.activityRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.activityDot, { backgroundColor: item.type === "arrival" ? "#22c55e" : item.type === "departure" ? "#f59d07" : colors.primary }]} />
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityText, { color: colors.foreground }]}>
                    {(item as { userName?: string | null }).userName ?? "Someone"} — {item.type}
                    {(item as { placeName?: string | null }).placeName ? ` at ${(item as { placeName?: string | null }).placeName}` : ""}
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{timeAgo(item.timestamp ?? "")}</Text>
                </View>
              </View>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  listPad: { padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 40 },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  inviteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  memberInitials: { fontSize: 15, fontFamily: "Inter_700Bold" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberRole: { fontSize: 12, fontFamily: "Inter_400Regular", textTransform: "capitalize", marginTop: 2 },
  pingBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  msgRow: { marginBottom: 8, alignItems: "flex-start" },
  msgRowMe: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "80%", padding: 12, borderRadius: 16, borderWidth: 1 },
  msgUser: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  msgText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 20 },
  msgTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "right" },
  msgInput: { flexDirection: "row", alignItems: "flex-end", padding: 12, paddingHorizontal: 16, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  msgField: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  placeRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  placeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  placeInfo: { flex: 1 },
  placeName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  placeAddr: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  placeRadius: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  deleteBtn: { padding: 8 },
  activityRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  activityDot: { width: 10, height: 10, borderRadius: 5 },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 18 },
  activityTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingTop: 24, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cancelText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  doneText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, fontFamily: "Inter_400Regular", borderWidth: 1, marginTop: 4 },
});
