"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function McpSetupInstructions() {
  const claudeCodeCommand =
    "claude mcp add complai --env COMPLAI_API_KEY=cai_tu_api_key -- npx -y complai-mcp";

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        complai: {
          command: "npx",
          args: ["-y", "complai-mcp"],
          env: { COMPLAI_API_KEY: "cai_tu_api_key" },
        },
      },
    },
    null,
    2
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiada al portapapeles");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cómo conectar el MCP server</CardTitle>
        <CardDescription>
          Conecta complAI a tu cliente MCP (Claude Code, Claude Desktop, o cualquier cliente compatible).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Claude Code */}
        <div className="space-y-3">
          <h3 className="font-semibold">Claude Code</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-2 rounded text-sm break-all">
              {claudeCodeCommand}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(claudeCodeCommand)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Claude Desktop */}
        <div className="space-y-3">
          <h3 className="font-semibold">Claude Desktop (claude_desktop_config.json)</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-2 rounded text-sm break-all whitespace-pre-wrap">
              {claudeDesktopConfig}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(claudeDesktopConfig)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* HTTP Direct Connection */}
        <div className="space-y-3">
          <h3 className="font-semibold">Conexión HTTP directa</h3>
          <p className="text-sm text-muted-foreground">
            Alternativa para clientes MCP que se conectan directamente a servidores remotos sin necesidad del paquete npm.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-xs font-semibold mb-1">Endpoint URL:</p>
                <code className="block bg-muted p-2 rounded text-sm break-all">
                  https://complai-co.vercel.app/api/mcp
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy("https://complai-co.vercel.app/api/mcp")}
                className="mt-6"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-xs font-semibold mb-1">Header de autenticación:</p>
                <code className="block bg-muted p-2 rounded text-sm break-all">
                  x-api-key: cai_tu_api_key
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy("x-api-key: cai_tu_api_key")}
                className="mt-6"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Alternativamente, usa el header <code className="bg-muted px-1 rounded">Authorization: Bearer cai_tu_api_key</code>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-xs text-muted-foreground border-t pt-4">
          Para más detalles, consulta el paquete npm <code className="bg-muted px-1 rounded">complai-mcp</code>.
        </p>
      </CardContent>
    </Card>
  );
}
