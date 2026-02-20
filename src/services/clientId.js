const CLIENT_ID_KEY = "clientId";

export function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (id) return id;
  id = `cv_${crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}
