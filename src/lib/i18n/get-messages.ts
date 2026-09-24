export type Messages = Record<string, any>;

export function t(messages: Messages, path: string, vars?: Record<string, string | number>): string {
  const keys = path.split('.');
  let current: any = messages;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // Fallback to key path if missing
    }
  }

  if (typeof current !== 'string') {
    return path;
  }

  if (vars) {
    return Object.entries(vars).reduce((acc, [k, v]) => {
      return acc.replaceAll(`{${k}}`, String(v));
    }, current);
  }

  return current;
}
