// Component-only browser harness. Never imported by the app.
import { createRoot } from 'react-dom/client';
import VoiceReply from '../app/voice-reply';
declare global { interface Window {
  renderVoiceReply: (audio: string, autoPlay: boolean) => void;
  renderVoiceChunks: (chunks: string[], autoPlay: boolean) => void;
  clearVoiceReply: () => void;
} }
const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host);
window.renderVoiceReply = (audio, autoPlay) => root.render(<VoiceReply chunks={[audio]} autoPlay={autoPlay}/>);
window.renderVoiceChunks = (chunks, autoPlay) => root.render(<VoiceReply chunks={chunks} autoPlay={autoPlay}/>);
window.clearVoiceReply = () => root.render(null);
