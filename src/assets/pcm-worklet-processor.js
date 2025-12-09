// pcm-worklet-processor.js
class PCMWorkletProcessor extends AudioWorkletProcessor {
process(inputs, outputs) {
  const input = inputs[0][0];
  if (!input) return true;

  const len = input.length;
  const buffer = new ArrayBuffer(len * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < len; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s * 0x7fff, true);
  }

  this.port.postMessage(buffer, [buffer]);
  return true;
}
}

registerProcessor('pcm-worklet', PCMWorkletProcessor);
