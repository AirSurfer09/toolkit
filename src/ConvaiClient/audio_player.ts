import { AsyncBlockingQueue } from '../helper/CharacterUtil';
export class AudioPlayer {
  private audioContext: AudioContext;
  private sourceNode: AudioBufferSourceNode | null;
  private audioQueue: Uint8Array[] = [];
  private gainNode: GainNode | null;

  private isMuted: Boolean = false;
  private isPlaying: boolean = false;

  private channels = 1;
  private sampleRate: number;

  private onPlay: (() => void) | null;
  private onStop: (() => void) | null;
//   private counter: number;



  constructor(sampleRate: number) {

    this.sampleRate = sampleRate;

    try {
        this.audioContext =  new (   window.AudioContext || 
        (window as any).webkitAudioContext ||
        (window as any).mozAudioContext    ||
        (window as any).oAudioContext      ||
        (window as any).msAudioContext
        )();
    }
    catch(e) {
        console.error('Web Audio API is not supported in this browser');
        alert('Web Audio API is not supported in this browser');
    }

    this.gainNode = this.audioContext.createGain();
    // this.gainNode.connect(this.audioContext.destination); // connect gain node to speakers

    this.sourceNode = null;
    this.onPlay = null;
    this.onStop = null;
    // this.counter = 1;
  }

  public addChunk(data: Uint8Array, sampleRate: number | null = null) {
    if (data !== null && data !== undefined) {
        this.sampleRate = sampleRate;
        // const filename = `output_${this.counter}.wav`;
        // this.saveAudioToFile(data, filename);
        const a = data.slice(44); //removing the header
        this.audioQueue.push(a);
        // this.counter += 1;
    }
    else {
        // for pushing the null value signifying the end of the response.
        this.audioQueue.push(data);
    }

    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }

  private playNextChunk() {
    if (this.audioQueue.length === 0) {
        return;
    }

    const chunk = this.audioQueue.shift();
    if (chunk === null)
        // signifying the end of the response.
        this.stopAudio();

    if (chunk) {

        const audioBuffer = this.audioContext.createBuffer(
            this.channels,
            chunk.length / (this.channels * 2), // Assuming 16-bit audio, adjust if needed
            this.sampleRate
        );

        // Convert raw audio data to audio buffer
        for (let channel = 0; channel < this.channels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);

            // Iterate over each sample in the chunk
            for (let i = 0; i < channelData.length; i++) {
                // Extract two bytes from the chunk
                const byte1 = chunk[i * 2];
                const byte2 = chunk[i * 2 + 1];

                // Combine two bytes into a 16-bit signed integer
                // Note: This assumes little-endian format
                const sample = (byte2 << 8) | byte1;

                // Normalize the sample to a value between -1 and 1
                const normalizedSample = sample >= 32768 ? (sample - 65536) / 32768.0 : sample / 32767.0;

                // Assign the normalized sample to the channel data
                channelData[i] = normalizedSample;
            }
        }


        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = audioBuffer;
        this.sourceNode.connect(this.gainNode).connect(this.audioContext.destination);

        this.sourceNode.onended = () => {
            this.sourceNode.disconnect();
            this.sourceNode = null;
            // Call playNextChunk recursively to play the next chunk
            this.playNextChunk();
        };

        this.sourceNode.start();
        this.isPlaying = true;
        this.onPlay && this.onPlay();
    } else {
        // If there's no chunk, wait for a short period and then check again
        setTimeout(() => {
            this.playNextChunk();
        }, 1); // time is in millisec
    }
    }

  public getVolume(): number {
    if (this.isMuted)
        return 0;
    else
        return 1;
  }

  public setAudioVolume(volume: number) {
    if (volume < 0 || volume > 1) {
      throw new Error('Invalid volume value. Volume must be between 0 and 1.');
    }
    this.gainNode.gain.value = volume;
    if (volume === 0)
        this.isMuted = true;
    else
        this.isMuted = false;
  }

  public stopAudio() {
    if (this.isPlaying && this.audioContext) {
            this.isPlaying = false;
            this.onStop && this.onStop();
            this.audioQueue = [];
        }
    }

  public onPlayStart(fn: () => void) {
    this.onPlay = fn;
  }

  public onPlayStop(fn: () => void) {
    this.onStop = fn;
  }


}
