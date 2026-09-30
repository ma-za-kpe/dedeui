"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [opening, setOpening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const media = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const discardOnStop = useRef(false);
  const requesting = useRef(false);

  const release = useCallback(() => {
    media.current?.getTracks().forEach(track => track.stop());
    media.current = null;
    if (tick.current) clearInterval(tick.current);
    if (timeout.current) clearTimeout(timeout.current);
    tick.current = timeout.current = null;
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
  }, []);

  const discard = useCallback(() => {
    discardOnStop.current = true;
    if (recorder.current?.state === "recording") recorder.current.stop();
    setVoice(null); setSeconds(0); setLevel(0); setError("");
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discardOnStop.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
    };
  }, [release]);

  async function start() {
    if (requesting.current || recorder.current?.state === "recording") return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Your browser needs HTTPS or localhost to record. You can still type a message.");
      return;
    }
    requesting.current = true; setOpening(true); discard(); discardOnStop.current = false;
    try {
      const tracks = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || discardOnStop.current) { tracks.getTracks().forEach(t => t.stop()); return; }
      media.current = tracks;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const next = new MediaRecorder(tracks, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      next.onerror = () => { discardOnStop.current = true; release(); if (mounted.current) { setRecording(false); setError("Recording stopped unexpectedly. Please try again."); } };
      next.onstop = () => {
        release();
        if (!mounted.current) return;
        setRecording(false); setLevel(0);
        if (discardOnStop.current) return;
        const blob = new Blob(chunks, { type: next.mimeType });
        if (!blob.size) { setError("The recording was empty. Please try again."); return; }
        if (blob.size > 4 * 1024 * 1024) { setError("That recording is too large. Try a shorter note."); return; }
        setVoice(blob);
      };
      recorder.current = next; next.start(); setRecording(true);
      const begun = Date.now();
      timeout.current = setTimeout(() => { if (next.state === "recording") next.stop(); }, 30_000);
      let analyser: AnalyserNode | null = null;
      try {
        const context = new AudioContext(); audioContext.current = context;
        analyser = context.createAnalyser(); analyser.fftSize = 256;
        context.createMediaStreamSource(tracks).connect(analyser);
        void context.resume().catch(() => {});
      } catch { /* Recording works even when the optional level meter is unavailable. */ }
      if (!mounted.current || next.state !== "recording") return;
      tick.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - begun) / 1000));
        if (analyser) {
          const samples = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(samples);
          const energy = Math.sqrt(samples.reduce((sum, x) => sum + ((x - 128) / 128) ** 2, 0) / samples.length);
          setLevel(Math.min(1, energy * 5));
        }
      }, 100);
    } catch (cause) {
      release();
      if (mounted.current) setError(cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "Microphone permission was denied. Enable it in your browser, or use text."
        : "We couldn't open your microphone. Check that it isn't being used elsewhere.");
    } finally {
      requesting.current = false;
      if (mounted.current) setOpening(false);
    }
  }

  function stop() { if (recorder.current?.state === "recording") recorder.current.stop(); }
  return { recording, opening, seconds, level, voice, error, start, stop, discard };
}
