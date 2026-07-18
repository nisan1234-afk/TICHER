/**
 * מיגרציה חד-פעמית: pairs → groups + יצירת טאב files
 *
 * מריצים פעם אחת מתוך עורך ה-Apps Script המחובר ל-Sheet התיירות
 * (12n0CXdLqws58H8LIvRobfX08U4adDTllEQEOQLDLDR4).
 * לא מוחק את pairs — נשאר כגיבוי/היסטוריה, פשוט לא ישמש יותר את ה-API.
 * בטוח להרצה חוזרת: אם groups כבר קיים, לא יוצר אותו מחדש.
 *
 * לפני הרצה: לעשות עותק של הגיליון (קובץ → יצירת עותק) ליתר ביטחון —
 * זו הפעולה היחידה כאן שאין לה "בטל" (Undo) פשוט.
 *
 * חשוב לגבי עיתוי: מריצים את זה ומחליפים מייד את קוד ה-API לגרסה v2 באותה
 * ישיבה, בלי פער — כי מרגע שהכותרת ב-projects/activity_log משתנה מ-pair_id
 * ל-group_id, גרסת ה-API הישנה (v1) שעדיין פרוסה תתחיל גם היא לכתוב שורות
 * "יתומות" (היא עדיין כותבת לפי pair_id).
 *
 * פותח את הגיליון לפי ה-ID שלו במפורש (לא getActiveSpreadsheet) —
 * כך שזה עובד תמיד על הגיליון הנכון, גם אם מריצים מפרויקט Apps Script
 * שלא בטוח מ"קושר" (bound) לגיליון הזה.
 */

const TOURISM_SHEET_ID = '12n0CXdLqws58H8LIvRobfX08U4adDTllEQEOQLDLDR4';

function migratePairsToGroups() {
  const ss = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const pairsSheet = ss.getSheetByName('pairs');
  if (!pairsSheet) throw new Error('לא נמצא טאב pairs');

  let groupsSheet = ss.getSheetByName('groups');
  if (groupsSheet) {
    Logger.log('טאב groups כבר קיים — לא יוצר מחדש. מחק אותו ידנית אם רוצים להריץ מיגרציה נקייה מחדש.');
  } else {
    groupsSheet = ss.insertSheet('groups');
    const headers = [
      'group_id', 'class_id', 'group_name', 'members', 'teacher_email',
      'site_name', 'site_url', 'site_score',
      'current_section', 'last_active', 'created_date'
    ];
    groupsSheet.appendRow(headers);

    const pairsData = pairsSheet.getDataRange().getValues();
    const pairsHeaders = pairsData[0];
    const idx = {};
    pairsHeaders.forEach((h, i) => idx[h] = i);

    const newRows = [];
    const skipped = [];

    for (let r = 1; r < pairsData.length; r++) {
      try {
        const row = pairsData[r];
        const pairId = row[idx.pair_id];

        if (!pairId || String(pairId).trim() === '') {
          skipped.push('שורה ' + (r + 1) + ': pair_id ריק — דולג.');
          continue;
        }

        const student1 = row[idx.student1_email] || '';
        const student2 = row[idx.student2_email] || '';
        const members = [student1, student2].filter(Boolean).join(',');
        const displayNum = String(pairId).indexOf('pair_') === 0 ? String(pairId).slice(5) : String(pairId);

        newRows.push([
          pairId,
          row[idx.class_id] || '',
          'קבוצה ' + displayNum,
          members,
          row[idx.teacher_email] || '',
          row[idx.site_name] || '',
          row[idx.site_url] || '',
          row[idx.site_score] || '',
          row[idx.current_section] || 1,
          row[idx.last_active] || '',
          row[idx.created_date] || ''
        ]);
      } catch (rowErr) {
        skipped.push('שורה ' + (r + 1) + ': שגיאה — ' + rowErr.message);
      }
    }

    if (newRows.length > 0) {
      groupsSheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
    }
    Logger.log('הועברו ' + newRows.length + ' קבוצות מ-pairs ל-groups.');
    if (skipped.length > 0) {
      Logger.log('דולגו ' + skipped.length + ' שורות:\n' + skipped.join('\n'));
    }
  }

  let filesSheet = ss.getSheetByName('files');
  if (filesSheet) {
    Logger.log('טאב files כבר קיים — לא יוצר מחדש.');
  } else {
    filesSheet = ss.insertSheet('files');
    filesSheet.appendRow([
      'file_id', 'group_id', 'uploaded_by',
      'file_name', 'stored_name', 'file_url', 'uploaded_date'
    ]);
    Logger.log('נוצר טאב files.');
  }

  renamePairIdHeader(ss, 'projects');
  renamePairIdHeader(ss, 'activity_log');

  Logger.log('מיגרציה הסתיימה בהצלחה.');
}

/**
 * קריטי: projects ו-activity_log נכתבו במקור עם עמודת pair_id.
 * ה-API v2 כותב ל-group_id (אותם ערכים בדיוק לקבוצות שמוגרו — group_id = pair_id הישן).
 * בלי שינוי השם הזה, appendRow ב-API לא ימצא עמודה מתאימה לשמור אליה group_id,
 * ושורות פרויקט/לוג חדשות ייכתבו בלי מזהה קבוצה כלל — "יתומות" ולא ניתנות לאיתור.
 * משנה רק את הכותרת (row 1) — לא נוגע בנתונים עצמם.
 */
function renamePairIdHeader(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) { Logger.log('טאב ' + sheetName + ' לא נמצא — דילוג.'); return; }

  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  const idx = headers.indexOf('pair_id');

  if (idx === -1) {
    if (headers.indexOf('group_id') !== -1) {
      Logger.log(sheetName + ': כבר עודכן ל-group_id.');
    } else {
      Logger.log(sheetName + ': לא נמצאה עמודת pair_id — יש לבדוק ידנית.');
    }
    return;
  }

  sheet.getRange(1, idx + 1).setValue('group_id');
  Logger.log(sheetName + ': עמודה ' + (idx + 1) + ' שונתה מ-pair_id ל-group_id.');
}
