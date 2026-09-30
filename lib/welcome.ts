export function welcomeText(displayName?: string | null): string {
  const firstName = displayName?.trim().replace(/[\u0000-\u001f\u007f]/g, "").split(/\s+/)[0]?.slice(0, 40);
  return `Hi${firstName ? ` ${firstName}` : ""}, I’m DeDe. I’m an AI. You can send me a voice note or write to me. What would you like to talk about?`;
}
