export type AnimeMatch = { id: number; anilistId?: number; title: string; episodes: number | null };

/** VidLink's documented anime API uses MAL IDs, not TMDB IDs. No fallback to sub. */
export function animeVoiceUrl(malId: number, episode: number, voice: 'en' | 'ja'): string {
  return `https://vidlink.pro/anime/${malId}/${episode}/${voice === 'en' ? 'dub' : 'sub'}`;
}

export function animeIcuVoiceUrl(anilistId: number, episode: number, voice: 'en' | 'ja'): string {
  return `https://vidsrc.icu/embed/anime/${anilistId}/${episode}/${voice === 'en' ? 1 : 0}`;
}