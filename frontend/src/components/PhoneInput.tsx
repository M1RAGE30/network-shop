interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  error,
  touched,
}: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const digits = raw.startsWith("375") ? raw.slice(3) : raw;
    const limited = digits.slice(0, 9);
    let formatted = "+375";
    if (limited.length > 0) formatted += " " + limited.slice(0, 2);
    if (limited.length > 2) formatted += " " + limited.slice(2, 5);
    if (limited.length > 5) formatted += "-" + limited.slice(5, 7);
    if (limited.length > 7) formatted += "-" + limited.slice(7, 9);
    onChange(formatted);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-ns-text mb-2">
        Номер телефона
      </label>
      <input
        type="tel"
        placeholder="+375 XX XXX-XX-XX"
        value={value || "+375 "}
        onChange={handleChange}
        onFocus={() => {
          if (!value) onChange("+375 ");
        }}
        className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all bg-ns-input text-ns-text placeholder:text-ns-muted  ${
          touched && error
            ? "ring-2 ring-red-500"
            : "focus:ring-2 focus:ring-ns-accent"
        }`}
      />
      {touched && error && (
        <p className="text-red-500 text-xs font-medium mt-1.5">{error}</p>
      )}
    </div>
  );
}
