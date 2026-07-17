/**
 * מיגרציה חד-פעמית: pairs → groups + יצירת טאב files
 *
 * מריצים פעם אחת מתוך עורך ה-Apps Script המחובר ל-Sheet התיירות
 * (12n0CXdLqws58H8LIvRobfX08U4adDTllEQEOQLDLDR4).
 * לא מוחק את pairs — נשאר כגיבוי/היסטוריה, פשוט לא ישמש יותר את ה-API.
 * בטוח להרצה חוזרת: אם groups כבר קיים, לא יוצר אותו מחדש.
 */

function migratePairsToGroups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

    for (let r = 1; r < pairsData.length; r++) {
      const row = pairsData[r];
      const student1 = row[idx.student1_email] || '';
      const student2 = row[idx.student2_email] || '';
      const members = [student1, student2].filter(Boolean).join(',');
      const pairId  = row[idx.pair_id];

      groupsSheet.appendRow([
        pairId,
        row[idx.class_id] || '',
        'קבוצה ' + pairId.replace('pair_', ''),
        members,
        row[idx.teacher_email] || '',
        row[idx.site_name] || '',
        row[idx.site_url] || '',
        row[idx.site_score] || '',
        row[idx.current_section] || 1,
        row[idx.last_active] || '',
        row[idx.created_date] || ''
      ]);
    }
    Logger.log('הועברו ' + (pairsData.length - 1) + ' קבוצות מ-pairs ל-groups.');
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
