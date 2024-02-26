import { AsyncBlockingQueue } from '../helper/CharacterUtil';

/**
 * AudioPlayer class for playing audio chunks.
 */
export class AudioPlayer {
  private sampleRate: number;
  private asyncQueue: AsyncBlockingQueue<string | null>;
  private audio: HTMLAudioElement;
  private isPlaying: boolean = false;
  private onPlay: (() => void) | null;
  private onStop: (() => void) | null;

  /**
   * Creates an instance of AudioPlayer.
   * @param {number} sampleRate - The sample rate of the audio.
   */
  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.asyncQueue = new AsyncBlockingQueue();
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.onended = async () => {
      const url = await this.asyncQueue.dequeue();
      if (url != null) {
        this.playAudio(url);
      } else {
        this.isPlaying = false;
        this.onStop?.();
        this.asyncQueue = new AsyncBlockingQueue(); // Reinitialize the queue
      }
    };

    this.onPlay = null;
    this.onStop = null;
  }

  /**
   * Plays the audio from the given URL.
   * @param {string} url - The URL of the audio to play.
   * @private
   */
  private playAudio(url: string) {
    this.audio.src = url;
    this.audio.load();
    this.audio.play();
    this.onPlay?.();
    this.isPlaying = true;
  }

  /**
   * Adds a chunk of audio data to the queue.
   * @param {Uint8Array | null} data - The audio data to add to the queue.
   * @param {number | null} sampleRate - The sample rate of the audio data.
   */
  public addChunk(data: Uint8Array | null, sampleRate: number | null = null) {
    if (data == null) {
      this.asyncQueue.enqueue(null);
      return;
    }

    // Convert the Uint8Array to a Blob and create a URL
    const blob = new Blob([data], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    if (!this.isPlaying) {
      this.playAudio(url);
    } else {
      this.asyncQueue.enqueue(url);
    }
  }

  /**
   * Gets the current volume of the audio player.
   * @returns {number} The current volume of the audio player.
   */
  public getVolume(): number {
    return this.audio.volume;
  }

  /**
   * Sets the volume of the audio player.
   * @param {number} volume - The volume to set. Must be between 0 and 1.
   * @throws {Error} If the volume value is invalid.
   */
  public setAudioVolume(volume: number) {
    if (volume < 0 || volume > 1) {
      throw new Error('Invalid volume value. Volume must be between 0 and 1.');
    }
    this.audio.volume = volume;
  }

  /**
   * Sets a callback function to be called when audio playback starts.
   * @param {() => void} fn - The callback function to set.
   */
  public onPlayStart(fn: () => void) {
    this.onPlay = fn;
  }

  /**
   * Sets a callback function to be called when audio playback stops.
   * @param {() => void} fn - The callback function to set.
   */
  public onPlayStop(fn: () => void) {
    this.onStop = fn;
  }
}
