// Self-declaration is a product gate, not verified age or durable vault state.
export function requireAdultDeclaration(status) {
  if (status !== 'adult_declared') throw new Error('DeDe is for adults 18 and over. Confirm your age before chatting. If you need urgent help, use your phone’s emergency calling feature or ask a trusted adult nearby. This app cannot call or alert anyone.');
}

// Narrow interim guard, not the backend's complete age-signal classifier.
// Never infer age from Google identity or a story about somebody else.
export function isExplicitMinor(text) {
  const normalized = text.trim().toLowerCase().replaceAll('’', "'");
  const match = normalized.match(/^(?:hi[,!\s]+)?(?:i am|i'm|im)\s+(\d{1,2})(?:\s*(?:years? old|y\/?o))?(?=$|[,.!?]|\s+(?:and|but)\b)/);
  return Boolean(match && Number(match[1]) < 18);
}
