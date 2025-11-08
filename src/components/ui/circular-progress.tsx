import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export interface CircularProgressProps extends PropsWithChildren {
  value: number;
  size?: number;
  thickness?: number;
  className?: string;
  trackColorClassName?: string;
}

export const CircularProgress = ({
  value,
  size = 240,
  thickness = 16,
  className,
  trackColorClassName,
  children,
}: CircularProgressProps) => {
  const clamped = Math.max(0, Math.min(1, value));
  const angle = clamped * 360;

  const ringStyle = {
    width: size,
    height: size,
    backgroundImage: `conic-gradient(hsl(var(--primary)) 0deg ${angle}deg, hsl(var(--muted)) ${angle}deg 360deg)`,
  };

  const innerOffset = thickness * 2;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div
        className={cn("relative rounded-full", trackColorClassName)}
        style={ringStyle}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: "0 0 0 1px rgba(0,0,0,0.04) inset",
          }}
        />
        <div
          className="absolute rounded-full bg-background flex items-center justify-center"
          style={{
            inset: innerOffset,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default CircularProgress;


