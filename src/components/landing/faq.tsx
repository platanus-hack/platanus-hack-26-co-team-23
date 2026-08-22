import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    question: "¿complAI reemplaza a mi abogado o equipo de compliance?",
    answer:
      "No. complAI te avisa a tiempo y, en PRO, te trae el cambio de código propuesto. El humano siempre revisa y decide — nunca automatizamos la decisión legal.",
  },
  {
    question: "¿complAI puede mergear código en mi repositorio?",
    answer:
      "Nunca. Todo Pull Request se abre en draft y queda asignado al revisor responsable que tú definas. Aprobar o rechazar es siempre una decisión humana.",
  },
  {
    question: "¿Qué pasa si mi empresa no tiene un repositorio conectado?",
    answer:
      "Usa el plan Plus: recibes las alertas igual, por el canal que elijas, sin conectar ningún código.",
  },
  {
    question: "¿En qué canales puedo recibir las alertas?",
    answer:
      "Slack, Google Chat, Microsoft Teams, Discord, email, WhatsApp y, para normas de severidad alta, una llamada de voz.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 md:px-6">
      <h2 className="text-center font-heading text-3xl font-bold tracking-tight">
        Preguntas frecuentes
      </h2>

      <Accordion className="mt-8" multiple={false}>
        {FAQS.map((faq) => (
          <AccordionItem key={faq.question} value={faq.question}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
