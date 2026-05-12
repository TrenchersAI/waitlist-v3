import { useLayoutEffect, useState } from "react";

/** `true` only after the first client layout — keeps SSR + first paint DOM aligned. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
