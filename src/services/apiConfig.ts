const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function isPackagedAndroidWebView() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" &&
    window.location.protocol === "https:" &&
    /; wv\)/i.test(window.navigator.userAgent);
}

export function hasApiBaseUrl() {
  return !!apiBaseUrl;
}

export function apiUrl(path: string) {
  if (apiBaseUrl) {
    return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  if (isPackagedAndroidWebView()) {
    throw new Error(
      "TediMed AI services are not configured for this mobile build. Set VITE_API_BASE_URL to your deployed TediMed API server and rebuild the APK."
    );
  }

  return path;
}
