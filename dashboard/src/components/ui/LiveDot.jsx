export default function LiveDot({ connected }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.05em]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-success animate-pulse" : "bg-muted"}`}
      />
      <span className={connected ? "text-success" : "text-muted"}>
        {connected ? "Live" : "Connecting"}
      </span>
    </span>
  );
}
