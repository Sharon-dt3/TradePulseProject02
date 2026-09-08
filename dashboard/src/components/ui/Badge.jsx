const TONES = {
  success: "bg-success-bg text-success border-success/20",
  warning: "bg-warning-bg text-warning border-warning/20",
  danger: "bg-danger-bg text-danger border-danger/20",
  info: "bg-info-bg text-info border-info/20",
  neutral: "bg-[#f4eeee] text-[#63454d] border-[#decfd0]",
};

export default function Badge({ tone = "neutral", size = "default", interactive = false, children }) {
  const sizeClass =
    size === "prominent"
      ? "rounded-full px-3 py-1 text-[0.78rem] font-extrabold tracking-[0.06em] shadow-sm"
      : "rounded-md px-2 py-0.5 text-[0.7rem] font-semibold tracking-[0.04em]";
  const interactionClass = interactive
    ? "cursor-default transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
    : "";

  return (
    <span
      className={`inline-flex items-center border uppercase ${sizeClass} ${interactionClass} ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
