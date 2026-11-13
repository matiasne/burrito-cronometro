"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import logo from "../public/logo.jpeg";
import {
  cargarMusica,
  desbloquearAudio,
  empezarMusica,
  pararMusica,
  silenciar,
  sonarBoton,
  sonarDerrota,
  sonarVictoria,
} from "./musica";

// Tiempo objetivo en centésimas de segundo (15,00 s).
const OBJETIVO_CS = 1500;
// Margen permitido en centésimas. 0 = hay que clavar el 15,00 exacto.
const TOLERANCIA_CS = 0;
// Pausa tras frenar, para que un toque doble no reinicie la partida sin querer.
const BLOQUEO_MS = 700;

type Estado = "listo" | "corriendo" | "frenado";

function formatear(cs: number) {
  const segundos = Math.floor(cs / 100);
  const centesimas = cs % 100;
  return `${String(segundos).padStart(2, "0")},${String(centesimas).padStart(2, "0")}`;
}

export default function Juego() {
  const [estado, setEstado] = useState<Estado>("listo");
  const [cs, setCs] = useState(0);
  const [intentos, setIntentos] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [silencio, setSilencio] = useState(false);

  const estadoRef = useRef<Estado>("listo");
  const inicioRef = useRef(0);
  const frameRef = useRef(0);
  const bloqueadoRef = useRef(false);

  const accion = useCallback(() => {
    if (bloqueadoRef.current) return;

    if (estadoRef.current === "corriendo") {
      const final = Math.floor((performance.now() - inicioRef.current) / 10);
      cancelAnimationFrame(frameRef.current);
      pararMusica();
      if (Math.abs(final - OBJETIVO_CS) <= TOLERANCIA_CS) sonarVictoria();
      else sonarDerrota();
      estadoRef.current = "frenado";
      setCs(final);
      setEstado("frenado");
      setIntentos((n) => n + 1);
      bloqueadoRef.current = true;
      setBloqueado(true);
      setTimeout(() => {
        bloqueadoRef.current = false;
        setBloqueado(false);
      }, BLOQUEO_MS);
      return;
    }

    // "Jugar de nuevo" solo vuelve a la pantalla inicial; el reloj arranca con EMPEZAR.
    if (estadoRef.current === "frenado") {
      estadoRef.current = "listo";
      setCs(0);
      setEstado("listo");
      sonarBoton(false);
      return;
    }

    inicioRef.current = performance.now();
    estadoRef.current = "corriendo";
    setCs(0);
    setEstado("corriendo");
    empezarMusica();
    sonarBoton(true);
    const tick = () => {
      setCs(Math.floor((performance.now() - inicioRef.current) / 10));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "Enter") return;
      // Sobre el botón de sonido, la tecla solo cambia el sonido.
      if ((e.target as HTMLElement).closest?.(".sonido")) return;
      e.preventDefault();
      if (!e.repeat) accion();
    };
    // En pantallas táctiles el audio solo se habilita al soltar el dedo, no al apoyarlo.
    const gestos = ["pointerup", "touchend", "keydown"] as const;
    window.addEventListener("keydown", alPresionar);
    gestos.forEach((g) => window.addEventListener(g, desbloquearAudio));
    return () => {
      window.removeEventListener("keydown", alPresionar);
      gestos.forEach((g) => window.removeEventListener(g, desbloquearAudio));
      cancelAnimationFrame(frameRef.current);
      pararMusica();
    };
  }, [accion]);

  useEffect(() => {
    void cargarMusica();
    try {
      if (localStorage.getItem("silencio") === "1") {
        silenciar(true);
        setSilencio(true);
      }
    } catch {}
  }, []);

  const cambiarSonido = () => {
    const nuevo = !silencio;
    setSilencio(nuevo);
    silenciar(nuevo);
    try {
      localStorage.setItem("silencio", nuevo ? "1" : "0");
    } catch {}
  };

  const diferencia = cs - OBJETIVO_CS;
  const gano = estado === "frenado" && Math.abs(diferencia) <= TOLERANCIA_CS;
  const perdio = estado === "frenado" && !gano;

  const textoBoton =
    estado === "corriendo" ? "¡FRENAR!" : estado === "frenado" ? "JUGAR DE NUEVO" : "EMPEZAR";

  return (
    <main className={`juego ${gano ? "juego--gano" : ""} ${perdio ? "juego--perdio" : ""}`}>
      {estado === "frenado" && (
        <>
          <div className={`lluvia ${perdio ? "lluvia--perdio" : ""}`} aria-hidden="true">
            {Array.from({ length: gano ? 36 : 16 }, (_, i) => (
              <span
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  animationDelay: `${(i % 7) * (gano ? 0.35 : 0.12)}s`,
                  animationDuration: `${2.6 + (i % 5) * 0.5}s`,
                  fontSize: `${1.6 + (i % 4) * 0.5}rem`,
                }}
              >
                {gano ? ["🌯", "🎉", "🌯", "⭐"][i % 4] : ["😭", "💔", "😵"][i % 3]}
              </span>
            ))}
          </div>
          <div className="estallido" aria-hidden="true">
            {gano ? "🌯" : "❌"}
          </div>
        </>
      )}

      <button
        type="button"
        className="sonido"
        onClick={cambiarSonido}
        aria-pressed={silencio}
        aria-label={silencio ? "Activar sonido" : "Silenciar sonido"}
      >
        {silencio ? "🔇" : "🔊"}
      </button>

      <Image className="logo" src={logo} alt="Santo Burrito SRL · Campus Alexis 2026" priority />

      <h1>Frená en 15</h1>
      <p className="consigna">
        Frená el cronómetro justo en <strong>15,00</strong> segundos y ganate un burrito.
      </p>

      <div
        className={`reloj ${gano ? "reloj--gano" : ""} ${perdio ? "reloj--perdio" : ""}`}
        role="timer"
        aria-label={`${formatear(cs)} segundos`}
      >
        {formatear(cs)
          .split("")
          .map((c, i) => (
            <span key={i} className={c === "," ? "coma" : "digito"} aria-hidden="true">
              {c}
            </span>
          ))}
      </div>

      <div className="resultado" aria-live="polite">
        {estado === "listo" && <p>Tocá el botón para arrancar.</p>}
        {estado === "corriendo" && <p>Ojo… ¡frená en 15,00!</p>}
        {gano && (
          <>
            <p className="resultado__titulo">¡Ganaste un burrito! 🌯</p>
            <p>Mostrá esta pantalla para reclamarlo.</p>
          </>
        )}
        {perdio && (
          <>
            <p className="resultado__titulo">¡Casi!</p>
            <p>
              {diferencia < 0
                ? `Te faltaron ${formatear(-diferencia)} segundos.`
                : `Te pasaste por ${formatear(diferencia)} segundos.`}
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        className={`boton ${estado === "corriendo" ? "boton--frenar" : ""}`}
        // pointerdown y no click: el tiempo se toma al apoyar el dedo, no al soltarlo.
        onPointerDown={(e) => {
          e.preventDefault();
          accion();
        }}
        disabled={bloqueado}
      >
        {textoBoton}
      </button>

      <p className="intentos">
        Intentos: {intentos} · También podés usar la barra espaciadora
      </p>
    </main>
  );
}
