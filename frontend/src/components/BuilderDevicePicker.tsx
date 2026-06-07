import { useMemo } from "react";
import { selectCls } from "../lib/uiClasses";
import {
  type BuilderProduct,
  formatBuilderProductLabel,
  sortBuilderProducts,
} from "../lib/builderProducts";

type BuilderDevicePickerProps = {
  routers: BuilderProduct[];
  accessPoints: BuilderProduct[];
  value: number | null;
  onChange: (productId: number) => void;
};

export default function BuilderDevicePicker({
  routers,
  accessPoints,
  value,
  onChange,
}: BuilderDevicePickerProps) {
  const sortedRouters = useMemo(
    () => sortBuilderProducts(routers),
    [routers],
  );
  const sortedAps = useMemo(
    () => sortBuilderProducts(accessPoints),
    [accessPoints],
  );

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className={selectCls}
      aria-label="Выбор устройства"
    >
      {sortedRouters.length > 0 && (
        <optgroup label="Маршрутизаторы">
          {sortedRouters.map((product) => (
            <option key={product.id} value={product.id}>
              {formatBuilderProductLabel(product)}
            </option>
          ))}
        </optgroup>
      )}
      {sortedAps.length > 0 && (
        <optgroup label="Точки доступа">
          {sortedAps.map((product) => (
            <option key={product.id} value={product.id}>
              {formatBuilderProductLabel(product)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
