"use client";

import { useEffect, useRef, useState } from "react";
import { encodedAudioMime } from "@/lib/audio-format";

export default function VoiceReply({ chunks, autoPlay = false }: { chunks: string[]; autoPlay?: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const part = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const player = audio.current;
    if (!autoPlay || !player || !chunks.length) return;
    let active = true;
    async function speak() {
      try {
        player!.src = `data:${encodedAudioMime(chunks[0])};base64,${chunks[0]}`;
        part.current = 0;
        await player!.play();
        if (active) setError("");
      } catch { if (active) setError("Tap to hear — your browser needs permission to play audio."); }
    }
    void speak();
    return () => { active = false; player.pause(); };
  }, [autoPlay, chunks]);

  async function play() {
    const player = audio.current;
    if (!player) return;
    if (playing) { player.pause(); return; }
    try {
      if (!player.getAttribute("src")) player.src = `data:${encodedAudioMime(chunks[part.current])};base64,${chunks[part.current]}`;
      await player.play(); setError("");
    }
    catch { setPlaying(false); setError("Audio couldn't play. Tap to retry."); }
  }

  async function next() {
    if (part.current + 1 >= chunks.length) {
      part.current = 0; audio.current?.removeAttribute("src"); setPlaying(false); return;
    }
    part.current += 1;
    try {
      if (audio.current) audio.current.src = `data:${encodedAudioMime(chunks[part.current])};base64,${chunks[part.current]}`;
      await audio.current?.play();
    }
    catch { setPlaying(false); setError("Tap play to continue the reply."); }
  }

  return <div className="reply-player">
    <button onClick={play} aria-label={playing ? "Pause DeDe's reply" : "Play DeDe's reply"} className="play-reply">
      {playing ? <span aria-hidden="true">Ⅱ</span> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>}
    </button>
    <div><strong>{playing ? "DeDe is speaking" : "Hear DeDe"}</strong><span>{error || "Your spoken reply"}</span></div>
    <audio ref={audio} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={next} onError={() => { setPlaying(false); setError("Reply audio is unavailable. Your text reply is below."); }}/>
  </div>;
}
