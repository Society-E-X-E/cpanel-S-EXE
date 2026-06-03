export async function adminFetch(url, options = {}) {
  const { body, method = "GET", headers: extraHeaders, ...rest } = options;

  const headers = { ...extraHeaders };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const data = await response.json();
  return { response, data };
}

export function isUnauthorized(response) {
  return response.status === 401;
}
