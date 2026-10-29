// Files live in public/assets/images/ so they're addressable by plain filename
// here, same convention as src/lib/audio.ts — no import per file.
const imgBase = import.meta.env.BASE_URL.replace(/\/$/, "/assets/images/");
export const img = (name: string) => `${imgBase}${name}`;
