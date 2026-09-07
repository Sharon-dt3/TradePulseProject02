"use client";

const VARIANTS = {
  primary: "bg-primary text-primary-fg hover:opacity-90 shadow-sm",
  secondary: "bg-surface text-fg border border-line hover:bg-primary-soft",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
  ghost: "text-fg hover:bg-primary-soft",
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
  const sizeCls = size === "sm" ? "text-sm px-3 py-1.5" : "text-sm px-4 py-2";
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeCls} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
