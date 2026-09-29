import { useRef, useCallback, useEffect, useState } from 'react';

export function useVHSSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const hissGainRef = useRef<GainNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [started, setStarted] = useState(false);

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) {
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      return ctxRef.current;
    }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = enabled ? 0.9 : 0;
    master.connect(ctx.destination);
    masterRef.current = master;

    // HISS - white noise loop
    const bufSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const hiss = ctx.createBufferSource();
    hiss.buffer = buffer;
    hiss.loop = true;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 4500;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.028;
    hiss.connect(hissFilter).connect(hissGain).connect(master);
    hiss.start();
    hissGainRef.current = hissGain;

    // RAIN - filtered noise low
    const rain = ctx.createBufferSource();
    rain.buffer = buffer;
    rain.loop = true;
    rain.playbackRate.value = 0.7;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 2800;
    rainFilter.Q.value = 0.4;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.05;
    rain.connect(rainFilter).connect(rainGain).connect(master);
    rain.start();

    // DRONE - detuned low oscillators
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.0;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    droneGain.connect(droneFilter).connect(master);
    [48, 50.5, 96.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.12 : 0.5;
      o.connect(g).connect(droneGain);
      o.start();
    });
    // LFO on drone
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(droneGain.gain);
    lfo.start();
    droneGainRef.current = droneGain;

    // slow fade drone in
    droneGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 4);

    setStarted(true);
    return ctx;
  }, [enabled]);

  const setDroneIntensity = useCallback((v: number) => {
    const ctx = ctxRef.current;
    const g = droneGainRef.current;
    if (!ctx || !g) return;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setTargetAtTime(v, ctx.currentTime, 1.2);
  }, []);

  const setHiss = useCallback((v: number) => {
    const ctx = ctxRef.current;
    const g = hissGainRef.current;
    if (!ctx || !g) return;
    g.gain.setTargetAtTime(v, ctx.currentTime, 0.15);
  }, []);

  const playBeep = useCallback((freq = 880, dur = 0.08) => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0.06;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(masterRef.current);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }, [ensureCtx]);

  const playThunder = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const dur = 1.4;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(masterRef.current);
    o.start();
    o.stop(ctx.currentTime + dur);
  }, [ensureCtx]);

  const playSting = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const t = ctx.currentTime;
    // dissonant cluster
    [110, 116.5, 233, 466, 1244, 2489].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f * (0.98 + Math.random() * 0.04);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(6000, t);
      flt.frequency.exponentialRampToValueAtTime(300, t + 1.4);
      o.connect(flt).connect(g).connect(masterRef.current!);
      o.start(t);
      o.stop(t + 1.7);
    });
    // sub drop
    const sub = ctx.createOscillator();
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(24, t + 1.2);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.5, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    sub.connect(sg).connect(masterRef.current);
    sub.start(t);
    sub.stop(t + 1.4);
    // noise crash
    const nb = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 2);
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    const ng = ctx.createGain();
    ng.gain.value = 0.5;
    ns.connect(ng).connect(masterRef.current);
    ns.start(t);
  }, [ensureCtx]);

  const playClick = useCallback(() => {
    playBeep(1400, 0.05);
  }, [playBeep]);

  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(enabled ? 0.9 : 0, ctxRef.current.currentTime, 0.1);
    }
  }, [enabled]);

  return {
    enabled, setEnabled, started, ensureCtx,
    playBeep, playSting, playThunder, playClick,
    setDroneIntensity, setHiss
  };
}
