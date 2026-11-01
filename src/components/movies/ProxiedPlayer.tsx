import { useEffect, useRef } from "react";
import { usePrefs } from "@/lib/astra/prefs";
import { openProxied } from "@/lib/astra/proxy";
import { attachProxiedPopups } from "@/lib/astra/proxy-popups";

/**
 * Plays a streaming source (VidSrc, APIPlayer, …) through the site's proxy so the
 * browser only talks to this site. The full source address, including its
 * query string (autoplay, captions, resume time), is passed through unchanged.
 */
export function ProxiedPlayer({ src, title, onLoad, onError }: { src: string; title: string; onLoad?: () => void; onError?: () => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const prefs = usePrefs();
  const loadRef = useRef(onLoad); loadRef.current = onLoad;
  const errRef = useRef(onError); errRef.current = onError;
  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    let first = true;
    const loaded = () => { if (first && iframe.src.includes("/scramjet/p/")) { first = false; loadRef.current?.(); } };
    iframe.addEventListener("load", loaded);
    const detach = attachProxiedPopups(iframe, src, prefs);
    openProxied(iframe, src, prefs).catch(() => errRef.current?.());
    return () => { iframe.removeEventListener("load", loaded); detach(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, prefs.transport, prefs.wisp]);
  return <iframe ref={ref} title={title} className="size-full border-0" allowFullScreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" />;
}
