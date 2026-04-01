import { parse } from 'csv-parse/sync';

/**
 * Parse a GTFS CSV string into an array of typed objects.
 * Handles BOM markers and trims whitespace from headers and values.
 */
export function parseGtfsCsv<T>(csvContent: string): T[] {
  // Remove BOM if present
  const content = csvContent.replace(/^\uFEFF/, '');

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
}
