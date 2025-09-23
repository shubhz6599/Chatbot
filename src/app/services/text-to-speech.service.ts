import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextToSpeechService {

  speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: () => void,
    onProgress?: (spoken: string, pending: string) => void
  ) {
    if (!text) return;

    // Convert any HTML to visible plain text
    const plain = this.extractVisibleText(text);

    // If nothing meaningful left after stripping HTML, skip speaking
    if (!plain || !plain.trim()) {
      console.log('TTS: nothing to speak after stripping HTML');
      return;
    }

    if ('speechSynthesis' in window) {
      this.stop(); // cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(plain);
      utterance.lang = 'en-UK';
      utterance.pitch = 1;
      utterance.rate = 1;
      utterance.volume = 1;

      utterance.onstart = () => onStart?.();
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onError?.();

      // Track progress
      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        // event.charIndex gives the current character index
        if (typeof event.charIndex === 'number') {
          const spoken = plain.substring(0, event.charIndex);
          const pending = plain.substring(event.charIndex);
          onProgress?.(spoken, pending);
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Text-to-speech not supported in this browser.');
    }
  }

  stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Convert HTML or mixed text to visible plain text:
   * - If string contains HTML, parse with DOMParser and use textContent.
   * - Decode HTML entities.
   * - Remove scripts/styles.
   * - Collapse whitespace/newlines to single spaces.
   */
  private extractVisibleText(input: string): string {
    if (!input) return '';

    // Quick heuristic: if it contains angle-bracket tags, treat as HTML
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(input);

    if (looksLikeHtml && typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/html');

        // remove script/style nodes to avoid accidental text traces
        doc.querySelectorAll('script, style, noscript').forEach(n => n.remove());

        // Get visible text (textContent will include button labels, link text, etc.)
        let visible = doc.body ? doc.body.textContent || '' : '';

        // Decode HTML entities (use textarea trick)
        visible = this.decodeHtmlEntities(visible);

        // Normalize whitespace: collapse multiple spaces/newlines to single space
        visible = visible.replace(/\s+/g, ' ').trim();

        return visible;
      } catch (err) {
        // fallback to regex-based stripping
        console.warn('DOMParser failed, falling back to regex strip', err);
      }
    }

    // Fallback when not HTML or DOMParser failed: strip tags and normalize
    let text = input.replace(/<\/?[^>]+(>|$)/g, ''); // crude tag removal
    text = this.decodeHtmlEntities(text);
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  private decodeHtmlEntities(str: string): string {
    if (!str) return '';
    // Use browser textarea to decode entities safely
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  }
}
