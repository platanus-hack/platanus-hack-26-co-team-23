import { Mail, MessageCircle, MessageSquare, PhoneCall, Smartphone, Users } from "lucide-react";

const CHANNELS = [
  { icon: MessageSquare, label: "Slack" },
  { icon: MessageCircle, label: "Google Chat" },
  { icon: Users, label: "Microsoft Teams" },
  { icon: MessageSquare, label: "Discord" },
  { icon: Mail, label: "Email" },
  { icon: Smartphone, label: "WhatsApp" },
  { icon: PhoneCall, label: "Llamada de voz" },
];

export function Channels() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight">
            Donde ya trabajas, no en otra pestaña más
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            El plan Plus entrega cada alerta por el canal que tu equipo ya usa. La
            llamada de voz se reserva para normas de severidad alta: el teléfono
            solo suena cuando de verdad importa.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {CHANNELS.map((channel) => (
            <div
              key={channel.label}
              className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium"
            >
              <channel.icon className="size-4 text-muted-foreground" />
              {channel.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
