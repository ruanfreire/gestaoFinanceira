export function slugifyOrganization(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'organizacao';
}

export async function uniqueOrganizationSlug(
  model: { findOne: (filter: object) => { lean: () => Promise<{ slug?: string } | null> } },
  name: string,
): Promise<string> {
  const base = slugifyOrganization(name);
  let slug = base;
  let suffix = 1;
  while (await model.findOne({ slug }).lean()) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}
