import React, { useState } from "react";
import { Link } from "wouter";
import { useListCircles, useCreateCircle, getListCirclesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Circles() {
  const { data: circles, isLoading } = useListCircles();
  const createCircle = useCreateCircle();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createCircle.mutate({
      data: { name, color: "#14b8a6" } // Default teal
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCirclesQueryKey() });
        setOpen(false);
        setName("");
        toast({ title: "Circle created successfully" });
      },
      onError: (err) => {
        toast({ title: "Failed to create circle", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Circles</h1>
          <p className="text-muted-foreground mt-1">Manage your family and friend circles.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 w-4 h-4" />
              New Circle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Circle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Circle Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Family, Close Friends" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createCircle.isPending || !name.trim()}>
                  {createCircle.isPending ? "Creating..." : "Create Circle"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => <div key={i} className="h-32 bg-secondary/50 animate-pulse rounded-xl" />)}
        </div>
      ) : circles?.length === 0 ? (
        <div className="text-center py-20 bg-secondary/30 rounded-xl border border-dashed border-border">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No circles yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Create your first circle to start tracking your people.</p>
          <Button onClick={() => setOpen(true)} variant="outline">Create your first circle</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {circles?.map(circle => (
            <Link key={circle.id} href={`/circles/${circle.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: circle.color }} />
                      {circle.name}
                    </CardTitle>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {circle.memberCount} members
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
