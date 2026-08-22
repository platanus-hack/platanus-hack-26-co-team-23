const STATS = [
  {
    value: "1.321",
    label: "normas emitidas en Colombia en 2025",
    detail: "~4 por día, +104% frente a la prepandemia",
  },
  {
    value: "5.237 h/año",
    label: "dedica una empresa colombiana a trámites y cumplimiento",
    detail: "más de 2 personas de tiempo completo",
  },
  {
    value: "45%",
    label: "de las empresas no se entera de los cambios normativos de su sector",
    detail: "y termina pagando multas evitables",
  },
];

export function Stats() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-14 sm:grid-cols-3 md:px-6">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center sm:text-left">
            <p className="font-heading text-4xl font-bold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-sm font-medium">{stat.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
