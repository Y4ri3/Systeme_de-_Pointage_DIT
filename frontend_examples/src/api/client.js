const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api/v1";

export function getAccessToken() {
  return localStorage.getItem("access_token");
}

export function clearAuthSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("role");
  localStorage.removeItem("user_id");
  localStorage.removeItem("must_change_password");
}

function buildHeaders(customHeaders = {}, body) {
  const headers = new Headers(customHeaders);
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = body instanceof FormData;
  if (!isFormData && body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  if (
    contentType.includes("text/csv") ||
    contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  ) {
    return response.blob();
  }

  return response.text();
}

export async function apiFetch(path, options = {}) {
  const headers = buildHeaders(options.headers, options.body);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(
      data?.message || data?.error || `Erreur HTTP ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    error.headers = response.headers;
    throw error;
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
  };
}

export function toQueryString(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.append(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function extractFilename(headers, fallback = "download") {
  const contentDisposition = headers.get("content-disposition") || "";
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export function triggerBrowserDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function getApiErrorMessage(error) {
  const code = error?.data?.error;

  if (code === "password_change_required") {
    return "Vous devez changer votre mot de passe avant de continuer.";
  }

  if (code === "account_disabled") {
    return "Ce compte est desactive.";
  }

  if (code === "conflit_horaire") {
    return "Ce cours chevauche un autre cours existant.";
  }

  if (code === "kiosk_network_forbidden") {
    return "Cette action n'est disponible que depuis le reseau autorise de l'etablissement.";
  }

  return error?.data?.message || error?.message || "Une erreur est survenue.";
}
