// Runtime configuration
let runtimeConfig: {
  API_BASE_URL: string;
} | null = null;

// Configuration loading state
let configLoading = true;

// Detect if running in production (deployed) vs local development
function isProduction(): boolean {
  // In production builds, import.meta.env.DEV is false
  return !import.meta.env.DEV;
}

// Default fallback configuration
// In production (deployed), use relative path (empty string) since frontend and backend share the same domain
// In development, use localhost:8000 (vite proxy handles /api requests anyway)
const defaultConfig = {
  API_BASE_URL: '',
};

// Function to load runtime configuration
export async function loadRuntimeConfig(): Promise<void> {
  try {
    // Try to load configuration from a config endpoint
    const response = await fetch('/api/config');
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      // Only parse as JSON if the response is actually JSON
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        // Validate the response has the expected structure
        if (data && typeof data.API_BASE_URL === 'string') {
          runtimeConfig = data;
          console.log('Runtime config loaded successfully');
        } else {
          console.log('Config endpoint returned unexpected data, skipping');
        }
      }
    }
  } catch {
    // Silent fail - use defaults
  } finally {
    configLoading = false;
  }
}

// Get current configuration
export function getConfig() {
  // If config is still loading, return default config
  if (configLoading) {
    return defaultConfig;
  }

  // First try runtime config (for Lambda)
  if (runtimeConfig) {
    return runtimeConfig;
  }

  // Then try Vite environment variables (for local development)
  if (import.meta.env.VITE_API_BASE_URL) {
    return {
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    };
  }

  // Finally fall back to default (empty string = relative path)
  return defaultConfig;
}

// Dynamic API_BASE_URL getter - this will always return the current config
export function getAPIBaseURL(): string {
  return getConfig().API_BASE_URL;
}

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};