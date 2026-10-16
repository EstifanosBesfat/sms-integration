export function queryRecord(url: URL): Record<string, string | string[] | undefined> {
  const query: Record<string, string | string[] | undefined> = {};
  url.searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  });
  return query;
}
