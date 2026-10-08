// The site's languages and every piece of interface text in each. The bio
// itself, which mixes text with logos, lives in app/[lang]/page.tsx.

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const hasLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

/** Each language's homepage: English at the root, Spanish under /es. */
export const HOME: Record<Locale, string> = { en: "/", es: "/es" };

/** Each language's name, in that language, for the language switch. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

/** Sky conditions from the weather service (see lib/weather.ts). */
export type Sky =
  | "clear"
  | "mostlyClear"
  | "partlyCloudy"
  | "cloudy"
  | "foggy"
  | "drizzly"
  | "rainy"
  | "snowy"
  | "showery"
  | "stormy";

const en = {
  ogLocale: "en_US",
  description:
    "Data Engineer at Intempo. B.S. in Computer Science from the University of Florida. Based in Madrid, Spain.",
  headline: "Data Engineer at Intempo",
  location: "Madrid, Spain",

  island: {
    menu: "Menu",
    site: "Site",
    soon: "soon",
    sections: { menu: "Menu", language: "Language", theme: "Theme" },
    home: "Home",
    projects: "Projects",
    writing: "Writing",
    themes: { light: "Light", dark: "Dark", system: "System" },
  },

  inMadrid: "in Madrid",
  sky: {
    clear: "clear",
    mostlyClear: "mostly clear",
    partlyCloudy: "partly cloudy",
    cloudy: "cloudy",
    foggy: "foggy",
    drizzly: "drizzly",
    rainy: "rainy",
    snowy: "snowy",
    showery: "showery",
    stormy: "stormy",
  } satisfies Record<Sky, string>,

  deck: {
    label: "About Aaron",
    carousel: "carousel",
    slide: "slide",
    cards: "Cards",
    next: "Next card",
    position: (i: number, n: number) => `${i} of ${n}`,
  },
  pages: { bio: "Bio", stack: "Stack", soon: "Coming soon" },
  comingSoon: "coming soon",

  tank: {
    label: "Tech stack",
    hover: "hover to sort",
    tap: "tap to sort",
    sorted: "my stack",
  },

  email: {
    copy: (email: string) => `Copy email address ${email}`,
    copied: "copied!",
    announced: "Email copied to clipboard",
  },
  gators: { play: "Go Gators!", stop: "Stop the chant" },
  previews: {
    contributions: (n: number) => `${n} contributions in the last year`,
    connect: "Connect",
    follow: "Follow",
  },
  logos: {
    gators: "Florida Gators logo",
    fabric: "Microsoft Fabric logo",
    azureMl: "Azure Machine Learning logo",
    soundcloud: "SoundCloud logo",
  },

  madeWith: "made with",
  source: "see source code",
};

export type Dictionary = typeof en;

const es: Dictionary = {
  ogLocale: "es_ES",
  description:
    "Data Engineer en Intempo. Grado en Ciencias de la Computación por la Universidad de Florida. En Madrid, España.",
  headline: "Data Engineer en Intempo",
  location: "Madrid, España",

  island: {
    menu: "Menú",
    site: "Sitio",
    soon: "pronto",
    sections: { menu: "Menú", language: "Idioma", theme: "Tema" },
    home: "Inicio",
    projects: "Proyectos",
    writing: "Escritos",
    themes: { light: "Claro", dark: "Oscuro", system: "Sistema" },
  },

  inMadrid: "en Madrid",
  sky: {
    clear: "despejado",
    mostlyClear: "casi despejado",
    partlyCloudy: "parcialmente nublado",
    cloudy: "nublado",
    foggy: "con niebla",
    drizzly: "con llovizna",
    rainy: "lluvioso",
    snowy: "nevando",
    showery: "con chubascos",
    stormy: "tormentoso",
  },

  deck: {
    label: "Sobre Aaron",
    carousel: "carrusel",
    slide: "tarjeta",
    cards: "Tarjetas",
    next: "Siguiente tarjeta",
    position: (i, n) => `${i} de ${n}`,
  },
  pages: { bio: "Bio", stack: "Stack", soon: "Próximamente" },
  comingSoon: "próximamente",

  tank: {
    label: "Stack tecnológico",
    hover: "pasa el cursor para ordenar",
    tap: "toca para ordenar",
    sorted: "mi stack",
  },

  email: {
    copy: (email) => `Copiar la dirección de correo ${email}`,
    copied: "¡copiado!",
    announced: "Correo copiado al portapapeles",
  },
  gators: { play: "Go Gators!", stop: "Parar el cántico" },
  previews: {
    contributions: (n) => `${n} contribuciones en el último año`,
    connect: "Conectar",
    follow: "Seguir",
  },
  logos: {
    gators: "Logo de los Florida Gators",
    fabric: "Logo de Microsoft Fabric",
    azureMl: "Logo de Azure Machine Learning",
    soundcloud: "Logo de SoundCloud",
  },

  madeWith: "hecho con",
  source: "ver código fuente",
};

export const DICTIONARIES: Record<Locale, Dictionary> = { en, es };
