import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateKeyForm } from "./create-key-form";
import { RevokeKeyButton } from "./revoke-key-button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

async function getApiKeys(orgId: string) {
  const supabase = supabaseAdmin();

  // Encontrar la empresa por clerk_org_id
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("clerk_org_id", orgId)
    .single();

  if (companyError || !company) {
    return { error: "No se encontró información de tu empresa" };
  }

  // Listar las API keys de la empresa
  const { data: keys, error: keysError } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (keysError) {
    return { error: "Error al cargar las API keys" };
  }

  return { keys: (keys || []) as ApiKey[] };
}

export default async function KeysPage() {
  const { orgId, orgRole } = await auth();

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground">
          No se pudo obtener la información de la organización.
        </p>
      </div>
    );
  }

  const isAdmin = orgRole === "org:admin";
  const result = await getApiKeys(orgId);

  if (result.error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const apiKeys = result.keys || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las API keys para tu MCP server.
        </p>
      </div>

      {/* Create Key Section (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Generar nueva API key</CardTitle>
            <CardDescription>
              Crea una nueva API key para acceder al MCP server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateKeyForm />
          </CardContent>
        </Card>
      )}

      {/* Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys activas</CardTitle>
          <CardDescription>
            {apiKeys.length === 0
              ? "No tienes API keys aún"
              : `${apiKeys.filter((k) => !k.revoked_at).length} key(s) activa(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Genera tu primera API key arriba para empezar."
                : "Tu administrador debe generar una API key."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Prefijo</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead>Último uso</TableHead>
                    <TableHead>Estado</TableHead>
                    {isAdmin && <TableHead className="w-16">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => {
                    const isRevoked = !!key.revoked_at;
                    const createdDate = new Date(key.created_at);
                    const lastUsedDate = key.last_used_at ? new Date(key.last_used_at) : null;

                    return (
                      <TableRow key={key.id} className={isRevoked ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell className="font-mono text-sm">{key.key_prefix}</TableCell>
                        <TableCell className="text-sm">
                          {formatDistanceToNow(createdDate, {
                            addSuffix: true,
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {lastUsedDate
                            ? formatDistanceToNow(lastUsedDate, {
                                addSuffix: true,
                                locale: es,
                              })
                            : "Nunca"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isRevoked ? "secondary" : "default"}>
                            {isRevoked ? "Revocada" : "Activa"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {!isRevoked && <RevokeKeyButton keyId={key.id} />}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
