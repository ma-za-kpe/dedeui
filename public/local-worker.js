/* Browser-only reference pipeline. No conversation leaves this worker. */
import { env, pipeline } from '/local-runtime/transformers.web.js';
import { assertLocalReply } from '/local-policy.js';
import { artifactRequestOptions, verifyArtifact, verifyArtifactFetch } from '/model-integrity.js';

const CACHE = 'dede-local-models-v1';
const MODELS = {
  llm: ['onnx-community/SmolLM2-135M-Instruct-ONNX-MHA', '5b6682c7c9df18f004bfb7e635cba3f3d98537d8'],
  stt: ['Xenova/whisper-tiny.en', '79fb389fc764e7c395bd330e9531d9d32ada7049'],
  tts: ['Xenova/mms-tts-eng', '3f8955a2adbd6487ce57420620d4916de22b9dac'],
};
// v4 pipeline discovery requests /main before applying pipeline revision options.
// Canonicalize both cache and fetch keys so discovery cannot escape the pinned revision.
function pinnedURL(input) {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, globalThis.location.href);
  if (url.origin === 'https://huggingface.co') {
    for (const [id, revision] of Object.values(MODELS)) {
      if (url.pathname.startsWith(`/${id}/resolve/main/`)) url.pathname = url.pathname.replace(`/resolve/main/`, `/resolve/${revision}/`);
    }
  }
  return url;
}
let generator, transcriber, synthesizer, busy = false, installed = false;
env.allowLocalModels = false;
env.useBrowserCache = true;
env.cacheKey = CACHE;
const HASHES = {
  'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA/resolve/5b6682c7c9df18f004bfb7e635cba3f3d98537d8/onnx/model_q4.onnx': 'dc846d8aa41f67480f4b3f94b71ab78d5b229bb6da576d7d90b7510924eda615',
  'Xenova/whisper-tiny.en/resolve/79fb389fc764e7c395bd330e9531d9d32ada7049/onnx/encoder_model_quantized.onnx': '8cc3c6f8563d1b3fbd2c5af9f64c2bed8b020bc593c402d1ef53b9f08fbf1b90',
  'Xenova/whisper-tiny.en/resolve/79fb389fc764e7c395bd330e9531d9d32ada7049/onnx/decoder_model_merged_quantized.onnx': 'dbb2e063b7fbc41d9803b9698f93ecb035c50cbb3fb87b56cb131e4a5eb99059',
  'Xenova/mms-tts-eng/resolve/3f8955a2adbd6487ce57420620d4916de22b9dac/onnx/model_quantized.onnx': '13cf610a20d9bec7d8948801ab073a65d85bf65b793927e3243f6fbf367cd0a5',
};
async function verify(url, response) {
  return verifyArtifact(url, response, HASHES);
}
env.useCustomCache = true;
env.customCache = {
  async match(url) { const key = pinnedURL(url).href; const cache = await caches.open(CACHE); const response = await cache.match(key); return response ? verify(key, response) : undefined; },
  async put(url, response) { const key = pinnedURL(url).href; const cache = await caches.open(CACHE); await cache.put(key, await verify(key, response)); },
  async delete(url) { return (await caches.open(CACHE)).delete(pinnedURL(url).href); },
};
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL('/local-runtime/ort-wasm-simd-threaded.mjs', globalThis.location.href).href,
  wasm: new URL('/local-runtime/ort-wasm-simd-threaded.wasm', globalThis.location.href).href,
};
// Runtime assets are self-hosted from the locked dependency. Model revisions are immutable.
// No browser SpeechRecognition or remote speechSynthesis is used.
const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  if (installed) throw new Error('Network is disabled during local inference.');
  const url = pinnedURL(input);
  const modelAsset = Object.values(MODELS).some(([id, revision]) => url.href.startsWith(`https://huggingface.co/${id}/resolve/${revision}/`));
  const runtimeAsset = url.origin === globalThis.location.origin && url.pathname.startsWith('/local-runtime/');
  const options = artifactRequestOptions(input, init);
  if ((!modelAsset && !runtimeAsset) || !['GET', 'HEAD'].includes(options.method)) throw new Error(`Non-artifact network request blocked: ${options.method} ${url.origin}${url.pathname}`);
  const response = await originalFetch(url.href, { ...options, credentials: 'omit', referrerPolicy: 'no-referrer' });
  return verifyArtifactFetch(url.href, response, options, HASHES);
};
env.fetch = globalThis.fetch;
function progress(stage) {
  return data => globalThis.postMessage({ type: 'progress', message: `${stage}: ${data.file || data.status || 'loading'}${typeof data.progress === 'number' ? ` ${Math.round(data.progress)}%` : ''}` });
}
async function load() {
  const options = key => ({ revision: MODELS[key][1], device: 'wasm', dtype: key === 'llm' ? 'q4' : 'q8', progress_callback: progress(key) });
  generator = await pipeline('text-generation', MODELS.llm[0], options('llm'));
  transcriber = await pipeline('automatic-speech-recognition', MODELS.stt[0], options('stt'));
  synthesizer = await pipeline('text-to-speech', MODELS.tts[0], options('tts'));
  installed = true;
}
const constitution = `You are DeDe, an AI assistant. Reply in one short, kind sentence. You are not human and have no body or private life. Use only facts from this conversation. Never claim ownership of someone. You cannot call anyone, alert contacts, send help or save memories. Do not claim you performed these actions. Respect requests for space. Do not diagnose.`;
globalThis.onmessage = async ({ data }) => {
  if (busy) { globalThis.postMessage({ type: 'error', message: 'A local operation is already running.' }); return; }
  busy = true;
  try {
    if (data.type === 'load') {
      await load(); globalThis.postMessage({ type: 'ready', models: MODELS });
    } else if (data.type === 'turn') {
      if (!installed) throw new Error('Download and load the local models first.');
      let text = typeof data.text === 'string' ? data.text.slice(0, 2000).trim() : '';
      if (data.samples) {
        const samples = new Float32Array(data.samples);
        if (!samples.length || samples.length > 16000 * 30) throw new Error('Use an audio note of 30 seconds or less.');
        globalThis.postMessage({ type: 'progress', message: 'Listening on this device…' });
        const result = await transcriber(samples, { chunk_length_s: 30, return_timestamps: false });
        text = result.text.trim();
      }
      if (!text) throw new Error('No words were heard. Your recording is still available.');
      globalThis.postMessage({ type: 'progress', message: 'Thinking on this device…' });
      const history = (data.history || []).slice(-6).filter(x => ['user', 'assistant'].includes(x.role) && typeof x.content === 'string').map(x => ({ role: x.role, content: x.content.slice(0, 500) }));
      const result = await generator([{ role: 'system', content: constitution }, ...history, { role: 'user', content: text }], { max_new_tokens: 72, do_sample: false, return_full_text: false });
      const generated = result[0].generated_text;
      const reply = (typeof generated === 'string' ? generated : generated.at(-1).content).trim();
      if (!reply) throw new Error('The local model returned no reply. Please try again.');
      assertLocalReply(reply);
      globalThis.postMessage({ type: 'progress', message: 'Making speech on this device…' });
      try {
        const audio = await synthesizer(reply);
        globalThis.postMessage({ type: 'reply', text: reply, transcript: text, samples: audio.audio, rate: audio.sampling_rate }, [audio.audio.buffer]);
      } catch {
        globalThis.postMessage({ type: 'reply', text: reply, transcript: text, warning: 'Local speech failed. Your reply is available as text; no cloud voice was used.' });
      }
    }
  } catch (error) {
    globalThis.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Local inference failed. Nothing was uploaded.' });
  } finally { busy = false; }
};
