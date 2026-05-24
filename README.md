# לוח בית חכם למחלות שכחה — גרסה סטטית ל-GitHub Pages

הגרסה הזו נועדה לפתור בדיוק את בעיית `main.js 404`.

אין כאן React/Vite, אין npm, אין build, ואין GitHub Actions חובה.  
אלה קבצים סטטיים בלבד ש-GitHub Pages יכול להציג ישירות.

## הקבצים החשובים

- `index.html`
- `main.js`
- `style.css`
- `favicon.svg`
- `.nojekyll`

## העלאה ל-GitHub

1. היכנסו לריפוזיטורי, למשל `luachnew`.
2. מחקו את הקבצים הישנים, במיוחד `index.html` ישן שמפנה ל-main.js לא קיים.
3. העלו את **כל הקבצים שבתוך התיקייה הזו** לשורש הריפוזיטורי.
4. ודאו ש-`main.js` נמצא ממש ליד `index.html`.

המבנה צריך להיות:

```txt
/
├─ index.html
├─ main.js
├─ style.css
├─ favicon.svg
├─ .nojekyll
└─ README.md
```

## הגדרת GitHub Pages

Settings → Pages → Build and deployment:

בחרו:
- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

לא צריך GitHub Actions בגרסה הזו.

## בדיקה

האתר יהיה בכתובת דומה:

```txt
https://USERNAME.github.io/REPOSITORY/
```

לדוגמה:

```txt
https://chengolz.github.io/luachnew/
```

## Supabase

בתוך `main.js` יש `CLOUD_SYNC_CONFIG`.  
ברירת המחדל היא:

```js
enabled: false
```

כלומר האתר עובד כרגע עם `localStorage`.

להפעלה עתידית של סנכרון ענן:
1. צרו Supabase project.
2. צרו טבלה:

```sql
create table memory_board_state (
  board_id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
```

3. הכניסו את `supabaseUrl` ואת `supabaseAnonKey`.
4. שנו `enabled` ל-`true`.

## חשוב

אם בקונסול עדיין מופיע:

```txt
Failed to load resource: main.js 404
```

זה אומר ש-`main.js` לא נמצא באותו מקום כמו `index.html`, או ש-GitHub Pages עדיין מציג גרסה ישנה. נסו:
- Ctrl+F5
- מחיקת כל הקבצים הישנים
- העלאה מחדש
- המתנה של 1-2 דקות ל-GitHub Pages
