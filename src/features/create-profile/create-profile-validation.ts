const COMMON_DOMAIN_CORRECTIONS: Record<string, string> = {
  'gmal.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'hotnail.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'yahho.com': 'yahoo.com',
};

export const isValidAge = (value: string) => {
  if (!/^\d{1,3}$/.test(value)) return false;
  const age = Number(value);
  return Number.isInteger(age) && age >= 1 && age <= 120;
};

export const isValidEmail = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const domain = normalized.split('@')[1];
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized) && !COMMON_DOMAIN_CORRECTIONS[domain];
};

const toEmailPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');

export const suggestEmail = (value: string, firstName: string, lastName: string) => {
  const normalized = value.trim().toLowerCase();
  const [enteredLocal = '', enteredDomain = ''] = normalized.split('@');
  const nameFallback = toEmailPart(`${firstName}.${lastName}`) || 'learner';
  const localPart = toEmailPart(enteredLocal) || nameFallback;

  if (enteredDomain) {
    const correctedDomain = COMMON_DOMAIN_CORRECTIONS[enteredDomain];
    if (correctedDomain) return `${localPart}@${correctedDomain}`;

    const cleanDomain = enteredDomain.replace(/[^a-z0-9.-]/g, '').replace(/^\.+|\.+$/g, '');
    if (cleanDomain && !cleanDomain.includes('.')) return `${localPart}@${cleanDomain}.com`;
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) return `${localPart}@${cleanDomain}`;
  }

  return `${localPart}@gmail.com`;
};
