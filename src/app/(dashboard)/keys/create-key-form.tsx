"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createKey } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Copy } from "lucide-react";

export function CreateKeyForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Por favor ingresa un nombre para la API key");
      return;
    }

    setLoading(true);
    try {
      const result = await createKey(name);

      if (result.error) {
        toast.error(result.error);
      } else if (result.raw) {
        setGeneratedKey(result.raw);
        setName("");
        toast.success("API key generada exitosamente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar la API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form to create key */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="key-name">Nombre de la API key</Label>
          <Input
            id="key-name"
            placeholder="ej: CI de Acme, agente interno"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? "Generando..." : "Generar API key"}
        </Button>
      </form>

      {/* Show generated key */}
      {generatedKey && (
        <Alert className="border-success bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertTitle>API key generada</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p className="text-sm">
              Cópiala ahora. No podrás verla de nuevo después de cerrar este mensaje.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-sm break-all">
                {generatedKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  toast.success("Copiada al portapapeles");
                  setGeneratedKey(null);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
