export function getInitials(name: string): string {
  if (!name) return "";

  const normalized = name.trim();
  if (normalized.length === 0) return "";

  const parts = normalized.split(/\s+/);

  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
}
