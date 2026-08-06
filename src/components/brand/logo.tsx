interface ReinAILogoProps {
  size?: number;
  className?: string;
}

// "Rein" rendered as an outline (transparent fill + stroke) and "AI" as a
// blue-to-magenta gradient fill, matching the brand wordmark. Browsers
// without -webkit-text-stroke support just show "Rein" filled solid via the
// `color` fallback instead of outlined — a readable degradation, not broken.
export function ReinAILogo({ size = 20, className }: ReinAILogoProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          color: "var(--foreground)",
          WebkitTextStrokeWidth: "1.4px",
          WebkitTextStrokeColor: "var(--foreground)",
          WebkitTextFillColor: "transparent",
        }}
      >
        Rein
      </span>
      <span
        style={{
          marginLeft: "0.05em",
          backgroundImage: "linear-gradient(135deg, #1E90FF, #8B5CF6 55%, #EC1CC4)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }}
      >
        AI
      </span>
    </span>
  );
}
