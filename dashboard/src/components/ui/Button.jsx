"use client";

const VARIANTS = {
  primary: "bg-primary text-primary-fg hover:bg-[#5d1327] shadow-sm",
  secondary: "border border-line bg-surface text-fg hover:border-[#caa9af] hover:bg-[#f9eeee]",
  danger: "bg-danger text-white hover:bg-[#922137] shadow-sm",
  ghost: "text-fg hover:bg-[#f7e7e8]",
};

export default function Button({
  variant = "primary",
  size = "md",
  disabled,
  loading,
  className = "",
  children,
  ...props
}) {
  const sizeCls = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeCls} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
