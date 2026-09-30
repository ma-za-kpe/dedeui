export function wavBase64(samples: Float32Array, rate: number): string {
  if (!samples.length || !Number.isInteger(rate) || rate < 8000 || rate > 96000) throw new Error('Invalid local audio');
  const bytes = new Uint8Array(44 + samples.length * 2), view = new DataView(bytes.buffer);
  const label = (offset: number, text: string) => { [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0))); };
  label(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); label(8, 'WAVE'); label(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  label(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((x, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * (x < 0 ? 32768 : 32767), true));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

export async function decodeLocalAudio(blob: Blob): Promise<Float32Array> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (!decoded.duration || decoded.duration > 30) throw new Error('Use a recording of 30 seconds or less.');
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally { await context.close(); }
}
