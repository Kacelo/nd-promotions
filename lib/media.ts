/** Event image rules, shared by the admin form and the server. Matches the event-media bucket limits. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
