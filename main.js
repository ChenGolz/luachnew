
/*
  לוח בית חכם למחלות שכחה — גרסה סטטית ל-GitHub Pages
  לא צריך npm, לא צריך build, ולא צריך GitHub Actions.
  הקבצים היחידים הנדרשים: index.html, main.js, style.css, favicon.svg

  הפעלת Supabase בעתיד:
  1. צרו טבלה memory_board_state:
     create table memory_board_state (
       board_id text primary key,
       value jsonb not null,
       updated_at timestamptz default now()
     );
  2. הכניסו supabaseUrl + supabaseAnonKey.
  3. שנו enabled ל-true.
*/

const CLOUD_SYNC_CONFIG = {
  enabled: false,
  supabaseUrl: "",
  supabaseAnonKey: "",
  boardId: "grandma-home-board",
  tableName: "memory_board_state",
  pollMs: 5000,
};

const STORAGE_KEY = "memory_board_static_v1";

const DEFAULT_STATE = {
  view: "patient",
  caregiverTab: "profile",
  person: {
    firstName: "רחל",
    fullName: "רחל כהן",
    address: "רחוב הדוגמה 10, דירה 4",
    city: "תל אביב",
    stage: "middle",
    safeMessage: "זה הבית שלי. המשפחה יודעת איפה אני. אין צורך לצאת לבד. אם אני צריכה עזרה, אפשר להתקשר לנועה.",
    identityNote: "אני רחל. אני אהובה. המשפחה שלי דואגת לי ומתקשרת אליי. היום אפשר להתקדם לאט, דבר אחד בכל פעם.",
    calmingTips: "מוזיקה שקטה, תה, תמונות משפחה ושיחה קצרה עם נועה.",
    riskNotes: "רעש, חושך, רעב, כאב או יותר מדי אנשים עלולים לבלבל."
  },
  schedule: [
    { id: 1, time: "08:00", text: "לקום, לשטוף פנים ולהתלבש", image: "☀️", forPatient: true, done: false },
    { id: 2, time: "09:00", text: "ארוחת בוקר", image: "🍳", forPatient: true, done: false },
    { id: 3, time: "10:30", text: "שיחה קצרה עם המשפחה", image: "📞", forPatient: true, done: false },
    { id: 4, time: "13:00", text: "ארוחת צהריים", image: "🍲", forPatient: true, done: false },
    { id: 5, time: "16:00", text: "מנוחה / טלוויזיה / מוזיקה רגועה", image: "🎵", forPatient: true, done: false },
    { id: 6, time: "19:00", text: "ארוחת ערב", image: "🍽️", forPatient: true, done: false },
    { id: 7, time: "21:00", text: "התארגנות לשינה", image: "🌙", forPatient: true, done: false }
  ],
  medications: [
    { id: 1, time: "08:30", name: "תרופת בוקר", dose: "לפי מרשם", instructions: "אחרי אוכל", taken: false, givenBy: "", notes: "" },
    { id: 2, time: "20:30", name: "תרופת ערב", dose: "לפי מרשם", instructions: "לפני שינה", taken: false, givenBy: "", notes: "" }
  ],
  contacts: [
    { id: 1, relation: "הבת שלי", name: "נועה", phone: "050-0000000", note: "להתקשר בכל שאלה", photo: "", videoLink: "" },
    { id: 2, relation: "הבן שלי", name: "דני", phone: "052-0000000", note: "משפחה קרובה", photo: "", videoLink: "" },
    { id: 3, relation: "מוקד חירום", name: "מד״א", phone: "101", note: "רק במקרה חירום", photo: "", videoLink: "" }
  ],
  family: [
    { id: 1, relation: "הבת שלי", name: "נועה", city: "גרה קרוב", note: "מדברת איתי כמעט כל יום", emoji: "👩", photo: "" },
    { id: 2, relation: "הבן שלי", name: "דני", city: "גר בעיר אחרת", note: "אוהב לבקר בסופי שבוע", emoji: "👨", photo: "" },
    { id: 3, relation: "הנכדה שלי", name: "מיה", city: "לומדת בבית ספר", note: "אוהבת לצייר איתי", emoji: "👧", photo: "" }
  ],
  careCheck: {
    date: new Date().toISOString().slice(0, 10),
    waterMorning: false,
    waterNoon: false,
    waterEvening: false,
    breakfast: "לא סומן",
    lunch: "לא סומן",
    dinner: "לא סומן",
    toileting: "לא סומן",
    pain: "לא סומן",
    mood: "רגוע/ה",
    sleep: "לא סומן",
    note: ""
  },
  symptomLog: [],
  monthlyEvents: [
    { id: 1, date: new Date().toISOString().slice(0, 10), title: "יום רגיל ונעים" }
  ],
  safety: {
    exitMessage: "הכול בסדר. אם תרצי לצאת, נתקשר קודם לנועה. לא יוצאים לבד.",
    confusedMessage: "את בבית. המשפחה יודעת איפה את. אין צורך לצאת לבד. אפשר להתקשר לנועה.",
    emergency: "במקרה חירום בלבד: להתקשר 101 ואז לעדכן את המשפחה.",
    doorSensor: "אם הדלת נפתחה בלי ליווי — להתקשר מיד למשפחה.",
    homeChecklist: "לבדוק דלת, גז, תרופות, שטיחים, תאורה ומקלחת."
  }
};

let state = loadState();
let now = new Date();
let calmMode = false;
let lastCloudSerialized = "";

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeDefaults(defaults, value) {
  if (Array.isArray(defaults)) return Array.isArray(value) ? value : clone(defaults);
  if (!defaults || typeof defaults !== "object") return value ?? defaults;
  const result = clone(defaults);
  if (!value || typeof value !== "object") return result;
  Object.keys(value).forEach((key) => {
    if (key in defaults && typeof defaults[key] === "object" && !Array.isArray(defaults[key])) {
      result[key] = mergeDefaults(defaults[key], value[key]);
    } else {
      result[key] = value[key];
    }
  });
  return result;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? mergeDefaults(DEFAULT_STATE, JSON.parse(raw)) : clone(DEFAULT_STATE);
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function saveState(pushCloud = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (pushCloud) debounceCloudPush();
}

function cloudEnabled() {
  return Boolean(CLOUD_SYNC_CONFIG.enabled && CLOUD_SYNC_CONFIG.supabaseUrl && CLOUD_SYNC_CONFIG.supabaseAnonKey);
}

function cloudHeaders(extra = {}) {
  return {
    apikey: CLOUD_SYNC_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${CLOUD_SYNC_CONFIG.supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

function cloudBase() {
  return CLOUD_SYNC_CONFIG.supabaseUrl.replace(/\/$/, "");
}

async function pullCloud() {
  if (!cloudEnabled()) return;
  const table = CLOUD_SYNC_CONFIG.tableName;
  const boardId = encodeURIComponent(CLOUD_SYNC_CONFIG.boardId);
  const url = `${cloudBase()}/rest/v1/${table}?board_id=eq.${boardId}&select=value,updated_at&limit=1`;
  const response = await fetch(url, { headers: cloudHeaders() });
  if (!response.ok) throw new Error("Cloud read failed");
  const rows = await response.json();
  const remote = rows?.[0]?.value;
  if (!remote) return;
  const serialized = JSON.stringify(remote);
  if (serialized !== lastCloudSerialized) {
    state = mergeDefaults(DEFAULT_STATE, remote);
    lastCloudSerialized = serialized;
    saveState(false);
    render();
  }
}

async function pushCloud() {
  if (!cloudEnabled()) return;
  const serialized = JSON.stringify(state);
  if (serialized === lastCloudSerialized) return;
  const body = [{
    board_id: CLOUD_SYNC_CONFIG.boardId,
    value: state,
    updated_at: new Date().toISOString()
  }];
  const response = await fetch(`${cloudBase()}/rest/v1/${CLOUD_SYNC_CONFIG.tableName}`, {
    method: "POST",
    headers: cloudHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("Cloud write failed");
  lastCloudSerialized = serialized;
}

let cloudTimer = null;
function debounceCloudPush() {
  if (!cloudEnabled()) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    pushCloud().catch((error) => console.warn("Cloud write failed", error));
  }, 500);
}

if (cloudEnabled()) {
  pullCloud().catch((error) => console.warn("Cloud hydrate failed", error));
  setInterval(() => pullCloud().catch((error) => console.warn("Cloud polling failed", error)), CLOUD_SYNC_CONFIG.pollMs);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function two(n) {
  return String(n).padStart(2, "0");
}

function fullDate(date) {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function monthName(date) {
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(date);
}

function dayPart(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return { label: "בוקר טוב", emoji: "☕", sentence: "עכשיו בוקר. מתחילים לאט וברוגע." };
  if (hour >= 12 && hour < 17) return { label: "צהריים טובים", emoji: "☀️", sentence: "עכשיו צהריים. זה זמן טוב לאכול, לשתות ולנוח." };
  if (hour >= 17 && hour < 21) return { label: "ערב טוב", emoji: "🍽️", sentence: "עכשיו ערב. היום כמעט נגמר והכול בסדר." };
  return { label: "לילה טוב", emoji: "🌙", sentence: "עכשיו לילה. זה זמן רגוע למנוחה ולשינה." };
}

function getTheme(date) {
  const hour = date.getHours();
  if (hour >= 17 && hour < 21) return { className: "sundown", notice: "שעות ערב: המסך עובר לצבעים חמים ורגועים יותר." };
  if (hour >= 21 || hour < 5) return { className: "night", notice: "שעות לילה: מומלץ לשמור על מסך רגוע ובהירות נמוכה." };
  return { className: "", notice: "" };
}

function minutesFromTime(time) {
  const [h, m] = String(time || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function analogClockSvg(date) {
  const hour = date.getHours() % 12;
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const hourAngle = hour * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  const secondAngle = second * 6;
  let ticks = "";
  for (let i = 0; i < 12; i += 1) {
    const angle = i * 30;
    const rad = Math.PI / 180 * angle;
    const x1 = 60 + Math.sin(rad) * 43;
    const y1 = 60 - Math.cos(rad) * 43;
    const x2 = 60 + Math.sin(rad) * 49;
    const y2 = 60 - Math.cos(rad) * 49;
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="3" stroke-linecap="round" />`;
  }
  return `
    <svg viewBox="0 0 120 120" width="144" height="144" aria-label="שעון מחוגים">
      <circle cx="60" cy="60" r="54" fill="white" stroke="currentColor" stroke-width="4" opacity="0.95"></circle>
      ${ticks}
      <line x1="60" y1="60" x2="60" y2="31" stroke="currentColor" stroke-width="6" stroke-linecap="round" transform="rotate(${hourAngle} 60 60)"></line>
      <line x1="60" y1="60" x2="60" y2="20" stroke="currentColor" stroke-width="4" stroke-linecap="round" transform="rotate(${minuteAngle} 60 60)"></line>
      <line x1="60" y1="66" x2="60" y2="18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.45" transform="rotate(${secondAngle} 60 60)"></line>
      <circle cx="60" cy="60" r="5" fill="currentColor"></circle>
    </svg>
  `;
}

function dayProgressHtml(date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const percent = Math.min(100, Math.max(0, minutes / 1440 * 100));
  return `
    <div style="margin-top:16px;border-radius:24px;background:#f1f5f9;color:#0f172a;padding:14px;">
      <div style="display:flex;justify-content:space-between;font-weight:1000;color:#64748b;margin-bottom:8px;">
        <span>בוקר</span><span>צהריים</span><span>ערב</span><span>לילה</span>
      </div>
      <div style="height:18px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
        <div style="height:100%;width:${percent}%;background:#0f172a;border-radius:999px;transition:width 1s;"></div>
      </div>
      <div style="text-align:center;margin-top:8px;font-weight:1000;font-size:20px;">ככה היום מתקדם</div>
    </div>
  `;
}

function speakHebrew(text, rate = 0.8) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "he-IL";
  utterance.rate = rate;
  utterance.pitch = 0.95;
  window.speechSynthesis.speak(utterance);
}

function setView(view) {
  state.view = view;
  saveState();
  render();
}

function setCaregiverTab(tab) {
  state.caregiverTab = tab;
  saveState();
  render();
}

function getPatientItems() {
  return [...state.schedule].filter(x => x.forPatient).sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function getNowNextLater() {
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const items = getPatientItems();
  const future = items.filter(item => minutesFromTime(item.time) >= currentMinute);
  const lastPast = items.filter(item => minutesFromTime(item.time) <= currentMinute).slice(-1)[0];
  return {
    nowItem: future[0] || lastPast,
    nextItem: future[1],
    laterItem: future[2]
  };
}

function avatarHtml(item, fallback = "❤️", sizeClass = "") {
  if (item.photo) {
    return `<div class="avatar ${sizeClass}"><img src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name || "")}"></div>`;
  }
  return `<div class="avatar ${sizeClass}">${escapeHtml(item.emoji || fallback)}</div>`;
}

function sectionTitle(icon, title, subtitle = "") {
  return `
    <div class="section-title">
      <div class="icon-box">${icon}</div>
      <div>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>
    </div>
  `;
}

function headerHtml() {
  const part = dayPart(now);
  const time = `${two(now.getHours())}:${two(now.getMinutes())}`;
  const theme = getTheme(now);
  return `
    <header class="header">
      <div class="header-grid">
        <div>
          <div class="greeting-pill">${part.emoji} ${part.label}</div>
          <h1 class="title">שלום ${escapeHtml(state.person.firstName)}</h1>
          <p class="subtitle">${escapeHtml(part.sentence)}</p>
        </div>
        <div class="time-card">
          <div class="time-row">
            ${analogClockSvg(now)}
            <div class="digital-time">${time}</div>
          </div>
          <div class="date-text">${escapeHtml(fullDate(now))}</div>
          <div class="today-badge">היום</div>
          ${dayProgressHtml(now)}
        </div>
      </div>
      <nav class="nav no-print">
        <button class="${state.view === "patient" ? "active" : ""}" data-action="view" data-view="patient">מסך מטופלת</button>
        <button class="${state.view === "caregiver" ? "active" : ""}" data-action="view" data-view="caregiver">מסך מטפל</button>
        <button class="${state.view === "monthly" ? "active" : ""}" data-action="view" data-view="monthly">לוח חודשי</button>
        <button class="warm" data-action="calm">אני מבולבלת / צריכה רגע</button>
        <button onclick="window.print()">הדפסה</button>
        <button data-action="fullscreen">מסך מלא</button>
      </nav>
      ${theme.notice ? `<div class="notice no-print">${escapeHtml(theme.notice)}</div>` : ""}
    </header>
  `;
}

function orientationHtml() {
  return `
    <section class="section grid grid-3">
      <div class="card warm">
        ${sectionTitle("🏠", "איפה אני נמצאת?")}
        <div class="big-text">
          <p>אני נמצאת בבית.</p>
          <p>${escapeHtml(state.person.address)}</p>
          <p>${escapeHtml(state.person.city)}</p>
        </div>
        <div class="medium-text" style="margin-top:16px;background:#fff;border-radius:24px;padding:18px;color:#0f172a;">
          ${escapeHtml(state.person.safeMessage)}
        </div>
      </div>
      <div class="card">
        ${sectionTitle("❤️", "מי אני?", "מידע אישי מרגיע וברור")}
        <div class="medium-text">
          <p><strong>שם:</strong> ${escapeHtml(state.person.fullName)}</p>
          <p><strong>משפט חשוב:</strong> ${escapeHtml(state.person.identityNote)}</p>
        </div>
      </div>
      <div class="card danger">
        ${sectionTitle("🛡️", "אם אני לא בטוחה")}
        <div class="big-text">
          <p>לעצור רגע. לנשום. הכול בסדר.</p>
          <p>${escapeHtml(state.safety.confusedMessage)}</p>
          <p>במקרה חירום בלבד: 101</p>
        </div>
      </div>
    </section>
  `;
}

function nowNextLaterHtml() {
  const { nowItem, nextItem, laterItem } = getNowNextLater();
  const advanced = state.person.stage === "advanced";
  return `
    <div class="card">
      ${sectionTitle("🕘", "עכשיו / הבא / אחר כך", "פחות מידע, יותר בהירות")}
      <div class="now-grid">
        ${nowTile("עכשיו", nowItem, true)}
        ${nowTile("הדבר הבא", nextItem, false)}
        ${advanced ? "" : nowTile("אחר כך", laterItem, false)}
      </div>
    </div>
  `;
}

function nowTile(label, item, current) {
  return `
    <div class="now-card ${current ? "current" : ""}">
      <div class="medium-text" style="color:${current ? "#1d4ed8" : "var(--muted)"}">${escapeHtml(label)}</div>
      <div class="emoji">${escapeHtml(item?.image || (current ? "🕘" : "🌿"))}</div>
      <div class="big-text">${escapeHtml(item?.text || "אפשר לנוח")}</div>
      ${item?.time ? `<div class="time-badge">${escapeHtml(item.time)}</div>` : ""}
    </div>
  `;
}

function contactCardHtml(contact, advanced = false) {
  const cleanPhone = String(contact.phone || "").replace(/[^0-9+]/g, "");
  const telValue = `tel:${cleanPhone}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(telValue)}`;
  return `
    <div class="contact-card">
      <div class="contact-top">
        <div class="person-row">
          ${avatarHtml(contact, "☎️")}
          <div>
            <div class="contact-relation">${escapeHtml(contact.relation)}</div>
            <div class="contact-name">${escapeHtml(contact.name)}</div>
            <div class="medium-text muted" style="font-size:20px;margin-top:8px;">${escapeHtml(contact.note)}</div>
          </div>
        </div>
        <div>
          <a class="phone-button" href="${telValue}">${escapeHtml(contact.phone)}</a>
          ${contact.videoLink ? `<a class="video-button" target="_blank" rel="noreferrer" href="${escapeHtml(contact.videoLink)}">🎥 שיחת וידאו</a>` : ""}
        </div>
      </div>
      <details class="details no-print">
        <summary>📱 אם אין סים בטאבלט — הצגת QR לחיוג</summary>
        <div class="qr-wrap">
          <img src="${qrUrl}" alt="QR לחיוג">
          <div class="medium-text">מי שנמצא ליד המטופלת יכול לסרוק את הקוד מהטלפון שלו ולחייג ישירות.</div>
        </div>
      </details>
    </div>
  `;
}

function phonesHtml() {
  const shown = state.person.stage === "advanced" ? state.contacts.slice(0, 2) : state.contacts;
  return `
    <div class="card">
      ${sectionTitle("☎️", "למי אפשר להתקשר?", "חיוג בלחיצה אחת, QR למכשיר בלי סים וקישור וידאו אם הוגדר")}
      ${shown.map(c => contactCardHtml(c, state.person.stage === "advanced")).join("")}
    </div>
  `;
}

function familyHtml() {
  if (state.person.stage === "advanced") return "";
  return `
    <section class="section card">
      ${sectionTitle("👨‍👩‍👧", "המשפחה הקרובה שלי", "תזכורת רגועה לאנשים אהובים")}
      <div class="family-grid">
        ${state.family.map(person => `
          <div class="family-card">
            ${avatarHtml(person, "❤️")}
            <div class="contact-relation" style="margin-top:12px;">${escapeHtml(person.relation)}</div>
            <div class="big-text">${escapeHtml(person.name)}</div>
            <div class="medium-text muted">${escapeHtml(person.city)}</div>
            <div class="medium-text muted" style="font-size:20px;margin-top:8px;">${escapeHtml(person.note)}</div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function dailyListHtml() {
  if (state.person.stage !== "early") return "";
  const items = getPatientItems();
  return `
    <section class="section card">
      ${sectionTitle("📅", "מה עושים היום?", "רשימה מלאה — מתאימה בעיקר לעצמאות חלקית")}
      ${items.map(item => `
        <div class="item-row">
          <div class="item-line">
            <button class="soft-btn no-print" data-action="toggle-schedule" data-id="${item.id}">${item.done ? "בוצע ✅" : "סימון"}</button>
            <div class="emoji" style="font-size:44px;margin:0;">${escapeHtml(item.image)}</div>
            <div class="medium-text" style="${item.done ? "text-decoration:line-through;color:#94a3b8;" : ""}"><strong>${escapeHtml(item.time)}</strong> — ${escapeHtml(item.text)}</div>
            <span></span>
          </div>
        </div>
      `).join("")}
    </section>
  `;
}

function patientHtml() {
  if (state.person.stage === "advanced") {
    return `
      <section class="section grid">
        ${nowNextLaterHtml()}
        ${phonesHtml()}
        <div class="card warm"><div class="big-text">${escapeHtml(state.safety.confusedMessage)}</div></div>
      </section>
    `;
  }
  return `
    ${orientationHtml()}
    <section class="section grid grid-wide">
      ${nowNextLaterHtml()}
      ${phonesHtml()}
    </section>
    ${dailyListHtml()}
    ${familyHtml()}
  `;
}

function caregiverSummaryHtml() {
  const medsDone = state.medications.filter(m => m.taken).length;
  const water = ["waterMorning", "waterNoon", "waterEvening"].filter(k => state.careCheck[k]).length;
  const eventsToday = state.symptomLog.filter(x => x.date === todayISO()).length;
  const stageLabels = { early: "עצמאות חלקית", middle: "בלבול בינוני", advanced: "בלבול מתקדם" };
  return `
    <section class="section card blue">
      ${sectionTitle("📋", "סיכום מהיר למטפל/ת", "סקירה יומית לפני החלפת משמרת או שיחה עם רופא")}
      <div class="summary-grid">
        <div class="summary-box"><div class="small">מצב תצוגה</div><div class="big">${escapeHtml(stageLabels[state.person.stage] || "בלבול בינוני")}</div></div>
        <div class="summary-box"><div class="small">תרופות שסומנו</div><div class="big">${medsDone} / ${state.medications.length}</div></div>
        <div class="summary-box"><div class="small">שתייה</div><div class="big">${water} / 3</div></div>
        <div class="summary-box"><div class="small">אירועים היום</div><div class="big">${eventsToday}</div></div>
      </div>
    </section>
  `;
}

function caregiverTabsHtml() {
  const tabs = [
    ["profile", "פרופיל אישי"],
    ["schedule", "שגרה"],
    ["meds", "תרופות"],
    ["care", "אוכל/שתייה"],
    ["symptoms", "יומן תסמינים"],
    ["safety", "בטיחות"],
    ["people", "משפחה וטלפונים"]
  ];
  return `
    <section class="section card no-print">
      ${sectionTitle("🔒", "מסך מטפל", "כאן מנהלים הרבה מידע. במסך המטופלת מוצג רק מה שמרגיע ועוזר.")}
      <div class="toolbar">
        ${tabs.map(([id, label]) => `<button class="${state.caregiverTab === id ? "active" : ""}" data-action="tab" data-tab="${id}">${label}</button>`).join("")}
      </div>
    </section>
  `;
}

function input(label, name, value, type = "text") {
  return `<label>${escapeHtml(label)}<input data-field="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}"></label>`;
}

function textarea(label, name, value) {
  return `<label>${escapeHtml(label)}<textarea data-field="${escapeHtml(name)}">${escapeHtml(value)}</textarea></label>`;
}

function select(label, name, value, options) {
  return `
    <label>${escapeHtml(label)}
      <select data-field="${escapeHtml(name)}">
        ${options.map(([val, text]) => `<option value="${escapeHtml(val)}" ${String(value) === String(val) ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
    </label>
  `;
}

function profileEditorHtml() {
  const p = state.person;
  return `
    <section class="section card" data-form="person">
      ${sectionTitle("❤️", "פרופיל אישי והתאמת שלב", "התאמה זו משפיעה על כמה מידע יוצג במסך המטופלת")}
      <div class="form-grid">
        ${input("שם פרטי", "firstName", p.firstName)}
        ${input("שם מלא", "fullName", p.fullName)}
        ${input("כתובת", "address", p.address)}
        ${input("עיר / יישוב", "city", p.city)}
        ${select("שלב תצוגה", "stage", p.stage, [
          ["early", "עצמאות חלקית — יותר מידע ורשימה יומית"],
          ["middle", "בלבול בינוני — עכשיו / הבא / אחר כך"],
          ["advanced", "בלבול מתקדם — מעט מאוד מידע, גדול וברור"]
        ])}
        ${textarea("משפט מרגיע על הבית", "safeMessage", p.safeMessage)}
        ${textarea("משפט זהות / משפחה", "identityNote", p.identityNote)}
        ${textarea("מה מרגיע אותה?", "calmingTips", p.calmingTips)}
        ${textarea("טריגרים / דברים שמבלבלים או מלחיצים", "riskNotes", p.riskNotes)}
      </div>
      <div class="save-row"><button class="primary-btn" data-action="save-form" data-target="person">שמירה</button></div>
    </section>
  `;
}

function scheduleEditorHtml() {
  return `
    <section class="section card">
      ${sectionTitle("📅", "שגרת יום", "רצוי לשמור על פעולות קבועות, קצרות וברורות")}
      ${[...state.schedule].sort((a,b) => a.time.localeCompare(b.time)).map(item => `
        <div class="item-row" data-schedule-id="${item.id}">
          <div class="form-grid three">
            <label>שעה<input type="time" data-schedule-field="time" value="${escapeHtml(item.time)}"></label>
            <label>אייקון<input data-schedule-field="image" value="${escapeHtml(item.image)}"></label>
            <label>פעולה<input data-schedule-field="text" value="${escapeHtml(item.text)}"></label>
            <label>להציג למטופלת
              <select data-schedule-field="forPatient">
                <option value="true" ${item.forPatient ? "selected" : ""}>כן</option>
                <option value="false" ${!item.forPatient ? "selected" : ""}>לא</option>
              </select>
            </label>
          </div>
          <div class="save-row">
            <button class="primary-btn" data-action="save-schedule" data-id="${item.id}">שמירה</button>
            <button class="danger-btn" data-action="delete-schedule" data-id="${item.id}">מחיקה</button>
          </div>
        </div>
      `).join("")}
      <div class="item-row" data-new-schedule>
        <h3>הוספת פעולה חדשה</h3>
        <div class="form-grid three">
          <label>שעה<input type="time" data-new-schedule-field="time"></label>
          <label>אייקון<input data-new-schedule-field="image" value="✅"></label>
          <label>פעולה<input data-new-schedule-field="text" placeholder="פעולה קצרה וברורה"></label>
        </div>
        <div class="save-row"><button class="primary-btn" data-action="add-schedule">הוספה</button></div>
      </div>
    </section>
  `;
}

function medicationsHtml() {
  return `
    <section class="section card">
      ${sectionTitle("💊", "תרופות", "סימון תרופה מחייב גם שם מי שנתן/אישר כדי למנוע כפילות")}
      <div class="table-scroll">
        <table class="med-table">
          <thead><tr><th>שעה</th><th>תרופה</th><th>מינון</th><th>איך לקחת</th><th>בוצע</th><th>מי אישר</th><th>הערות</th><th></th></tr></thead>
          <tbody>
            ${state.medications.map(med => `
              <tr data-med-id="${med.id}">
                <td><input type="time" data-med-field="time" value="${escapeHtml(med.time)}"></td>
                <td><input data-med-field="name" value="${escapeHtml(med.name)}"></td>
                <td><input data-med-field="dose" value="${escapeHtml(med.dose)}"></td>
                <td><input data-med-field="instructions" value="${escapeHtml(med.instructions)}"></td>
                <td><select data-med-field="taken"><option value="false" ${!med.taken ? "selected" : ""}>לא</option><option value="true" ${med.taken ? "selected" : ""}>כן</option></select></td>
                <td><input data-med-field="givenBy" value="${escapeHtml(med.givenBy)}"></td>
                <td><input data-med-field="notes" value="${escapeHtml(med.notes)}"></td>
                <td>
                  <button class="primary-btn" data-action="save-med" data-id="${med.id}">שמירה</button>
                  <button class="danger-btn" data-action="delete-med" data-id="${med.id}">מחיקה</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="item-row" data-new-med>
        <h3>הוספת תרופה</h3>
        <div class="form-grid three">
          <label>שעה<input type="time" data-new-med-field="time"></label>
          <label>שם תרופה<input data-new-med-field="name"></label>
          <label>מינון<input data-new-med-field="dose"></label>
          <label>איך לקחת<input data-new-med-field="instructions"></label>
        </div>
        <div class="save-row"><button class="primary-btn" data-action="add-med">הוספה</button></div>
      </div>
    </section>
  `;
}

function careEditorHtml() {
  const c = state.careCheck;
  const meal = [["לא סומן","לא סומן"],["כן","כן"],["חלקית","חלקית"],["לא","לא"]];
  return `
    <section class="section card">
      ${sectionTitle("💧", "מעקב אוכל, שתייה ושירותים", "מיועד למטפל/ת — לא חייב להופיע במסך המטופלת")}
      <div class="check-grid">
        <button class="check-btn ${c.waterMorning ? "done" : ""}" data-action="toggle-care" data-key="waterMorning">💧 שתתה מים בבוקר</button>
        <button class="check-btn ${c.waterNoon ? "done" : ""}" data-action="toggle-care" data-key="waterNoon">💧 שתתה מים בצהריים</button>
        <button class="check-btn ${c.waterEvening ? "done" : ""}" data-action="toggle-care" data-key="waterEvening">💧 שתתה מים בערב</button>
      </div>
      <div class="form-grid" data-form="care">
        ${select("ארוחת בוקר", "breakfast", c.breakfast, meal)}
        ${select("ארוחת צהריים", "lunch", c.lunch, meal)}
        ${select("ארוחת ערב", "dinner", c.dinner, meal)}
        ${select("יציאה / שירותים", "toileting", c.toileting, meal)}
        ${select("כאב או אי־נוחות", "pain", c.pain, [["לא סומן","לא סומן"],["לא","לא"],["כן","כן"],["לא בטוח","לא בטוח"]])}
        ${select("מצב רוח", "mood", c.mood, [["רגוע/ה","רגוע/ה"],["עייף/ה","עייף/ה"],["חרד/ה","חרד/ה"],["מבולבל/ת","מבולבל/ת"],["עצוב/ה","עצוב/ה"],["שמחה","שמחה"]])}
        ${select("שינה", "sleep", c.sleep, [["לא סומן","לא סומן"],["טובה","טובה"],["חלקית","חלקית"],["התעורר/ה הרבה","התעורר/ה הרבה"],["לא ישן/ה טוב","לא ישן/ה טוב"]])}
        ${textarea("הערת מטפל/ת להיום", "note", c.note)}
      </div>
      <div class="save-row"><button class="primary-btn" data-action="save-form" data-target="care">שמירה</button></div>
    </section>
  `;
}

function symptomsEditorHtml() {
  return `
    <section class="section card">
      ${sectionTitle("📋", "יומן תסמינים והתנהגות", "מטרתו לזהות דפוסים: רעב, כאב, עייפות, בדידות, שקיעה בערב או שינוי תרופה")}
      <div class="item-row" data-new-symptom>
        <div class="form-grid three">
          <label>תאריך<input type="date" data-new-symptom-field="date" value="${todayISO()}"></label>
          <label>שעה<input type="time" data-new-symptom-field="time"></label>
          <label>סוג
            <select data-new-symptom-field="type">
              ${["בלבול","חרדה","רצון לצאת","נפילה","כאב","שינה","אכילה","שתייה","מצב רוח","אחר"].map(x => `<option>${escapeHtml(x)}</option>`).join("")}
            </select>
          </label>
          <label>מה קרה?<textarea data-new-symptom-field="what"></textarea></label>
          <label>מה היה לפני זה?<textarea data-new-symptom-field="before"></textarea></label>
          <label>מה עזר?<textarea data-new-symptom-field="helped"></textarea></label>
        </div>
        <div class="save-row"><button class="primary-btn" data-action="add-symptom">הוספת אירוע</button></div>
      </div>
      ${state.symptomLog.length ? state.symptomLog.map(e => `
        <div class="item-row">
          <div class="medium-text"><strong>${escapeHtml(e.type)}</strong> · ${escapeHtml(e.date)} · ${escapeHtml(e.time)}</div>
          <p><strong>מה קרה:</strong> ${escapeHtml(e.what)}</p>
          <p><strong>לפני זה:</strong> ${escapeHtml(e.before || "—")}</p>
          <p><strong>מה עזר:</strong> ${escapeHtml(e.helped || "—")}</p>
          <button class="danger-btn" data-action="delete-symptom" data-id="${e.id}">מחיקה</button>
        </div>
      `).join("") : `<div class="item-row medium-text muted">עדיין אין אירועים ביומן.</div>`}
    </section>
  `;
}

function safetyEditorHtml() {
  const s = state.safety;
  return `
    <section class="section card danger" data-form="safety">
      ${sectionTitle("🛡️", "בטיחות ושוטטות", "ניסוחים מרגיעים עדיפים על איסורים חדים")}
      <div class="form-grid">
        ${textarea("מסר אם רוצה לצאת", "exitMessage", s.exitMessage)}
        ${textarea("מסר למצב בלבול", "confusedMessage", s.confusedMessage)}
        ${textarea("הוראות חירום", "emergency", s.emergency)}
        ${textarea("נוהל דלת / יציאה", "doorSensor", s.doorSensor)}
        ${textarea("צ׳קליסט בטיחות בבית", "homeChecklist", s.homeChecklist)}
      </div>
      <div class="save-row"><button class="primary-btn" data-action="save-form" data-target="safety">שמירה</button></div>
    </section>
  `;
}

function peopleEditorHtml() {
  return `
    <section class="section grid grid-2">
      <div class="card">
        ${sectionTitle("☎️", "טלפונים חשובים", "אפשר להוסיף תמונה וקישור וידאו")}
        ${state.contacts.map(c => `
          <div class="item-row" data-contact-id="${c.id}">
            <div class="form-grid">
              <label>קשר<input data-contact-field="relation" value="${escapeHtml(c.relation)}"></label>
              <label>שם<input data-contact-field="name" value="${escapeHtml(c.name)}"></label>
              <label>טלפון<input data-contact-field="phone" value="${escapeHtml(c.phone)}"></label>
              <label>קישור לתמונה<input data-contact-field="photo" value="${escapeHtml(c.photo)}"></label>
              <label>קישור לשיחת וידאו<input data-contact-field="videoLink" value="${escapeHtml(c.videoLink)}"></label>
              <label>הערה<input data-contact-field="note" value="${escapeHtml(c.note)}"></label>
            </div>
            <div class="save-row">
              <button class="primary-btn" data-action="save-contact" data-id="${c.id}">שמירה</button>
              <button class="danger-btn" data-action="delete-contact" data-id="${c.id}">מחיקה</button>
            </div>
          </div>
        `).join("")}
        <div class="item-row" data-new-contact>
          <h3>הוספת טלפון</h3>
          <div class="form-grid">
            <label>קשר<input data-new-contact-field="relation"></label>
            <label>שם<input data-new-contact-field="name"></label>
            <label>טלפון<input data-new-contact-field="phone"></label>
            <label>הערה<input data-new-contact-field="note"></label>
            <label>קישור לתמונה<input data-new-contact-field="photo"></label>
            <label>קישור וידאו<input data-new-contact-field="videoLink"></label>
          </div>
          <div class="save-row"><button class="primary-btn" data-action="add-contact">הוספה</button></div>
        </div>
      </div>
      <div class="card">
        ${sectionTitle("👨‍👩‍👧", "משפחה קרובה", "אפשר להשתמש באימוג׳י או תמונה")}
        ${state.family.map(f => `
          <div class="item-row" data-family-id="${f.id}">
            <div class="form-grid">
              <label>קשר<input data-family-field="relation" value="${escapeHtml(f.relation)}"></label>
              <label>שם<input data-family-field="name" value="${escapeHtml(f.name)}"></label>
              <label>עיר<input data-family-field="city" value="${escapeHtml(f.city)}"></label>
              <label>אימוג׳י<input data-family-field="emoji" value="${escapeHtml(f.emoji)}"></label>
              <label>קישור לתמונה<input data-family-field="photo" value="${escapeHtml(f.photo)}"></label>
              <label>הערה<input data-family-field="note" value="${escapeHtml(f.note)}"></label>
            </div>
            <div class="save-row">
              <button class="primary-btn" data-action="save-family" data-id="${f.id}">שמירה</button>
              <button class="danger-btn" data-action="delete-family" data-id="${f.id}">מחיקה</button>
            </div>
          </div>
        `).join("")}
        <div class="item-row" data-new-family>
          <h3>הוספת משפחה</h3>
          <div class="form-grid">
            <label>קשר<input data-new-family-field="relation"></label>
            <label>שם<input data-new-family-field="name"></label>
            <label>עיר<input data-new-family-field="city"></label>
            <label>אימוג׳י<input data-new-family-field="emoji" value="❤️"></label>
            <label>קישור לתמונה<input data-new-family-field="photo"></label>
            <label>הערה<input data-new-family-field="note"></label>
          </div>
          <div class="save-row"><button class="primary-btn" data-action="add-family">הוספה</button></div>
        </div>
      </div>
    </section>
  `;
}

function caregiverContentHtml() {
  const tab = state.caregiverTab;
  if (tab === "profile") return profileEditorHtml();
  if (tab === "schedule") return scheduleEditorHtml();
  if (tab === "meds") return medicationsHtml();
  if (tab === "care") return careEditorHtml();
  if (tab === "symptoms") return symptomsEditorHtml();
  if (tab === "safety") return safetyEditorHtml();
  if (tab === "people") return peopleEditorHtml();
  return profileEditorHtml();
}

function caregiverHtml() {
  return caregiverSummaryHtml() + caregiverTabsHtml() + caregiverContentHtml();
}

function monthlyHtml() {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= last.getDate(); day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weekDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const today = todayISO();

  return `
    <section class="section card">
      ${sectionTitle("📅", `לוח חודשי: ${monthName(now)}`, "אפשר להדפיס ולתלות על המקרר")}
      <div class="month-grid">
        ${weekDays.map(d => `<div class="month-head">${d}</div>`).join("")}
        ${cells.map(d => {
          if (!d) return `<div class="day-cell"></div>`;
          const iso = d.toISOString().slice(0, 10);
          const events = state.monthlyEvents.filter(e => e.date === iso);
          return `
            <div class="day-cell ${iso === today ? "today" : ""}">
              <div class="day-num">${d.getDate()}</div>
              ${iso === today ? `<div class="event-chip">היום</div>` : ""}
              ${events.map(e => `<div class="event-chip">${escapeHtml(e.title)} <button class="danger-btn no-print" style="padding:4px 8px;font-size:14px;" data-action="delete-monthly" data-id="${e.id}">מחיקה</button></div>`).join("")}
            </div>
          `;
        }).join("")}
      </div>
      <div class="item-row no-print" data-new-monthly>
        <div class="form-grid three">
          <label>תאריך<input type="date" data-new-monthly-field="date" value="${todayISO()}"></label>
          <label>אירוע<input data-new-monthly-field="title" placeholder="אירוע חודשי"></label>
        </div>
        <div class="save-row"><button class="primary-btn" data-action="add-monthly">הוספה</button></div>
      </div>
    </section>
  `;
}

function calmOverlayHtml() {
  if (!calmMode) return "";
  const primary = state.contacts[0];
  return `
    <div class="calm-overlay">
      <div class="calm-inner">
        <div class="calm-hero">
          <div style="font-size:80px;">🌿</div>
          <h1>הכול בסדר, ${escapeHtml(state.person.firstName)}</h1>
          <p>את בבית. את בטוחה.</p>
          <button class="calm-btn" data-action="speak-calm">🔊 הקריאי לי שוב</button>
        </div>
        <section class="section grid grid-2">
          <div class="card warm">
            ${sectionTitle("🏠", "איפה אני?")}
            <div class="big-text">
              <p>אני בבית.</p>
              <p>${escapeHtml(state.person.address)}</p>
              <p>${escapeHtml(state.person.city)}</p>
            </div>
          </div>
          <div class="card good">
            ${sectionTitle("❤️", "מה לעשות עכשיו?")}
            <div class="big-text">
              <p>לעצור רגע.</p>
              <p>לנשום לאט.</p>
              <p>${escapeHtml(state.safety.confusedMessage)}</p>
            </div>
          </div>
        </section>
        ${primary ? `<section class="section">${contactCardHtml(primary, true)}</section>` : ""}
        <button class="full-btn" data-action="close-calm">חזרה ללוח</button>
      </div>
    </div>
  `;
}

function render() {
  const theme = getTheme(now);
  document.body.className = theme.className;
  let content = "";
  if (state.view === "patient") content = patientHtml();
  if (state.view === "caregiver") content = caregiverHtml();
  if (state.view === "monthly") content = monthlyHtml();

  document.getElementById("app").innerHTML = `
    ${calmOverlayHtml()}
    <div class="app-shell">
      ${headerHtml()}
      ${content}
      <footer class="footer no-print">
        גרסה סטטית ל-GitHub Pages. אם רואים main.js 404 — ודאו שהקובץ main.js נמצא בשורש הריפוזיטורי יחד עם index.html.
      </footer>
    </div>
  `;
}

function readForm(container, attr) {
  const data = {};
  container.querySelectorAll(`[${attr}]`).forEach(el => {
    data[el.getAttribute(attr)] = el.value;
  });
  return data;
}

function saveGenericForm(target) {
  const container = document.querySelector(`[data-form="${target}"]`);
  if (!container) return;
  const data = readForm(container, "data-field");
  if (target === "person") state.person = { ...state.person, ...data };
  if (target === "care") {
    state.careCheck = { ...state.careCheck, ...data, date: todayISO() };
  }
  if (target === "safety") state.safety = { ...state.safety, ...data };
  saveState();
  render();
}

function parseBool(value) {
  return value === true || value === "true";
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "view") return setView(button.dataset.view);
  if (action === "tab") return setCaregiverTab(button.dataset.tab);

  if (action === "fullscreen") {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      alert("הדפדפן לא מאפשר מסך מלא כרגע");
    }
    return;
  }

  if (action === "calm") {
    calmMode = true;
    render();
    speakCalm();
    return;
  }

  if (action === "close-calm") {
    calmMode = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    render();
    return;
  }

  if (action === "speak-calm") return speakCalm();

  if (action === "toggle-schedule") {
    const id = Number(button.dataset.id);
    state.schedule = state.schedule.map(x => x.id === id ? { ...x, done: !x.done } : x);
    saveState();
    render();
    return;
  }

  if (action === "save-form") return saveGenericForm(button.dataset.target);

  if (action === "save-schedule") {
    const row = document.querySelector(`[data-schedule-id="${button.dataset.id}"]`);
    const data = readForm(row, "data-schedule-field");
    state.schedule = state.schedule.map(x => x.id === Number(button.dataset.id) ? {
      ...x,
      time: data.time,
      image: data.image,
      text: data.text,
      forPatient: parseBool(data.forPatient)
    } : x);
    saveState();
    render();
    return;
  }

  if (action === "delete-schedule") {
    state.schedule = state.schedule.filter(x => x.id !== Number(button.dataset.id));
    saveState();
    render();
    return;
  }

  if (action === "add-schedule") {
    const row = document.querySelector("[data-new-schedule]");
    const data = readForm(row, "data-new-schedule-field");
    if (!data.time || !data.text) return alert("נא להזין שעה ופעולה");
    state.schedule.push({ id: Date.now(), time: data.time, image: data.image || "✅", text: data.text, forPatient: true, done: false });
    saveState();
    render();
    return;
  }

  if (action === "save-med") {
    const row = document.querySelector(`[data-med-id="${button.dataset.id}"]`);
    const data = readForm(row, "data-med-field");
    state.medications = state.medications.map(x => x.id === Number(button.dataset.id) ? { ...x, ...data, taken: parseBool(data.taken) } : x);
    saveState();
    render();
    return;
  }

  if (action === "delete-med") {
    state.medications = state.medications.filter(x => x.id !== Number(button.dataset.id));
    saveState();
    render();
    return;
  }

  if (action === "add-med") {
    const row = document.querySelector("[data-new-med]");
    const data = readForm(row, "data-new-med-field");
    if (!data.time || !data.name) return alert("נא להזין שעה ושם תרופה");
    state.medications.push({ id: Date.now(), time: data.time, name: data.name, dose: data.dose || "", instructions: data.instructions || "", taken: false, givenBy: "", notes: "" });
    saveState();
    render();
    return;
  }

  if (action === "toggle-care") {
    const key = button.dataset.key;
    state.careCheck[key] = !state.careCheck[key];
    state.careCheck.date = todayISO();
    saveState();
    render();
    return;
  }

  if (action === "add-symptom") {
    const row = document.querySelector("[data-new-symptom]");
    const data = readForm(row, "data-new-symptom-field");
    if (!data.what) return alert("נא לכתוב מה קרה");
    state.symptomLog.unshift({
      id: Date.now(),
      date: data.date || todayISO(),
      time: data.time || `${two(new Date().getHours())}:${two(new Date().getMinutes())}`,
      type: data.type || "אחר",
      what: data.what,
      before: data.before || "",
      helped: data.helped || ""
    });
    saveState();
    render();
    return;
  }

  if (action === "delete-symptom") {
    state.symptomLog = state.symptomLog.filter(x => x.id !== Number(button.dataset.id));
    saveState();
    render();
    return;
  }

  if (action === "save-contact") {
    const row = document.querySelector(`[data-contact-id="${button.dataset.id}"]`);
    const data = readForm(row, "data-contact-field");
    state.contacts = state.contacts.map(x => x.id === Number(button.dataset.id) ? { ...x, ...data } : x);
    saveState();
    render();
    return;
  }

  if (action === "delete-contact") {
    state.contacts = state.contacts.filter(x => x.id !== Number(button.dataset.id));
    saveState();
    render();
    return;
  }

  if (action === "add-contact") {
    const row = document.querySelector("[data-new-contact]");
    const data = readForm(row, "data-new-contact-field");
    if (!data.relation || !data.phone) return alert("נא להזין קשר וטלפון");
    state.contacts.push({ id: Date.now(), ...data });
    saveState();
    render();
    return;
  }

  if (action === "save-family") {
    const row = document.querySelector(`[data-family-id="${button.dataset.id}"]`);
    const data = readForm(row, "data-family-field");
    state.family = state.family.map(x => x.id === Number(button.dataset.id) ? { ...x, ...data } : x);
    saveState();
    render();
    return;
  }

  if (action === "delete-family") {
    state.family = state.family.filter(x => x.id !== Number(button.dataset.id));
    saveState();
    render();
    return;
  }

  if (action === "add-family") {
    const row = document.querySelector("[data-new-family]");
    const data = readForm(row, "data-new-family-field");
    if (!data.relation || !data.name) return alert("נא להזין קשר ושם");
    state.family.push({ id: Date.now(), ...data });
    saveState();
    render();
    return;
  }

  if (action === "add-monthly") {
    const row = document.querySelector("[data-new-monthly]");
    const data = readForm(row, "data-new-monthly-field");
    if (!data.date || !data.title) return alert("נא להזין תאריך ואירוע");
    state.monthlyEvents.push({ id: Date.now(), date: data.date, title: data.title });
    saveState();
    render();
    return;
  }

  if (action === "delete-monthly") {
    state.monthlyEvents = state.monthlyEvents.filter(x => x.id !== Number(button.dataset.id));
    saveState();
    render();
  }
});

function speakCalm() {
  const message = `שלום ${state.person.firstName}, הכול בסדר. את נמצאת בבית, בכתובת ${state.person.address}, ${state.person.city}. את בטוחה והמשפחה שלך שומרת עלייך.`;
  speakHebrew(message, 0.78);
}

setInterval(() => {
  now = new Date();
  const currentCareDate = state.careCheck.date;
  if (currentCareDate && currentCareDate !== todayISO()) {
    state.careCheck = { ...DEFAULT_STATE.careCheck, date: todayISO() };
    saveState();
  }
  render();
}, 1000);

render();
