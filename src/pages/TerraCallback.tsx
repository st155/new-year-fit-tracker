import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function TerraCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Отправить сообщение родительскому окну об успешном подключении
    if (window.opener) {
      window.opener.postMessage('terra-success', '*');
      window.close();
    } else {
      // Если окно не popup, перенаправить на integrations
      setTimeout(() => {
        navigate('/integrations');
      }, 2000);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-6 w-6" />
            Успешно подключено!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <p className="text-center text-muted-foreground">
            Terra API успешно подключен. Окно закроется автоматически...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
