import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PLACEHOLDER, isFilled } from '../lib/contentRules.js';

const GAP = 14;
const PAD = 6;
const POP_WIDTH = 320;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

// Tur berpandu: menyorot satu elemen per langkah. Teks datang dari content/tour.json.
// Tur tidak memblokir klik di halaman (lapisan sorot tidak menangkap pointer), jadi tombol konversi tetap bisa dipakai.
export default function Tour({ steps, onView, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState({ docked: true });
  const popRef = useRef(null);
  const headingRef = useRef(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step.target]);

  // Pindah langkah: atur tampilan konversi bila langkah menyebutkannya, gulir ke elemen, lalu ukur.
  useEffect(() => {
    if (step.tampilan) onView(step.tampilan);
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ block: window.innerWidth < 720 ? 'start' : 'center', behavior: reduce ? 'auto' : 'smooth' });
    measure();
    const timers = [150, 450, 900].map((ms) => setTimeout(measure, ms));
    headingRef.current?.focus({ preventScroll: true });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Sorotan mengikuti elemen saat halaman digulir atau jendela berubah ukuran.
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    const ro = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (el && ro) ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
    };
  }, [measure, step.target]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Letakkan teks di samping elemen bila muat; kalau tidak (atau di ponsel), tempel di bawah layar.
  useLayoutEffect(() => {
    const pop = popRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!pop || !rect || vw < 720) return setPos({ docked: true });
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const cands = [
      { left: rect.right + PAD + GAP, top: clamp(rect.top, 8, vh - ph - 8), ok: rect.right + PAD + GAP + pw <= vw - 8 },
      { left: rect.left - PAD - GAP - pw, top: clamp(rect.top, 8, vh - ph - 8), ok: rect.left - PAD - GAP - pw >= 8 },
      { left: clamp(rect.left, 8, vw - pw - 8), top: rect.bottom + PAD + GAP, ok: rect.bottom + PAD + GAP + ph <= vh - 8 },
      { left: clamp(rect.left, 8, vw - pw - 8), top: rect.top - PAD - GAP - ph, ok: rect.top - PAD - GAP - ph >= 8 },
    ];
    const c = cands.find((x) => x.ok);
    setPos(c ? { left: c.left, top: c.top } : { docked: true });
  }, [rect, index]);

  const spot = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const judul = isFilled(step.judul) ? step.judul : null;
  const teks = isFilled(step.teks) ? step.teks : null;

  return (
    <>
      {spot && <div className="tour-spot" style={spot} aria-hidden="true" />}
      <div
        ref={popRef}
        className={`tour-pop ${pos.docked ? 'docked' : ''}`}
        style={pos.docked ? undefined : { left: pos.left, top: pos.top, width: POP_WIDTH }}
        role="dialog"
        aria-label={`Tur berpandu, langkah ${index + 1} dari ${steps.length}`}
      >
        <p className="tour-count">Langkah {index + 1} dari {steps.length}</p>
        <h3 ref={headingRef} tabIndex={-1} className={`tour-title ${judul ? '' : 'placeholder'}`}>{judul ?? PLACEHOLDER}</h3>
        <p className={teks ? '' : 'placeholder'} aria-live="polite">{teks ?? PLACEHOLDER}</p>
        <div className="tour-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Lewati tur</button>
          <span className="tour-nav">
            <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Sebelumnya</button>
            <button type="button" className="btn btn-primary" onClick={() => (last ? onClose() : setIndex((i) => i + 1))}>
              {last ? 'Selesai' : 'Berikutnya'}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}
