"use client";

const VARIANTS = {
  primary: "bg-primary text-primary-fg hover:bg-[#6ae6d5] shadow-[0_5px_16px_rgba(45,212,191,0.16)]",
  secondary: "border border-line bg-[#16243a] text-fg hover:border-[#3a587b] hover:bg-[#1b2d47]",
  danger: "bg-danger text-[#260710] hover:bg-[#ff9aa2] shadow-sm",
  ghost: "text-fg hover:bg-[#17243a]",
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeCls} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
