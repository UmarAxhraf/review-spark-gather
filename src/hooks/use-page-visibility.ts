import { useEffect, useState } from 'react';

export function usePageVisibility(onVisibilityChange?: (isVisible: boolean) => void) {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (onVisibilityChange) {
        onVisibilityChange(visible);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisibilityChange]);

  return isVisible;
}