"use client";
import { useEffect, useRef, useState } from 'react';
import { decodeLocalAudio, wavBase64 } from '@/lib/local-audio';
import { appPath } from '@/lib/app-path';
type Reply = { text: string; transcript: string; audio?: string[]; warning?: string };
type History = { role: 'user' | 'assistant'; content: string }[];
export function useLocalModel() {
  const worker = useRef<Worker | null>(null);
  const epoch = useRef(0);
  const pending = useRef<{ resolve: (value: Reply) => void; reject: (error: Error) => void } | null>(null);
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(false), [status, setStatus] = useState('Models not loaded');
  function stop() {
    epoch.current += 1;
    worker.current?.terminate(); worker.current = null;
    pending.current?.reject(new Error('Local operation cancelled. Nothing was uploaded.')); pending.current = null;
    setReady(false); setLoading(false); setStatus('Models unloaded; cached downloads are kept');
  }
  useEffect(() => () => { worker.current?.terminate(); pending.current?.reject(new Error('Local worker closed')); }, []);
  async function load() {
    if (loading || ready) return;
    const loadingEpoch = ++epoch.current;
    setLoading(true); setStatus('Preparing local models…');
    try {
      if (!window.isSecureContext || !window.Worker || !window.caches || !window.WebAssembly) throw new Error('This browser needs HTTPS or localhost, workers, WASM and model cache support. No cloud fallback.');
      const estimate = await navigator.storage?.estimate();
      if (estimate?.quota && estimate.quota - (estimate.usage || 0) < 450 * 1024 * 1024) throw new Error('At least 450 MB of free browser storage is needed.');
      await navigator.storage?.persist?.();
      if (epoch.current !== loadingEpoch) return;
      worker.current?.terminate();
      const next = new Worker(appPath('/local-worker.js'), { type: 'module' }); worker.current = next;
      next.onmessage = ({ data }) => {
        if (worker.current !== next || epoch.current !== loadingEpoch) return;
        if (data.type === 'progress') setStatus(data.message);
        if (data.type === 'ready') { setReady(true); setLoading(false); setStatus('Local models ready'); }
        if (data.type === 'error') { setStatus(data.message); setLoading(false); pending.current?.reject(new Error(data.message)); pending.current = null; }
        if (data.type === 'age_blocked') { setStatus(data.message); pending.current?.reject(Object.assign(new Error(data.message), { code: 'AGE_RESTRICTED' })); pending.current = null; }
        if (data.type === 'reply') {
          try { pending.current?.resolve({ text: data.text, transcript: data.transcript, audio: data.samples ? [wavBase64(data.samples, data.rate)] : undefined, warning: data.warning }); }
          catch { pending.current?.resolve({ text: data.text, transcript: data.transcript, warning: 'Audio could not be encoded. Text is preserved.' }); }
          pending.current = null; setStatus('Local models ready');
        }
      };
      next.onerror = () => { if (worker.current !== next) return; stop(); setStatus('The browser could not run the models. Try loading again. No cloud fallback.'); };
      next.postMessage({ type: 'load' });
    } catch (error) { if (epoch.current !== loadingEpoch) return; setLoading(false); setStatus(error instanceof Error ? error.message : 'Local models unavailable'); }
  }
  async function turn(text: string, audio: Blob | null, history: History, ageStatus: 'adult_declared'): Promise<Reply> {
    if (!ready || !worker.current || pending.current) throw new Error('Load the local models before sending.');
    const target = worker.current;
    const samples = audio ? await decodeLocalAudio(audio) : undefined;
    if (worker.current !== target) throw new Error('Local operation cancelled.');
    return new Promise((resolve, reject) => {
      pending.current = { resolve, reject };
      target.postMessage({ type: 'turn', text, samples: samples?.buffer, history, ageStatus }, samples ? [samples.buffer] : []);
    });
  }
  async function remove() { stop(); await caches.delete('dede-local-models-v1'); setStatus('Downloaded models removed. Conversation was not stored in that cache.'); }
  return { ready, loading, status, load, turn, stop, remove };
}
