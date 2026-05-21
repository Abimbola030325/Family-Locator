import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  useGetCircle, useGetCircleSummary, useListCircleMembers, useGetCircleActivity,
  useListPlaces, useInviteMember, useRemoveCircleMember, useCheckIn,
  getGetCircleQueryKey, getListCircleMembersQueryKey, getGetCircleActivityQueryKey,
  getGetCircleSummaryQueryKey, getListPlacesQueryKey,
  useListCircleMessages, useSendCircleMessage, getListCircleMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Activity, Star, Battery, UserPlus, Trash2, ChevronLeft, Clock, MessageSquare, Link2, Check, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  arrival: <MapPin className="w-4 h-4 text-emerald-500" />,
  departure: <MapPin className="w-4 h-4 text-rose-500" />,
  checkin: <Star className="w-4 h-4 text-amber-500" />,
  location_shared: <MapPin className="w-4 h-4 text-primary" />,
  member_joined: <UserPlus className="w-4 h-4 text-primary" />,
  member_left: <Trash2 className="w-4 h-4 text-muted-foreground" />,
};

export default function CircleDetail() {
  const params    = useParams<{ id: string }>();
  const circleId  = Number(params.id);
  const qc        = useQueryClient();
  const { toast } = useToast();
  const { user }  = useAuth();

  const { data: circle,  isLoading: loadingCircle }   = useGetCircle(circleId,        { query: { enabled: !!circleId } });
  const { data: summary }                              = useGetCircleSummary(circleId,  { query: { enabled: !!circleId } });
  const { data: members, isLoading: loadingMembers }   = useListCircleMembers(circleId, { query: { enabled: !!circleId } });
  const { data: activity, isLoading: loadingActivity } = useGetCircleActivity(circleId, { query: { enabled: !!circleId } });
  const { data: places }                               = useListPlaces(circleId,        { query: { enabled: !!circleId } });
  const { data: messages, isLoading: loadingMessages } = useListCircleMessages(circleId, { query: { enabled: !!circleId, refetchInterval: 4000 } });

  const inviteMember = useInviteMember();
  const removeMember = useRemoveCircleMember();
  const checkIn      = useCheckIn();
  const sendMessage  = useSendCircleMessage();

  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteOpen,   setInviteOpen]   = useState(false);
  const [checkInMsg,   setCheckInMsg]   = useState("");
  const [checkInOpen,  setCheckInOpen]  = useState(false);
  const [linkCopied,   setLinkCopied]   = useState(false);
  const [linkLoading,  setLinkLoading]  = useState(false);
  const [chatMessage,  setChatMessage]  = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMember.mutate({ circleId, data: { email: inviteEmail } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCircleMembersQueryKey(circleId) });
        qc.invalidateQueries({ queryKey: getGetCircleSummaryQueryKey(circleId) });
        setInviteEmail("");
        setInviteOpen(false);
        toast({ title: "Invite sent!", description: "Member go receive notification." });
      },
      onError: () => toast({ title: "Invite failed", variant: "destructive" }),
    });
  };

  const handleRemove = (memberId: number) => {
    removeMember.mutate({ circleId, memberId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCircleMembersQueryKey(circleId) });
        qc.invalidateQueries({ queryKey: getGetCircleSummaryQueryKey(circleId) });
      },
    });
  };

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    checkIn.mutate({ circleId, data: { description: checkInMsg } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCircleActivityQueryKey(circleId) });
        setCheckInMsg("");
        setCheckInOpen(false);
        toast({ title: "Checked in!", description: "Your people don see say you dey here." });
      },
      onError: () => toast({ title: "Check-in failed", variant: "destructive" }),
    });
  };

  const handleInviteLink = async () => {
    setLinkLoading(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/invite-link`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        const url = `${window.location.origin}/join/${data.token}`;
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }
    } finally {
      setLinkLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const content = chatMessage.trim();
    if (!content) return;
    sendMessage.mutate({ circleId, data: { content } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCircleMessagesQueryKey(circleId) });
        setChatMessage("");
      },
      onError: () => toast({ title: "Message not sent", variant: "destructive" }),
    });
  };

  if (loadingCircle) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-muted-foreground">
        <Users className="w-12 h-12 opacity-30" />
        <p>Circle no dey o</p>
        <Link href="/circles"><Button variant="outline">Go Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/circles">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{circle.name}</h1>
          {circle.description && <p className="text-sm text-muted-foreground truncate">{circle.description}</p>}
        </div>
        <div className="flex gap-2">
          <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Star className="w-4 h-4 mr-2" />Check in
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Check In</DialogTitle></DialogHeader>
              <form onSubmit={handleCheckIn} className="space-y-4 pt-2">
                <Input placeholder="Where you dey? E.g. I dey office" value={checkInMsg} onChange={e => setCheckInMsg(e.target.value)} autoFocus />
                <div className="flex justify-end">
                  <Button type="submit" disabled={checkIn.isPending || !checkInMsg.trim()}>
                    {checkIn.isPending ? "Sending..." : "Check In"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" onClick={handleInviteLink} disabled={linkLoading}>
            {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Members",     value: summary.memberCount,     icon: <Users    className="w-4 h-4 text-primary" /> },
            { label: "Places",      value: summary.placeCount,      icon: <MapPin   className="w-4 h-4 text-amber-500" /> },
            { label: "Events Today",value: summary.recentEventCount,icon: <Activity className="w-4 h-4 text-emerald-500" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex flex-col items-center gap-1">
                {icon}
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="members">
        <TabsList className="w-full">
          <TabsTrigger value="members"  className="flex-1">Members</TabsTrigger>
          <TabsTrigger value="chat"     className="flex-1">Chat</TabsTrigger>
          <TabsTrigger value="places"   className="flex-1">Places</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
        </TabsList>

        {/* ── Members Tab ─────────────────────────────── */}
        <TabsContent value="members" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invite a Member</DialogTitle></DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="friend@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} autoFocus />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={inviteMember.isPending || !inviteEmail.trim()}>
                      {inviteMember.isPending ? "Inviting..." : "Send Invite"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loadingMembers ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary/50 animate-pulse rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {members?.map(member => (
                <Card key={member.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-background shadow">
                      <AvatarImage src={member.user.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {member.user.firstName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-2">
                        {member.user.firstName} {member.user.lastName}
                        {member.role === "owner" && <Badge variant="secondary" className="text-xs">Owner</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{member.lastLocation?.address || "Location no show"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.lastLocation?.batteryLevel != null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Battery className="w-3 h-3" />
                          {member.lastLocation.batteryLevel}%
                        </div>
                      )}
                      {member.lastLocation?.timestamp && (
                        <div className="text-xs text-muted-foreground hidden sm:block">
                          {formatDistanceToNow(new Date(member.lastLocation.timestamp))} ago
                        </div>
                      )}
                      {member.role !== "owner" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(member.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Chat Tab ────────────────────────────────── */}
        <TabsContent value="chat" className="mt-4">
          <div className="flex flex-col h-[460px] border border-border rounded-xl overflow-hidden bg-background">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !messages?.length ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-medium text-sm">No messages yet o</p>
                  <p className="text-xs mt-1 text-center">Be the first to say something to your circle!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.userId === (user as any)?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                      {!isOwn && (
                        <Avatar className="h-7 w-7 shrink-0 self-end mt-4">
                          <AvatarImage src={msg.user.profileImageUrl || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {msg.user.firstName?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                        {!isOwn && (
                          <span className="text-[11px] text-muted-foreground font-medium px-1">
                            {msg.user.firstName}
                          </span>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-secondary text-secondary-foreground rounded-tl-sm"
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground px-1">
                          {formatDistanceToNow(new Date(msg.createdAt))} ago
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="border-t border-border p-3 flex gap-2 bg-card">
              <Input
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                placeholder="Oya talk something…"
                maxLength={500}
                className="flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e as any);
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={!chatMessage.trim() || sendMessage.isPending}>
                {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* ── Places Tab ──────────────────────────────── */}
        <TabsContent value="places" className="mt-4">
          {!places?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No saved places yet</p>
              <p className="text-sm mt-1">Add places like House, Office, or Market to get arrival alerts.</p>
              <Link href="/places">
                <Button variant="outline" size="sm" className="mt-4">Manage Places</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {places.map(place => (
                <Card key={place.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{place.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)} · radius {place.radius}m
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Activity Tab ────────────────────────────── */}
        <TabsContent value="activity" className="mt-4">
          {loadingActivity ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary/50 animate-pulse rounded-xl" />)}
            </div>
          ) : !activity?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nothing dey happen yet</p>
              <p className="text-sm mt-1">Events go show when your people share location or check in.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                  <div className="mt-0.5 shrink-0">{EVENT_ICONS[event.type] || <Activity className="w-4 h-4 text-muted-foreground" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{event.user.firstName} {event.user.lastName}</div>
                    <div className="text-sm text-muted-foreground truncate">{event.description}</div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(event.timestamp))} ago
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
