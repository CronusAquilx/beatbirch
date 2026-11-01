import { expect, it } from 'vitest';
import { animeIcuVoiceUrl, animeVoiceUrl } from './anime-sources';
it('requests anime dub using the confirmed MAL ID without falling back to sub', () => {
  expect(animeVoiceUrl(21, 2, 'en')).toBe('https://vidlink.pro/anime/21/2/dub');
  expect(animeVoiceUrl(21, 2, 'ja')).toBe('https://vidlink.pro/anime/21/2/sub');
});
it('requests the second dub source with an AniList ID, never a TMDB ID', () => {
  expect(animeIcuVoiceUrl(21, 3, 'en')).toBe('https://vidsrc.icu/embed/anime/21/3/1');
  expect(animeIcuVoiceUrl(21, 3, 'ja')).toBe('https://vidsrc.icu/embed/anime/21/3/0');
});