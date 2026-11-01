import { describe, expect, it } from "vitest";
import { allowedAudioUrl, bestAudio, sourceOrder } from "./sources";

describe("music playback rules", () => {
  it("Auto prefers high-quality JioSaavn and falls back to YouTube without preview/video sources", () => {
    expect(sourceOrder("auto")).toEqual(["jiosaavn", "youtube", "audius", "soundcloud"]);
  });
  it("honors the selected source and tries each fallback only once", () => {
    expect(sourceOrder("youtube")).toEqual(["youtube", "jiosaavn", "audius", "soundcloud"]);
    expect(sourceOrder("jiosaavn")).toEqual(["jiosaavn", "youtube", "audius", "soundcloud"]);
  });
  it("selects 320kbps JioSaavn audio over lower quality", () => {
    expect(bestAudio([{ quality: "128kbps", url: "https://aac.saavncdn.com/128.mp4" }, { quality: "320kbps", url: "https://aac.saavncdn.com/320.mp4" }])?.quality).toBe("320kbps");
  });
  it("selects highest-bitrate adaptive audio and never a video stream", () => {
    expect(bestAudio([{ bitrate: 128000, url: "https://example.com/low", mimeType: "audio/mp4" }, { bitrate: 256000, url: "https://example.com/high", mimeType: "audio/webm" }, { bitrate: 900000, url: "https://example.com/video", mimeType: "video/mp4" }])?.bitrate).toBe(256000);
  });
  it("rejects arbitrary audio relay destinations", () => {
    expect(allowedAudioUrl("https://aac.saavncdn.com/song.mp4")).toBe(true);
    expect(allowedAudioUrl("https://saavncdn.com.evil.test/song.mp4")).toBe(false);
    expect(allowedAudioUrl("https://127.0.0.1/private")).toBe(false);
    expect(allowedAudioUrl("https://evilpiped.test/private")).toBe(false);
  });
});