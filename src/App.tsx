import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Square, Rewind, FastForward, Eject, Power,
  Volume2, VolumeX, Minus, Plus, Radio, TriangleAlert,
  Clapperboard, Ticket, Skull, Eye, Film, ChevronRight,
  Maximize, RotateCcw, BadgeCheck, Clock3, MapPin
} from 'lucide-react';
import { SCENES, TOTAL_DURATION, formatTimecode, CAST } from './data/scenes';
import { StaticNoise, TrackingGlitch, OSD, RainOverlay } from './components/VHSOverlays';
import { useVHSSound } from './hooks/useVHSSound';

type Mode = 'PLAY' | 'PAUSE' | 'STOP' | 'REW' | 'FF';

function cumDurations() {
  const arr: number[] = [];
  let acc = 0;
  SCENES.forEach(s => { arr.push(acc); acc += s.duration; });
  return arr;
}
const CUM = cumDurations();

function sceneAt(progress: number) {
  for (let i = SCENES.length - 1; i >= 0; i--) {
    if (progress >= CUM[i]) return i;
  }
  return 0;
}

export default function App() {
  const [power, setPower] = useState(true);
  const [hasTape, setHasTape] = useState(false);
  const [mode, setMode] = useState<Mode>('STOP');
  const [progress, setProgress] = useState(0);
  const [tracking, setTracking] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const [cutFlash, setCutFlash] = useState(false);
  const [thunderFlash, setThunderFlash] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const screenRef = useRef<HTMLDivElement>(null);

  const sound = useVHSSound();
  const idx = useMemo(() => sceneAt(progress), [progress]);
  const scene = SCENES[idx];

  // ---------- playback engine ----------
  useEffect(() => {
    if (!power || !hasTape) return;
    if (mode !== 'PLAY' && mode !== 'REW' && mode !== 'FF') return;
    const speed = mode === 'PLAY' ? 1 : mode === 'FF' ? 8 : -6;
    const iv = setInterval(() => {
      setProgress(p => {
        const np = p + 50 * speed;
        if (np >= TOTAL_DURATION) {
          setMode('STOP');
          return TOTAL_DURATION - 1;
        }
        if (np < 0) {
          setMode('PLAY');
          return 0;
        }
        return np;
      });
    }, 50);
    return () => clearInterval(iv);
  }, [mode, power, hasTape]);

  // ---------- scene change side effects ----------
  const prevIdx = useRef(0);
  useEffect(() => {
    if (idx !== prevIdx.current) {
      prevIdx.current = idx;
      setCutFlash(true);
      const t = setTimeout(() => setCutFlash(false), 110);
      const s = SCENES[idx];
      if (mode === 'PLAY') {
        if (s.id === 'zumbi') {
          sound.playSting();
          sound.setDroneIntensity(0.22);
          sound.setHiss(0.09);
        } else if (s.id === 'interferencia') {
          sound.setHiss(0.22);
          sound.playBeep(220, 0.25);
        } else if (s.id === 'titulo') {
          sound.setDroneIntensity(0.1);
          sound.setHiss(0.03);
          sound.playThunder();
        } else {
          sound.setDroneIntensity(0.06);
          sound.setHiss(0.028);
        }
      }
      return () => clearTimeout(t);
    }
  }, [idx, mode]);

  // ---------- random tracking bursts ----------
  useEffect(() => {
    if (mode !== 'PLAY') { setGlitch(false); return; }
    let alive = true;
    let timeout: any;
    const loop = () => {
      const imperfection = Math.abs(tracking);
      const wait = 3500 + Math.random() * 7000 - imperfection * 500;
      timeout = setTimeout(() => {
        if (!alive) return;
        setGlitch(true);
        sound.playBeep(1200 + Math.random() * 800, 0.04);
        setTimeout(() => alive && setGlitch(false), 350 + Math.random() * 700 + imperfection * 220);
        loop();
      }, Math.max(900, wait));
    };
    loop();
    return () => { alive = false; clearTimeout(timeout); };
  }, [mode, tracking]);

  // ---------- random thunder ----------
  useEffect(() => {
    if (mode !== 'PLAY') return;
    const iv = setInterval(() => {
      if (Math.random() < 0.35) {
        sound.playThunder();
        setThunderFlash(true);
        setTimeout(() => setThunderFlash(false), 180);
      }
    }, 9000);
    return () => clearInterval(iv);
  }, [mode]);

  // ---------- actions ----------
  const insertTape = () => {
    sound.ensureCtx();
    sound.playClick();
    setHasTape(true);
    setProgress(0);
    setMode('PLAY');
    setShowHint(false);
    sound.setDroneIntensity(0.06);
  };
  const doPlay = () => {
    sound.ensureCtx(); sound.playClick();
    if (!hasTape) { insertTape(); return; }
    if (progress >= TOTAL_DURATION - 100) setProgress(0);
    setMode('PLAY');
  };
  const doPause = () => { sound.playClick(); setMode(m => m === 'PAUSE' ? 'PLAY' : 'PAUSE'); };
  const doStop = () => { sound.playClick(); setMode('STOP'); };
  const doRew = () => { sound.ensureCtx(); sound.playClick(); setMode('REW'); };
  const doFF = () => { sound.ensureCtx(); sound.playClick(); setMode('FF'); };
  const doEject = () => { sound.playBeep(300, 0.2); setMode('STOP'); setHasTape(false); setProgress(0); };
  const doPower = () => { sound.playClick(); setPower(p => !p); };
  const seekTo = (i: number) => {
    sound.ensureCtx(); sound.playClick();
    if (!hasTape) setHasTape(true);
    setProgress(CUM[i] + 1);
    setMode('PLAY');
  };
  const toggleFull = () => {
    if (!screenRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else screenRef.current.requestFullscreen?.();
  };

  // keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); mode === 'PLAY' ? doPause() : doPlay(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // clock strings
  const elapsedStr = formatTimecode(progress);
  const baseMinutes = 3 * 60 + 33 + Math.floor(progress / 60000);
  const hh = String(Math.floor(baseMinutes / 60) % 12 || 12).padStart(2, '0');
  const mm = String(baseMinutes % 60).padStart(2, '0');
  const ss = String(Math.floor((progress / 1000) % 60)).padStart(2, '0');
  const dateStr = `OCT. 27 1994  ${hh}:${mm}:${ss} AM`;

  const progressPct = (progress / TOTAL_DURATION) * 100;

  return (
    <div className="min-h-screen bg-[#050505] relative">
      {/* ambient bg */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,0,0,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,40,120,0.18),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 90px), repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 90px)' }} />
      </div>

      {/* ===== TOP MARQUEE ===== */}
      <header className="relative z-10 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="overflow-hidden border-b border-red-900/40 bg-[#0d0000] py-1.5">
          <div className="marquee-track flex whitespace-nowrap font-vcr text-sm md:text-base text-red-400/90 w-max">
            {[0, 1].map(k => (
              <span key={k} className="pr-8">
                ★ LOCADORA ESTRELA APRESENTA ★ TEASER EXCLUSIVO ★ RONDA DA MORTE: SURTO VEPER (1994) ★ PROIBIDO P/ MENORES ★ REBOBINE ANTES DE DEVOLVER ★ FITA Nº 07 — NÃO ALUGAR APÓS MEIA-NOITE ★&nbsp;
              </span>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded bg-red-700 flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.7)]">
              <Skull className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-vcr text-[11px] text-cyan-300 tracking-[0.3em]">VEPER PICTURES • 1994 • HI-FI STEREO</div>
              <h1 className="font-horror text-3xl md:text-4xl text-white leading-none">RONDA DA <span className="text-red-600 neon-red">MORTE</span></h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 font-vcr text-sm">
            <span className="px-3 py-1 border border-white/20 rounded text-white/70">CATÁLOGO Nº 071994</span>
            <span className="px-3 py-1 bg-red-700 rounded text-white flex items-center gap-1"><TriangleAlert className="w-4 h-4" /> 18+</span>
            <span className="px-3 py-1 border border-cyan-500/50 rounded text-cyan-300 flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> TEASER OFICIAL</span>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 md:px-4 py-5 grid lg:grid-cols-[1fr_320px] gap-5">

        {/* ===== TV ===== */}
        <section className="tv-plastic rounded-2xl p-2 md:p-3 border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.9)]">
          {/* brand bar */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="font-vcr text-white/60 tracking-[0.35em] text-sm">TRINITRON VH-90 • COLOR • STEREO</div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${power ? 'bg-green-400 shadow-[0_0_10px_lime]' : 'bg-red-700'}`} />
              <span className="font-vcr text-xs text-white/50">{power ? 'POWER ON' : 'STANDBY'}</span>
            </div>
          </div>

          {/* SCREEN */}
          <div ref={screenRef} className={`crt-screen rounded-lg aspect-[4/3] md:aspect-[16/10] border-4 border-black ${scene?.redAlert && mode === 'PLAY' ? 'anim-shake' : ''}`}>
            {!power ? (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <div className="w-24 h-1 bg-white/5 blur-sm rounded-full" />
              </div>
            ) : !hasTape ? (
              /* NO SIGNAL */
              <div className="absolute inset-0 bg-[#0000aa] flex flex-col items-center justify-center text-center p-6">
                <StaticNoise />
                <div className="scanlines" />
                <Radio className="w-10 h-10 text-white/70 mb-3" />
                <div className="font-vcr text-4xl md:text-6xl text-white osd-shadow">SEM SINAL</div>
                <div className="font-vcr text-lg text-white/70 mt-1">INSIRA A FITA Nº 07 PARA REPRODUZIR O TEASER</div>
                <button onClick={insertTape} className="mt-6 group font-vcr text-2xl bg-white text-[#0000aa] px-8 py-2 rounded-sm hover:bg-red-600 hover:text-white transition flex items-center gap-2 shadow-xl">
                  <Film className="w-6 h-6" /> INSERIR FITA ▶
                </button>
                <div className="font-vcr text-white/50 mt-4 text-base">VIATURA 07 • 27.OUT.1994 • 03:33 AM</div>
                <OSD mode="STOP" timeElapsed="--:--:--" dateStr="-- -- ----" tracking={tracking} />
              </div>
            ) : (
              <>
                {/* SCENE CONTENT */}
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={scene.id + (mode === 'PAUSE' ? '-p' : '')}
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0"
                  >
                    <SceneView scene={scene} paused={mode === 'PAUSE'} />
                  </motion.div>
                </AnimatePresence>

                {/* overlays */}
                {scene.type === 'footage' || scene.type === 'jumpscare' ? <RainOverlay /> : null}
                <div className="scanlines" />
                <div className="scanlines-light" />
                <StaticNoise heavy={scene.type === 'static' || mode === 'REW' || mode === 'FF'} />
                <TrackingGlitch active={glitch || mode === 'REW' || mode === 'FF' || scene.type === 'static'} intensity={mode === 'REW' || mode === 'FF' ? 1.4 : 1} />
                <div className="crt-flicker absolute inset-0 z-[33] pointer-events-none bg-white/[0.015]" />

                {/* flashes */}
                {cutFlash && <div className="absolute inset-0 z-[50] bg-white/80 pointer-events-none" />}
                {thunderFlash && <div className="absolute inset-0 z-[49] bg-[#cfe6ff]/25 pointer-events-none" />}
                {scene.redAlert && mode === 'PLAY' && (
                  <div className="absolute inset-0 z-[32] pointer-events-none" style={{ boxShadow: 'inset 0 0 120px rgba(255,0,0,0.85), inset 0 0 40px rgba(255,0,0,0.6)' }} />
                )}

                {/* OSD */}
                <OSD mode={mode} timeElapsed={elapsedStr} dateStr={dateStr} tracking={tracking} />

                {/* paused big */}
                {mode === 'PAUSE' && (
                  <div className="absolute inset-0 z-[46] flex items-center justify-center pointer-events-none">
                    <div className="font-vcr text-6xl md:text-7xl text-white/90 osd-shadow bg-black/40 px-8 py-1 border-y border-white/20">❚❚ PAUSE</div>
                  </div>
                )}
                {(mode === 'REW' || mode === 'FF') && (
                  <div className="absolute top-16 left-0 right-0 z-[46] flex justify-center pointer-events-none">
                    <div className="font-vcr text-3xl text-white osd-shadow bg-black/50 px-6 rounded">{mode === 'REW' ? '◀◀ REBOBINANDO...' : 'AVANÇANDO ▶▶'}</div>
                  </div>
                )}

                {/* scene caption timecode tag */}
                <div className="absolute bottom-10 left-4 z-[45] font-vcr text-sm md:text-base text-yellow-300/90 osd-shadow bg-black/60 px-2">
                  {scene.timecode}
                </div>

                {/* progress */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-[47]">
                  <div className="h-full bg-cyan-400 shadow-[0_0_12px_cyan] transition-none" style={{ width: `${progressPct}%` }} />
                </div>
              </>
            )}
          </div>

          {/* VCR CONTROLS */}
          <div className="vcr-plastic mt-2 rounded-xl border border-white/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ControlBtn onClick={doPower} active={!power} label="POWER" title="Ligar/Desligar"><Power className="w-5 h-5" /></ControlBtn>
                <ControlBtn onClick={doRew} active={mode === 'REW'} label="REW"><Rewind className="w-5 h-5" /></ControlBtn>
                <ControlBtn onClick={doPlay} active={mode === 'PLAY'} label="PLAY" big><Play className="w-6 h-6" /></ControlBtn>
                <ControlBtn onClick={doPause} active={mode === 'PAUSE'} label="PAUSE"><Pause className="w-5 h-5" /></ControlBtn>
                <ControlBtn onClick={doStop} active={mode === 'STOP' && hasTape} label="STOP"><Square className="w-5 h-5" /></ControlBtn>
                <ControlBtn onClick={doFF} active={mode === 'FF'} label="FF"><FastForward className="w-5 h-5" /></ControlBtn>
                <ControlBtn onClick={doEject} label="EJECT"><Eject className="w-5 h-5" /></ControlBtn>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-black/60 rounded-lg px-2 py-1.5 border border-white/10">
                  <span className="font-vcr text-xs text-white/50 px-1 hidden sm:inline">TRACKING</span>
                  <button onClick={() => setTracking(t => Math.max(-3, t - 1))} className="vcr-btn w-8 h-8 rounded bg-zinc-700 text-white flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                  <span className="font-vcr text-lg text-cyan-300 w-8 text-center">{tracking >= 0 ? `+${tracking}` : tracking}</span>
                  <button onClick={() => setTracking(t => Math.min(3, t + 1))} className="vcr-btn w-8 h-8 rounded bg-zinc-700 text-white flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                </div>
                <ControlBtn onClick={() => { sound.setEnabled(!sound.enabled); }} active={!sound.enabled} label={sound.enabled ? 'MUDO' : 'SOM'} title="Som">
                  {sound.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </ControlBtn>
                <ControlBtn onClick={toggleFull} label="TELA"><Maximize className="w-5 h-5" /></ControlBtn>
              </div>
            </div>
            {/* timeline */}
            <div className="mt-3 flex items-center gap-2">
              <span className="font-vcr text-cyan-300 text-sm whitespace-nowrap">{elapsedStr}</span>
              <div className="flex-1 h-2 bg-black rounded-full overflow-hidden border border-white/10 relative cursor-pointer" onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const p = ((e.clientX - r.left) / r.width) * TOTAL_DURATION;
                setProgress(p); sound.ensureCtx();
              }}>
                <div className="h-full bg-gradient-to-r from-red-700 via-red-500 to-cyan-400" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="font-vcr text-white/50 text-sm whitespace-nowrap">0:00:{String(Math.ceil(TOTAL_DURATION / 1000)).padStart(2, '0')}</span>
            </div>
            {showHint && (
              <div className="mt-2 font-vcr text-yellow-300/80 text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" /> DICA: aperte PLAY, apague a luz e aumente o som. Espaço = pausa.
              </div>
            )}
          </div>
        </section>

        {/* ===== SIDE ===== */}
        <aside className="flex flex-col gap-4">
          {/* tape box */}
          <div className="rounded-xl overflow-hidden border border-white/10 bg-[#111] shadow-xl">
            <div className="bg-red-800 px-4 py-2 flex items-center justify-between">
              <span className="font-vcr text-white tracking-widest">▮ VHS • FITA Nº 07</span>
              <Clapperboard className="w-5 h-5 text-white/80" />
            </div>
            <div className="p-3">
              <div className="tape-label rounded p-3 text-[#222] relative">
                <div className="font-type text-lg font-bold leading-tight">RONDA DA MORTE:<br />SURTO VEPER</div>
                <div className="font-vcr text-sm mt-1">TEASER TRAILER • 1994 • COR/58s</div>
                <div className="mt-2 flex gap-1">
                  <span className="font-vcr text-xs bg-black text-white px-2 py-0.5">SP</span>
                  <span className="font-vcr text-xs bg-red-700 text-white px-2 py-0.5">TERROR</span>
                  <span className="font-vcr text-xs border border-black px-2 py-0.5">ZUMBI</span>
                </div>
                <div className="absolute top-3 right-3 rotate-12 border-2 border-red-700 text-red-700 font-vcr px-2 text-sm">NÃO APAGAR</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 font-vcr text-center text-sm">
                <div className="bg-black/60 rounded p-2 border border-white/10"><Clock3 className="w-4 h-4 mx-auto text-cyan-300" /><div className="text-white/80 mt-1">58 SEG</div></div>
                <div className="bg-black/60 rounded p-2 border border-white/10"><MapPin className="w-4 h-4 mx-auto text-cyan-300" /><div className="text-white/80 mt-1">SETOR NORTE</div></div>
                <div className="bg-black/60 rounded p-2 border border-white/10"><RotateCcw className="w-4 h-4 mx-auto text-cyan-300" /><div className="text-white/80 mt-1">REBOBINADA</div></div>
              </div>
              <button onClick={doPlay} className="mt-3 w-full font-vcr text-xl bg-red-700 hover:bg-red-600 text-white rounded py-2 flex items-center justify-center gap-2 transition shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                <Play className="w-5 h-5" /> {hasTape ? 'VER TEASER NOVAMENTE' : 'REPRODUZIR TEASER'}
              </button>
            </div>
          </div>

          {/* chapters */}
          <div className="rounded-xl border border-white/10 bg-[#0c0c0c] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
              <span className="font-vcr tracking-widest text-white/80">■ CAPÍTULOS DA FITA</span>
              <span className="font-vcr text-xs text-white/40">{idx + 1}/{SCENES.length}</span>
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {SCENES.map((s, i) => (
                <button key={s.id} onClick={() => seekTo(i)} className={`w-full flex items-center gap-3 px-3 py-2 border-b border-white/5 text-left transition hover:bg-white/5 ${i === idx ? 'bg-red-950/50 border-l-2 border-l-red-600' : 'border-l-2 border-l-transparent'}`}>
                  <div className="w-16 h-10 rounded overflow-hidden bg-black shrink-0 border border-white/10 relative">
                    {s.image ? <img src={s.image} className="w-full h-full object-cover opacity-80" alt="" /> : (
                      <div className={`w-full h-full flex items-center justify-center font-vcr text-xs ${s.type === 'static' ? 'bg-zinc-400' : s.type === 'bars' ? 'color-bars' : 'bg-black text-red-500'}`}>
                        {s.type === 'warning' ? 'FBI' : s.type === 'static' ? 'NOISE' : s.type === 'title' ? 'TÍTULO' : 'TXT'}
                      </div>
                    )}
                    {i === idx && mode === 'PLAY' && <div className="absolute inset-0 bg-red-600/20" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-vcr text-sm leading-tight truncate ${i === idx ? 'text-red-300' : 'text-white/80'}`}>{String(i + 1).padStart(2, '0')} — {s.caption || s.title || s.id.toUpperCase()}</div>
                    <div className="font-vcr text-xs text-white/40">{(s.duration / 1000).toFixed(1)}s • {s.timecode}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${i === idx ? 'text-red-500' : 'text-white/20'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* rental card */}
          <div className="rounded-xl border border-yellow-600/30 bg-[#141002] p-4">
            <div className="font-type text-yellow-200/90 text-sm leading-relaxed">
              <span className="text-yellow-400">CARTÃO DA LOCADORA:</span><br />
              “Cliente devolveu a fita chorando. Disse que a viatura da capa passou na rua dele às 3:33 da manhã, com o giroflex ligado... mas sem ninguém dentro.”<br />
              <span className="text-white/40">— Dona Cida, atendente, 14/11/1994</span>
            </div>
          </div>
        </aside>
      </main>

      {/* ===== POSTER + SINOPSE ===== */}
      <section className="relative z-10 max-w-7xl mx-auto px-3 md:px-4 pb-6 grid md:grid-cols-[340px_1fr] gap-5">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-b from-red-700/60 to-cyan-600/20 blur-lg opacity-60" />
          <div className="relative rounded-lg overflow-hidden border-2 border-white/15 shadow-2xl">
            <img src="/images/poster.jpg" alt="Cartaz VHS Ronda da Morte" className="w-full aspect-[3/4] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
            <div className="absolute top-0 left-0 right-0 p-4 text-center">
              <div className="font-vcr text-cyan-300 tracking-[0.3em] text-xs">VEPER PICTURES APRESENTA</div>
              <div className="font-horror text-5xl text-[#d6d6d6] leading-[0.9] mt-1 horror-glow">RONDA<br /><span className="text-red-600 text-6xl">DA MORTE</span></div>
              <div className="font-vcr text-yellow-300 tracking-[0.4em] mt-1">— SURTO VEPER —</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="font-type text-white/90 text-sm text-center">“Naquela noite, nenhuma ronda voltou para casa.”</div>
              <div className="mt-2 flex justify-center gap-2">
                <span className="font-vcr text-xs bg-white text-black px-2 py-0.5 font-bold">TERROR</span>
                <span className="font-vcr text-xs bg-red-700 text-white px-2 py-0.5">18 ANOS</span>
                <span className="font-vcr text-xs border border-white/60 text-white px-2 py-0.5">1994</span>
              </div>
            </div>
            <div className="scanlines" />
          </div>
          <div className="mt-2 text-center font-vcr text-white/40 text-sm">CAPA ORIGINAL DA FITA — ARTE PINTADA À MÃO</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b0b0c] p-5 md:p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-700 via-yellow-500 to-cyan-500" />
          <div className="font-vcr text-red-500 tracking-[0.35em] text-sm">■ SINOPSE OFICIAL ■</div>
          <h2 className="font-type text-2xl md:text-3xl text-white mt-2 leading-snug">Uma madrugada chuvosa. Uma viatura vazia. E algo que não deveria ter levantado.</h2>
          <p className="mt-4 text-white/70 leading-relaxed font-light text-[17px]">
            Outubro de 1994. Durante o turno da meia-noite, o vigilante <span className="text-white">Almeida</span> encontra a <span className="text-cyan-300">Viatura 07</span> estacionada sob o temporal — porta destrancada, motor quente, rádio chiando.
            As câmeras de segurança registraram tudo. O que ele tocou naquela maçaneta... <span className="text-red-400">tocou de volta</span>.
          </p>
          <p className="mt-3 text-white/70 leading-relaxed font-light text-[17px]">
            Dos mesmos criadores de <span className="font-type text-white/90">“A Noite do Vigia” (1991)</span>, chega o teaser mais procurado das locadoras: 58 segundos recuperados de uma fita que a polícia tentou esconder.
          </p>

          <div className="mt-6 grid sm:grid-cols-2 gap-3 font-vcr">
            {[
              ['DIREÇÃO', 'J. MARCONDES'],
              ['EFEITOS', 'MAQUIAGEM ARTESANAL + SANGUE CENOGRÁFICO'],
              ['SOM', 'GRAVADO EM VHS HI-FI • CHUVA REAL'],
              ['DURAÇÃO', 'TEASER 58s • FILME 87 MIN'],
              ['ESTREIA', 'DEZEMBRO 1994'],
              ['CENSURA', '18 ANOS — CENAS FORTES'],
            ].map(([k, v]) => (
              <div key={k} className="bg-black/50 border border-white/10 rounded p-2.5 flex gap-2">
                <span className="text-cyan-400 text-sm shrink-0">{k}:</span>
                <span className="text-white/85 text-sm">{v}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="font-vcr text-sm px-3 py-1.5 rounded bg-white/5 border border-white/15 text-white/70 flex items-center gap-1.5"><Ticket className="w-4 h-4 text-yellow-400" /> SESSÃO DA MEIA-NOITE</span>
            <span className="font-vcr text-sm px-3 py-1.5 rounded bg-white/5 border border-white/15 text-white/70 flex items-center gap-1.5"><Film className="w-4 h-4 text-cyan-300" /> 35MM • VHS • BETAMAX</span>
            <button onClick={() => { seekTo(9); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="font-vcr text-sm px-3 py-1.5 rounded bg-red-700 text-white flex items-center gap-1.5 hover:bg-red-600 transition">
              <Skull className="w-4 h-4" /> PULAR PARA O SUSTO
            </button>
          </div>
        </div>
      </section>

      {/* ===== CAST ===== */}
      <section className="relative z-10 max-w-7xl mx-auto px-3 md:px-4 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-vcr tracking-[0.3em] text-white/70">■ ELENCO DA MADRUGADA ■</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CAST.map(c => (
            <div key={c.name} className="rounded-xl border border-white/10 bg-gradient-to-b from-[#151515] to-[#0a0a0a] p-4 hover:border-red-700/60 transition group">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-horror text-xl text-red-500 group-hover:bg-red-800 group-hover:text-white transition">{c.name[0]}</div>
                <span className={`font-vcr text-xs px-2 py-0.5 rounded ${c.status === 'ATIVO' ? 'bg-red-700 text-white animate-pulse' : 'bg-black border border-white/20 text-white/60'}`}>{c.status}</span>
              </div>
              <div className="font-type text-white text-lg mt-2">{c.name}</div>
              <div className="font-vcr text-cyan-300 tracking-widest text-sm">{c.role}</div>
              <div className="text-white/55 text-sm mt-1 font-light">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 border-t border-white/10 bg-black/80 mt-2">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="font-vcr text-white/50 text-sm text-center md:text-left">
            © 1994 VEPER PICTURES • LOCADORA ESTRELA • FITA Nº 07<br />
            <span className="text-white/30">Site tributo fictício feito a partir da sua sequência — todo o sangue é cenográfico. Provavelmente.</span>
          </div>
          <div className="font-vcr text-yellow-300/80 flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" /> SEJA GENTIL, REBOBINE A FITA
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- sub components ---------- */

function ControlBtn({ children, onClick, label, active, big, title }: { children: React.ReactNode; onClick: () => void; label: string; active?: boolean; big?: boolean; title?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onClick} title={title || label} className={`vcr-btn rounded-lg flex items-center justify-center text-zinc-200 bg-zinc-700 hover:bg-zinc-600 ${big ? 'w-14 h-11' : 'w-11 h-10'} ${active ? 'vcr-btn-active' : ''}`}>
        {children}
      </button>
      <span className={`font-vcr text-[10px] tracking-widest ${active ? 'text-red-400' : 'text-white/40'}`}>{label}</span>
    </div>
  );
}

function SceneView({ scene, paused }: { scene: (typeof SCENES)[number]; paused: boolean }) {
  if (scene.type === 'warning') {
    return (
      <div className="absolute inset-0 bg-[#0a0aaa] flex flex-col items-center justify-center p-6 md:p-10 text-center">
        <div className="border-4 border-white/90 px-6 py-4 max-w-2xl">
          <div className="font-vcr text-white text-xl md:text-2xl tracking-[0.25em]">{scene.kicker}</div>
          <div className="font-type text-white text-lg md:text-2xl mt-3 leading-snug">{scene.title}</div>
          <div className="font-vcr text-white/70 text-sm md:text-base mt-3">{scene.subtitle}</div>
        </div>
        <div className="font-vcr text-white/60 mt-4">— 1994 VEPER HOME VIDEO —</div>
      </div>
    );
  }
  if (scene.type === 'bars') {
    return (
      <div className="absolute inset-0 flex flex-col">
        <div className="color-bars flex-1" />
        <div className="bg-black py-3 md:py-4 text-center border-t-4 border-white">
          <div className="font-vcr text-white text-lg md:text-2xl tracking-widest">{scene.caption}</div>
          <div className="font-vcr text-cyan-300 text-sm">◉ 1kHz TEST TONE ◉</div>
        </div>
      </div>
    );
  }
  if (scene.type === 'text') {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-6 md:p-12 text-center">
        <div className="font-vcr text-red-500 tracking-[0.3em] text-sm md:text-lg">{scene.kicker}</div>
        <div className="font-type text-white text-xl md:text-3xl lg:text-4xl mt-4 leading-snug max-w-3xl">{scene.title}</div>
        {scene.subtitle && <div className="font-vcr text-white/60 text-base md:text-xl mt-4 tracking-wider">{scene.subtitle}</div>}
        {scene.caption && <div className="mt-5 font-vcr text-yellow-300 text-lg md:text-2xl tracking-widest border-y border-yellow-600/50 py-1 px-4">{scene.caption}</div>}
      </div>
    );
  }
  if (scene.type === 'static') {
    return (
      <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 color-bars opacity-40" style={{ transform: 'translateY(-12%) scaleY(0.4)' }} />
        <div className="relative z-10 bg-black/80 px-6 py-3 border border-red-600">
          <div className="font-vcr text-red-500 text-2xl md:text-4xl tracking-widest red-flicker">{scene.caption}</div>
          <div className="font-vcr text-white/70 text-center mt-1">AJUSTE O TRACKING...</div>
        </div>
      </div>
    );
  }
  if (scene.type === 'jumpscare') {
    return (
      <div className="absolute inset-0 bg-black overflow-hidden">
        <img src={scene.image} alt="" className={`absolute inset-0 w-full h-full object-cover ${paused ? '' : 'anim-shake-hard'} contrast-125 saturate-50 brightness-110`} />
        <div className="absolute inset-0 bg-gradient-to-t from-red-950/90 via-transparent to-black/60" />
        <div className="absolute top-4 left-0 right-0 text-center">
          <span className="font-vcr bg-red-700 text-white px-4 py-1 text-lg md:text-xl tracking-[0.3em] red-flicker">⚠ NÃO OLHE PARA TRÁS ⚠</span>
        </div>
        <div className="absolute bottom-8 left-0 right-0 text-center px-4">
          <div className="font-horror text-5xl md:text-8xl text-red-600 horror-glow leading-none red-flicker">{scene.caption}</div>
          <div className="font-vcr text-white text-2xl md:text-3xl tracking-[0.5em] mt-1">{scene.subcaption}</div>
        </div>
      </div>
    );
  }
  if (scene.type === 'title') {
    return (
      <div className="absolute inset-0 bg-black overflow-hidden">
        <img src={scene.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 anim-kenburns-in" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <div className="font-vcr text-cyan-300 tracking-[0.5em] text-sm md:text-base">VEPER PICTURES APRESENTA</div>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }} className="font-horror text-[17vw] md:text-8xl lg:text-9xl leading-[0.85] mt-2 text-[#e8e8e8] horror-glow">
            RONDA<br /><span className="text-red-600">DA MORTE</span>
          </motion.div>
          <div className="mt-3 font-vcr text-yellow-300 text-xl md:text-3xl tracking-[0.45em] border-y border-yellow-600/60 px-6 py-1">{scene.subcaption}</div>
          <div className="mt-3 font-vcr text-white/70 tracking-widest text-sm md:text-base">{scene.title}</div>
        </div>
      </div>
    );
  }
  if (scene.type === 'end') {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="font-vcr text-cyan-300 tracking-[0.4em]">{scene.kicker}</div>
        <div className="font-horror text-4xl md:text-7xl text-yellow-100 mt-3 horror-glow">{scene.title}</div>
        <div className="font-vcr text-red-500 tracking-[0.3em] mt-3 text-lg">{scene.subtitle}</div>
        <div className="mt-6 font-vcr text-white/80 text-xl tracking-widest flex items-center gap-2">
          <Square className="w-4 h-4" /> {scene.caption} <Square className="w-4 h-4" />
        </div>
      </div>
    );
  }
  // footage
  const animClass = paused ? '' : scene.animation === 'kenburns-in' ? 'anim-kenburns-in' : scene.animation === 'kenburns-out' ? 'anim-kenburns-out' : scene.animation === 'pan' ? 'anim-pan' : scene.animation === 'handheld' ? 'anim-handheld' : scene.animation === 'shake' ? 'anim-shake' : '';
  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      {scene.image && <img src={scene.image} alt="" className={`absolute inset-0 w-full h-full object-cover ${animClass} ${paused ? 'grayscale-[0.2]' : ''}`} style={{ filter: 'contrast(1.08) saturate(0.85)' }} />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
      <div className="absolute bottom-12 md:bottom-14 left-0 right-0 px-4 md:px-8">
        <div className="border-l-4 border-red-600 bg-black/65 backdrop-blur-sm px-4 py-2.5 max-w-2xl">
          <div className="font-vcr text-white text-xl md:text-3xl leading-tight osd-shadow">{scene.caption}</div>
          {scene.subcaption && <div className="font-vcr text-white/60 text-sm md:text-lg mt-0.5">{scene.subcaption}</div>}
        </div>
      </div>
    </div>
  );
}
