export default function LiveDot({ connected }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-success animate-pulse" : "bg-muted"}`}
      />
      <span className={connected ? "text-success" : "text-muted"}>
        {connected ? "live" : "connecting..."}
      </span>
    </span>
  );
}
