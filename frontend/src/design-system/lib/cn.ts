import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const tokens = {
  spacing: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24] as const,
  gridColumns: 12,
  motion: {
    fast: 0.12,
    normal: 0.2,
    slow: 0.32,
  },
} as const;
