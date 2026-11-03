# Синхронизация прогресса (Supabase)

Пока `supabase-config.js` пустой, сайт работает только с `localStorage`, как раньше.

## Один раз настроить Supabase

1. **supabase.com** → Start your project → войти через GitHub.
2. **New project**: имя `mi-espanol`, регион Central EU (Frankfurt), пароль базы сгенерировать и сохранить. Тариф Free.
3. **SQL Editor** → New query → вставить содержимое `supabase/schema.sql` → **Run**.
4. **Authentication → URL Configuration**:
   - Site URL: `https://mersanns.github.io/mi-espanol/`
   - Redirect URLs → Add URL: `https://mersanns.github.io/mi-espanol/`
5. **Authentication → Emails → Magic Link**: в текст письма добавить строку
   `<p>Код для входа: {{ .Token }}</p>` → Save.
   Он нужен для приложения на iPhone: ссылка из письма откроется в Safari, а не в приложении, поэтому там вводят код.
6. **Project Settings → API Keys**: скопировать Project URL и publishable-ключ (`sb_publishable_…`) и вписать их в `supabase-config.js`.

Publishable-ключ публичный: его можно хранить в коде, потому что каждый пользователь видит только свою строку (правила RLS в `schema.sql`).

## Как это работает

- Вход: вкладка «Progreso» → «Синхронизация» → e-mail → ссылка или код из письма.
- Синхронизируются коробки карточек, решённые упражнения и ответы в них, «Sobre mí», мои факты, дни занятий, очки, ошибки и режим курса.
- Состояния двух устройств сливаются, ничего не теряется: для каждой карточки и упражнения берётся последний ответ, дни и очки берутся по максимуму, факты объединяются.
- Без интернета всё сохраняется локально и уходит на сервер, когда связь вернётся.
- «Сбросить прогресс» сбрасывает прогресс на всех устройствах.
