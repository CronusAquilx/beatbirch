export type AnimeMatch = { id: number; title: string; episodes: number | null };

/** VidLink's documented anime API uses MAL IDs, not TMDB IDs. No fallback to sub. */
export function animeVoiceUrl(malId: number, episode: number, voice: 'en' | 'ja'): string {
  return `https://vidlink.pro/anime/${malId}/${episode}/${voice === 'en' ? 'dub' : 'sub'}`;
}