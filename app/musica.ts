// La canción de fondo es public/musica.mp3; los efectos se generan con Web Audio.

const VOLUMEN = 0.5;
// La canción suena más fuerte que los efectos (se multiplica por VOLUMEN).
const VOLUMEN_CANCION = 1.6;

let ctx: AudioContext | null = null;
let salida: GainNode | null = null;
let pista: GainNode | null = null;
let cancion: AudioBuffer | null = null;
let cargando = false;
let fuente: AudioBufferSourceNode | null = null;
let quiereSonar = false;
let silenciado = false;

function contexto() {
  if (!ctx) {
    const Clase =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Clase) return null;
    ctx = new Clase();
    salida = ctx.createGain();
    salida.gain.value = silenciado ? 0 : VOLUMEN;
    salida.connect(ctx.destination);
  }
  return ctx;
}

function frecuencia(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function nota(
  destino: AudioNode,
  midi: number,
  inicio: number,
  duracion: number,
  tipo: OscillatorType,
  volumen: number,
  midiFinal?: number,
) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia(midi), inicio);
  if (midiFinal !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(frecuencia(midiFinal), inicio + duracion);
  }
  env.gain.setValueAtTime(0.0001, inicio);
  env.gain.linearRampToValueAtTime(volumen, inicio + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(env).connect(destino);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.03);
}

/** Hay que llamarla dentro de un gesto del usuario: los navegadores bloquean el audio hasta entonces. */
export function desbloquearAudio() {
  const c = contexto();
  if (c && c.state === "suspended") void c.resume();
}

/** Descarga y decodifica la canción por adelantado, para que arranque sin demora. */
export async function cargarMusica() {
  const c = contexto();
  if (!c || cancion || cargando) return;
  cargando = true;
  try {
    const datos = await (await fetch("/musica.mp3")).arrayBuffer();
    cancion = await c.decodeAudioData(datos);
    if (quiereSonar) arrancar();
  } catch {
    // Sin canción el juego sigue funcionando igual.
  } finally {
    cargando = false;
  }
}

function arrancar() {
  if (!ctx || !salida || !cancion || fuente) return;
  pista = ctx.createGain();
  pista.gain.value = VOLUMEN_CANCION;
  pista.connect(salida);
  fuente = ctx.createBufferSource();
  fuente.buffer = cancion;
  fuente.loop = true;
  fuente.connect(pista);
  // Cada partida arranca la canción desde el principio.
  fuente.start();
}

export function empezarMusica() {
  const c = contexto();
  if (!c) return;
  pararMusica();
  void c.resume();
  quiereSonar = true;
  if (cancion) arrancar();
  else void cargarMusica();
}

export function pararMusica() {
  quiereSonar = false;
  if (!ctx || !fuente || !pista) return;
  const viejaFuente = fuente;
  const viejaPista = pista;
  viejaPista.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
  viejaFuente.stop(ctx.currentTime + 0.15);
  viejaFuente.onended = () => viejaPista.disconnect();
  fuente = null;
  pista = null;
}

export function sonarVictoria() {
  const c = contexto();
  if (!c || !salida) return;
  const t = c.currentTime + 0.03;
  const fanfarria: [number, number, number][] = [
    [72, 0, 0.14], [76, 0.14, 0.14], [79, 0.28, 0.14], [84, 0.42, 0.3],
    [79, 0.72, 0.14], [84, 0.86, 0.9],
  ];
  for (const [midi, desde, dura] of fanfarria) {
    nota(salida, midi, t + desde, dura, "square", 0.16);
    nota(salida, midi - 12, t + desde, dura, "triangle", 0.3);
  }
  for (const n of [76, 79]) nota(salida, n, t + 0.86, 0.9, "square", 0.08);
}

export function sonarDerrota() {
  const c = contexto();
  if (!c || !salida) return;
  const t = c.currentTime + 0.03;
  // El clásico "wah wah wah waaah" de trombón triste.
  const filtro = c.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.value = 900;
  filtro.connect(salida);
  nota(filtro, 58, t, 0.32, "sawtooth", 0.3, 57);
  nota(filtro, 57, t + 0.36, 0.32, "sawtooth", 0.3, 56);
  nota(filtro, 56, t + 0.72, 0.32, "sawtooth", 0.3, 55);
  nota(filtro, 55, t + 1.08, 1.0, "sawtooth", 0.3, 52);
  setTimeout(() => filtro.disconnect(), 2500);
}

export function silenciar(valor: boolean) {
  silenciado = valor;
  if (ctx && salida) salida.gain.setTargetAtTime(valor ? 0 : VOLUMEN, ctx.currentTime, 0.02);
}

/** Blip corto para los botones: sube al empezar, baja al volver a la pantalla inicial. */
export function sonarBoton(sube: boolean) {
  const c = contexto();
  if (!c || !salida) return;
  const t = c.currentTime + 0.01;
  nota(salida, sube ? 72 : 79, t, 0.12, "square", 0.14, sube ? 84 : 67);
}
