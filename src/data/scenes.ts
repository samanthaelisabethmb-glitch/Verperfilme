export type SceneType = 'warning' | 'bars' | 'text' | 'footage' | 'static' | 'jumpscare' | 'title' | 'end';

export interface Scene {
  id: string;
  type: SceneType;
  duration: number; // ms
  image?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  caption?: string;
  subcaption?: string;
  animation?: 'kenburns-in' | 'kenburns-out' | 'pan' | 'handheld' | 'shake' | 'none';
  timecode?: string;
  redAlert?: boolean;
}

export const SCENES: Scene[] = [
  {
    id: 'aviso',
    type: 'warning',
    duration: 3600,
    kicker: 'FBI WARNING // AVISO FEDERAL',
    title: 'ESTA FITA É PROPRIEDADE DA LOCADORA ESTRELA',
    subtitle: 'A REPRODUÇÃO NÃO AUTORIZADA DESTA OBRA É CRIME FEDERAL. DENUNCIE A PIRATARIA.',
    timecode: '00:00:00'
  },
  {
    id: 'bars',
    type: 'bars',
    duration: 2200,
    caption: 'CALIBRAÇÃO DE VÍDEO — VEPER SECURITY SYSTEMS',
    timecode: '00:00:04'
  },
  {
    id: 'recuperada',
    type: 'text',
    duration: 4600,
    kicker: '◆ FITA RECUPERADA ◆ ARQUIVO Nº 07-1994',
    title: 'O MATERIAL A SEGUIR FOI ENCONTRADO EM UMA VIATURA ABANDONADA',
    subtitle: 'DIA 27 DE OUTUBRO DE 1994 — 03:33 DA MADRUGADA — SOB CHUVA INTENSA',
    caption: 'NENHUM DOS SEGURANÇAS FOI LOCALIZADO',
    timecode: '00:00:07'
  },
  {
    id: 'plano-aberto',
    type: 'footage',
    duration: 5500,
    image: '/images/scene-car-wide.jpg',
    animation: 'kenburns-in',
    caption: 'TURNO 03:33 — SETOR NORTE',
    subcaption: 'VIATURA 07 ESTACIONADA EM LOCAL NÃO AUTORIZADO',
    timecode: 'CAM 01 — ESTACIONAMENTO'
  },
  {
    id: 'viatura-nao-responde',
    type: 'footage',
    duration: 5000,
    image: '/images/scene-car-close.jpg',
    animation: 'pan',
    caption: '“VIATURA 07, RESPONDA... CÂMBIO.”',
    subcaption: '... SILÊNCIO. SÓ CHUVA E ESTÁTICA.',
    timecode: 'CAM 02 — APROXIMAÇÃO'
  },
  {
    id: 'foi-sozinho',
    type: 'text',
    duration: 3200,
    kicker: 'REGISTRO DE ÁUDIO — GUARDA R. ALMEIDA',
    title: '"VOU VERIFICAR SOZINHO. DEVE SER SÓ A CHUVA..."',
    subtitle: '— ÚLTIMA TRANSMISSÃO CONHECIDA —',
    timecode: '00:00:31'
  },
  {
    id: 'mao',
    type: 'footage',
    duration: 4800,
    image: '/images/scene-hand.jpg',
    animation: 'handheld',
    caption: 'A PORTA ESTAVA DESTRANCADA',
    subcaption: 'O MOTOR AINDA QUENTE. O RÁDIO AINDA LIGADO.',
    timecode: 'CAM 03 — CORPORAL'
  },
  {
    id: 'rua-vazia',
    type: 'footage',
    duration: 4600,
    image: '/images/scene-street.jpg',
    animation: 'kenburns-out',
    caption: 'AS RUAS ESTÃO VAZIAS',
    subcaption: 'NÃO DEVERIAM ESTAR.',
    timecode: 'CAM 04 — PERÍMETRO'
  },
  {
    id: 'interferencia',
    type: 'static',
    duration: 1400,
    caption: '⚠ SINAL INTERROMPIDO ⚠',
    timecode: 'ERRO DE TRACKING'
  },
  {
    id: 'zumbi',
    type: 'jumpscare',
    duration: 4200,
    image: '/images/scene-zombie.jpg',
    animation: 'shake',
    caption: 'ELES NÃO MORRERAM',
    subcaption: 'CORRA.',
    timecode: '● REC — SINAL RECUPERADO',
    redAlert: true
  },
  {
    id: 'titulo',
    type: 'title',
    duration: 6200,
    image: '/images/poster.jpg',
    caption: 'RONDA DA MORTE',
    subcaption: 'SURTO VEPER',
    title: 'NOS CINEMAS E LOCADORAS — DEZEMBRO 1994',
    timecode: 'TEASER OFICIAL'
  },
  {
    id: 'fim',
    type: 'end',
    duration: 5000,
    kicker: 'VEPER PICTURES APRESENTA',
    title: 'EM BREVE NA SUA LOCADORA',
    subtitle: 'PROIBIDO PARA MENORES DE 18 ANOS',
    caption: '■ SEJA GENTIL, REBOBINE ■',
    timecode: 'FIM DO TEASER'
  }
];

export const TOTAL_DURATION = SCENES.reduce((a, s) => a + s.duration, 0);

export function formatTimecode(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = 0;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const f = Math.floor((ms % 1000) / 33);
  return `SP ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export const CAST = [
  { name: 'R. ALMEIDA', role: 'O VIGILANTE', desc: 'Turno da meia-noite. Sozinho. Armado só com lanterna.', status: 'DESAPARECIDO' },
  { name: 'M. DUARTE', role: 'A OPERADORA', desc: 'Última voz no rádio antes do silêncio.', status: 'DESAPARECIDA' },
  { name: 'VIATURA 07', role: 'A TESTEMUNHA', desc: 'Encontrada com porta aberta, motor quente.', status: 'APREENDIDA' },
  { name: 'ELES', role: 'OS INFECTADOS', desc: 'Não respire perto. Não faça barulho. Corra.', status: 'ATIVO' },
];
