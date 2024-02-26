export var audio_reocrder_processor = `class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.chunkSize = 4096;
    this.sampleAccumulator = new Float32Array(this.chunkSize);
    this.accumulatedSamples = 0;
    this.port.onmessage = (event) => {
      if (!event.data.command) {
        return;
      }
      if (event.data.command === 'start') {
        this.recording = true;
      } else if (event.data.command === 'stop') {
        this.recording = false;
      }
    };
  }

  process(inputs, outputs) {
    if (!this.recording) {
      return true;
    }
    const input = inputs[0];
    const output = outputs[0];
    // output[0].set(input[0]);
    for (let i = 0; i < input[0].length; i++) {
      this.sampleAccumulator[this.accumulatedSamples++] = input[0][i];
      if (this.accumulatedSamples >= this.chunkSize) {
        this.port.postMessage(this.sampleAccumulator.buffer);
        this.sampleAccumulator = new Float32Array(this.chunkSize);
        this.accumulatedSamples = 0;
      }
    }
    return true;
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);`;