export function readPreference<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(`devkit:v1:${key}`);
    if (!raw || raw.length > 20000) return fallback;
    const value: unknown = JSON.parse(raw);
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function savePreference(key: 'language' | 'theme' | 'favorites' | 'recent', value: unknown) {
  try {
    localStorage.setItem(`devkit:v1:${key}`, JSON.stringify(value));
  } catch {
    /* 私密模式下仍可使用工具。 */
  }
}

const DRAFT_LIMIT = 256 * 1024;
export function readDraft(
  id: string
): { input: string; secondary: string; params: Record<string, string | boolean> } | undefined {
  if (['aes', 'hmac', 'jwt', 'curl-converter'].includes(id)) return;
  try {
    const raw = localStorage.getItem(`devkit:v1:draft:${id}`);
    if (!raw || raw.length > DRAFT_LIMIT) return;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return;
    const draft = value as Record<string, unknown>;
    if (
      typeof draft.input !== 'string' ||
      typeof draft.secondary !== 'string' ||
      !draft.params ||
      typeof draft.params !== 'object' ||
      Object.values(draft.params).some((v) => typeof v !== 'string' && typeof v !== 'boolean')
    )
      return;
    return {
      input: draft.input,
      secondary: draft.secondary,
      params: draft.params as Record<string, string | boolean>,
    };
  } catch {
    return;
  }
}
export function writeDraft(
  id: string,
  draft?: { input: string; secondary: string; params: Record<string, string | boolean> }
): boolean {
  if (['aes', 'hmac', 'jwt', 'curl-converter'].includes(id)) return false;
  try {
    const key = `devkit:v1:draft:${id}`;
    if (!draft) {
      localStorage.removeItem(key);
      return true;
    }
    const json = JSON.stringify(draft);
    if (json.length > DRAFT_LIMIT) return false;
    localStorage.setItem(key, json);
    return true;
  } catch {
    return false;
  }
}
export function clearDrafts() {
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('devkit:v1:draft:')) localStorage.removeItem(key);
  } catch {
    /* 存储不可用时不影响本地处理。 */
  }
}
