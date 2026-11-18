/**
 * Pop-up objects (Story Animator): drawn in the same line-art style as the
 * characters. They pop up next to the speaker the moment the word is said.
 * Every icon is a 100x100 SVG.
 */
const S = `stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

const ICONS: Record<string, string> = {
  samosa: `<path d="M50 12 L88 82 Q50 92 12 82 Z" fill="#e8a84a" ${S}/><path d="M50 12 L50 86" fill="none" stroke="#c98a2e" stroke-width="3"/><circle cx="38" cy="64" r="3" fill="#c98a2e"/><circle cx="62" cy="58" r="3" fill="#c98a2e"/><circle cx="56" cy="74" r="3" fill="#c98a2e"/>`,
  phone: `<rect x="28" y="8" width="44" height="84" rx="8" fill="#374151" ${S}/><rect x="33" y="18" width="34" height="58" rx="3" fill="#7dd3fc"/><circle cx="50" cy="84" r="3.5" fill="#e5e7eb"/>`,
  cat: `<path d="M22 40 L18 12 L40 28 Q50 25 60 28 L82 12 L78 40 Q86 70 50 84 Q14 70 22 40 Z" fill="#f59e0b" ${S}/><circle cx="38" cy="48" r="5" fill="#1a1a1a"/><circle cx="62" cy="48" r="5" fill="#1a1a1a"/><path d="M46 60 L54 60 L50 65 Z" fill="#f472b6" ${S}/><path d="M50 65 Q44 72 38 68 M50 65 Q56 72 62 68 M14 56 L32 58 M14 66 L32 62 M86 56 L68 58 M86 66 L68 62" fill="none" ${S}/>`,
  dog: `<ellipse cx="50" cy="54" rx="30" ry="30" fill="#d4a373" ${S}/><path d="M22 36 Q8 50 16 74 Q26 66 28 50 Z M78 36 Q92 50 84 74 Q74 66 72 50 Z" fill="#8b5e3c" ${S}/><circle cx="40" cy="48" r="5" fill="#1a1a1a"/><circle cx="60" cy="48" r="5" fill="#1a1a1a"/><ellipse cx="50" cy="64" rx="8" ry="6" fill="#1a1a1a"/><path d="M50 70 Q50 80 58 80" fill="none" ${S}/>`,
  money: `<rect x="10" y="26" width="80" height="48" rx="6" fill="#86efac" ${S}/><circle cx="50" cy="50" r="14" fill="#bbf7d0" ${S}/><text x="50" y="58" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="22" fill="#166534">$</text><circle cx="22" cy="38" r="3" fill="#166534"/><circle cx="78" cy="62" r="3" fill="#166534"/>`,
  book: `<path d="M50 24 Q30 14 10 20 V82 Q30 76 50 86 Q70 76 90 82 V20 Q70 14 50 24 Z" fill="#60a5fa" ${S}/><path d="M50 24 V86" fill="none" ${S}/><path d="M18 34 Q30 30 42 36 M18 46 Q30 42 42 48 M58 36 Q70 30 82 34 M58 48 Q70 42 82 46" fill="none" stroke="#e0f2fe" stroke-width="3"/>`,
  pizza: `<path d="M14 22 Q50 6 86 22 L50 92 Z" fill="#fcd34d" ${S}/><path d="M14 22 Q50 6 86 22 Q50 14 14 22 Z" fill="#d97706" ${S}/><circle cx="40" cy="36" r="6" fill="#dc2626"/><circle cx="60" cy="40" r="6" fill="#dc2626"/><circle cx="50" cy="60" r="5" fill="#dc2626"/>`,
  burger: `<path d="M14 46 Q14 16 50 16 Q86 16 86 46 Z" fill="#f59e0b" ${S}/><rect x="10" y="46" width="80" height="8" rx="4" fill="#4ade80" ${S}/><rect x="12" y="54" width="76" height="12" rx="5" fill="#7c2d12" ${S}/><path d="M14 66 H86 V76 Q86 86 76 86 H24 Q14 86 14 76 Z" fill="#f59e0b" ${S}/><circle cx="36" cy="28" r="2" fill="#fff"/><circle cx="58" cy="24" r="2" fill="#fff"/>`,
  cake: `<rect x="16" y="46" width="68" height="40" rx="4" fill="#f9a8d4" ${S}/><path d="M16 56 Q24 64 33 56 Q42 64 50 56 Q58 64 67 56 Q76 64 84 56" fill="none" stroke="#fff" stroke-width="4"/><rect x="46" y="24" width="8" height="22" fill="#93c5fd" ${S}/><path d="M50 8 Q58 16 50 22 Q42 16 50 8 Z" fill="#fbbf24" ${S}/>`,
  tea: `<path d="M18 34 H70 V64 Q70 84 44 84 Q18 84 18 64 Z" fill="#fde68a" ${S}/><path d="M70 42 Q88 42 86 56 Q84 68 70 66" fill="none" ${S}/><path d="M32 24 Q28 16 34 8 M46 24 Q42 16 48 8" fill="none" stroke="#9ca3af" stroke-width="4" stroke-linecap="round"/><rect x="22" y="38" width="44" height="8" fill="#b45309" opacity="0.6"/>`,
  clock: `<circle cx="50" cy="52" r="36" fill="#fff" ${S}/><path d="M50 52 V30 M50 52 L66 60" fill="none" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/><path d="M24 14 L12 26 M76 14 L88 26" fill="none" ${S}/><circle cx="50" cy="52" r="3" fill="#dc2626"/>`,
  heart: `<path d="M50 86 Q12 60 12 36 Q12 14 32 14 Q44 14 50 28 Q56 14 68 14 Q88 14 88 36 Q88 60 50 86 Z" fill="#ef4444" ${S}/><path d="M28 30 Q30 24 36 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
  car: `<path d="M8 64 L12 48 L28 44 L38 28 H66 L78 44 L92 48 V64 Z" fill="#ef4444" ${S}/><path d="M40 32 H64 L72 44 H34 Z" fill="#bae6fd" ${S}/><circle cx="28" cy="66" r="10" fill="#374151" ${S}/><circle cx="72" cy="66" r="10" fill="#374151" ${S}/>`,
  gift: `<rect x="14" y="40" width="72" height="46" fill="#a78bfa" ${S}/><rect x="10" y="28" width="80" height="14" fill="#c4b5fd" ${S}/><rect x="44" y="28" width="12" height="58" fill="#fbbf24" ${S}/><path d="M50 28 Q34 6 26 18 Q22 28 50 28 Q78 28 74 18 Q66 6 50 28 Z" fill="#fbbf24" ${S}/>`,
  bomb: `<circle cx="44" cy="58" r="30" fill="#374151" ${S}/><rect x="52" y="22" width="16" height="12" rx="2" fill="#6b7280" ${S} transform="rotate(35 60 28)"/><path d="M66 22 Q74 10 84 14" fill="none" ${S}/><path d="M86 6 L88 14 L96 14 L90 19 L92 27 L86 22 L80 27 L82 19 L76 14 L84 14 Z" fill="#fbbf24"/><circle cx="32" cy="48" r="5" fill="#9ca3af"/>`,
  ice: `<path d="M32 46 L50 92 L68 46 Z" fill="#fbbf24" ${S}/><path d="M38 56 L62 56 M42 68 L58 68" stroke="#b45309" stroke-width="3"/><circle cx="50" cy="34" r="20" fill="#f9a8d4" ${S}/><circle cx="58" cy="14" r="6" fill="#dc2626" ${S}/>`,
  ball: `<circle cx="50" cy="50" r="36" fill="#dc2626" ${S}/><path d="M24 26 Q40 50 24 74 M76 26 Q60 50 76 74" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="5 5"/>`,
  star: `<path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#fbbf24" ${S}/>`,
  trophy: `<path d="M28 12 H72 V38 Q72 62 50 62 Q28 62 28 38 Z" fill="#fbbf24" ${S}/><path d="M28 20 H14 Q12 40 30 44 M72 20 H86 Q88 40 70 44" fill="none" ${S}/><rect x="44" y="62" width="12" height="14" fill="#fbbf24" ${S}/><rect x="30" y="76" width="40" height="12" rx="2" fill="#92400e" ${S}/>`,
  key: `<circle cx="30" cy="40" r="18" fill="#fbbf24" ${S}/><circle cx="30" cy="40" r="6" fill="#fff" ${S}/><path d="M46 48 L88 74 M74 66 L68 76 M82 70 L76 80" fill="none" stroke="#1a1a1a" stroke-width="6" stroke-linecap="round"/><path d="M46 48 L88 74" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>`,
  bed: `<rect x="8" y="50" width="84" height="22" rx="4" fill="#93c5fd" ${S}/><rect x="12" y="38" width="26" height="14" rx="6" fill="#fff" ${S}/><path d="M8 72 V86 M92 72 V86 M8 30 V72" fill="none" ${S}/><text x="66" y="38" font-family="Arial" font-weight="bold" font-size="22" fill="#6366f1">Zz</text>`,
  fire: `<path d="M50 92 Q18 88 20 58 Q22 40 36 26 Q36 42 46 46 Q42 22 60 8 Q60 30 74 42 Q86 56 80 72 Q74 90 50 92 Z" fill="#f97316" ${S}/><path d="M50 88 Q36 84 38 68 Q40 58 48 52 Q50 64 58 66 Q64 76 58 84 Z" fill="#fde047"/>`,
};

export const POP_ICON_NAMES = Object.keys(ICONS);

export function popIconSvg(name: string): string | null {
  const body = ICONS[name];
  if (!body) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256">${body}</svg>`;
}
