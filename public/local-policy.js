// Minimum output rejection checks, not a port or qualification of DeDe's law spine.
export function assertLocalReply(text) {
  const normalized = text.replaceAll('’', "'").toLowerCase();
  if (/\bi(?:'m| am)\s+(?:a\s+|real\s+)?(?:human|person)\b/.test(normalized)
      || /\bi\s+(?:have\s+)?(?:called|alerted|notified|dispatched)\b/.test(normalized)
      || /\bi(?:'m| am)\s+(?:calling|alerting|notifying|dispatching)\b/.test(normalized)) {
    throw new Error('The reference model failed its honesty check. Your input is still here; no substitute reply or audio was generated.');
  }
  const sentences = normalized.split(/[.!?]+/).map(x => x.trim()).filter(Boolean);
  if (sentences.some(sentence => sentences.filter(x => x === sentence).length >= 3)) {
    throw new Error('The reference model repeated itself. Your input is still here; no substitute reply was generated.');
  }
}
