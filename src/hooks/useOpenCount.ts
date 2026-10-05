import { useState } from 'react';

/**
 * Counts how many times `visible` has turned on. Key a sheet's form with it so the form
 * resets on each open but keeps its content while the sheet animates closed.
 */
export function useOpenCount(visible: boolean): number {
  const [count, setCount] = useState(visible ? 1 : 0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setCount(count + 1);
  }
  return count;
}
