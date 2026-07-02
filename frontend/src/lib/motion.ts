import { useReducedMotion } from "framer-motion";

export function useFadeInMotion(y = 0) {
  const reduce = useReducedMotion();
  if (reduce) {
    return { initial: false as const, animate: undefined, transition: undefined };
  }
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  };
}
