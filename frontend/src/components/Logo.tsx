export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="64" height="64" rx="14" fill="#161616" />
      <circle cx="32" cy="32" r="5.5" fill="white" fillOpacity="0.95" />
      <circle cx="13" cy="20" r="4" fill="white" fillOpacity="0.7" />
      <circle cx="51" cy="20" r="4" fill="white" fillOpacity="0.7" />
      <circle cx="13" cy="44" r="4" fill="white" fillOpacity="0.7" />
      <circle cx="51" cy="44" r="4" fill="white" fillOpacity="0.7" />
      <line x1="32" y1="26.5" x2="15.5" y2="22.5" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="26.5" x2="48.5" y2="22.5" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="37.5" x2="15.5" y2="41.5" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="37.5" x2="48.5" y2="41.5" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
