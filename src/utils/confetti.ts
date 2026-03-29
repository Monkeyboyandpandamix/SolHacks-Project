type ConfettiOrigin = {
  x?: number;
  y?: number;
};

type ConfettiOptions = {
  particleCount?: number;
  spread?: number;
  origin?: ConfettiOrigin;
  colors?: string[];
  ticks?: number;
  disableForReducedMotion?: boolean;
};

const DEFAULT_COLORS = ['#4f46e5', '#818cf8', '#ffffff'];

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

export const fireConfetti = ({
  particleCount = 30,
  spread = 50,
  origin = { x: 0.5, y: 0.5 },
  colors = DEFAULT_COLORS,
  ticks = 120,
  disableForReducedMotion = false,
}: ConfettiOptions = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (disableForReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const count = Math.max(0, Math.min(particleCount, 160));
  if (count === 0) {
    return;
  }

  const centerX = (origin.x ?? 0.5) * window.innerWidth;
  const centerY = (origin.y ?? 0.5) * window.innerHeight;
  const maxTravel = Math.max(180, ticks * 2);

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('span');
    const angle = randomBetween(-spread / 2, spread / 2) * (Math.PI / 180) - Math.PI / 2;
    const distance = randomBetween(maxTravel * 0.45, maxTravel);
    const driftX = Math.cos(angle) * distance;
    const driftY = Math.sin(angle) * distance + randomBetween(40, 120);
    const rotation = randomBetween(-360, 360);
    const size = randomBetween(6, 12);

    particle.setAttribute('aria-hidden', 'true');
    Object.assign(particle.style, {
      position: 'fixed',
      left: `${centerX}px`,
      top: `${centerY}px`,
      width: `${size}px`,
      height: `${size * 0.6}px`,
      borderRadius: '999px',
      pointerEvents: 'none',
      zIndex: '9999',
      backgroundColor: colors[index % colors.length] ?? DEFAULT_COLORS[0],
      boxShadow: '0 0 6px rgba(15, 23, 42, 0.12)',
    });

    document.body.appendChild(particle);

    particle.animate(
      [
        {
          transform: 'translate(-50%, -50%) rotate(0deg) scale(1)',
          opacity: 1,
        },
        {
          transform: `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px)) rotate(${rotation}deg) scale(0.75)`,
          opacity: 0,
        },
      ],
      {
        duration: randomBetween(700, 1200),
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    ).finished.finally(() => {
      particle.remove();
    });
  }
};
