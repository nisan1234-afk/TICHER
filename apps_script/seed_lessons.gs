/**
 * מיגרציה חד-פעמית: מרחיבה את טאב units הקיים בעמודות תוכן,
 * וזורעת בו את 9 יחידות הלימוד הרשמיות עם תוכן אמיתי (מתוך המצגות/עבודות ב-
 * G:\האחסון שלי\תיירות דיגיטלית\תיירות דיגיטלית חומרים).
 *
 * לא נוגעת בטאב groups/projects/activity_log/files, ולא במנגנון is_open/open_date
 * הקיים — רק מוסיפה עמודות (lesson_num, summary, assignment_summary, source_type)
 * ומוסיפה שורות. כל יחידה מותאמת-אישית שמורה כבר בטאב לא נפגעת.
 *
 * הכרעות שנדרשו (ניסן האציל את הארגון לקלוד קוד, 2026-07-19):
 * - התנגשות מספור 7/8 במקור בין "תחבורה אוטונומית" ל"יעד חכם": נקבע
 *   יעד חכם=7 (לפי השורה הראשונה בתוך קובץ העבודה עצמו), תחבורה אוטונומית=8
 *   (לפי שם קובץ המצגת).
 * - יחידה 7 (יעד חכם): אין לה מצגת מקור כלל — מסומן בפירוש באתר, לא מוסתר.
 * - יחידה 9 (IoT): ניסוח ה-assignment_summary כאן מפנה לאתר הפרויקט האמיתי
 *   של התלמיד, לא לאתר הבדיוני של יחידה 6 (ביג דאטה) כפי שכתוב במקור.
 */

const LESSONS_TEACHER_EMAIL = 'nisan1234@gmail.com';

const LESSONS_SEED_DATA = [
  {
    lesson_num: 1,
    unit_name: 'מבוא לתיירות ותיירות דיגיטלית',
    section_linked: 1,
    source_type: 'product_feeding',
    summary: 'מגדירה מהי תיירות ומהי "תיירות דיגיטלית" (תיירות 2.0), ומציגה חמש קטגוריות של פעילות תיירות דיגיטלית: הזמנות מקוונות, תיירות וירטואלית (VR/AR), אתרי מידע וביקורת (TripAdvisor, Google Maps), שיווק יעד ברשתות חברתיות, ואפליקציות סיוע לנוסע.',
    assignment_summary: 'להביא דוגמה אמיתית (תמונה + לוגו + הסבר) לכל אחת מחמש הקטגוריות. עוזר לבנות את אוצר המילים הבסיסי לתיאור האתר שבחרתם (סעיף 1).'
  },
  {
    lesson_num: 2,
    unit_name: 'רקע היסטורי לתיירות דיגיטלית',
    section_linked: 4,
    source_type: 'independent',
    summary: 'עוסקת ב"מהפכת הדיגיטציה" ו"מהפכת האינטרנט" כרקע היסטורי-טכנולוגי: איך תכנון חופשה נראה לפני ואחרי הדיגיטציה, השפעת האינטרנט על תקשורת/מסחר/חינוך/בידור, ומושג "הפער הדיגיטלי" (digital divide).',
    assignment_summary: 'עבודה עיונית בעיקרה (השלמת מילים ושאלות הבנה) — לא עוסקת ישירות באתר הפרויקט שלכם, אבל נותנת מושג חשוב (פער דיגיטלי) לבנק המושגים (סעיף 4).'
  },
  {
    lesson_num: 3,
    unit_name: 'מעטפת דיגיטלית',
    section_linked: 3,
    source_type: 'product_feeding',
    summary: 'היחידה הגדולה ביותר בחומר. מלמדת את "מסע התייר הדיגיטלי": השראה דיגיטלית לבחירת יעד (UGC ברשתות, בלוגים, יוטיוב), תהליך הזמנה מקוונת, מושג "Seamless Travel", גאדג\'טים בתיירות (צ\'ק אין אוטומטי), וטכנולוגיית בלוקצ\'יין.',
    assignment_summary: 'לבצע בפועל על האתר שבחרתם: הזמנת לינה, הזמנת סיור ב-GetYourGuide, חיפוש ביקורת בגוגל — עם צילומי מסך אמיתיים. זו ליבת סעיף 3 (נוכחות דיגיטלית).'
  },
  {
    lesson_num: 4,
    unit_name: 'ניהול מבקרים דיגיטלי ואינפואתיקה',
    section_linked: 7,
    source_type: 'product_feeding',
    summary: 'טכנולוגיה לניהול מבקרים (כרטוס דיגיטלי, חיישני עומס, AI לזרימת מבקרים), מושגי "כושר נשיאה" ו"תיירות בר-קיימא", ודוגמאות עולמיות (הלובר, יוניברסל סינגפור). חלק שני: דילמות ערכיות (פרטיות מול נוחות, קיימות מול נגישות).',
    assignment_summary: 'לתכנן מערכת ניהול מבקרים דיגיטלית לאתר שבחרתם — מחקר, רעיון, נימוק, שיקולי יישום. זה תרגול ישיר של סעיף 7 (הצעות לשיפור) — הסעיף המשוקלל ביותר.'
  },
  {
    lesson_num: 5,
    unit_name: 'כלכלה שיתופית',
    section_linked: 4,
    source_type: 'independent',
    summary: 'מסבירה כלכלה שיתופית בתיירות: Airbnb, BlaBlaCar, Uber, Hipcamp, Couchsurfing, Airbnb Experiences, EatWith.',
    assignment_summary: 'תרגילי מיומנות כלליים (למשל חיפוש דירה ב-Airbnb בתל אביב) — לא קשורים ישירות לאתר הפרויקט שלכם, אבל נותנים מושג חשוב לסעיף 4.'
  },
  {
    lesson_num: 6,
    unit_name: 'ביג דאטה',
    section_linked: 4,
    source_type: 'independent',
    summary: 'שימוש בביג דאטה בתיירות: שיווק מותאם אישית, תמחור דינמי (Booking.com Pulse, Airbnb Smart Pricing), חיזוי ביקוש, ניהול הכנסות, מקרה בוחן Caesars Entertainment.',
    assignment_summary: 'תרגיל על אתר תיירות מומצא (לא אתר הפרויקט שלכם) — עבודה עיונית שנותנת מושג חשוב לסעיף 4.'
  },
  {
    lesson_num: 7,
    unit_name: 'יעד חכם ותיירות חכמה',
    section_linked: 7,
    source_type: 'product_feeding',
    summary: '⚠️ ליחידה זו לא נמצאה מצגת הרצאה מקורית — התוכן כאן מבוסס על עבודת ההגשה בלבד. עוסקת ב"תיירות חכמה" בחמישה תחומים: סביבה, תחבורה, כלכלה, חיים, אנשים — עם דוגמאות מאילת.',
    assignment_summary: 'להדגים כיצד אילת מיישמת תיירות חכמה בשני תחומים, ואז לבחור דרך אחת לתיירות וירטואלית ולתאר איך היא באה לידי ביטוי באתר הפרויקט שלכם. תרגול נוסף של סעיף 7.'
  },
  {
    lesson_num: 8,
    unit_name: 'תחבורה אוטונומית',
    section_linked: 4,
    source_type: 'independent',
    summary: 'רכבים אוטונומיים בתיירות: חוויית נסיעה, בטיחות, נגישות; "תיירות אוטונומית" (סיורי עיר ברכב אוטונומי); היסטוריית חברות תחבורה שיתופית (BlaBlaCar, Uber); אפליקציית Moovit.',
    assignment_summary: 'תכנון מסלול נסיעה אמיתי ב-Moovit — תרגיל מיומנות שלא קשור ישירות לאתר הפרויקט, אבל נותן מושג חשוב לסעיף 4.'
  },
  {
    lesson_num: 9,
    unit_name: 'אינטרנט של דברים (IoT)',
    section_linked: 7,
    source_type: 'product_feeding',
    summary: 'מסבירה IoT ויישומיו בתיירות: שליטה בחדר מלון מהסמארטפון, חיישני נפח לניהול מבקרים, מידע מונחה-מיקום, ניהול אנרגיה, מעקב נכסים.',
    assignment_summary: 'לקרוא שני מאמרים, ואז להציע פתרונות IoT יצירתיים לשיפור חוויית המבקר והיעילות התפעולית — על אתר הפרויקט שלכם. תרגול נוסף של סעיף 7 (הצעות לשיפור).'
  }
];

/**
 * מיגרציה חד-פעמית: קובעת "חודש מתוכנן" לכל אחת מ-9 היחידות, לפי חלוקה שנתית
 * שסוכמה עם ניסן (2026-07-19) — שנת לימודים 1.9.26 עד פורים (סוף מרץ 27),
 * 3 שעות שבועיות (שני שעה + רביעי שעתיים), עם חגי תשרי/חנוכה בחשבון.
 * לא קובעת מסמרות — ניסן יכול לשנות כל יחידה בנפרד דרך "ערוך" בדשבורד.
 */
const PLANNED_MONTHS = {
  lesson_1: 'ספטמבר',
  lesson_2: 'אוקטובר',
  lesson_3: 'אוקטובר',
  lesson_4: 'נובמבר',
  lesson_5: 'נובמבר',
  lesson_6: 'דצמבר',
  lesson_7: 'ינואר',
  lesson_8: 'ינואר',
  lesson_9: 'פברואר'
};

function seedPlannedMonths() {
  const ss    = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const sheet = ss.getSheetByName('units');
  ensureUnitPlannedMonthColumn(sheet);

  const units   = sheetToObjects(sheet);
  const headers = getHeaders(sheet);
  const colIdx  = headers.indexOf('planned_month') + 1;
  let updated = 0;

  units.forEach((u, i) => {
    if (PLANNED_MONTHS[u.unit_id] && !u.planned_month) {
      sheet.getRange(i + 2, colIdx).setValue(PLANNED_MONTHS[u.unit_id]);
      updated++;
    }
  });
  Logger.log('נקבע חודש מתוכנן ל-' + updated + ' יחידות.');
}

function seedCurriculumLessons() {
  const ss = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const sheet = ss.getSheetByName('units');
  if (!sheet) throw new Error('לא נמצא טאב units');

  fixTeacherPhoneHeader(sheet);
  ensureUnitsContentColumns(sheet);
  backfillMissingTeacherEmail(sheet);

  const existing = sheetToObjects(sheet);
  const existingLessonNums = existing
    .filter(u => u.lesson_num)
    .map(u => Number(u.lesson_num));

  const headers = getHeaders(sheet);
  let added = 0;

  LESSONS_SEED_DATA.forEach(lesson => {
    if (existingLessonNums.includes(lesson.lesson_num)) {
      Logger.log('יחידה ' + lesson.lesson_num + ' (' + lesson.unit_name + ') כבר קיימת — דילוג.');
      return;
    }
    appendRow(sheet, {
      unit_id: 'lesson_' + lesson.lesson_num,
      teacher_email: LESSONS_TEACHER_EMAIL,
      unit_name: lesson.unit_name,
      section_linked: lesson.section_linked,
      is_open: 'FALSE',
      open_date: '',
      lesson_num: lesson.lesson_num,
      summary: lesson.summary,
      assignment_summary: lesson.assignment_summary,
      source_type: lesson.source_type
    });
    added++;
  });

  Logger.log('נזרעו ' + added + ' יחידות לימוד חדשות (מתוך 9). קיימות מראש: ' + (9 - added) + '.');
}

/**
 * מתקן שם עמודה ישן: teacher_phone → teacher_email. הטאב units נוצר לפני
 * המעבר למייל כמזהה יחיד (Google Sign-In) ונשאר עם השם הישן, כך שכל הקוד
 * (toggleUnit, addUnit, getGroupLessons) שמחפש teacher_email לא מוצא כלום.
 * לא נוגע בנתונים — רק בכותרת. בטוח להרצה חוזרת (לא עושה כלום אם כבר תוקן).
 */
function fixTeacherPhoneHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  const idx = headers.indexOf('teacher_phone');

  if (idx === -1) {
    Logger.log(headers.indexOf('teacher_email') !== -1
      ? 'עמודת teacher_email כבר קיימת.'
      : 'לא נמצאה לא teacher_phone ולא teacher_email — יש לבדוק ידנית.');
    return;
  }

  sheet.getRange(1, idx + 1).setValue('teacher_email');
  Logger.log('הכותרת בעמודה ' + (idx + 1) + ' שונתה מ-teacher_phone ל-teacher_email.');
}

/**
 * שורות ה-lesson_* שכבר נכתבו לפני התיקון של fixTeacherPhoneHeader נשארו עם
 * עמודת teacher_email ריקה (כי בזמן הכתיבה שלהן העמודה עוד לא הייתה קיימת
 * בכלל, אז appendRow לא הייתה לה לאן לשים את הערך). ממלא את הערך בדיעבד,
 * רק לשורות עם lesson_num שהעמודה ריקה אצלן.
 */
function backfillMissingTeacherEmail(sheet) {
  const data    = sheetToObjects(sheet);
  const headers = getHeaders(sheet);
  const emailIdx = headers.indexOf('teacher_email') + 1;
  if (emailIdx === 0) return;

  let fixed = 0;
  data.forEach((row, i) => {
    if (row.lesson_num && !row.teacher_email) {
      sheet.getRange(i + 2, emailIdx).setValue(LESSONS_TEACHER_EMAIL);
      fixed++;
    }
  });
  if (fixed > 0) Logger.log('מולא teacher_email רטרואקטיבית ל-' + fixed + ' שורות.');
}

/**
 * מוסיף לטאב units את עמודות התוכן אם הן עוד לא קיימות — לא נוגע בעמודות
 * הקיימות (unit_id, teacher_email, unit_name, section_linked, is_open, open_date).
 */
function ensureUnitsContentColumns(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  const needed = ['lesson_num', 'summary', 'assignment_summary', 'source_type'];
  const toAdd = needed.filter(h => headers.indexOf(h) === -1);

  if (toAdd.length === 0) {
    Logger.log('כל עמודות התוכן כבר קיימות.');
    return;
  }

  const startCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, startCol, 1, toAdd.length).setValues([toAdd]);
  Logger.log('נוספו עמודות: ' + toAdd.join(', '));
}
