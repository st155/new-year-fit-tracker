import { useAuth } from "@/hooks/useAuth";
import { TerraIntegration } from "@/components/integrations/TerraIntegration";

export default function IntegrationsPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4 md:p-6">
      <TerraIntegration />
    </div>
  );
}
