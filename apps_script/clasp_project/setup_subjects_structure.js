/**
 * הקמה חד-פעמית: טאב 'subjects' בגיליון KITA_PLUS.
 *
 * מריצים פעם אחת מתוך עורך ה-Apps Script המחובר (Run → setupSubjectsTab),
 * אחרי שהעלית את code.js המעודכן (עם getMySubjects) לאותו פרויקט.
 * בטוח להרצה חוזרת: אם subjects כבר קיים, לא יוצר אותו מחדש ולא דורס נתונים.
 *
 * פותח את הגיליון לפי ה-ID שלו במפורש (לא getActiveSpreadsheet) —
 * כך שזה עובד תמיד על הגיליון הנכון, בדיוק כמו setup_groups_structure.js.
 */

const KITA_PLUS_SHEET_ID = '10PxA-ynfG-6d5-FCW54stsz6dLK0c9Qxggl103rjg6A';

function setupSubjectsTab() {
  const ss = SpreadsheetApp.openById(KITA_PLUS_SHEET_ID);

  let subjectsSheet = ss.getSheetByName('subjects');
  if (subjectsSheet) {
    Logger.log('טאב subjects כבר קיים — לא יוצר מחדש ולא נוגע בנתונים. מחק אותו ידנית אם רוצים הקמה נקייה מחדש.');
    return;
  }

  subjectsSheet = ss.insertSheet('subjects');
  const headers = ['subject_id', 'name', 'icon', 'teacher_url', 'student_url', 'status'];
  subjectsSheet.appendRow(headers);

  subjectsSheet.appendRow([
    'tourism',
    'תיירות דיגיטלית',
    '🗺️',
    'https://nisan1234-afk.github.io/tourism/teacher/',
    'https://nisan1234-afk.github.io/tourism/student/',
    'active'
  ]);

  Logger.log('נוצר טאב subjects עם שורת תיירות דיגיטלית.');
}
