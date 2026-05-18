import { ButtonLink } from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center max-w-lg mx-auto">
      <p className="text-[120px] sm:text-[160px] font-semibold leading-none text-ns-text tracking-tighter mb-6">
        404
      </p>
      <h1 className="text-2xl font-semibold text-ns-text mb-3">Страница не найдена</h1>
      <p className="text-ns-text-secondary mb-10 max-w-sm">
        Адрес введён неверно или страница была удалена.
      </p>
      <ButtonLink to="/" variant="primary" className="min-h-[48px] px-8">
        На главную
      </ButtonLink>
    </div>
  );
}
