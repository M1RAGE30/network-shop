import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { formatPrice } from "../lib/format";
import MediaImage from "./MediaImage";

interface OrderItemRowProps {
  item: any;
  index: number;
  linkToCatalog?: boolean;
}

export default function OrderItemRow({
  item,
  index,
  linkToCatalog = true,
}: OrderItemRowProps) {
  const productName =
    item.product?.name ||
    item.name ||
    item.title ||
    `Товар #${item.productId ?? index + 1}`;
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(
    item.price ?? item.unitPrice ?? item.product?.price ?? 0,
  );
  const slug = item.product?.slug;
  const imageUrl = item.product?.imageUrl;

  const content = (
    <>
      <div className="w-12 h-12 sm:w-14 sm:h-14 ns-thumb rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
        {imageUrl ? (
          <MediaImage
            src={imageUrl}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package size={24} strokeWidth={1.25} className="text-ns-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ns-text line-clamp-2 leading-snug">
          {productName}
        </p>
        <p className="text-xs text-ns-muted mt-1 tabular-nums">
          {quantity} шт. · {formatPrice(unitPrice)} за шт.
        </p>
      </div>
    </>
  );

  const rowClass =
    "flex items-center gap-3 p-3 rounded-xl ns-chip min-w-0 transition-colors";

  if (linkToCatalog && slug) {
    return (
      <Link
        to={`/catalog/${slug}`}
        className={`${rowClass} hover:bg-ns-hover cursor-pointer`}
      >
        {content}
      </Link>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
