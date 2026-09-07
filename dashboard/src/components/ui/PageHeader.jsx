export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
      <div>
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
