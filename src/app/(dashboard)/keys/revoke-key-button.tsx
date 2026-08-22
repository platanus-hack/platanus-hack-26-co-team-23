"use client";

import { useState } from "react";
import { toast } from "sonner";
import { revokeKey } from "./actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type RevokeKeyButtonProps = {
  keyId: string;
};

export function RevokeKeyButton({ keyId }: RevokeKeyButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    if (!confirm("¿Estás seguro de que deseas revocar esta API key?")) {
      return;
    }

    setLoading(true);
    try {
      const result = await revokeKey(keyId);

      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success("API key revocada exitosamente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al revocar la API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleRevoke}
      disabled={loading}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Revocar API key</span>
    </Button>
  );
}
