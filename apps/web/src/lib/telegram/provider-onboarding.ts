import type {ServerEnv} from '@/lib/env';

export type BotLocale = 'es-AR' | 'ru' | 'en';
import {parseCategoryAlias} from '@/lib/categories';
import {parseBarrioAlias} from '@/lib/barrios';

export type OnboardingStep = 'category' | 'barrio' | 'description' | 'price' | 'photo' | 'confirm';

const copy: Record<BotLocale, Record<OnboardingStep | 'welcome' | 'submitted' | 'submissionFailed' | 'invalidPrice' | 'approved' | 'rejected' | 'suspended' | 'reportReason' | 'reportDetails' | 'reportSubmitted' | 'reportRateLimited' | 'support' | 'supportSubmitted' | 'supportFailed' | 'supportRateLimited', string>> = {
  'es-AR': {
    welcome: '¡Bien! Vamos a crear tu perfil profesional en BuenServ.',
    category: '¿Qué servicio ofrecés? Respondé con una categoría.',
    barrio: '¿En qué barrio trabajás? Por ejemplo: Palermo.',
    description: 'Contanos brevemente sobre tu experiencia y el servicio que ofrecés.',
    price: 'Ingresá un precio orientativo en ARS, solo números. Ejemplo: 18000.',
    photo: 'Enviá una foto clara para tu perfil profesional.',
    confirm: 'Revisá los datos. Escribí CONFIRMAR para enviarlo a moderación.',
    submitted: '¡Listo! Tu perfil fue enviado a moderación. Te avisaremos por este chat.',
    submissionFailed: 'No pudimos enviar el perfil ahora. Esperá un momento y escribí CONFIRMAR otra vez.',
    approved: '¡Tu perfil fue aprobado! Ya puede aparecer en el directorio de BuenServ.',
    rejected: 'Tu perfil necesita algunos ajustes antes de publicarse. Revisá el motivo enviado por el equipo de BuenServ.',
    suspended: 'Tu perfil fue suspendido temporalmente del directorio. Revisá el motivo enviado por el equipo de BuenServ.',
    reportReason: '¿Cuál es el motivo? Respondé: perfil, respuesta, spam, seguridad u otro.',
    reportDetails: 'Contanos qué pasó con un poco más de detalle.',
    reportSubmitted: 'Gracias. Recibimos tu reporte y lo revisaremos.',
    reportRateLimited: 'Ya enviaste varios reportes recientemente. Probá de nuevo más tarde.',
    support: 'Hola. Contanos cómo podemos ayudarte con un poco de detalle.',
    supportSubmitted: 'Gracias. Recibimos tu consulta y el equipo de BuenServ la revisará.',
    supportFailed: 'No pudimos enviar tu consulta ahora. Esperá un momento y escribí tu mensaje otra vez.',
    supportRateLimited: 'Ya enviaste varias consultas recientemente. Probá de nuevo más tarde.',
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
    submissionFailed: 'Сейчас не удалось отправить профиль. Подождите немного и снова напишите ПОДТВЕРДИТЬ.',
    approved: 'Ваш профиль одобрен! Теперь он может появиться в каталоге BuenServ.',
    rejected: 'Профилю нужны небольшие правки перед публикацией. Посмотрите причину от команды BuenServ.',
    suspended: 'Ваш профиль временно снят из каталога. Посмотрите причину от команды BuenServ.',
    reportReason: 'Укажите причину: профиль, ответ, спам, безопасность или другое.',
    reportDetails: 'Расскажите подробнее, что произошло.',
    reportSubmitted: 'Спасибо. Мы получили жалобу и рассмотрим её.',
    reportRateLimited: 'Вы уже недавно отправили несколько жалоб. Попробуйте позже.',
    support: 'Здравствуйте. Расскажите подробнее, как мы можем помочь.',
    supportSubmitted: 'Спасибо. Мы получили обращение, и команда BuenServ его рассмотрит.',
    supportFailed: 'Сейчас не удалось отправить обращение. Подождите немного и снова напишите сообщение.',
    supportRateLimited: 'Вы уже недавно отправили несколько обращений. Попробуйте позже.',
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
    submissionFailed: 'We could not submit your profile right now. Please wait a moment and type CONFIRM again.',
    approved: 'Your profile was approved! It can now appear in the BuenServ directory.',
    rejected: 'Your profile needs a few updates before publication. Please review the reason from the BuenServ team.',
    suspended: 'Your profile was temporarily removed from the directory. Please review the reason from the BuenServ team.',
    reportReason: 'What is the reason? Reply: profile, response, spam, safety or other.',
    reportDetails: 'Tell us what happened in a little more detail.',
    reportSubmitted: 'Thank you. We received your report and will review it.',
    reportRateLimited: 'You have sent several reports recently. Please try again later.',
    support: 'Hello. Tell us how we can help in a little more detail.',
    supportSubmitted: 'Thank you. We received your request and the BuenServ team will review it.',
    supportFailed: 'We could not send your request right now. Please wait a moment and send your message again.',
    supportRateLimited: 'You have sent several support requests recently. Please try again later.',
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

/** Category labels for keyboard buttons, keyed by locale. */
const CATEGORY_LABELS: Record<BotLocale, string[]> = {
  'es-AR': ['Limpieza', 'Reparaciones', 'Mascotas', 'Mudanzas', 'Clases', 'Mensajería', 'Taxi'],
  ru: ['Уборка', 'Ремонт', 'Питомцы', 'Переезды', 'Занятия', 'Курьеры', 'Такси'],
  en: ['Cleaning', 'Repairs', 'Pets', 'Moving', 'Lessons', 'Delivery', 'Taxi']
};

/** Barrio labels for keyboard buttons, keyed by locale. */
const BARRIO_LABELS: Record<BotLocale, string[]> = {
  'es-AR': ['Palermo', 'Recoleta', 'Belgrano', 'Caballito'],
  ru: ['Палермо', 'Реколета', 'Бельграно', 'Кабальито'],
  en: ['Palermo', 'Recoleta', 'Belgrano', 'Caballito']
};

/** Build a 2-column ReplyKeyboardMarkup from a list of labels. */
function keyboardButtons(labels: string[]): {keyboard: Array<Array<{text: string}>>; resize_keyboard: true; one_time_keyboard: true} {
  const rows: Array<Array<{text: string}>> = [];
  for (let i = 0; i < labels.length; i += 2) {
    rows.push(labels.slice(i, i + 2).map(text => ({text})));
  }
  return {keyboard: rows, resize_keyboard: true, one_time_keyboard: true};
}

/** Send a message with a reply keyboard. */
export async function sendTelegramKeyboard(env: ServerEnv, chatId: number, text: string, labels: string[]) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({chat_id: chatId, text, reply_markup: keyboardButtons(labels)})
  });
  if (!response.ok) throw new Error(`Telegram sendKeyboard failed: ${response.status}`);
}

/** Remove the reply keyboard (call after a keyboard step is completed). */
export async function removeTelegramKeyboard(env: ServerEnv, chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({chat_id: chatId, text, reply_markup: {remove_keyboard: true}})
  });
  if (!response.ok) throw new Error(`Telegram removeKeyboard failed: ${response.status}`);
}

export function categoryKeyboard(locale: BotLocale) { return CATEGORY_LABELS[locale]; }
export function barrioKeyboard(locale: BotLocale) { return BARRIO_LABELS[locale]; }

export function parseArsPrice(value: string) {
  const normalized = value.trim().replace(/[.\s]/g, '').replace(',', '.');
  const price = Number(normalized);
  return Number.isFinite(price) && price > 0 && price <= 100_000_000 ? Math.round(price) : null;
}

export function parseCategory(value: string) { return parseCategoryAlias(value); }
export function parseBarrio(value: string) { return parseBarrioAlias(value); }
export function isConfirmation(value: string) { return ['confirmar', 'подтвердить', 'confirm'].includes(value.trim().toLowerCase()); }
export function rateLimitCopyKey(flow: 'report' | 'support') {
  return flow === 'report' ? 'reportRateLimited' : 'supportRateLimited';
}

export function parseReportReason(value: string) {
  const key = value.trim().toLowerCase();
  if (['perfil', 'profile', 'профиль'].includes(key)) return 'profile_mismatch';
  if (['respuesta', 'response', 'ответ'].includes(key)) return 'no_response';
  if (['spam', 'спам'].includes(key)) return 'spam';
  if (['seguridad', 'safety', 'безопасность'].includes(key)) return 'safety';
  if (['otro', 'other', 'другое'].includes(key)) return 'other';
  return null;
}
