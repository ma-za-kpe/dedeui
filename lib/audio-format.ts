export function encodedAudioMime(encoded: string): "audio/ogg" | "audio/wav" {
  const header = atob(encoded.slice(0, 32));
  if (header.startsWith("OggS")) return "audio/ogg";
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WAVE") return "audio/wav";
  throw new Error("Unsupported reply audio format");
}
