import { expect, it } from 'vitest';
import { animeVoiceUrl } from './anime-sources';
it('requests anime dub using the confirmed MAL ID without falling back to sub', () => {
  expect(animeVoiceUrl(21, 2, 'en')).toBe('https://vidlink.pro/anime/21/2/dub');
  expect(animeVoiceUrl(21, 2, 'ja')).toBe('https://vidlink.pro/anime/21/2/sub');
});