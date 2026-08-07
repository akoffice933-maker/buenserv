import type {ServerEnv} from '@/lib/env';

export type BotLocale = 'es-AR' | 'ru' | 'en';
export type OnboardingStep = 'category' | 'barrio' | 'description' | 'price' | 'photo' | 'confirm';

const copy: Record<BotLocale, Record<OnboardingStep | 'welcome' | 'submitted' | 'invalidPrice', string>> = {
  'es-AR': {
    welcome: '¡Bien! Vamos a crear tu perfil profesional en BuenServ.',
    category: '¿Qué servicio ofrecés? Respondé con una categoría.',
    barrio: '¿En qué barrio trabajás? Por ejemplo: Palermo.',
    description: 'Contanos brevemente sobre tu experiencia y el servicio que ofrecés.',
    price: 'Ingresá un precio orientativo en ARS, solo números. Ejemplo: 18000.',
    photo: 'Enviá una foto clara para tu perfil profesional.',
    confirm: 'Revisá los datos. Escribí CONFIRMAR para enviarlo a moderación.',
    submitted: '¡Listo! Tu perfil fue enviado a moderación. Te avisaremos por este chat.',
    invalidPrice: 'Ingresá solo un número válido en ARS, sin símbolos.'
  },
  ru: {
    welcome: 'Отлично! Давайте создадим ваш профессиональный профиль в BuenServ.',
    category: 'Какую услугу вы предлагаете? Ответьте названием категории.',
    barrio: 'В каком районе вы работаете? Например: Palermo.',
    description: 'Коротко расскажите об опыте и услуге, которую вы предлагаете.',
    price: 'Укажите ориентировочную цену в ARS, только цифры. Например: 18000.',
    photo: 'Отправьте чёткую фотографию для профессионального профиля.',
    confirm: 'Проверьте данные. Напишите ПОДТВЕРДИТЬ, чтобы отправить профиль на модерацию.',
    submitted: 'Готово! Профиль отправлен на модерацию. Мы напишем вам в этом чате.',
    invalidPrice: 'Укажите корректную цену в ARS только цифрами, без символов.'
  },
  en: {
    welcome: 'Great! Let’s create your professional BuenServ profile.',
    category: 'What service do you offer? Reply with a category.',
    barrio: 'Which neighbourhood do you work in? For example: Palermo.',
    description: 'Tell us briefly about your experience and the service you offer.',
    price: 'Enter an indicative price in ARS, numbers only. Example: 18000.',
    photo: 'Send a clear photo for your professional profile.',
    confirm: 'Review your details. Type CONFIRM to send your profile for moderation.',
    submitted: 'Done! Your profile was sent for moderation. We will message you here.',
    invalidPrice: 'Enter a valid ARS price using numbers only, without symbols.'
  }
};

export function onboardingText(locale: BotLocale, key: keyof typeof copy['es-AR']) {
  return copy[locale]?.[key] ?? copy['es-AR'][key];
}

export async function sendTelegramMessage(env: ServerEnv, chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({chat_id: chatId, text})
  });
  if (!response.ok) throw new Error(`Telegram sendMessage failed: ${response.status}`);
}

export function parseArsPrice(value: string) {
  const normalized = value.trim().replace(/[.\s]/g, '').replace(',', '.');
  const price = Number(normalized);
  return Number.isFinite(price) && price > 0 && price <= 100_000_000 ? Math.round(price) : null;
}
