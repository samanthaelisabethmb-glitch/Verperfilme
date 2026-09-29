import { useEffect, useState } from 'react';

export function StaticNoise({ heavy = false }: { heavy?: boolean }) {
  return <div className={`vhs-noise ${heavy ? 'vhs-noise-heavy' : ''}`} />;
}

export function TrackingGlitch({ active, intensity = 1 }: { active: boolean; intensity?: number }) {
  const [pos, setPos] = useState(20);

  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => {
      setPos(Math.random() * 100);
    }, 120);
    return () => clearInterval(iv);
  }, [active]);

  if (!active) return null;
  return (
    <>
      <div className="tracking-distort" style={{ top: `${pos}%`, opacity: 0.6 * intensity }} />
      <div className="tracking-line" style={{ top: `${pos}%`, opacity: intensity }} />
      {/* bottom tearing */}
      <div
        className="absolute left-0 right-0 bottom-0 pointer-events-none z-[38]"
        style={{
          height: `${14 * intensity}px`,
          background: 'linear-gradient(to top, rgba(255,255,255,0.35), transparent)',
          transform: `translateX(${(Math.random() - 0.5) * 8}px)`,
        }}
      />
    </>
  );
}

export function OSD({
  mode,
  timeElapsed,
  dateStr,
  tracking,
}: {
  mode: string;
  timeElapsed: string;
  dateStr: string;
  tracking: number;
}) {
  return (
    <>
      {/* top left PLAY */}
      <div className="absolute top-3 left-4 z-[45] flex items-center gap-3 select-none">
        <span className="font-vcr text-2xl md:text-3xl text-white osd-shadow tracking-widest flex items-center gap-2">
          {mode === 'PLAY' && <span className="inline-block text-[0.9em]">▶</span>}
          {mode === 'PAUSE' && <span className="inline-block">❚❚</span>}
          {mode === 'STOP' && <span className="inline-block">■</span>}
          {mode === 'REW' && <span className="inline-block">◀◀</span>}
          {mode === 'FF' && <span className="inline-block">▶▶</span>}
          {mode}
        </span>
        {mode === 'PLAY' && <span className="blink font-vcr text-cyan-200 text-lg osd-shadow hidden sm:inline">HI-FI SP</span>}
      </div>

      {/* top right date */}
      <div className="absolute top-3 right-4 z-[45] text-right select-none">
        <div className="font-vcr text-xl md:text-2xl text-white osd-shadow leading-none">{dateStr}</div>
        <div className="font-vcr text-lg md:text-xl text-white/90 osd-shadow leading-none mt-0.5">{timeElapsed}</div>
      </div>

      {/* bottom left timecode */}
      <div className="absolute bottom-3 left-4 z-[45] select-none">
        <div className="font-vcr text-lg text-white/90 osd-shadow">TRK {tracking >= 0 ? '+' : ''}{tracking}</div>
      </div>

      {/* bottom right REC */}
      <div className="absolute bottom-3 right-4 z-[45] hidden sm:flex items-center gap-2 select-none">
        <span className="w-3 h-3 rounded-full bg-red-600 rec-dot" />
        <span className="font-vcr text-lg text-white osd-shadow">REC ●</span>
      </div>
    </>
  );
}

export function RainOverlay() {
  return (
    <div
      className="absolute inset-0 z-[30] pointer-events-none opacity-30"
      style={{
        backgroundImage:
          'repeating-linear-gradient(105deg, transparent 0px, transparent 8px, rgba(180,220,255,0.25) 8px, rgba(180,220,255,0.25) 9px)',
        animation: 'rainOverlay 0.35s linear infinite',
      }}
    />
  );
}
