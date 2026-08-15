export interface CategoryDef {
  slug: string;
  name: { "es-AR": string; ru: string; en: string };
  icon: string;
  color: string;
}

export const CANONICAL_CATEGORIES: CategoryDef[] = [
  {
    slug: "limpieza",
    name: { "es-AR": "Limpieza", ru: "Уборка", en: "Cleaning" },
    icon: "Sparkles",
    color: "#0FA37F",
  },
  {
    slug: "reparaciones",
    name: { "es-AR": "Reparaciones", ru: "Ремонт", en: "Repairs" },
    icon: "Wrench",
    color: "#0FA37F",
  },
  {
    slug: "mascotas",
    name: { "es-AR": "Mascotas", ru: "Питомцы", en: "Pet Care" },
    icon: "Dog",
    color: "#0FA37F",
  },
  {
    slug: "mudanzas",
    name: { "es-AR": "Mudanzas", ru: "Переезды", en: "Moving & Cargo" },
    icon: "Truck",
    color: "#0FA37F",
  },
  {
    slug: "clases",
    name: { "es-AR": "Clases", ru: "Занятия", en: "Tutoring & Lessons" },
    icon: "GraduationCap",
    color: "#0FA37F",
  },
  {
    slug: "mensajeria",
    name: { "es-AR": "Mensajería", ru: "Курьеры", en: "Courier & Delivery" },
    icon: "Package",
    color: "#0FA37F",
  },
  {
    slug: "taxi-traslados",
    name: { "es-AR": "Taxi y traslados", ru: "Такси и трансферы", en: "Rides & Airport" },
    icon: "Car",
    color: "#0FA37F",
  },
];

export const BUENOS_AIRES_BARRIOS: string[] = [
  "Palermo",
  "Recoleta",
  "Belgrano",
  "Caballito",
  "San Telmo",
  "Colegiales",
  "Villa Urquiza",
  "Almagro",
  "Núñez",
  "Villa Crespo",
  "Puerto Madero",
  "Microcentro",
  "Villa Devoto",
  "Chacarita",
];
