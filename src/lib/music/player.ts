import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SERVERS, sourceOrder, type Server, type AudioSource } from "./sources";
export { SERVERS, type Server } from "./sources";
import type { Prefs } from "@/lib/astra/prefs";

/**
 * App-wide music player. The audio element lives outside any page,
 * so music keeps playing while you move between tabs (Web, Movies, Chat…).
 */
export type Track = { id: string; title: string; artist: string; artistId: string; album: string; albumId: string; art: string; duration: number; preview?: string; source?: "piped" | "jiosaavn" };

type State = { queue: Track[]; cur: number; status: string; paused: boolean; time: number; dur: number; server: Server; currentSource: AudioSource | null; mode: "audio" | "video" | null; volume: number };
let state: State = { queue: [], cur: -1, status: "", paused: true, time: 0, dur: 0, server: "auto", currentSource: null, mode: null, volume: 1 };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };

let audio: HTMLAudioElement | null = null;
let restored = false;
let token = "";
let playId = 0;

export async function musicToken() {
  const { data } = await supabase.auth.getSession();
  token = data.session?.access_token ?? "guest";
  return token;
}
export const artUrl = (src: string) => (src && !/^https:\/\/([a-z0-9-]+\.)*(dzcdn\.net|deezer\.com|mzstatic\.com)\//i.test(src) ? src : src && token ? `/api/music?op=art&src=${encodeURIComponent(src)}&token=${encodeURIComponent(token)}` : "");

export async function musicApi<T>(params: Record<string, string>): Promise<T> {
  if (!(await musicToken())) throw new Error("Please sign in again");
  const res = await fetch(`/api/music?${new URLSearchParams(params)}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(res.status === 401 ? "Session expired — sign in again" : `Music couldn't load (${res.status})`);
  return res.json();
}

/** Direct download link for a track, streamed through Astra's server. */
export function downloadUrl(t: Track) {
  const p = new URLSearchParams({ op: "download", title: t.title, artist: t.artist, duration: String(t.duration || 0), ...(t.preview ? { preview: t.preview } : {}) });
  return `/api/music?${p.toString()}&token=${encodeURIComponent(token)}`;
}

function ensure() {
  if (typeof document === "undefined") return;
  if (!audio) {
    const element = new Audio();
    audio = element;
    element.preload = "auto";
    element.addEventListener("timeupdate", () => set({ time: element.currentTime, dur: Number.isFinite(element.duration) ? element.duration : state.dur }));
    element.addEventListener("play", () => set({ paused: false }));
    element.addEventListener("pause", () => set({ paused: true }));
    element.addEventListener("ended", () => next());
  }
  if (!restored) {
    restored = true;
    try {
      const saved = localStorage.getItem("bb-music-server3");
      const value = saved === "piped" ? "youtube" : saved;
      if (value && SERVERS.some(x => x.id === value)) set({ server: value as Server });
    } catch { /* storage unavailable */ }
  }
}

export function setServer(s: Server) {
  ensure();
  try { localStorage.setItem("bb-music-server3", s); } catch { /* storage unavailable */ }
  set({ server: s });
  if (state.cur >= 0) void playList(state.queue, state.cur);
}
export function setVolume(v: number) { ensure(); if (audio) audio.volume = v; set({ volume: v }); }
// Retained for existing shells; audio-only playback does not need a proxied frame.
export function setPlayerPrefs(_p: Prefs) {}

async function startAudio(element: HTMLAudioElement, url: string): Promise<void> {
  element.src = url;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); element.removeEventListener("error", failed); };
    const failed = () => { cleanup(); reject(new Error("Audio source unavailable")); };
    const timer = setTimeout(failed, 12000);
    element.addEventListener("error", failed, { once: true });
    element.play().then(() => { cleanup(); resolve(); }, error => { cleanup(); reject(error); });
  });
}

export async function playList(list: Track[], i: number) {
  ensure();
  const t = list[i];
  const element = audio;
  if (!t || !element) return;
  const my = ++playId;
  element.onerror = null;
  element.pause(); element.removeAttribute("src"); element.load();
  set({ queue: list, cur: i, status: "Finding audio…", paused: true, time: 0, dur: t.duration, mode: null, currentSource: null });
  const order = sourceOrder(state.server, t.source);
  const tried = new Set<AudioSource>();
  let recovering = false;
  async function attempt(resume = 0): Promise<void> {
    if (!element || !t) return;
    if (recovering || my !== playId) return;
    recovering = true;
    element.onerror = null;
    for (const sv of order) {
      if (my !== playId) { recovering = false; return; }
      if (tried.has(sv)) continue;
      tried.add(sv);
      const name = SERVERS.find(x => x.id === sv)?.name ?? sv;
      set({ status: `Trying ${name}…`, currentSource: null, mode: null });
      try {
        const r = await musicApi<{ url: string | null; quality?: string }>({ op: "resolve", server: sv, id: t.id, title: t.title, artist: t.artist, duration: String(t.duration || 0), preview: t.preview ?? "" });
        if (my !== playId) { recovering = false; return; }
        if (!r.url) continue;
        await startAudio(element, `/api/music?op=audio&u=${encodeURIComponent(r.url)}&token=${encodeURIComponent(token)}`);
        if (my !== playId) { recovering = false; return; }
        if (resume > 0 && Number.isFinite(element.duration)) element.currentTime = Math.min(resume, Math.max(0, element.duration - 1));
        set({ mode: "audio", currentSource: sv, status: sv === "deezer" ? "30-second preview" : r.quality ?? "", paused: false });
        recovering = false;
        element.onerror = () => { if (my === playId) { const at = element.currentTime; set({ status: "Stream interrupted — switching source…", paused: true }); void attempt(at); } };
        return;
      } catch (error) {
        if (my !== playId) { recovering = false; return; }
        if (error instanceof Error && error.name === "NotAllowedError") {
          set({ mode: "audio", currentSource: sv, status: "Tap Play to continue", paused: true });
          recovering = false;
          element.onerror = () => { if (my === playId) void attempt(element.currentTime); };
          return;
        }
        element.pause(); element.removeAttribute("src"); element.load();
      }
    }
    recovering = false;
    if (my === playId) set({ status: "No source is available for this song right now", paused: true, mode: null, currentSource: null });
  }
  await attempt();
}

export function toggle() {
  ensure();
  if (state.mode === "audio" && audio?.src) {
    if (audio.paused) void audio.play().catch(() => set({ status: "Playback unavailable — select another source", paused: true }));
    else audio.pause();
  } else if (state.cur >= 0) void playList(state.queue, state.cur);
}
export function next() { if (state.cur < state.queue.length - 1) void playList(state.queue, state.cur + 1); }
export function prev() { if (audio && state.mode === "audio" && audio.currentTime > 4) { audio.currentTime = 0; return; } void playList(state.queue, Math.max(0, state.cur - 1)); }
export function seek(t: number) { if (audio && state.mode === "audio") audio.currentTime = t; }
export function stop() { playId++; if (audio) { audio.onerror = null; audio.pause(); audio.removeAttribute("src"); audio.load(); } set({ cur: -1, queue: [], mode: null, currentSource: null, paused: true }); }
export function getAudio() { ensure(); return audio; }
export function getPlayer() { return state; }

export function usePlayer() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
}
