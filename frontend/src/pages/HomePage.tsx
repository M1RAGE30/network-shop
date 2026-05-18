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
      <section className="ns-container-hero ns-hero-section pb-16 md:pb-20 lg:pb-24">
        <div className="flex flex-col gap-12 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center max-w-[1320px] mx-auto">
          <div className="ns-hero-stagger flex flex-col max-w-[620px] gap-6 lg:gap-8">
            <p className="ns-caption uppercase tracking-wide">Профессиональное сетевое оборудование</p>
            <h1 className="ns-heading-hero max-w-[650px]">Сетевые решения для дома и бизнеса</h1>
            <p className="ns-body-secondary max-w-[500px]">
              Маршрутизаторы, коммутаторы, точки доступа и кабельная инфраструктура —
              подбор оборудования, конструкторы топологии и доставка в одном магазине.
            </p>
            <div className="flex flex-col gap-3 w-full sm:flex-row sm:flex-wrap pt-2 lg:pt-4">
              <ButtonLink to="/catalog" variant="primary" className="px-8 justify-center">
                Каталог
              </ButtonLink>
              <ButtonLink to="/builder/network" variant="secondary" className="px-8 justify-center">
                Конструктор сети
              </ButtonLink>
            </div>
          </div>
          <div className="ns-hero-visual w-full max-w-[600px] mx-auto lg:justify-self-end lg:min-h-[500px]">
            <NetworkHeroVisual />
          </div>
        </div>
      </section>

      <section className="ns-container ns-section-y">
        <h2 className="ns-heading-section text-center mb-10 md:mb-12">Почему выбирают нас</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WHY.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="ns-card flex flex-col ns-card-padding min-h-[240px]">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[14px] bg-ns-hover text-ns-icon">
                <Icon size={24} strokeWidth={1.5} />
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
