import { Injectable, signal } from '@angular/core';

/**
 * Web Speech API wrapper. TTS (speechSynthesis) works in all target browsers incl. iOS Safari.
 * STT (SpeechRecognition) exists in Chrome/Edge/Android and Safari 14.1+, but NOT in Firefox — callers must
 * check `canListen` and offer typing instead. This produces a transcript only; it is not a pronunciation score.
 */
@Injectable({ providedIn: 'root' })
export class Speech {
  readonly canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  private Recognition: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  readonly canListen = !!this.Recognition;
  readonly speaking = signal(false);
  readonly listening = signal(false);
  rate = 0.9;
  private rec: any = null;

  private voice(): SpeechSynthesisVoice | undefined {
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.lang === 'en-IN') ?? voices.find(v => v.lang === 'en-GB') ?? voices.find(v => v.lang.startsWith('en'));
  }

  /** Must be called from a user gesture on iOS. */
  say(text: string, rate = this.rate): Promise<void> {
    if (!this.canSpeak || !text) return Promise.resolve();
    speechSynthesis.cancel();
    return new Promise(resolve => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-IN'; u.rate = rate;
      const v = this.voice(); if (v) { u.voice = v; u.lang = v.lang; }
      u.onend = u.onerror = () => { this.speaking.set(false); resolve(); };
      this.speaking.set(true);
      speechSynthesis.speak(u);
    });
  }

  stop() { if (this.canSpeak) speechSynthesis.cancel(); this.speaking.set(false); this.rec?.abort?.(); this.listening.set(false); }

  /** Listen once; resolves with the transcript (or '' if nothing heard). Rejects with a friendly message. */
  listen(): Promise<string> {
    if (!this.canListen) return Promise.reject(new Error('Voice input is not supported in this browser. Please type your answer.'));
    this.stop();
    return new Promise((resolve, reject) => {
      const rec = new this.Recognition();
      this.rec = rec;
      rec.lang = 'en-IN'; rec.interimResults = false; rec.maxAlternatives = 1; rec.continuous = false;
      let text = '';
      rec.onresult = (e: any) => { text = Array.from(e.results).map((r: any) => r[0].transcript).join(' '); };
      rec.onerror = (e: any) => {
        this.listening.set(false);
        reject(new Error(e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Microphone permission was denied. Allow microphone access in your browser settings, or type your answer.'
          : e.error === 'no-speech' ? 'I did not hear anything. Tap the mic and speak clearly.' : 'Voice input stopped. Please try again or type your answer.'));
      };
      rec.onend = () => { this.listening.set(false); resolve(text.trim()); };
      this.listening.set(true);
      rec.start();
    });
  }
}
