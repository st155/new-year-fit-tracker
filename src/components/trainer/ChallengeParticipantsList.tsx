import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserMinus, Target, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useClientContext } from "@/contexts/ClientContext";
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
  challengeName?: string;
}

export function ChallengeParticipantsList({
  challengeId,
  participants,
  onRefresh,
  challengeName
}: ChallengeParticipantsListProps) {
  const { t } = useTranslation("trainer");
  const navigate = useNavigate();
  const { setSelectedClient } = useClientContext();
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

      toast.success(t("participants.participantRemoved"));
      onRefresh();
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error(t("participants.participantRemoveFailed"));
    } finally {
      setRemoving(null);
    }
  };

  const handleViewClientGoals = (participant: Participant) => {
    const clientData = {
      id: participant.user_id,
      user_id: participant.user_id,
      username: participant.profiles.username || '',
      full_name: participant.profiles.full_name || participant.profiles.username || '',
      avatar_url: participant.profiles.avatar_url
    };
    
    setSelectedClient(clientData, {
      type: 'challenges',
      challengeId,
      challengeName: challengeName || 'Challenge'
    });
    
    navigate(`/trainer-dashboard?tab=clients&client=${participant.user_id}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{t("participants.title")}</h4>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" />
          {t("participants.addParticipant")}
        </Button>
      </div>

      {participants.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">{t("participants.noParticipants")}</p>
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
                  {new Date(participant.joined_at).toLocaleDateString()}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewClientGoals(participant)}
                  >
                  <Target className="h-4 w-4 mr-2" />
                  {t("participants.goals")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveParticipant(participant.user_id)}
                  disabled={removing === participant.user_id}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  {t("participants.remove")}
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