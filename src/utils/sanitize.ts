/**
 * Validates an Internet Archive item identifier.
 * Identifiers consist of ASCII letters, digits, hyphens, underscores, and periods.
 */
export function validateIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error("Identifier must not be empty");
  }
  if (trimmed.length > 100) {
    throw new Error("Identifier must be 100 characters or fewer");
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    throw new Error(
      `Invalid identifier "${trimmed}". Only letters, digits, hyphens, underscores, and periods are allowed.`
    );
  }
  return trimmed;
}

/**
 * Validates a search query string.
 * Does NOT need to sanitize for shell injection because we use execFile (no shell).
 */
export function validateQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Search query must not be empty");
  }
  if (trimmed.length > 2000) {
    throw new Error("Search query must be 2000 characters or fewer");
  }
  return trimmed;
}

/**
 * Validates a glob pattern for file matching.
 */
export function validateGlob(pattern: string): string {
  const trimmed = pattern.trim();
  if (!trimmed) {
    throw new Error("Glob pattern must not be empty");
  }
  if (trimmed.length > 200) {
    throw new Error("Glob pattern must be 200 characters or fewer");
  }
  if (!/^[a-zA-Z0-9.*?\[\]_\-/{}|]+$/.test(trimmed)) {
    throw new Error(
      `Invalid glob pattern "${trimmed}". Contains disallowed characters.`
    );
  }
  return trimmed;
}

/**
 * Validates a directory path for --destdir.
 */
export function validateDestdir(dir: string): string {
  const trimmed = dir.trim();
  if (!trimmed) {
    throw new Error("Destination directory must not be empty");
  }
  if (trimmed.length > 500) {
    throw new Error(
      "Destination directory path must be 500 characters or fewer"
    );
  }
  return trimmed;
}

/**
 * Validates a format name for --format.
 */
export function validateFormat(format: string): string {
  const trimmed = format.trim();
  if (!trimmed) {
    throw new Error("Format must not be empty");
  }
  if (trimmed.length > 100) {
    throw new Error("Format name must be 100 characters or fewer");
  }
  return trimmed;
}

/**
 * Validates the rows parameter (number of results per page).
 */
export function validateRows(rows: number): number {
  if (!Number.isInteger(rows) || rows < 1 || rows > 10000) {
    throw new Error("rows must be an integer between 1 and 10000");
  }
  return rows;
}

/**
 * Validates the page parameter.
 */
export function validatePage(page: number): number {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error("page must be a positive integer");
  }
  return page;
}

/**
 * Validates field names for search --field parameters.
 */
export function validateFieldName(field: string): string {
  const trimmed = field.trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    throw new Error(
      `Invalid field name "${trimmed}". Must be alphanumeric with underscores.`
    );
  }
  return trimmed;
}
