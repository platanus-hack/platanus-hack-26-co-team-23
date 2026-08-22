import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Company } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { userId, orgId, orgRole } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const isAdmin = orgRole === "org:admin";

  // Fetch company data
  let company: Company | null = null;
  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("companies")
      .select("*")
      .eq("clerk_org_id", orgId)
      .single();

    company = data as Company | null;
  } catch (error) {
    console.error("Error fetching company:", error);
  }

  if (!company && !isAdmin) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Configuración no disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Tu organización aún no ha configurado CumplAI. Contacta a un administrador para que complete la configuración.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!company) {
    // Admin but no company yet - show empty state with button to reveal form
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configuración</h1>
          <p className="text-muted-foreground">
            Configura tu empresa para que CumplAI pueda monitorear la normativa relevante.
          </p>
        </div>

        <SettingsForm company={null} isAdmin={isAdmin} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuración</h1>
        <p className="text-muted-foreground">
          Administra el perfil de tu empresa y los canales de notificación.
        </p>
      </div>

      {!isAdmin && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900">
              Solo los administradores pueden cambiar estas configuraciones. Contacta a tu administrador si necesitas hacer cambios.
            </p>
          </CardContent>
        </Card>
      )}

      <SettingsForm company={company} isAdmin={isAdmin} />
    </div>
  );
}
