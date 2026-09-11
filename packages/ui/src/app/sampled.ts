import { useEffect, useRef, useState } from "react";

/**
 * Reads a fast-changing number once a second while `enabled`, so a live readout (a streaming
 * speed, say) settles on steady values instead of flickering with every chunk.
 */
export function useSampled(read: () => number | null, enabled: boolean): number | null {
  const readRef = useRef(read);
  readRef.current = read;
  const [value, setValue] = useState<number | null>(() => (enabled ? read() : null));
  useEffect(() => {
    if (!enabled) {
      setValue(null);
      return;
    }
    setValue(readRef.current());
    const timer = setInterval(() => setValue(readRef.current()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return value;
}
