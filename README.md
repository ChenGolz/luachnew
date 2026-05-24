# לוח בית חכם למחלות שכחה / דמנציה

פרויקט React/Vite בעברית, מוכן להעלאה ל-GitHub ולפריסה ב-GitHub Pages.

## תיקון למסך לבן ב-GitHub Pages

הגרסה הזו לא משתמשת ב-`main.js` ידני. אם בריפוזיטורי הישן יש קבצים כמו `main.js` או `index.html` ישן שמפנה אל `main.js`, מחקו/החליפו אותם בכל הקבצים מתוך ה-ZIP הזה.

האתר נבנה על ידי Vite ו-GitHub Actions, ולכן הקבצים האמיתיים נוצרים אוטומטית תחת `dist/assets` בזמן הפריסה.

## מה יש בפנים

- מסך מטופלת פשוט וברור: איפה אני, מה עכשיו, מה הדבר הבא, למי להתקשר.
- מסך מטפל לניהול שגרה, תרופות, אוכל/שתייה, אנשי קשר, בטיחות ויומן תסמינים.
- מצב הרגעה עם הקראה קולית בעברית באמצעות Web Speech API.
- ממשק ערב/לילה רגוע יותר לפי השעה.
- שעון דיגיטלי + שעון מחוגים + פס התקדמות יומי.
- חיוג בלחיצה, QR לחיוג ממכשיר אחר, וקישור אופציונלי לשיחת וידאו.
- שמירה מקומית ב-localStorage כברירת מחדל.
- Adapter מוכן לסנכרון Supabase בענן.

## הרצה מקומית

```bash
npm install
npm run dev
```

לאחר מכן פותחים את הכתובת שמופיעה בטרמינל, בדרך כלל:

```txt
http://localhost:5173
```

## העלאה ל-GitHub Pages

1. צרו ריפוזיטורי, לדוגמה `luach`.
2. העלו את כל הקבצים מתוך התיקייה הזו לשורש הריפוזיטורי.
3. ב-GitHub היכנסו אל **Settings → Pages**.
4. תחת **Build and deployment** בחרו **GitHub Actions**.
5. דחפו/העלו את הקבצים ל-branch `main`.
6. היכנסו ל-**Actions** וודאו שהפריסה הסתיימה בירוק.

האתר יופיע בדרך כלל בכתובת:

```txt
https://YOUR_USER.github.io/YOUR_REPO/
```

לדוגמה:

```txt
https://chengolz.github.io/luach/
```

## אם עדיין מופיע מסך לבן

פתחו DevTools → Console. אם מופיעה שגיאה על `main.js 404`, זה אומר שעדיין נשאר בריפוזיטורי `index.html` ישן. ודאו שה-`index.html` בשורש נראה כך:

```html
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <title>לוח בית חכם למחלות שכחה</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## Supabase — אופציונלי

כרגע הכול נשמר מקומית בדפדפן. להפעלת סנכרון ענן:

1. צרו פרויקט Supabase.
2. הריצו את ה-SQL הבא:

```sql
create table memory_board_state (
  board_id text not null,
  state_key text not null,
  value jsonb not null,
  updated_at timestamptz default now(),
  primary key (board_id, state_key)
);

alter table memory_board_state enable row level security;

create policy "allow anon read" on memory_board_state
for select to anon
using (true);

create policy "allow anon insert" on memory_board_state
for insert to anon
with check (true);

create policy "allow anon update" on memory_board_state
for update to anon
using (true)
with check (true);
```

3. ב-GitHub הוסיפו Repository Variables או Secrets:

```txt
VITE_CLOUD_SYNC_ENABLED=true
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_BOARD_ID=grandma-home-board
```

4. הריצו מחדש את ה-workflow.

## הערה חשובה

הכלי הזה לא מחליף ייעוץ רפואי או הנחיות רופא/ה. בתרופות, נפילות, שוטטות או שינוי פתאומי במצב — מומלץ לערב גורם רפואי מתאים.
