import { csrfManager } from "./csrf";
import { supabase } from "../integrations/supabase/client";

type ApiOptions = RequestInit & {
  timeout?: number;
  withCredentials?: boolean;
};

/**
 * Enhanced fetch wrapper with timeout, CSRF protection, and auth error handling
 * @param url The URL to fetch
 * @param options Fetch options with additional timeout parameter
 * @returns Promise with response or error
 */
export const enhancedFetch = async (
  url: string,
  options: ApiOptions = {}
): Promise<Response> => {
  const { timeout = 30000, withCredentials = true, ...fetchOptions } = options;
  
  // Check network status first
  if (!navigator.onLine) {
    throw new Error('Network offline');
  }
  
  // Add CSRF token if needed
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };
  
  if (withCredentials) {
    try {
      const token = await csrfManager.getToken();
      headers["X-CSRF-Token"] = token;
    } catch (error) {
      console.error("Failed to get CSRF token:", error);
    }
  }
  
  // Create an AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      // Clear auth data and redirect to login
      handleAuthError();
    }
    
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Handle authentication errors by clearing tokens and redirecting to login
 */
export const handleAuthError = () => {
  // Clear all auth data
  localStorage.removeItem("supabase.auth.token");
  sessionStorage.removeItem("csrf_token");
  localStorage.removeItem("lastActivity");
  localStorage.removeItem("sessionVerified");
  
  // Sign out from Supabase
  supabase.auth.signOut().catch(error => {
    console.error("Error signing out:", error);
  });
  
  // Redirect to login page
  window.location.href = "/login";
};