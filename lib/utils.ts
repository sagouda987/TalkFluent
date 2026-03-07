import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FLAG_MAP: Record<string, string> = {
  US: 'ðŸ‡ºðŸ‡¸',
  UK: 'ðŸ‡¬ðŸ‡§',
  IN: 'ðŸ‡®ðŸ‡³',
  CA: 'ðŸ‡¨ðŸ‡¦',
  ES: 'ðŸ‡ªðŸ‡¸',
  FR: 'ðŸ‡«ðŸ‡·',
  DE: 'ðŸ‡©ðŸ‡ª',
  BR: 'ðŸ‡§ðŸ‡·',
  JP: 'ðŸ‡¯ðŸ‡µ',
  KR: 'ðŸ‡°ðŸ‡·'
};

export function toFlagEmoji(code: string) {
  const normalized = code.trim().toUpperCase();
  return FLAG_MAP[normalized] ?? 'ðŸŒ';
}

export function levelLabel(level: string) {
  return level.charAt(0) + level.slice(1).toLowerCase();
}
