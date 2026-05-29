import { useState } from "react";
import { resolveMediaUrl } from "../lib/media";

type MediaImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src: string | null | undefined;
};

export default function MediaImage({ src, alt = "", className, ...props }: MediaImageProps) {
  const resolved = resolveMediaUrl(src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-ns-hover text-ns-muted ${className ?? ""}`}
        aria-hidden={!alt}
      >
        <span className="text-2xl opacity-40">📦</span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
