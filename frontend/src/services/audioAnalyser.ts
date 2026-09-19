export type MouthShape = 'closed' | 'small' | 'wide' | 'round' | 'open';

export class AudioLipSyncAnalyser {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private smoothedLevel = 0;

  initAudioElement(audioElement: HTMLAudioElement) {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (!this.analyser) {
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.6;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }

      if (!this.sourceNode) {
        this.sourceNode = this.audioCtx.createMediaElementSource(audioElement);
        this.sourceNode.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn('LipSync audio element attachment warning:', e);
    }
  }

  getAudioMetrics(): { mouthShape: MouthShape; opening: number; volume: number } {
    if (!this.analyser || !this.dataArray) {
      return { mouthShape: 'closed', opening: 0, volume: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray as any);

    let sum = 0;
    const len = this.dataArray.length;
    for (let i = 0; i < len; i++) {
      sum += this.dataArray[i];
    }
    const rawVolume = sum / len / 255.0; // 0 to 1

    // Low, mid, high frequencies for vowel formant estimation
    const low = (this.dataArray[1] + this.dataArray[2] + this.dataArray[3]) / 3 / 255.0;
    const mid = (this.dataArray[6] + this.dataArray[7] + this.dataArray[8]) / 3 / 255.0;
    const high = (this.dataArray[14] + this.dataArray[15] + this.dataArray[16]) / 3 / 255.0;

    // Smooth volume to prevent visual jitter
    this.smoothedLevel = this.smoothedLevel * 0.7 + rawVolume * 0.3;

    if (this.smoothedLevel < 0.05) {
      return { mouthShape: 'closed', opening: 0, volume: 0 };
    }

    let shape: MouthShape = 'small';
    if (this.smoothedLevel > 0.35 && low > 0.4) {
      shape = 'open'; // "ah", "aa"
    } else if (mid > high && mid > 0.3) {
      shape = 'wide'; // "ee", "ih"
    } else if (low > mid && this.smoothedLevel > 0.25) {
      shape = 'round'; // "oh", "ou"
    } else {
      shape = 'small';
    }

    return {
      mouthShape: shape,
      opening: Math.min(1.0, this.smoothedLevel * 2.2),
      volume: this.smoothedLevel,
    };
  }

  destroy() {
    try {
      this.sourceNode?.disconnect();
      this.analyser?.disconnect();
      this.audioCtx?.close();
    } catch {
      // ignore cleanup errors
    }
  }
}
