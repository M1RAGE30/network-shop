import {
  AddressSuggestions,
  DaDataAddress,
  DaDataSuggestion,
} from "react-dadata";
import "react-dadata/dist/react-dadata.css";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
}

export default function AddressInput({
  value,
  onChange,
  error,
  touched,
}: AddressInputProps) {
  const token = (import.meta.env.VITE_DADATA_API_TOKEN as string | undefined)?.trim();
  const canUseDaData = !!token && token.length > 20;

  const suggestion: DaDataSuggestion<DaDataAddress> | undefined = value
    ? { value, unrestricted_value: value, data: {} as DaDataAddress }
    : undefined;

  return (
    <div>
      <label className="block text-sm font-semibold text-ns-text mb-2">
        Адрес доставки
      </label>
      {canUseDaData ? (
        <AddressSuggestions
          token={token}
          value={suggestion}
          onChange={(s) => onChange(s?.value ?? "")}
          filterLocations={[{ country: "Беларусь" }]}
          filterLocationsBoost={[{ country: "Беларусь" }]}
          inputProps={{
            placeholder: "г. Минск, ул. Ленина, д. 1",
            className: `w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all bg-ns-input text-ns-text placeholder:text-ns-muted ${
              touched && error
                ? "ring-2 ring-red-500"
                : "focus:ring-2 focus:ring-ns-accent"
            }`,
          }}
          suggestionsClassName="z-50"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="г. Минск, ул. Ленина, д. 1"
          className={`w-full rounded-xl border border-ns-border px-4 py-3 text-sm focus:outline-none transition-all bg-ns-input text-ns-text placeholder:text-ns-muted ${
            touched && error
              ? "ring-2 ring-red-500"
              : "focus:ring-2 focus:ring-ns-accent"
          }`}
        />
      )}
      {!canUseDaData && (
        <p className="text-xs text-ns-muted mt-1.5">
          Подсказки адреса временно отключены (нет корректного токена DaData).
        </p>
      )}
      {touched && error && (
        <p className="text-red-500 text-xs font-medium mt-1.5">{error}</p>
      )}
    </div>
  );
}
