import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

export function Leaderboard() {
  const leaderboardData = [
    { rank: 1, name: "Alex K.", points: 1247, change: "+15" },
    { rank: 2, name: "Maria L.", points: 1198, change: "+8" },
    { rank: 3, name: "You", points: 1156, change: "+12", isUser: true },
    { rank: 4, name: "John D.", points: 1134, change: "-5" },
    { rank: 5, name: "Sarah M.", points: 1089, change: "+3" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Team Leaderboard
        </h3>
      </div>
      
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-background">
        <CardContent className="p-4">
          <div className="space-y-3">
            {leaderboardData.map((user) => (
              <div 
                key={user.rank}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  user.isUser 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    user.rank === 1 ? 'bg-yellow-500 text-white' :
                    user.rank === 2 ? 'bg-gray-400 text-white' :
                    user.rank === 3 ? 'bg-orange-500 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {user.rank}
                  </div>
                  <span className={`text-sm font-medium ${user.isUser ? 'text-primary' : 'text-foreground'}`}>
                    {user.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {user.points}
                  </span>
                  <Badge 
                    variant={user.change.startsWith('-') ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {user.change}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}