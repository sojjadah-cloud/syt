export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="section-title">
      <header className="mb-8 border-b border-line pb-6">
        <h2 id="section-title" tabIndex={-1} className="text-[22px] font-semibold leading-tight text-ink outline-none md:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
      </header>
      <div className="space-y-8">{children}</div>
    </section>
  );
}
