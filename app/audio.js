// Original synthesis; no recordings or third-party game assets.
export class RelayAudio {
  context = null;
  enabled = true;
  async unlock() {
    if (!this.enabled) return;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    this.context ||= new Audio();
    if(this.context.state==='suspended') await this.context.resume();
  }
  click(mask) {
    const ctx=this.context;
    if (!this.enabled || !ctx || ctx.state!=='running' || !mask) return;
    const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.024),ctx.sampleRate);
    const data=buffer.getChannelData(0); let seed=0x713ac5;
    for(let i=0;i<data.length;i++) {
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      const t=i/ctx.sampleRate;
      data[i]=((seed>>>0)/2147483648-1)*Math.exp(-t*210);
    }
    const src=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    src.buffer=buffer; filter.type='bandpass'; filter.frequency.value=(mask&4)?1100:(mask&2)?1800:2400;
    filter.Q.value=.6; gain.gain.value=.23;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(); src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  }
  close() { this.context?.close(); this.context=null; }
  button(closed) {
    const ctx=this.context;if(!this.enabled||!ctx||ctx.state!=='running')return;
    // Original short synthesis for the plunger contact; no historical recording.
    const source=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
    source.type='triangle';source.frequency.setValueAtTime(closed?1300:950,t);
    source.frequency.exponentialRampToValueAtTime(closed?450:350,t+.012);
    gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.018);
    source.connect(gain).connect(ctx.destination);source.start(t);source.stop(t+.02);
    source.onended=()=>{source.disconnect();gain.disconnect();};
  }
}
