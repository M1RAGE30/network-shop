import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import {
  buildRouterSetupGuide,
  type RouterProductInput,
} from "../lib/routerSetupGuides";

interface RouterSetupGuideSectionProps {
  product: RouterProductInput;
}

export default function RouterSetupGuideSection({
  product,
}: RouterSetupGuideSectionProps) {
  const guide = useMemo(() => buildRouterSetupGuide(product), [product]);

  return (
    <section className="rounded-[2rem] px-1 sm:px-2">
      <div className="flex items-start gap-3 mb-6 sm:mb-8">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-ns-hover text-ns-icon">
          <BookOpen size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-ns-text leading-snug">
            {guide.title}
          </h2>
          <p className="text-sm text-ns-muted mt-2 leading-relaxed">
            {guide.intro}
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {guide.steps.map((step, index) => (
          <li
            key={index}
            className="flex gap-3 sm:gap-4 p-4 rounded-xl ns-chip text-sm text-ns-text leading-relaxed"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-btn)] bg-ns-accent text-ns-accent-fg text-xs font-bold tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      {guide.tip && (
        <p className="mt-5 text-sm text-ns-text-secondary leading-relaxed p-4 rounded-xl bg-ns-hover border border-ns-border">
          <span className="font-semibold text-ns-text">Совет: </span>
          {guide.tip}
        </p>
      )}
    </section>
  );
}
