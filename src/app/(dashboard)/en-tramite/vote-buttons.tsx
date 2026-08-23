"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { VoteChoice, VoteTally } from "@/lib/types";

// Reddit-style stance on a proposed bill: A favor / En contra, private to the org.
// Optimistic — the server returns the authoritative tally and we reconcile with it.
export function VoteButtons({ normId, initial }: { normId: string; initial: VoteTally }) {
  const [tally, setTally] = useState<VoteTally>(initial);
  const [pending, startTransition] = useTransition();

  const cast = (vote: VoteChoice) => {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/en-tramite/${normId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setTally((await res.json()) as VoteTally);
      } catch (e) {
        toast.error(`No se pudo registrar el voto: ${(e as Error).message}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={tally.mine === "favor" ? "default" : "outline"}
        size="sm"
        disabled={pending}
        onClick={() => cast("favor")}
        aria-pressed={tally.mine === "favor"}
      >
        <ThumbsUp className="mr-1.5 h-4 w-4" />
        A favor · {tally.favor}
      </Button>
      <Button
        type="button"
        variant={tally.mine === "contra" ? "destructive" : "outline"}
        size="sm"
        disabled={pending}
        onClick={() => cast("contra")}
        aria-pressed={tally.mine === "contra"}
      >
        <ThumbsDown className="mr-1.5 h-4 w-4" />
        En contra · {tally.contra}
      </Button>
    </div>
  );
}
