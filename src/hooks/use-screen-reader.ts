import { useRef, useCallback } from 'react';

interface ScreenReaderOptions {
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

export const useScreenReader = () => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Create live region if it doesn't exist
  const ensureLiveRegion = useCallback((politeness: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', politeness);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('aria-relevant', 'additions text');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }
    return liveRegionRef.current;
  }, []);

  const announce = useCallback((message: string, options: ScreenReaderOptions = {}) => {
    const { politeness = 'polite' } = options;
    const liveRegion = ensureLiveRegion(politeness);
    
    // Clear previous message
    liveRegion.textContent = '';
    
    // Add new message after a brief delay to ensure it's announced
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 100);
  }, [ensureLiveRegion]);

  const announcePolite = useCallback((message: string) => {
    announce(message, { politeness: 'polite' });
  }, [announce]);

  const announceAssertive = useCallback((message: string) => {
    announce(message, { politeness: 'assertive' });
  }, [announce]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (liveRegionRef.current) {
      document.body.removeChild(liveRegionRef.current);
      liveRegionRef.current = null;
    }
  }, []);

  return {
    announce,
    announcePolite,
    announceAssertive,
    cleanup
  };
};