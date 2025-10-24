export default function slugify(name) {
  if (!name) return '';
  return String(name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
