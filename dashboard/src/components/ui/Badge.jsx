const TONES = {
  success: "bg-success-bg text-success border-success/20",
  warning: "bg-warning-bg text-warning border-warning/20",
  danger: "bg-danger-bg text-danger border-danger/20",
  info: "bg-info-bg text-info border-info/20",
  neutral: "bg-[#f4eeee] text-[#63454d] border-[#decfd0]",
};

export default function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.04em] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
