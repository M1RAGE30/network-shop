import { Truck, Shield, Headphones } from "lucide-react";
import NetworkHeroVisual from "../components/NetworkHeroVisual";
import { ButtonLink } from "../components/ui/Button";

const WHY = [
  {
    icon: Truck,
    title: "Быстрая доставка",
    desc: "Отправка в день заказа по Беларуси. Отслеживание статуса в личном кабинете.",
  },
  {
    icon: Shield,
    title: "Гарантия качества",
    desc: "Оригинальное оборудование с официальной гарантией и проверкой перед отгрузкой.",
  },
  {
    icon: Headphones,
    title: "Поддержка 24/7",
    desc: "Инженеры помогут с подбором, монтажом и настройкой сети в любое время.",
  },
];

export default function HomePage() {
  return (
    <div className="relative ns-reduce-motion">
      <section className="ns-container ns-hero-section ns-home-hero pb-10 sm:pb-16 md:pb-20 lg:pb-24">
        <div className="ns-home-hero__layout">
          <div className="ns-hero-stagger ns-home-hero__copy flex flex-col gap-5 sm:gap-6 lg:gap-8">
            <p className="ns-caption uppercase tracking-wide">Профессиональное сетевое оборудование</p>
            <h1 className="ns-heading-hero">Сетевые решения для дома и бизнеса</h1>
            <p className="ns-body-secondary">
              Маршрутизаторы, коммутаторы, точки доступа и кабельная инфраструктура —
              подбор оборудования, конструкторы топологии и доставка в одном магазине.
            </p>
            <div className="ns-home-hero__actions pt-1 sm:pt-2 lg:pt-4">
              <ButtonLink
                to="/catalog"
                variant="primary"
                className="w-full min-[420px]:w-auto px-8 justify-center"
              >
                Каталог
              </ButtonLink>
              <ButtonLink
                to="/builder/network"
                variant="secondary"
                className="w-full min-[420px]:w-auto px-8 justify-center"
              >
                Конструктор сети
              </ButtonLink>
            </div>
          </div>
          <div className="ns-hero-visual ns-home-hero__visual">
            <NetworkHeroVisual />
          </div>
        </div>
      </section>

      <section className="ns-container ns-section-y ns-home-why">
        <h2 className="ns-heading-section text-center mb-6 sm:mb-8 md:mb-10">
          Почему выбирают нас
        </h2>
        <div className="ns-home-why__grid">
          {WHY.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="ns-card flex flex-col ns-card-padding min-h-0 sm:min-h-[220px] lg:min-h-[240px]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ns-hover text-ns-icon">
                <Icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="ns-heading-card mb-2">{title}</h3>
              <p className="ns-body-secondary flex-1">{desc}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
