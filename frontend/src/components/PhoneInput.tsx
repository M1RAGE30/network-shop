import { authFieldError, authLabel } from "../lib/authFormStyles";
import { inputCls } from "../lib/uiClasses";

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
      <label className={authLabel}>Номер телефона</label>
      <input
        type="tel"
        placeholder="+375 XX XXX-XX-XX"
        value={value || "+375 "}
        onChange={handleChange}
        onFocus={() => {
          if (!value) onChange("+375 ");
        }}
        className={`${inputCls} ${
          touched && error ? "ring-2 ring-ns-error" : ""
        }`}
      />
      {touched && error && <p className={authFieldError}>{error}</p>}
    </div>
  );
}
