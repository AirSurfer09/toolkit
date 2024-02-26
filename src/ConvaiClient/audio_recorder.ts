import { audio_reocrder_processor } from "./audio_recorder_processor";

/**
 * Represents an audio recorder that can capture audio from the user's microphone and provide it as an ArrayBuffer.
 */
export class AudioRecorder {
    private audioContext: AudioContext;
    private userMedia: Promise<MediaStream>;
    private mediaStream: MediaStream | null;
    private workletNode: AudioWorkletNode | null;
    private audioCallback: (buffer: ArrayBuffer) => void;
    /**
     * Creates an instance of AudioRecorder.
     */
    private audioWorkletModule: Promise<void>;
    constructor() {
        this.audioContext = new AudioContext();
        let blob = new Blob([audio_reocrder_processor], { type: 'application/javascript' });
        this.audioWorkletModule = this.audioContext?.audioWorklet.addModule(URL.createObjectURL(blob));
        this.mediaStream = null;
        this.workletNode = null;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            console.log("getUserMedia supported.");
            this.userMedia = navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
            console.log("getUserMedia not supported on your browser!");
        }
    }

    private convertoFloat32ToInt16(buffer: Float32Array) {
        var l = buffer.length;
        var buf = new Int16Array(l);
        while (l--) {
            buf[l] = buffer[l] * 0xFFFF; //convert to 16 bit
        }
        return buf.buffer;
    }

    /**
     * Starts recording audio from the user's microphone.
     * @param audioCallback A function that will be called with the recorded audio as an ArrayBuffer.
     */
    public start(audioCallback: (buffer: ArrayBuffer) => void) {
        this.audioCallback = audioCallback;
        this.userMedia.then((stream) => {
            this.mediaStream = stream;
            this.audioWorkletModule.then(() => {
                const source = this.audioContext.createMediaStreamSource(this.mediaStream as MediaStream);
                this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');
                this.workletNode.port.onmessage = (event: MessageEvent) => {
                    // console.log("worklet node message");
                    if (event.data.command) {
                        return;
                    }
                    const buffer = new Float32Array(event.data);
                    const pcm_buffer = this.convertoFloat32ToInt16(buffer);
                    this.audioCallback(pcm_buffer);
                };
                source.connect(this.workletNode as AudioWorkletNode);
                //this.workletNode?.connect(this.audioContext.destination);
                this.audioContext.resume();
                this.workletNode.port.postMessage({ command: 'start' });
            });
        });
    }

    /**
     * Stops recording audio.
     */
    public stop() {
        if (this.workletNode) {
            this.workletNode.port.postMessage({ command: 'stop' });
            this.workletNode.disconnect();
            this.workletNode = null;
        }
    }
}