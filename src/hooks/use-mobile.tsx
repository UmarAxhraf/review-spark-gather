import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Initialize with actual window width if available (SSR safe)
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT
    }
    return false
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      // Use matchMedia.matches for consistency
      setIsMobile(mql.matches)
    }
    
    // Set initial value using matchMedia for consistency
    setIsMobile(mql.matches)
    
    // Add listener
    mql.addEventListener("change", onChange)
    
    // Also add a resize listener as backup for edge cases
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return isMobile
}
