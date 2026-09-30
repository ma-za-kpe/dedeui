"use client";

import { useEffect, useRef } from "react";

export default function AudioPreview({ file }: { file: Blob }) {
  const player = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const element = player.current;
    if (element) element.src = url;
    return () => { element?.pause(); URL.revokeObjectURL(url); };
  }, [file]);
  return <audio ref={player} controls preload="metadata" aria-label="Preview your voice note"/>;
}
