// pcm-worklet-processor.js
class PCMWorkletProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;

    // Convert Float32 -> Int16 (PCM16 little-endian)
    const len = input.length;
    const buffer = new ArrayBuffer(len * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < len; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s * 0x7fff, true); // little-endian
    }

    // Send raw ArrayBuffer of PCM16 to main thread
    this.port.postMessage(buffer, [buffer]);

    return true;
  }
}

registerProcessor('pcm-worklet', PCMWorkletProcessor);
