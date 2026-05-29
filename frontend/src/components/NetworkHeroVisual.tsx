import { Router, Server, Wifi, Cable } from "lucide-react";

const nodes = [
  { Icon: Wifi, className: "left-[12%] top-[18%]", delay: "0s" },
  { Icon: Server, className: "right-[10%] top-[20%]", delay: "-2s" },
  { Icon: Cable, className: "left-[14%] bottom-[22%]", delay: "-4s" },
  { Icon: Wifi, className: "right-[12%] bottom-[20%]", delay: "-3s" },
];

export default function NetworkHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,520px)] aspect-[5/4] sm:aspect-square">
      <div className="absolute inset-0 overflow-hidden rounded-[var(--ns-radius-card)] border border-ns-border bg-ns-elevated">
        <svg
          className="absolute inset-0 h-full w-full text-ns-muted"
          viewBox="0 0 400 400"
          aria-hidden
        >
          <line x1="200" y1="200" x2="80" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="200" y1="200" x2="320" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="200" y1="200" x2="80" y2="300" stroke="currentColor" strokeWidth="1" />
          <line x1="200" y1="200" x2="320" y2="300" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="200" r="4" fill="currentColor" className="text-ns-accent" />
        </svg>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-ns-float">
          <div className="flex h-16 w-16 items-center justify-center rounded-[14px] border border-ns-border bg-ns-hover">
            <Router size={28} className="text-ns-accent" strokeWidth={1.5} />
          </div>
        </div>

        {nodes.map(({ Icon, className, delay }, i) => (
          <div
            key={i}
            className={`absolute ${className} flex h-12 w-12 animate-ns-float items-center justify-center rounded-[12px] border border-ns-border bg-ns-bg-secondary`}
            style={{ animationDelay: delay }}
          >
            <Icon size={20} className="text-ns-icon" strokeWidth={1.5} />
          </div>
        ))}
      </div>
    </div>
  );
}
