import { useState } from "react";
import {
  useListCircles, useListPlaces, useCreatePlace, useUpdatePlace, useDeletePlace,
  getListPlacesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Plus, Trash2, Home, Briefcase, GraduationCap, Star, Coffee, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ICON_OPTIONS = [
  { value: "home", label: "Home", icon: <Home className="w-4 h-4" /> },
  { value: "work", label: "Work", icon: <Briefcase className="w-4 h-4" /> },
  { value: "school", label: "School", icon: <GraduationCap className="w-4 h-4" /> },
  { value: "favorite", label: "Favorite", icon: <Star className="w-4 h-4" /> },
  { value: "cafe", label: "Cafe", icon: <Coffee className="w-4 h-4" /> },
  { value: "shopping", label: "Shopping", icon: <ShoppingBag className="w-4 h-4" /> },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  home: <Home className="w-5 h-5 text-primary" />,
  work: <Briefcase className="w-5 h-5 text-primary" />,
  school: <GraduationCap className="w-5 h-5 text-primary" />,
  favorite: <Star className="w-5 h-5 text-amber-500" />,
  cafe: <Coffee className="w-5 h-5 text-primary" />,
  shopping: <ShoppingBag className="w-5 h-5 text-primary" />,
};

export default function Places() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: circles } = useListCircles();

  const [selectedCircleId, setSelectedCircleId] = useState<number | null>(null);
  const activeCircleId = selectedCircleId ?? circles?.[0]?.id ?? null;

  const { data: places, isLoading } = useListPlaces(activeCircleId || 0, {
    query: { enabled: !!activeCircleId },
  });

  const createPlace = useCreatePlace();
  const deletePlace = useDeletePlace();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", latitude: "37.7749", longitude: "-122.4194", icon: "home", radius: "100" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCircleId) return;
    createPlace.mutate({
      circleId: activeCircleId,
      data: {
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        icon: form.icon,
        radius: parseFloat(form.radius),
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlacesQueryKey(activeCircleId) });
        setOpen(false);
        setForm({ name: "", latitude: "37.7749", longitude: "-122.4194", icon: "home", radius: "100" });
        toast({ title: "Place added" });
      },
      onError: () => toast({ title: "Failed to add place", variant: "destructive" }),
    });
  };

  const handleDelete = (placeId: number) => {
    if (!activeCircleId) return;
    deletePlace.mutate({ circleId: activeCircleId, placeId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlacesQueryKey(activeCircleId) });
        toast({ title: "Place removed" });
      },
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Places</h1>
          <p className="text-muted-foreground mt-1">Saved locations for arrival and departure alerts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!activeCircleId}>
              <Plus className="w-4 h-4 mr-2" />
              Add Place
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a Place</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Place Name</Label>
                <Input placeholder="e.g. Home, Office, School" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={form.icon} onValueChange={v => setForm(f => ({ ...f, icon: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">{opt.icon}{opt.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Radius (meters)</Label>
                  <Input type="number" value={form.radius} onChange={e => setForm(f => ({ ...f, radius: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createPlace.isPending || !form.name.trim()}>
                  {createPlace.isPending ? "Adding..." : "Add Place"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {circles && circles.length > 1 && (
        <Select value={activeCircleId?.toString()} onValueChange={v => setSelectedCircleId(Number(v))}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select circle" />
          </SelectTrigger>
          <SelectContent>
            {circles.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary/50 animate-pulse rounded-xl" />)}
        </div>
      ) : !places?.length ? (
        <div className="text-center py-20 bg-secondary/30 rounded-xl border border-dashed border-border">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-medium">No places yet</h3>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">Add locations like Home or Work to get alerts.</p>
          <Button onClick={() => setOpen(true)} variant="outline" disabled={!activeCircleId}>Add your first place</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {places.map(place => (
            <Card key={place.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {ICON_MAP[place.icon] || <MapPin className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base">{place.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)} · {place.radius}m radius
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => handleDelete(place.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
