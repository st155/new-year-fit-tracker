import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserMinus, Target, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AddParticipantDialog } from "./AddParticipantDialog";

interface Participant {
  user_id: string;
  joined_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface ChallengeParticipantsListProps {
  challengeId: string;
  participants: Participant[];
  onRefresh: () => void;
}

export function ChallengeParticipantsList({
  challengeId,
  participants,
  onRefresh,
}: ChallengeParticipantsListProps) {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleRemoveParticipant = async (userId: string) => {
    setRemoving(userId);
    try {
      const { error } = await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", challengeId)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Участник удален из челленджа");
      onRefresh();
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error("Не удалось удалить участника");
    } finally {
      setRemoving(null);
    }
  };

  const handleViewClientGoals = (userId: string) => {
    navigate(`/trainer-dashboard?tab=clients&client=${userId}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Участники челленджа</h4>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" />
          Добавить участника
        </Button>
      </div>

      {participants.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Нет участников в этом челлендже</p>
        </Card>
      ) : (
        participants.map((participant) => (
          <Card key={participant.user_id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={participant.profiles.avatar_url} />
                  <AvatarFallback>
                    {participant.profiles.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{participant.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    @{participant.profiles.username}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {new Date(participant.joined_at).toLocaleDateString("ru-RU")}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewClientGoals(participant.user_id)}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Цели
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveParticipant(participant.user_id)}
                  disabled={removing === participant.user_id}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}

      <AddParticipantDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        challengeId={challengeId}
        onSuccess={onRefresh}
      />
    </div>
  );
}
