import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  Heart,
  Home,
  Moon,
  Phone,
  Pill,
  Plus,
  Printer,
  QrCode,
  ShieldAlert,
  Sun,
  Trash2,
  UserRound,
  Users,
  Video,
  Volume2,
  Wifi,
} from "lucide-react";

/*
  לוח בית חכם למטופלת עם מחלת שכחה / דמנציה
  ------------------------------------------------
  מוכן ל-GitHub Pages.

  סנכרון ענן:
  כברירת מחדל עובד עם localStorage כדי שלא יישבר.
  להפעלת Supabase:
  1. צרו טבלה לפי ה-SQL ב-README.
  2. הכניסו VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY ב-GitHub Secrets או בקובץ .env.local.
  3. שנו את VITE_CLOUD_SYNC_ENABLED ל-true.
*/

const CLOUD_SYNC_CONFIG = {
  enabled: import.meta.env.VITE_CLOUD_SYNC_ENABLED === "true",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  boardId: import.meta.env.VITE_BOARD_ID || "grandma-home-board",
  tableName: "memory_board_state",
  pollMs: 5000,
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const defaultPerson = {
  firstName: "רחל",
  fullName: "רחל כהן",
  address: "רחוב הדוגמה 10, דירה 4",
  city: "תל אביב",
  stage: "middle",
  safeMessage: "זה הבית שלי. המשפחה יודעת איפה אני. אין צורך לצאת לבד. אם אני צריכה עזרה, אפשר להתקשר לנועה.",
  identityNote: "אני רחל. אני אהובה. המשפחה שלי דואגת לי. היום מתקדמים לאט, דבר אחד בכל פעם.",
  calmingTips: "מוזיקה שקטה, תה, תמונות משפחה ושיחה קצרה עם נועה.",
};

const defaultSchedule = [
  { id: 1, time: "08:00", text: "לקום, לשטוף פנים ולהתלבש", icon: "☀️", showToPatient: true, done: false },
  { id: 2, time: "09:00", text: "ארוחת בוקר", icon: "🍳", showToPatient: true, done: false },
  { id: 3, time: "10:30", text: "שיחה קצרה עם המשפחה", icon: "📞", showToPatient: true, done: false },
  { id: 4, time: "13:00", text: "ארוחת צהריים", icon: "🍲", showToPatient: true, done: false },
  { id: 5, time: "16:00", text: "מנוחה / מוזיקה רגועה", icon: "🎵", showToPatient: true, done: false },
  { id: 6, time: "19:00", text: "ארוחת ערב", icon: "🍽️", showToPatient: true, done: false },
  { id: 7, time: "21:00", text: "התארגנות לשינה", icon: "🌙", showToPatient: true, done: false },
];

const defaultContacts = [
  { id: 1, relation: "הבת שלי", name: "נועה", phone: "050-0000000", note: "להתקשר בכל שאלה", videoLink: "" },
  { id: 2, relation: "הבן שלי", name: "דני", phone: "052-0000000", note: "משפחה קרובה", videoLink: "" },
  { id: 3, relation: "מוקד חירום", name: "מד״א", phone: "101", note: "רק במקרה חירום", videoLink: "" },
];

const defaultMeds = [
  { id: 1, time: "08:30", name: "תרופת בוקר", dose: "לפי מרשם", instructions: "אחרי אוכל", taken: false, givenBy: "", notes: "" },
  { id: 2, time: "20:30", name: "תרופת ערב", dose: "לפי מרשם", instructions: "לפני שינה", taken: false, givenBy: "", notes: "" },
];

const defaultCare = {
  date: todayISO(),
  waterMorning: false,
  waterNoon: false,
  waterEvening: false,
  breakfast: "לא סומן",
  lunch: "לא סומן",
  dinner: "לא סומן",
  toilet: "לא סומן",
  pain: "לא סומן",
  mood: "רגוע/ה",
  note: "",
};

const defaultSafety = {
  confusedMessage: "את בבית. המשפחה יודעת איפה את. אין צורך לצאת לבד. אפשר להתקשר לנועה.",
  exitMessage: "הכול בסדר. אם תרצי לצאת, נתקשר קודם למשפחה. לא יוצאים לבד.",
  emergency: "במקרה חירום בלבד: להתקשר 101 ואז לעדכן את המשפחה.",
};

const stages = {
  early: "עצמאות חלקית",
  middle: "בלבול בינוני",
  advanced: "בלבול מתקדם",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function cloudEnabled() {
  return Boolean(CLOUD_SYNC_CONFIG.enabled && CLOUD_SYNC_CONFIG.supabaseUrl && CLOUD_SYNC_CONFIG.supabaseAnonKey);
}

function cloudHeaders(extra = {}) {
  return {
    apikey: CLOUD_SYNC_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${CLOUD_SYNC_CONFIG.supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function cloudUrlForKey(key) {
  const base = CLOUD_SYNC_CONFIG.supabaseUrl.replace(/\/$/, "");
  const table = CLOUD_SYNC_CONFIG.tableName;
  const boardId = encodeURIComponent(CLOUD_SYNC_CONFIG.boardId);
  const stateKey = encodeURIComponent(key);
  return `${base}/rest/v1/${table}?board_id=eq.${boardId}&state_key=eq.${stateKey}`;
}

async function readCloudValue(key) {
  if (!cloudEnabled()) return null;
  const res = await fetch(`${cloudUrlForKey(key)}&select=value&limit=1`, { headers: cloudHeaders() });
  if (!res.ok) throw new Error(`Cloud read failed: ${res.status}`);
  const rows = await res.json();
  return rows?.[0]?.value ?? null;
}

async function writeCloudValue(key, value) {
  if (!cloudEnabled()) return;
  const base = CLOUD_SYNC_CONFIG.supabaseUrl.replace(/\/$/, "");
  const body = [{ board_id: CLOUD_SYNC_CONFIG.boardId, state_key: key, value, updated_at: new Date().toISOString() }];
  const res = await fetch(`${base}/rest/v1/${CLOUD_SYNC_CONFIG.tableName}`, {
    method: "POST",
    headers: cloudHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Cloud write failed: ${res.status}`);
}

function useSyncedState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  });

  const hydratedRef = useRef(!cloudEnabled());
  const lastSerializedRef = useRef("");
  const uploadTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!cloudEnabled()) return;
      try {
        const remote = await readCloudValue(key);
        if (!cancelled && remote !== null) {
          setValue(remote);
          const serialized = JSON.stringify(remote);
          lastSerializedRef.current = serialized;
          localStorage.setItem(key, serialized);
        }
      } catch (err) {
        console.warn("נכשל סנכרון ראשוני, משתמשים ב-localStorage", err);
      } finally {
        hydratedRef.current = true;
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const serialized = JSON.stringify(value);
    try {
      localStorage.setItem(key, serialized);
    } catch {}

    if (!cloudEnabled() || !hydratedRef.current || serialized === lastSerializedRef.current) return;
    if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current);
    uploadTimerRef.current = window.setTimeout(async () => {
      try {
        await writeCloudValue(key, value);
        lastSerializedRef.current = serialized;
      } catch (err) {
        console.warn("נכשל סנכרון לענן", err);
      }
    }, 500);

    return () => {
      if (uploadTimerRef.current) window.clearTimeout(uploadTimerRef.current);
    };
  }, [key, value]);

  useEffect(() => {
    if (!cloudEnabled()) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const remote = await readCloudValue(key);
        if (remote === null) return;
        const serialized = JSON.stringify(remote);
        if (serialized !== lastSerializedRef.current) {
          lastSerializedRef.current = serialized;
          setValue(remote);
          localStorage.setItem(key, serialized);
        }
      } catch (err) {
        console.warn("Polling failed", err);
      }
    }, CLOUD_SYNC_CONFIG.pollMs);
    return () => window.clearInterval(timer);
  }, [key]);

  return [value, setValue];
}

function two(n) {
  return String(n).padStart(2, "0");
}

function fullDate(date) {
  return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

function minutesFromTime(time) {
  const [h, m] = String(time).split(":").map(Number);
  return h * 60 + m;
}

function partOfDay(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return { label: "בוקר טוב", icon: "☀️", sentence: "עכשיו בוקר. מתחילים לאט וברוגע." };
  if (hour >= 12 && hour < 17) return { label: "צהריים טובים", icon: "🌤️", sentence: "עכשיו צהריים. זה זמן טוב לאכול, לשתות ולנוח." };
  if (hour >= 17 && hour < 21) return { label: "ערב טוב", icon: "🌆", sentence: "עכשיו ערב. היום כמעט נגמר והכול בסדר." };
  return { label: "לילה טוב", icon: "🌙", sentence: "עכשיו לילה. זה זמן רגוע למנוחה ולשינה." };
}

function themeForTime(date) {
  const hour = date.getHours();
  if (hour >= 17 && hour < 21) {
    return {
      shell: "bg-amber-100/70 text-slate-900",
      header: "bg-amber-950 text-amber-50",
      note: "שעות ערב: המסך עובר לגוונים חמים ורגועים יותר.",
    };
  }
  if (hour >= 21 || hour < 5) {
    return {
      shell: "bg-slate-900 text-slate-50",
      header: "bg-slate-950 text-white",
      note: "שעות לילה: מומלץ לשמור על בהירות נמוכה ומסך רגוע.",
    };
  }
  return { shell: "bg-slate-100 text-slate-950", header: "bg-slate-950 text-white", note: "" };
}

function speakHebrew(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "he-IL";
  u.rate = 0.78;
  u.pitch = 0.95;
  window.speechSynthesis.speak(u);
}

function Card({ children, className = "" }) {
  return <section className={cx("rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-xl md:p-6", className)}>{children}</section>;
}

function Title({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-2xl bg-slate-100 p-3 text-slate-800">{Icon ? <Icon size={30} /> : null}</div>
      <div>
        <h2 className="text-2xl font-black leading-tight md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-lg font-bold leading-relaxed text-slate-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function VisualClock({ now }) {
  const hour = now.getHours() % 12;
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const hourAngle = hour * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  const secondAngle = second * 6;

  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" aria-label="שעון מחוגים">
      <circle cx="60" cy="60" r="54" fill="white" stroke="currentColor" strokeWidth="4" />
      {[...Array(12)].map((_, i) => {
        const a = (Math.PI / 180) * i * 30;
        return <line key={i} x1={60 + Math.sin(a) * 43} y1={60 - Math.cos(a) * 43} x2={60 + Math.sin(a) * 49} y2={60 - Math.cos(a) * 49} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />;
      })}
      <line x1="60" y1="60" x2="60" y2="32" stroke="currentColor" strokeWidth="6" strokeLinecap="round" transform={`rotate(${hourAngle} 60 60)`} />
      <line x1="60" y1="60" x2="60" y2="22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" transform={`rotate(${minuteAngle} 60 60)`} />
      <line x1="60" y1="66" x2="60" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" transform={`rotate(${secondAngle} 60 60)`} />
      <circle cx="60" cy="60" r="5" fill="currentColor" />
    </svg>
  );
}

function DayProgress({ now }) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const pct = Math.min(100, Math.max(0, (minutes / 1440) * 100));
  return (
    <div className="mt-4 rounded-3xl bg-slate-100 p-4 text-slate-950">
      <div className="mb-2 flex justify-between text-lg font-black text-slate-600">
        <span>בוקר</span><span>צהריים</span><span>ערב</span><span>לילה</span>
      </div>
      <div className="h-5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-slate-950 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-center text-xl font-black">ככה היום מתקדם</div>
    </div>
  );
}

function Header({ now, person, view, setView, setCalm }) {
  const time = `${two(now.getHours())}:${two(now.getMinutes())}`;
  const part = partOfDay(now);
  const theme = themeForTime(now);

  return (
    <header className={cx("rounded-[2.4rem] p-6 shadow-2xl md:p-7", theme.header)}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-2 text-2xl font-black">
            <span>{part.icon}</span>{part.label}
          </div>
          <h1 className="text-5xl font-black md:text-7xl">שלום {person.firstName}</h1>
          <p className="mt-3 text-2xl font-bold text-white/80 md:text-3xl">{part.sentence}</p>
          {theme.note ? <p className="mt-4 rounded-3xl bg-white/10 p-4 text-xl font-black">{theme.note}</p> : null}
        </div>

        <div className="rounded-[2rem] bg-white p-5 text-center text-slate-950 shadow-xl">
          <div className="flex flex-col items-center gap-2">
            <VisualClock now={now} />
            <div className="font-mono text-7xl font-black tabular-nums md:text-8xl">{time}</div>
          </div>
          <div className="mt-2 text-3xl font-black md:text-4xl">{fullDate(now)}</div>
          <DayProgress now={now} />
        </div>
      </div>

      <div className="no-print mt-6 flex flex-wrap gap-3">
        {["מטופלת", "מטפל", "חודשי"].map((item) => (
          <button key={item} onClick={() => setView(item)} className={cx("rounded-2xl px-5 py-3 text-xl font-black", view === item ? "bg-white text-slate-950" : "bg-white/10 text-white")}>{item}</button>
        ))}
        <button onClick={() => setCalm(true)} className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-xl font-black text-amber-950">
          <ShieldAlert size={24} /> אני מבולבלת / צריכה רגע
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-xl font-black text-emerald-950">
          <Printer size={24} /> הדפסה
        </button>
      </div>
    </header>
  );
}

function NowNextLater({ schedule, now, stage }) {
  const items = useMemo(() => schedule.filter((x) => x.showToPatient).slice().sort((a, b) => a.time.localeCompare(b.time)), [schedule]);
  const current = now.getHours() * 60 + now.getMinutes();
  const future = items.filter((x) => minutesFromTime(x.time) >= current);
  const lastPast = items.filter((x) => minutesFromTime(x.time) <= current).slice(-1)[0];
  const nowItem = future[0] || lastPast;
  const next = future[1];
  const later = future[2];
  const isAdvanced = stage === "advanced";

  const box = (label, item, important) => (
    <div className={cx("rounded-[2rem] p-5", important ? "border-4 border-blue-300 bg-blue-50" : "border-2 border-slate-200 bg-slate-50")}>
      <div className="mb-2 text-2xl font-black text-slate-600">{label}</div>
      <div className="mb-3 text-6xl">{item?.icon || "🌿"}</div>
      <div className={cx("font-black leading-tight", important || isAdvanced ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl")}>{item?.text || "אפשר לנוח"}</div>
      {item?.time ? <div className="mt-4 inline-block rounded-2xl bg-white px-5 py-3 font-mono text-3xl font-black">{item.time}</div> : null}
    </div>
  );

  return (
    <Card className="xl:col-span-2">
      <Title icon={Clock3} title="עכשיו / הבא / אחר כך" subtitle="פחות מידע, יותר בהירות" />
      <div className={cx("grid gap-4", isAdvanced ? "" : "lg:grid-cols-3")}>
        {box("עכשיו", nowItem, true)}
        {box("הדבר הבא", next, false)}
        {!isAdvanced ? box("אחר כך", later, false) : null}
      </div>
    </Card>
  );
}

function Orientation({ person, safety }) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="border-amber-300 bg-amber-50">
        <Title icon={Home} title="איפה אני נמצאת?" />
        <div className="space-y-3 text-3xl font-black leading-relaxed">
          <p>אני נמצאת בבית.</p><p>{person.address}</p><p>{person.city}</p>
        </div>
      </Card>
      <Card>
        <Title icon={Heart} title="מי אני?" />
        <p className="text-4xl font-black">{person.fullName}</p>
        <p className="mt-4 text-3xl font-black leading-relaxed">{person.identityNote}</p>
      </Card>
      <Card className="border-red-200 bg-red-50">
        <Title icon={ShieldAlert} title="אם אני לא בטוחה" />
        <p className="text-3xl font-black leading-relaxed text-red-950">{safety.confusedMessage}</p>
      </Card>
    </div>
  );
}

function ContactCard({ contact, stage }) {
  const phone = String(contact.phone || "").replace(/[^0-9+]/g, "");
  const tel = `tel:${phone}`;
  const advanced = stage === "advanced";
  return (
    <div className="rounded-[1.7rem] border-2 border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className={cx("font-black", advanced ? "text-5xl" : "text-3xl")}>{contact.relation}</div>
          <div className={cx("font-bold text-slate-700", advanced ? "text-4xl" : "text-2xl")}>{contact.name}</div>
          <div className="mt-2 text-xl font-bold text-slate-600">{contact.note}</div>
        </div>
        <div className={cx("grid gap-3", advanced ? "w-full md:w-1/2" : "")}> 
          <a href={tel} className={cx("rounded-3xl bg-emerald-600 px-6 py-5 text-center font-mono font-black text-white", advanced ? "text-5xl md:text-6xl" : "text-3xl")}>{contact.phone}</a>
          {contact.videoLink ? <a href={contact.videoLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-3xl bg-blue-600 px-6 py-4 text-2xl font-black text-white"><Video size={28} /> שיחת וידאו</a> : null}
        </div>
      </div>
      <details className="no-print mt-4 rounded-3xl bg-white p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-2xl font-black"><QrCode size={26} /> QR לחיוג ממכשיר אחר</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
          <div className="rounded-3xl bg-white p-4 shadow-inner"><QRCodeSVG value={tel} size={190} includeMargin /></div>
          <p className="text-2xl font-bold leading-relaxed text-slate-700">אם הטאבלט בלי SIM, מטפל/שכן יכול לסרוק ולחייג מהנייד שלו.</p>
        </div>
      </details>
    </div>
  );
}

function PhoneList({ contacts, stage }) {
  const shown = stage === "advanced" ? contacts.slice(0, 2) : contacts;
  return (
    <Card>
      <Title icon={Phone} title="למי אפשר להתקשר?" subtitle="חיוג, QR, ושיחת וידאו אם הוגדרה" />
      <div className="space-y-3">{shown.map((c) => <ContactCard key={c.id} contact={c} stage={stage} />)}</div>
    </Card>
  );
}

function PatientView({ person, safety, schedule, contacts, now }) {
  const stage = person.stage || "middle";
  if (stage === "advanced") {
    return <div className="space-y-5"><NowNextLater schedule={schedule} now={now} stage={stage} /><PhoneList contacts={contacts} stage={stage} /></div>;
  }
  return (
    <div className="space-y-5">
      <Orientation person={person} safety={safety} />
      <div className="grid gap-5 xl:grid-cols-3">
        <NowNextLater schedule={schedule} now={now} stage={stage} />
        <PhoneList contacts={contacts} stage={stage} />
      </div>
    </div>
  );
}

function CalmMode({ person, safety, contacts, onClose }) {
  const primary = contacts[0];
  const message = `שלום ${person.firstName}, הכול בסדר. את נמצאת בבית, בכתובת ${person.address}, ${person.city}. את בטוחה והמשפחה שלך שומרת עלייך.`;
  useEffect(() => {
    speakHebrew(message);
    return () => window.speechSynthesis?.cancel();
  }, [message]);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-amber-50 p-5 text-slate-950" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-5">
        <Card className="text-center">
          <div className="text-7xl">🌿</div>
          <h1 className="mt-4 text-5xl font-black md:text-7xl">הכול בסדר, {person.firstName}</h1>
          <p className="mt-5 text-4xl font-black leading-relaxed">את בבית. את בטוחה.</p>
          <button onClick={() => speakHebrew(message)} className="mt-5 inline-flex items-center gap-3 rounded-3xl bg-amber-300 px-6 py-4 text-2xl font-black text-amber-950"><Volume2 size={30} /> הקריאי לי שוב</button>
        </Card>
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="border-amber-300 bg-amber-100"><Title icon={Home} title="איפה אני?" /><p className="text-4xl font-black leading-relaxed">אני בבית.<br />{person.address}<br />{person.city}</p></Card>
          <Card className="border-emerald-200 bg-emerald-50"><Title icon={Heart} title="מה לעשות עכשיו?" /><p className="text-4xl font-black leading-relaxed text-emerald-950">לעצור רגע. לנשום לאט. {safety.confusedMessage}</p></Card>
        </div>
        {primary ? <ContactCard contact={primary} stage="advanced" /> : null}
        <button onClick={onClose} className="w-full rounded-[2rem] bg-slate-950 px-6 py-5 text-3xl font-black text-white">חזרה ללוח</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-lg font-black text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xl font-bold outline-none focus:border-blue-500" />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-lg font-black text-slate-700">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-28 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xl font-bold outline-none focus:border-blue-500" />
    </label>
  );
}

function CaregiverView({ person, setPerson, schedule, setSchedule, meds, setMeds, care, setCare, contacts, setContacts, safety, setSafety, log, setLog }) {
  const [tab, setTab] = useState("profile");
  const tabs = ["profile", "schedule", "meds", "care", "contacts", "safety", "log"];
  const labels = { profile: "פרופיל", schedule: "שגרה", meds: "תרופות", care: "אוכל/שתייה", contacts: "טלפונים", safety: "בטיחות", log: "יומן" };

  return (
    <div className="space-y-5">
      <Card className="border-indigo-200 bg-indigo-50">
        <Title icon={Wifi} title="מסך מטפל" subtitle={`סנכרון ענן: ${cloudEnabled() ? "פעיל" : "כבוי — משתמש ב-localStorage"}`} />
        <div className="flex flex-wrap gap-3">{tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={cx("rounded-2xl px-4 py-3 text-lg font-black", tab === t ? "bg-slate-950 text-white" : "bg-white text-slate-800")}>{labels[t]}</button>)}</div>
      </Card>

      {tab === "profile" && <Card><Title icon={UserRound} title="פרופיל והתאמת שלב" /><div className="grid gap-4 md:grid-cols-2"><Field label="שם פרטי" value={person.firstName} onChange={(v) => setPerson({ ...person, firstName: v })} /><Field label="שם מלא" value={person.fullName} onChange={(v) => setPerson({ ...person, fullName: v })} /><Field label="כתובת" value={person.address} onChange={(v) => setPerson({ ...person, address: v })} /><Field label="עיר" value={person.city} onChange={(v) => setPerson({ ...person, city: v })} /><label><span className="mb-1 block text-lg font-black text-slate-700">שלב</span><select value={person.stage} onChange={(e) => setPerson({ ...person, stage: e.target.value })} className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xl font-bold">{Object.entries(stages).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><div /><div className="md:col-span-2"><TextArea label="משפט זהות" value={person.identityNote} onChange={(v) => setPerson({ ...person, identityNote: v })} /></div><div className="md:col-span-2"><TextArea label="מה מרגיע אותה" value={person.calmingTips} onChange={(v) => setPerson({ ...person, calmingTips: v })} /></div></div></Card>}

      {tab === "schedule" && <ScheduleEditor schedule={schedule} setSchedule={setSchedule} />}
      {tab === "meds" && <MedsEditor meds={meds} setMeds={setMeds} />}
      {tab === "care" && <CareEditor care={care} setCare={setCare} />}
      {tab === "contacts" && <ContactsEditor contacts={contacts} setContacts={setContacts} />}
      {tab === "safety" && <Card className="border-red-200 bg-red-50"><Title icon={ShieldAlert} title="בטיחות ושוטטות" /><TextArea label="מסר בלבול" value={safety.confusedMessage} onChange={(v) => setSafety({ ...safety, confusedMessage: v })} /><div className="mt-4"><TextArea label="מסר יציאה" value={safety.exitMessage} onChange={(v) => setSafety({ ...safety, exitMessage: v })} /></div><div className="mt-4"><TextArea label="חירום" value={safety.emergency} onChange={(v) => setSafety({ ...safety, emergency: v })} /></div></Card>}
      {tab === "log" && <LogEditor log={log} setLog={setLog} />}
    </div>
  );
}

function ScheduleEditor({ schedule, setSchedule }) {
  const [draft, setDraft] = useState({ time: "", text: "", icon: "✅", showToPatient: true });
  function add(e) {
    e.preventDefault();
    if (!draft.time || !draft.text.trim()) return;
    setSchedule([...schedule, { ...draft, id: Date.now(), done: false }].sort((a, b) => a.time.localeCompare(b.time)));
    setDraft({ time: "", text: "", icon: "✅", showToPatient: true });
  }
  return <Card><Title icon={CalendarDays} title="שגרת יום" /><div className="space-y-3">{schedule.map((item) => <div key={item.id} className="grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-[120px_90px_1fr_140px_auto]"><input type="time" value={item.time} onChange={(e) => setSchedule(schedule.map((x) => x.id === item.id ? { ...x, time: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2 font-bold" /><input value={item.icon} onChange={(e) => setSchedule(schedule.map((x) => x.id === item.id ? { ...x, icon: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2 text-center text-2xl" /><input value={item.text} onChange={(e) => setSchedule(schedule.map((x) => x.id === item.id ? { ...x, text: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2 text-xl font-bold" /><label className="flex items-center gap-2 font-black"><input type="checkbox" checked={item.showToPatient} onChange={(e) => setSchedule(schedule.map((x) => x.id === item.id ? { ...x, showToPatient: e.target.checked } : x))} /> להציג</label><button onClick={() => setSchedule(schedule.filter((x) => x.id !== item.id))} className="rounded-2xl bg-red-50 p-3 text-red-700"><Trash2 /></button></div>)}</div><form onSubmit={add} className="mt-5 grid gap-3 rounded-3xl bg-slate-100 p-4 md:grid-cols-[150px_100px_1fr_140px_auto]"><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} className="rounded-2xl border-2 px-3 py-2 text-center text-2xl" /><input placeholder="פעולה" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className="rounded-2xl border-2 px-3 py-2 text-xl" /><label className="flex items-center gap-2 font-black"><input type="checkbox" checked={draft.showToPatient} onChange={(e) => setDraft({ ...draft, showToPatient: e.target.checked })} /> להציג</label><button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"><Plus /></button></form></Card>;
}

function MedsEditor({ meds, setMeds }) {
  const [draft, setDraft] = useState({ time: "", name: "", dose: "", instructions: "", taken: false, givenBy: "", notes: "" });
  function add(e) {
    e.preventDefault();
    if (!draft.time || !draft.name.trim()) return;
    setMeds([...meds, { ...draft, id: Date.now() }].sort((a, b) => a.time.localeCompare(b.time)));
    setDraft({ time: "", name: "", dose: "", instructions: "", taken: false, givenBy: "", notes: "" });
  }
  return <Card><Title icon={Pill} title="תרופות" subtitle="לסמן גם מי נתן/אישר כדי למנוע כפילות" /><div className="space-y-3">{meds.map((m) => <div key={m.id} className="grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-[120px_1fr_1fr_1fr_90px_1fr_auto]"><input type="time" value={m.time} onChange={(e) => setMeds(meds.map((x) => x.id === m.id ? { ...x, time: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><input value={m.name} onChange={(e) => setMeds(meds.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><input value={m.dose} onChange={(e) => setMeds(meds.map((x) => x.id === m.id ? { ...x, dose: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><input value={m.instructions} onChange={(e) => setMeds(meds.map((x) => x.id === m.id ? { ...x, instructions: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><label className="flex items-center gap-2 font-black"><input type="checkbox" checked={m.taken} onChange={(e) => setMeds(meds.map((x) => x.id === m.id ? { ...x, taken: e.target.checked } : x))} /> בוצע</label><input placeholder="מי אישר" value={m.givenBy} onChange={(e) => setMeds(meds.map((x) => x.id === m.id ? { ...x, givenBy: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><button onClick={() => setMeds(meds.filter((x) => x.id !== m.id))} className="rounded-2xl bg-red-50 p-3 text-red-700"><Trash2 /></button></div>)}</div><form onSubmit={add} className="mt-5 grid gap-3 rounded-3xl bg-slate-100 p-4 md:grid-cols-4"><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><input placeholder="שם תרופה" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><input placeholder="מינון" value={draft.dose} onChange={(e) => setDraft({ ...draft, dose: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><input placeholder="איך לקחת" value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white md:col-span-4"><Plus /> הוספת תרופה</button></form></Card>;
}

function CareEditor({ care, setCare }) {
  const opts = ["לא סומן", "כן", "חלקית", "לא"];
  const select = (label, key, options = opts) => <label><span className="mb-1 block text-lg font-black">{label}</span><select value={care[key]} onChange={(e) => setCare({ ...care, date: todayISO(), [key]: e.target.value })} className="w-full rounded-2xl border-2 px-4 py-3 text-xl font-bold">{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
  return <Card><Title icon={Droplets} title="אוכל, שתייה ושירותים" /><div className="grid gap-4 md:grid-cols-3">{[["waterMorning", "מים בבוקר"], ["waterNoon", "מים בצהריים"], ["waterEvening", "מים בערב"]].map(([k, label]) => <button key={k} onClick={() => setCare({ ...care, date: todayISO(), [k]: !care[k] })} className={cx("rounded-3xl p-5 text-2xl font-black", care[k] ? "bg-emerald-50 text-emerald-950" : "bg-slate-50")}>{label} {care[k] ? "✅" : "⬜"}</button>)}</div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{select("בוקר", "breakfast")}{select("צהריים", "lunch")}{select("ערב", "dinner")}{select("שירותים", "toilet")}{select("כאב", "pain", ["לא סומן", "לא", "כן", "לא בטוח"])}{select("מצב רוח", "mood", ["רגוע/ה", "עייף/ה", "חרד/ה", "מבולבל/ת", "עצוב/ה", "שמחה"])}<div className="md:col-span-2"><TextArea label="הערה" value={care.note} onChange={(v) => setCare({ ...care, note: v })} /></div></div></Card>;
}

function ContactsEditor({ contacts, setContacts }) {
  const [draft, setDraft] = useState({ relation: "", name: "", phone: "", note: "", videoLink: "" });
  function add(e) {
    e.preventDefault();
    if (!draft.relation || !draft.phone) return;
    setContacts([...contacts, { ...draft, id: Date.now() }]);
    setDraft({ relation: "", name: "", phone: "", note: "", videoLink: "" });
  }
  return <Card><Title icon={Users} title="טלפונים וקישורי וידאו" /><div className="space-y-3">{contacts.map((c) => <div key={c.id} className="grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-5"><input value={c.relation} onChange={(e) => setContacts(contacts.map((x) => x.id === c.id ? { ...x, relation: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><input value={c.name} onChange={(e) => setContacts(contacts.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><input value={c.phone} onChange={(e) => setContacts(contacts.map((x) => x.id === c.id ? { ...x, phone: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><input placeholder="קישור וידאו" value={c.videoLink || ""} onChange={(e) => setContacts(contacts.map((x) => x.id === c.id ? { ...x, videoLink: e.target.value } : x))} className="rounded-2xl border-2 px-3 py-2" /><button onClick={() => setContacts(contacts.filter((x) => x.id !== c.id))} className="rounded-2xl bg-red-50 p-3 text-red-700"><Trash2 /></button></div>)}</div><form onSubmit={add} className="mt-5 grid gap-3 rounded-3xl bg-slate-100 p-4 md:grid-cols-5"><input placeholder="קשר" value={draft.relation} onChange={(e) => setDraft({ ...draft, relation: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><input placeholder="שם" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><input placeholder="טלפון" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><input placeholder="קישור וידאו" value={draft.videoLink} onChange={(e) => setDraft({ ...draft, videoLink: e.target.value })} className="rounded-2xl border-2 px-3 py-2" /><button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"><Plus /></button></form></Card>;
}

function LogEditor({ log, setLog }) {
  const [draft, setDraft] = useState({ date: todayISO(), time: "", type: "בלבול", what: "", before: "", helped: "" });
  function add(e) {
    e.preventDefault();
    if (!draft.what.trim()) return;
    setLog([{ ...draft, id: Date.now(), time: draft.time || `${two(new Date().getHours())}:${two(new Date().getMinutes())}` }, ...log]);
    setDraft({ date: todayISO(), time: "", type: "בלבול", what: "", before: "", helped: "" });
  }
  return <Card><Title icon={CheckCircle2} title="יומן תסמינים והתנהגות" /><form onSubmit={add} className="grid gap-3 rounded-3xl bg-slate-100 p-4 md:grid-cols-3"><Field label="תאריך" type="date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} /><Field label="שעה" type="time" value={draft.time} onChange={(v) => setDraft({ ...draft, time: v })} /><Field label="סוג" value={draft.type} onChange={(v) => setDraft({ ...draft, type: v })} /><div className="md:col-span-3"><TextArea label="מה קרה" value={draft.what} onChange={(v) => setDraft({ ...draft, what: v })} /></div><div className="md:col-span-3"><TextArea label="מה היה לפני" value={draft.before} onChange={(v) => setDraft({ ...draft, before: v })} /></div><div className="md:col-span-3"><TextArea label="מה עזר" value={draft.helped} onChange={(v) => setDraft({ ...draft, helped: v })} /></div><button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white md:col-span-3">הוספה</button></form><div className="mt-5 space-y-3">{log.map((x) => <div key={x.id} className="rounded-3xl bg-slate-50 p-4"><div className="font-black">{x.type} · {x.date} · {x.time}</div><p className="mt-2 text-xl font-bold">{x.what}</p><p className="text-slate-600">לפני: {x.before || "—"} · עזר: {x.helped || "—"}</p></div>)}</div></Card>;
}

function MonthlyView({ now }) {
  const month = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(now);
  return <Card><Title icon={CalendarDays} title={`לוח חודשי: ${month}`} subtitle="בגרסה זו התצוגה החודשית בסיסית; ניתן להוסיף אירועים דרך שגרת היום או להרחיב בהמשך." /><p className="text-3xl font-black leading-relaxed">היום: {fullDate(now)}</p></Card>;
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [view, setView] = useSyncedState("view", "מטופלת");
  const [calm, setCalm] = useState(false);
  const [person, setPerson] = useSyncedState("person", defaultPerson);
  const [schedule, setSchedule] = useSyncedState("schedule", defaultSchedule);
  const [contacts, setContacts] = useSyncedState("contacts", defaultContacts);
  const [meds, setMeds] = useSyncedState("meds", defaultMeds);
  const [care, setCare] = useSyncedState("care", defaultCare);
  const [safety, setSafety] = useSyncedState("safety", defaultSafety);
  const [log, setLog] = useSyncedState("symptom_log", []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (care.date !== todayISO()) setCare({ ...defaultCare, date: todayISO() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [care.date]);

  const theme = themeForTime(now);

  return (
    <main dir="rtl" className={cx("min-h-screen p-4 transition-colors duration-1000 md:p-6 print:bg-white print:p-0", theme.shell)}>
      <style>{`@media print { .no-print { display: none !important; } section, header { break-inside: avoid; } }`}</style>
      {calm ? <CalmMode person={person} safety={safety} contacts={contacts} onClose={() => setCalm(false)} /> : null}
      <div className="mx-auto max-w-[1550px] space-y-5">
        <Header now={now} person={person} view={view} setView={setView} setCalm={setCalm} />
        {view === "מטופלת" ? <PatientView person={person} safety={safety} schedule={schedule} contacts={contacts} now={now} /> : null}
        {view === "מטפל" ? <CaregiverView person={person} setPerson={setPerson} schedule={schedule} setSchedule={setSchedule} meds={meds} setMeds={setMeds} care={care} setCare={setCare} contacts={contacts} setContacts={setContacts} safety={safety} setSafety={setSafety} log={log} setLog={setLog} /> : null}
        {view === "חודשי" ? <MonthlyView now={now} /> : null}
        <footer className="no-print rounded-[2rem] bg-slate-950 p-5 text-center text-lg font-bold text-white/80">
          לוח בית חכם למחלות שכחה · מתאים ל-GitHub Pages · {cloudEnabled() ? "סנכרון ענן פעיל" : "שמירה מקומית בלבד"}
        </footer>
      </div>
    </main>
  );
}
