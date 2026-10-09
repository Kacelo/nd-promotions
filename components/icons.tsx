type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const CalendarIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const ClockIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const PinIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const UploadIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);
export const LockIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...base} {...p}>
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);
export const ArrowIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const SealIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const JournalIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z" />
    <path d="M6 3v18M9 7h6" />
    <path d="M20.5 6v11l-1 2-1-2V6z" />
  </svg>
);
const CupIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M5 9h11l-1 11H6z" />
    <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H15.5" />
    <path d="M8 6c0-1 1-1 1-2M11 6c0-1 1-1 1-2" />
  </svg>
);
const PeopleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="12" cy="7" r="3" />
    <path d="M6 20v-1a6 6 0 0 1 12 0v1" />
    <circle cx="5" cy="10" r="2" />
    <circle cx="19" cy="10" r="2" />
  </svg>
);
const SparkIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 9-.6-6.6-2.4-8.4-7-9 4.6-.6 6.4-2.4 7-7Z" />
  </svg>
);
const FlowerIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    {[0, 72, 144, 216, 288].map((a) => (
      <path
        key={a}
        transform={`rotate(${a} 12 12)`}
        d="M12 10.7c-2.1-1.4-3.4-4.5-1.6-7.2.5-.7 1-1 1.6-1s1.1.3 1.6 1c1.8 2.7.5 5.8-1.6 7.2Z"
      />
    ))}
    <circle cx="12" cy="12" r="1.3" />
  </svg>
);
const GiftIcon = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    <rect x="4" y="9" width="16" height="11" rx="1" />
    <path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S12 9 12 9Zm0 0c2-4 6-4 6-1.5S12 9 12 9Z" />
  </svg>
);

/** Picks an icon for an inclusion line by keyword. */
export function InclusionIcon({ text }: { text: string }) {
  const t = text.toLowerCase();
  if (/journal|pen|book|note/.test(t)) return <JournalIcon />;
  if (/food|drink|refresh|meal|lunch|brunch|tea|coffee|cocktail/.test(t))
    return <CupIcon />;
  if (/experience|connect|people|community|session|talk/.test(t))
    return <PeopleIcon />;
  if (/gift|goodie|bag/.test(t)) return <GiftIcon />;
  if (/flower|flourish|spark|bloom|craft/.test(t)) return <FlowerIcon />;
  return <SparkIcon />;
}

/** Hand-drawn style ribbon flourish (original artwork). */
export const Flourish = (p: P) => (
  <svg
    viewBox="0 0 200 120"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.1"
    strokeLinecap="round"
    {...p}
  >
    <path d="M8 112c40-14 62-38 78-62" />
    <path d="M86 50c-14-18-30-30-24-40 6-9 22 4 24 40Z" />
    <path d="M86 50c10-20 28-34 36-26 8 9-12 22-36 26Z" />
    <path d="M86 50c18 6 44 18 62 40 14 17 30 22 44 14" />
    <path d="M86 50c-4 12-2 24 6 34" />
  </svg>
);

/** Single-stem line-art flower (original artwork). Inherits colour via currentColor. */
export const Flower = (p: P) => (
  <svg
    viewBox="24 10 72 150"
    fill="none"
    stroke="currentColor"
    // strokeWidth="1.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={"2em"}
    height={"2em"}
    {...p}
  >
    {[0, 72, 144, 216, 288].map((a) => (
      <g key={a} transform={`rotate(${a} 60 50)`}>
        <path d="M60 45c-8-5-13-17-6-27 2-3 4-4 6-4s4 1 6 4c7 10 2 22-6 27Z" />
        <path d="M60 41c-1-6-1-13 0-20" />
      </g>
    ))}
    <circle cx="60" cy="50" r="3.6" />
    <path d="M60 54c-2 22 4 38 1 58s-5 28-2 44" />
    <path d="M60 104c-5-13-17-22-31-21 3 14 15 21 31 21Z" />
    <path d="M60 104c-9-7-18-13-27-18" />
    <path d="M60 126c4-15 14-25 29-26-2 15-13 24-29 26Z" />
    <path d="M60 126c8-8 16-15 25-22" />
  </svg>
);

export const NamibiaFlag = (p: P) => (
  <svg viewBox="0 0 30 20" {...p}>
    <rect width="30" height="20" fill="#009543" />
    <path d="M0 0h30L0 20z" fill="#003580" />
    <path d="M0 20 30 0v4.5L6.8 20z" fill="#fff" />
    <path
      d="M0 18.2 27.3 0H30v1.8L2.7 20H0z"
      fill="#d21034"
      transform="translate(1.6 0.9)"
    />
    <circle cx="6" cy="5.5" r="2.4" fill="#ffce00" />
  </svg>
);
