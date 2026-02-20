export function isAnonymousName(value) {
  const raw = String(value || "").trim().toLowerCase();
  return !raw || ["anonymous", "anonim"].includes(raw);
}

export function getDisplayAuthor(confession) {
  const usernameCandidate =
    confession.username ||
    confession.authorUsername ||
    confession.user?.username ||
    confession.authorUser?.username ||
    confession.createdBy?.username;

  const authorRaw = String(confession.author || "").trim();
  const authorIsAnonymous = isAnonymousName(authorRaw);

  if (usernameCandidate) return usernameCandidate;
  if (authorRaw && !authorIsAnonymous) return authorRaw;
  return "Anonymous";
}
