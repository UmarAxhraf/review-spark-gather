import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";

interface CSRFToken {
  token: string;
  expires: number;
}

class CSRFManager {
  private static instance: CSRFManager;
  private token: CSRFToken | null = null;
  private readonly TOKEN_DURATION = 30 * 60 * 1000; // 30 minutes

  static getInstance(): CSRFManager {
    if (!CSRFManager.instance) {
      CSRFManager.instance = new CSRFManager();
    }
    return CSRFManager.instance;
  }

  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  async getToken(): Promise<string> {
    const now = Date.now();

    // Check if token exists and is still valid
    if (this.token && this.token.expires > now) {
      return this.token.token;
    }

    // Generate new token
    const newToken = this.generateToken();
    const expires = now + this.TOKEN_DURATION;

    this.token = { token: newToken, expires };

    // Store token in session storage for persistence across tabs
    sessionStorage.setItem("csrf_token", JSON.stringify(this.token));

    return newToken;
  }

  validateToken(token: string): boolean {
    if (!this.token) {
      // Try to restore from session storage
      const stored = sessionStorage.getItem("csrf_token");
      if (stored) {
        try {
          this.token = JSON.parse(stored);
        } catch {
          return false;
        }
      } else {
        return false;
      }
    }

    const now = Date.now();
    return this.token.token === token && this.token.expires > now;
  }

  clearToken(): void {
    this.token = null;
    sessionStorage.removeItem("csrf_token");
  }
}

export const csrfManager = CSRFManager.getInstance();

// Hook for React components
export const useCSRF = () => {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getToken = async () => {
      try {
        const csrfToken = await csrfManager.getToken();
        setToken(csrfToken);
      } catch (error) {
        console.error("Failed to get CSRF token:", error);
      } finally {
        setLoading(false);
      }
    };

    getToken();
  }, []);

  return { token, loading };
};

// Enhanced fetch wrapper with CSRF protection
export const secureApiCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await csrfManager.getToken();

  const headers = {
    "Content-Type": "application/json",
    "X-CSRF-Token": token,
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};
