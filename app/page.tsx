"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { appPath } from '@/lib/app-path';
import ThemePicker from "./theme-picker";
import { useVoiceRecorder } from "./use-voice-recorder";
import VoiceReply from "./voice-reply";
import AudioPreview from "./audio-preview";
import GoogleAccount from "./google-account";
import { useAccount } from "./use-account";
import { welcomeText } from "@/lib/welcome";
import { useLocalModel } from "./use-local-model";

type Tab = "Talk" | "Memory" | "Circle" | "Settings";
type Message = { who: "you" | "dede"; text: string; audio?: string[]; recording?: Blob };
const tabs: Tab[] = ["Talk", "Memory", "Circle", "Settings"];

function Icon({ name }: { name: "mic" | "stop" | "type" | "attach" | "talk" | "memory" | "circle" | "settings" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "mic" && <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-3 0h6"/></>}
    {name === "stop" && <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" stroke="none"/>}
    {name === "type" && <><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"/></>}
    {name === "attach" && <path d="m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8"/>}
    {name === "talk" && <path d="M20 11a8 8 0 0 1-8 8H4l1-4a8 8 0 1 1 15-4Z"/>}
    {name === "memory" && <><path d="M5 3h12a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1ZM4 17h15M8 7h7M8 10h5"/></>}
    {name === "circle" && <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/></>}
    {name === "settings" && <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--surface)"/><circle cx="15" cy="17" r="3" fill="var(--surface)"/></>}
  </svg>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("Talk");
  const [menu, setMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [attachments, setAttachments] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [ageStatus, setAgeStatus] = useState<'unknown' | 'adult_declared' | 'minor'>('unknown');
  const [spokenReplies, setSpokenReplies] = useState(() => {
    try { return typeof window === "undefined" || localStorage.getItem("dede-spoken-replies") !== "off"; } catch { return true; }
  });
  const [notice, setNotice] = useState("");
  const [uploaded, setUploaded] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const threadEnd = useRef<HTMLDivElement | null>(null);
  const menuContainer = useRef<HTMLDivElement | null>(null);
  const voice = useVoiceRecorder();
  const local = useLocalModel();
  const accountGeneration = useRef(0);
  const account = useAccount(() => {
    accountGeneration.current += 1;
    document.querySelectorAll("audio").forEach(player => player.pause());
    setMessages([]); setDraft(""); setUploaded(null); voice.discard(); local.stop();
    setAgeStatus('unknown');
  });
  const sending = useRef(false);
  const mounted = useRef(true);
  const voiceAvailable = local.ready;
  const pendingAudio = uploaded || voice.voice;
  const locked = busy || voice.recording || voice.opening;
  const authenticated = Boolean(account.user) && !account.loading && !account.busy;

  useEffect(() => { threadEnd.current?.scrollIntoView({ block: "end" }); }, [messages, busy, tab]);

  useEffect(() => {
    if (!menu) return;
    function dismiss(event: PointerEvent) { if (!menuContainer.current?.contains(event.target as Node)) setMenu(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setMenu(false); menuContainer.current?.querySelector<HTMLButtonElement>("button")?.focus(); } }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [menu]);

  useEffect(() => {
    mounted.current = true;
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register(appPath('/sw.js')).catch(() => {});
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    function onePlayer(event: Event) {
      if (!(event.target instanceof HTMLMediaElement)) return;
      document.querySelectorAll("audio").forEach(player => { if (player !== event.target) player.pause(); });
    }
    document.addEventListener("play", onePlayer, true);
    return () => document.removeEventListener("play", onePlayer, true);
  }, []);

  async function startRecording() {
    if (uploaded) { setNotice("Remove the attached audio before recording a voice note."); return; }
    document.querySelectorAll("audio").forEach(player => player.pause());
    setNotice(""); await voice.start();
  }

  async function send() {
    if (sending.current || locked || (!draft.trim() && !pendingAudio)) return;
    if (!account.user || account.loading || account.busy) { setNotice("Sign in with Google before sending a message or voice note."); return; }
    if (ageStatus !== 'adult_declared') { setNotice('DeDe is for adults 18 and over. Please complete the age check before sending.'); return; }
    if (!local.ready) { setNotice("Load the on-device models below before sending. Your input stays here."); return; }
    sending.current = true; setBusy(true); setNotice("");
    const generation = accountGeneration.current;
    const inputText = pendingAudio ? "" : draft;
    try {
      const history = messages.map(message => ({ role: message.who === "you" ? "user" as const : "assistant" as const, content: message.text }));
      const result = await local.turn(inputText, pendingAudio, history, ageStatus);
      if (!mounted.current || generation !== accountGeneration.current) return;
      setMessages(old => [...old, { who: "you", text: result.transcript, recording: pendingAudio || undefined }, { who: "dede", text: result.text, audio: result.audio }]);
      if (!pendingAudio) setDraft("");
      setUploaded(null); voice.discard(); setTyping(false); setAttachments(false);
      if (result.warning) setNotice(result.warning);
    } catch (cause) {
      if (generation === accountGeneration.current && cause && typeof cause === 'object' && 'code' in cause && cause.code === 'AGE_RESTRICTED') { setAgeStatus('minor'); local.stop(); }
      if (mounted.current && generation === accountGeneration.current) setNotice(cause instanceof Error ? cause.message : "The connection failed. Your input is still here; it won't retry automatically.");
    } finally { sending.current = false; if (mounted.current) setBusy(false); }
  }

  function attach(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("audio/") || !file.size || file.size > 4 * 1024 * 1024) {
      setNotice("Choose an audio file under 4 MB. Photo and document reading aren't connected yet."); return;
    }
    voice.discard(); setUploaded(file); setAttachments(false); setNotice("");
  }

  function chooseTab(next: Tab) {
    if (voice.recording || voice.opening) { setNotice("Stop or cancel the recording before leaving Talk."); return; }
    setTab(next);
    setMenu(false);
  }


  const status = voiceAvailable ? "On-device · reference model" : local.loading ? "Loading on-device models…" : "On-device models not loaded";
  const tabNames: Record<Tab, string> = { Talk: "Conversation", Memory: "What I know", Circle: "Safety circle", Settings: "Settings" };

  return <div className="app-shell">
    <main className="main-panel">
      <header className="contact-header">
        {tab !== "Talk" && <button className="icon-button" onClick={() => chooseTab("Talk")} aria-label="Back to conversation">‹</button>}
        <div className="contact-avatar"><Image className="mark-light" src={appPath('/brand/dede-mark.svg')} width={27} height={32} alt=""/><Image className="mark-dark" src={appPath('/brand/dede-mark-dark.svg')} width={27} height={32} alt=""/></div>
        <div className="contact-name"><h1>{tab === "Talk" ? "DeDe" : tabNames[tab]}</h1><span>{tab === "Talk" ? status : "DeDe"}</span></div>
        <div className="contact-menu" ref={menuContainer}><button className="icon-button" onClick={() => setMenu(!menu)} aria-label="Conversation options" aria-expanded={menu} aria-controls="conversation-options">⋮</button>
          {menu && <nav id="conversation-options" aria-label="Conversation options">{tabs.map(name => <button key={name} onClick={() => chooseTab(name)} aria-current={tab === name ? "page" : undefined}>{tabNames[name]}</button>)}</nav>}
        </div>
      </header>

      {tab === "Talk" ? <>
        <section className="talk-room" aria-label="Conversation with DeDe" aria-busy={busy}>
          <article className="message dede welcome-message" aria-label="DeDe introduction"><p>{welcomeText(account.user?.displayName)}</p><span className="message-status">Introduction · on this device</span></article>
          {messages.map((message, i) => <article key={i} className={`message ${message.who}`} aria-label={message.who === "you" ? "Your message" : "DeDe's reply"}>
            {message.recording ? <><span className="note-label">Your voice note</span><AudioPreview file={message.recording}/></> : message.audio?.length ? <><VoiceReply chunks={message.audio} autoPlay={spokenReplies && i === messages.length - 1}/><p>{message.text}</p></> : <p>{message.text}</p>}
            <span className="message-status">{message.who === "you" ? "Processed on this device · not backed up" : "DeDe · local reference model"}</span>
          </article>)}
          {busy && <div className="processing" role="status">{local.status} <button className="text-button" onClick={local.stop}>Cancel</button></div>}
          <div ref={threadEnd}/>
        </section>
        <div className="composer-area">
          <details className="detail-card"><summary>Need urgent help?</summary><p>Use your phone’s emergency calling feature or ask someone safe nearby to help. This app cannot place a call or send an alert. Help information is available regardless of age or sign-in.</p></details>
          {account.user && ageStatus !== 'adult_declared' && <section className="detail-card" aria-label="Adults-only age check"><h2>DeDe is for adults</h2><p>{ageStatus === 'minor' ? 'This conversation is not available to under-18s. Please ask a parent, guardian or another trusted adult for support. Adding a guardian does not unlock adult chat.' : 'Are you 18 or older? Google sign-in does not confirm your age. Your answer stays in this tab for now; it is not verified age or a saved vault record.'}</p>{ageStatus === 'unknown' && <><button className="outline-button" onClick={() => setAgeStatus('adult_declared')}>I am 18 or older</button><button className="text-button" onClick={() => { setAgeStatus('minor'); local.stop(); voice.discard(); setUploaded(null); }}>I am under 18</button></>}</section>}
          {!account.user && <div className="detail-card"><p>{account.loading ? "Checking sign-in…" : "Sign in before sending a message or voice note. Your conversation is processed on this device."}</p><button className="outline-button" disabled={!account.configured || account.busy || account.loading} onClick={account.signIn}>{account.busy ? "Signing in…" : "Continue with Google"}</button>{account.notice && <p role="status">{account.notice}</p>}</div>}
          {!local.ready && <div className="detail-card"><p>On-device voice and chat. Initial download is about 300 MB; allow 450 MB free. English-only reference models, not the qualified DeDe student. History stays in this tab and is not backed up.</p><p role="status">{local.status}</p><button className="outline-button" disabled={local.loading || account.busy} onClick={local.load}>{local.loading ? "Loading…" : "Download / load on-device models"}</button>{local.loading && <button className="text-button" onClick={local.stop}>Cancel download</button>}</div>}
          {(notice || voice.error) && <div className="notice" role="status"><span>{voice.error || notice}</span><button onClick={() => { setNotice(""); if (voice.error) voice.discard(); }} aria-label="Dismiss notice">×</button></div>}
          {attachments && <div id="attachment-options" className="attachment-options"><button onClick={() => fileInput.current?.click()}><Icon name="mic"/><span><strong>Audio file</strong><small>A voice note, up to 4 MB</small></span></button><div className="unavailable-attachment"><Icon name="attach"/><span><strong>Photo or document</strong><small>Reading files is not connected yet</small></span></div></div>}
          {pendingAudio ? <div className="voice-review"><div className="review-heading"><strong>{uploaded ? uploaded.name : `Voice note · ${voice.seconds}s`}</strong><button className="text-button" disabled={busy} onClick={() => { voice.discard(); setUploaded(null); }}>Discard</button></div><AudioPreview file={pendingAudio}/><div className="review-send"><span>{!authenticated ? "Sign in to send" : voiceAvailable ? "Listen back, then send." : "Load on-device models to send"}</span><button className="voice-button" disabled={busy || !voiceAvailable || !authenticated} onClick={send} aria-label="Send voice note">↑</button></div></div>
          : voice.recording || voice.opening ? <div className="recording-composer"><button className="text-button" onClick={voice.discard}>Cancel recording</button><div className="recording-meter"><span className="recording-lamp"/><span aria-live="polite">{voice.opening ? "Opening mic…" : `0:${String(voice.seconds).padStart(2, "0")}`}</span><div className="waveform" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ height: `${5 + voice.level * (12 + (4 - Math.abs(i - 4)) * 4)}px` }}/>)}</div></div><button className="voice-button" disabled={voice.opening} onClick={voice.stop} aria-label="Stop recording"><Icon name="stop"/></button></div>
          : <div className="composer-bar">
            <button className="icon-button" onClick={() => { setAttachments(!attachments); setTyping(false); }} disabled={locked} aria-label="Add something" aria-expanded={attachments} aria-controls="attachment-options"><Icon name="attach"/></button>
            {typing ? <textarea ref={textarea} id="message" aria-label="A thought in words" placeholder="Message" value={draft} maxLength={8000} disabled={locked} rows={1} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/>
            : <button className="composer-prompt" onClick={() => { setTyping(true); setAttachments(false); requestAnimationFrame(() => textarea.current?.focus()); }} disabled={locked}>Message</button>}
            <button className="icon-button" onClick={() => { setTyping(!typing); setAttachments(false); if (!typing) requestAnimationFrame(() => textarea.current?.focus()); }} disabled={locked} aria-label={typing ? "Use voice instead" : "Type instead"} aria-pressed={typing}><Icon name={typing ? "mic" : "type"}/></button>
            <button className="voice-button" onClick={typing && draft.trim() ? send : startRecording} disabled={locked || Boolean(typing && draft.trim() && (!authenticated || !local.ready))} aria-label={typing && draft.trim() ? "Send message" : "Record a voice note"}>{typing && draft.trim() ? <span aria-hidden="true">↑</span> : <Icon name="mic"/>}</button>
          </div>}
          <p className="composer-hint">{voice.recording ? "Tap stop to review · 30-second limit" : voice.opening ? "Allow microphone access. Nothing sends automatically." : pendingAudio ? "Nothing sends until you choose." : "Tap the mic to record · listen back before sending"}</p>
          <input ref={fileInput} type="file" accept="audio/*" hidden onChange={e => { attach(e.target.files?.[0]); e.currentTarget.value = ""; }}/>
        </div>
      </> : <section className="detail-page">
        <h2>{tab === "Memory" ? "What stays with DeDe." : tab === "Circle" ? "The people you trust." : "Settings"}</h2>
        {tab === "Settings" && <label className="workshop-consent"><input type="checkbox" checked={spokenReplies} onChange={event => { const enabled = event.target.checked; setSpokenReplies(enabled); try { localStorage.setItem("dede-spoken-replies", enabled ? "on" : "off"); } catch { /* Preference remains active in this tab. */ } if (!enabled) document.querySelectorAll(".reply-player audio").forEach(player => (player as HTMLAudioElement).pause()); }}/><span>Spoken replies — DeDe talks back automatically. Text stays visible.</span></label>}
        <p>{tab === "Memory" ? "Persistent memory and encrypted backup aren't connected yet. This test keeps the conversation only in the open tab." : tab === "Circle" ? "Contact enrollment and beacon delivery aren't connected to this test. No one will be contacted." : "Choose your appearance and sign in. Sign-in does not yet unlock a vault or protect the test connection."}</p>
        {tab === "Settings" && <><ThemePicker/><GoogleAccount account={account}/><div className="detail-card"><h3>On-device models</h3><p>{status}. Speech and replies run here, with no Vast fallback. Public model downloads go to Hugging Face and the pinned runtime CDN; conversation content does not. SmolLM2 135M Q4, Whisper tiny.en Q8 and MMS English Q8 are reference models. MMS is non-commercial licensed: this bundle is development-only, not a production release.</p><p role="status">{local.status}</p><button className="outline-button" disabled={local.loading || local.ready || locked} onClick={local.load}>Download / load on-device models</button><button className="text-button" disabled={locked || local.loading} onClick={() => void local.remove().catch(() => setNotice("Could not remove cached models. Check browser storage permissions."))}>Remove downloaded models</button><button className="text-button" disabled={locked || !messages.length} onClick={() => { setMessages([]); setNotice("This tab's conversation was cleared. No remote data was deleted."); }}>Clear this session</button></div></>}
        {notice && <p className="notice" role="status">{notice}</p>}
      </section>}
    </main>
  </div>;
}
