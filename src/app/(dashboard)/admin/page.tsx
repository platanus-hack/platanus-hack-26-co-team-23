import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminPanel } from "./admin-panel";

// The ingest can run for a while; give the server action room to await it.
export const maxDuration = 300;

export default async function AdminPage() {
  const { orgRole } = await auth();
  if (orgRole !== "org:admin") redirect("/feed");

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="text-sm text-muted-foreground">
          Acciones manuales para la demo. Normalmente corren solas por cron.
        </p>
      </div>
      <AdminPanel />
    </div>
  );
}
