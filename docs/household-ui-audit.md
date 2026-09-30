# Household conversation design audit

The PWA now opens into a conversation with DeDe rather than a microphone landing page. This follows core doc 06, which defines WhatsApp as the north star for everyday social permission, voice notes and asynchronous rhythm, and doc 16, which specifies quiet paper-and-ink chrome. The change implements the interaction surface, not persistent memory, backup or qualified speech inference.

## Changes

- A contact header and open thread replace the hero microphone and dashboard navigation. The brand mark is a temporary contact placeholder, not a generated Bond portrait.
- The microphone sits at the bottom beside the message field and attachment control. Recording uses tap, stop, review, discard and explicit send; nothing sends automatically.
- Returned speech plays as a voice note inside the thread, with the transcript optional. A user's submitted recording remains playable in this tab. The thread no longer hides inside a history disclosure.
- What I know, safety and settings sit in the overflow menu. Appearance and Google sign-in stay in settings, not in the conversation.
- Paper, ink and flat amber controls replace the gradient microphone. The existing dark brand mark is used at night.
- No sample messages, invented online status, read ticks or delivered beacons appear. Test-only consent and the lack of backup remain visible, outside the message stream.

## Verification

On 2026-09-30, Docker ran ESLint, TypeScript and the Next production build. The HTTP/security smoke checks passed. Docker Chromium checked widths 320, 375, 390, 768 and 1280 in light and dark, with zero automated WCAG 2 A/AA and 2.1 AA violations. The report also checks no horizontal overflow, a visible bottom composer, and a microphone touch target at least 44 pixels wide and high.

Interaction checks cover consent before recording, text and attachment controls, draft preservation through navigation, menu dismissal with Escape, actual browser microphone permission denial and recovery, and the disabled Google button when the isolated audit server has no configuration. Screenshots were visually inspected; the dark mark contrast issue was corrected. Evidence is stored in [the browser report](evidence/household-ui/browser-audit.json), alongside light/dark screenshots. No model requests, mocked replies or fake microphone device were used.

## Remaining qualification

The current connected candidate is text-only. Recording preview is implemented; sending voice still needs the real small-model speech stack. The audit does not establish physical microphone/speaker behavior, Safari installation, mobile keyboard behavior, background delivery, Google consent, encrypted memory or beacon delivery.

Press-and-hold and lock-to-record remain a physical-device interaction task, rather than being claimed from tap recording. The founder must test whether this feels natural with one hand at home; passing automated accessibility checks alone cannot answer that. Full voice integration and household-use qualification remain in UI-014, UI-019 and UI-021 in the task ledger.
