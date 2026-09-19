export const speechService = {
  speak(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        onEnd?.();
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      // Try to find a warm female English voice
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Female') ||
            v.name.includes('Samantha') ||
            v.name.includes('Victoria') ||
            v.name.includes('Zira') ||
            v.name.includes('Jenny') ||
            v.name.includes('Natural'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        onEnd?.();
        resolve();
      };

      utterance.onerror = () => {
        onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  },

  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  createSpeechRecognition(
    onResult: (transcript: string) => void,
    onError?: (error: any) => void
  ): any {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + ' ';
      }
      onResult(fullTranscript.trim());
    };

    recognition.onerror = (err: any) => {
      onError?.(err);
    };

    return recognition;
  },
};
