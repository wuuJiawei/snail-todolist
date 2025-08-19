import React from "react";
import * as IconPark from "@icon-park/react";
import { cn } from "@/lib/utils";

interface IconParkProps {
  icon: string;
  theme?: 'outline' | 'filled' | 'two-tone' | 'multi-color';
  size?: number | string;
  fill?: string | string[];
  strokeWidth?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  className?: string;
  spin?: boolean;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

const IconParkComponent: React.FC<IconParkProps> = ({
  icon,
  theme = 'outline',
  size = '1em',
  fill = 'currentColor',
  strokeWidth = 4,
  strokeLinecap = 'round',
  strokeLinejoin = 'round',
  className = "",
  spin = false,
  onClick,
}) => {
  // Convert kebab-case to PascalCase for IconPark icons
  const toPascalCase = (str: string) => {
    return str
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  };

  // Try to find the icon in @icon-park/react
  const pascalCaseName = toPascalCase(icon);
  const IconComponent = (IconPark as Record<string, any>)[pascalCaseName];

  if (IconComponent) {
    return (
      <IconComponent
        theme={theme}
        size={size}
        fill={fill}
        strokeWidth={strokeWidth}
        strokeLinecap={strokeLinecap}
        strokeLinejoin={strokeLinejoin}
        className={cn(className)}
        spin={spin}
        onClick={onClick}
      />
    );
  }

  // Fallback to a placeholder if icon not found
  return <span className={cn("inline-block", className)} style={{ width: size, height: size }}></span>;
};

export { IconParkComponent as Icon };
