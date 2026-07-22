/**
 * כיתה פלוס — API מרכזי מאובטח (v2 — מודל קבוצות גמיש)
 *
 * שינויים מול v1:
 * - pairs/student1_email/student2_email → groups/members (רשימת מיילים מופרדת-פסיקים, כל גודל)
 * - נוספו: addGroup, addMember, removeMember, uploadFile, getGroupFiles
 * - נוספו תיקוני באגים: now לא מוגדר ב-toggleUnit, אימות aud חסר ב-verifyGoogleToken
 *
 * אבטחה:
 * - כל קריאה מאומתת מול גוגל דרך token, כולל בדיקת aud (שה-token הונפק לאפליקציה הזו)
 * - תפקידים נקבעים בטאב roles בלבד
 *
 * פריסה: Extensions → Apps Script → Deploy → New Deployment
 * Type: Web App | Execute as: Me | Who has access: Anyone
 */

const SHEETS = {
  KITA_PLUS: '10PxA-ynfG-6d5-FCW54stsz6dLK0c9Qxggl103rjg6A',
  TOURISM:   '12n0CXdLqws58H8LIvRobfX08U4adDTllEQEOQLDLDR4'
};

const ALLOWED_ORIGIN = 'https://nisan1234-afk.github.io';
const DRIVE_FOLDER    = '1SviWtQGsfCB6Yaxs_TwuPCSjFZlUahly';
const GOOGLE_CLIENT_ID = '988232727899-pajp4mhs43tet1phcu3rc8c8mutsgpme.apps.googleusercontent.com';
const TOURISM_SUBJECT_NAME = 'תיירות דיגיטלית';
const GEMINI_MODEL = 'gemini-flash-latest';

/**
 * המפתח נשמר ב-Script Properties (לא בקוד, לא ב-HTML הציבורי):
 * Apps Script עורך → Project Settings → Script Properties → הוסף GEMINI_API_KEY
 */
function getGeminiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('לא הוגדר מפתח Gemini API ב-Script Properties');
  return key;
}

/**
 * נעילה סביב קריאה-שינוי-כתיבה (find row index, then write to it) —
 * בלי זה, שני תלמידים שכותבים לאותה קבוצה כמעט בו-זמנית (autosave, כמה מכשירים)
 * עלולים לדרוס שינוי אחד את השני בלי שגיאה. ממתין עד 10 שניות לנעילה.
 */
function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ========== נקודת כניסה ==========

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    const protectedActions = [
      'getMyProfile', 'getTeacherDashboard', 'getGroupData',
      'saveSection', 'toggleUnit', 'addUnit', 'updateLesson', 'getGroupLessons', 'getAdminData',
      'updateTeacherStatus', 'updatePassword', 'addRole',
      'addGroup', 'addMember', 'removeMember', 'uploadFile', 'getGroupFiles',
      'proposeSite', 'chatWithBot',
      'saveLessonAnswer', 'addLessonBlock', 'updateLessonBlock', 'deleteLessonBlock', 'getGroupChatLog',
      'getGroupLessonAnswers', 'saveTeacherSectionEdit', 'sendBackupEmail', 'restoreBackup',
      'getFindingsForTeacher', 'updateFindingStatus',
      'addClass', 'updateClass', 'deleteClass',
      'trackUnitPresented', 'trackLessonView'
    ];

    if (protectedActions.includes(action)) {
      const userInfo = verifyGoogleToken(body.token);
      body.verifiedEmail = userInfo.email;
      body.verifiedName  = userInfo.name;
    }

    const handlers = {
      registerTeacher:     () => registerTeacher(body),

      getMyProfile:        () => getMyProfile(body),
      getAdminData:        () => getAdminData(body),
      updateTeacherStatus: () => updateTeacherStatus(body),
      addRole:             () => addRole(body),
      updatePassword:      () => updatePassword(body),
      getTeacherDashboard: () => getTeacherDashboard(body),
      getGroupData:        () => getGroupData(body),
      saveSection:         () => saveSection(body),
      toggleUnit:          () => toggleUnit(body),
      addUnit:             () => addUnit(body),
      updateLesson:        () => updateLesson(body),
      getGroupLessons:     () => getGroupLessons(body),

      addGroup:            () => addGroup(body),
      addMember:           () => addMember(body),
      removeMember:        () => removeMember(body),
      uploadFile:          () => uploadFile(body),
      getGroupFiles:       () => getGroupFiles(body),

      proposeSite:         () => proposeSite(body),
      chatWithBot:         () => chatWithBot(body),

      saveLessonAnswer:    () => saveLessonAnswer(body),
      addLessonBlock:      () => addLessonBlock(body),
      updateLessonBlock:   () => updateLessonBlock(body),
      deleteLessonBlock:   () => deleteLessonBlock(body),
      getGroupChatLog:     () => getGroupChatLog(body),
      getGroupLessonAnswers: () => getGroupLessonAnswers(body),
      saveTeacherSectionEdit: () => saveTeacherSectionEdit(body),
      sendBackupEmail:     () => sendBackupEmail(body),
      restoreBackup:       () => restoreBackup(body),

      getFindingsForTeacher: () => getFindingsForTeacher(body),
      updateFindingStatus:   () => updateFindingStatus(body),

      addClass:    () => addClass(body),
      updateClass: () => updateClass(body),
      deleteClass: () => deleteClass(body),

      trackUnitPresented: () => trackUnitPresented(body),
      trackLessonView:    () => trackLessonView(body),
    };

    if (!handlers[action]) {
      return respond({ ok: false, error: 'פעולה לא מוכרת: ' + action });
    }

    return respond({ ok: true, data: handlers[action]() });

  } catch (err) {
    return respond({ ok: false, error: err.message });
  }
}

function doGet() {
  return respond({ ok: true, message: 'כיתה פלוס API v2 פעיל' });
}

// ========== אימות גוגל ==========

function verifyGoogleToken(token) {
  if (!token) throw new Error('לא סופק token');

  try {
    const res  = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + token);
    const info = JSON.parse(res.getContentText());

    if (info.error) throw new Error('token לא תקין');
    if (!info.email_verified) throw new Error('מייל לא מאומת');
    if (info.aud !== GOOGLE_CLIENT_ID) throw new Error('token לא הונפק עבור אפליקציה זו');

    return { email: info.email, name: info.name || info.email };
  } catch(e) {
    throw new Error('אימות נכשל: ' + e.message);
  }
}

// ========== פרופיל משתמש ==========

function getMyProfile({ verifiedEmail, verifiedName }) {
  const ss = SpreadsheetApp.openById(SHEETS.KITA_PLUS);

  const teachers = sheetToObjects(ss.getSheetByName('מורים'));
  const teacher  = teachers.find(r => String(r.email).trim().toLowerCase() === verifiedEmail.toLowerCase());

  if (teacher) {
    if (teacher.status === 'blocked') throw new Error('החשבון חסום. פנה למנהל.');
    if (teacher.status === 'pending') throw new Error('החשבון ממתין לאישור המנהל.');

    const roles = getRoles(ss, verifiedEmail);
    if (roles.length === 0) roles.push('teacher');

    return {
      name:     teacher.name || verifiedName,
      email:    verifiedEmail,
      phone:    teacher.phone || '',
      roles,
      role:     roles[0],
      status:   teacher.status,
      folderId: teacher.folder_id || ''
    };
  }

  const students = sheetToObjects(ss.getSheetByName('תלמידים'));
  const student  = students.find(r => String(r.email).trim().toLowerCase() === verifiedEmail.toLowerCase());

  if (student) {
    return {
      name:  student.name || verifiedName,
      email: verifiedEmail,
      phone: student.phone || '',
      roles: ['student'],
      role:  'student'
    };
  }

  throw new Error('משתמש לא נמצא במערכת. פנה למורה להרשמה.');
}

// ========== הרשמת מורה ==========

function registerTeacher({ name, email, phone }) {
  if (!name || !email) throw new Error('נא למלא שם ומייל');

  const ss    = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const sheet = ss.getSheetByName('מורים');

  const existing = sheetToObjects(sheet);
  if (existing.find(r => String(r.email).toLowerCase() === email.toLowerCase())) {
    throw new Error('מייל זה כבר רשום במערכת');
  }

  let folderId = '';
  try {
    const parentFolder  = DriveApp.getFolderById(DRIVE_FOLDER);
    const teacherFolder = parentFolder.createFolder('מורה — ' + name);
    folderId = teacherFolder.getId();
  } catch(e) {
    // אם יצירת תיקייה נכשלת — ממשיכים בלעדיה
  }

  appendRow(sheet, {
    name,
    email,
    phone:          cleanPhone(phone || ''),
    password:       '',
    status:         'pending',
    created_date:   new Date().toISOString(),
    students_count: 0,
    topics:         0,
    folder_id:      folderId
  });

  return { registered: true, folderId };
}

// ========== אדמין ==========

function getAdminData({ verifiedEmail }) {
  requireRole(verifiedEmail, ['admin', 'school_admin']);
  const ss       = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const teachers = sheetToObjects(ss.getSheetByName('מורים'));
  const students = sheetToObjects(ss.getSheetByName('תלמידים'));
  return {
    teachers,
    students,
    stats: {
      active:   teachers.filter(t => t.status === 'active').length,
      pending:  teachers.filter(t => t.status === 'pending').length,
      blocked:  teachers.filter(t => t.status === 'blocked').length,
      students: students.length
    }
  };
}

function updateTeacherStatus({ verifiedEmail, targetEmail, status }) {
  requireRole(verifiedEmail, ['admin', 'school_admin']);
  const ss    = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const sheet = ss.getSheetByName('מורים');
  const data  = sheet.getDataRange().getValues();
  const headers   = data[0];
  const emailIdx  = headers.indexOf('email');
  const statusIdx = headers.indexOf('status');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][emailIdx]).toLowerCase() === targetEmail.toLowerCase()) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(status);
      return { updated: true };
    }
  }
  throw new Error('מורה לא נמצא');
}

function updatePassword({ verifiedEmail, newPassword }) {
  return { updated: true };
}

// ========== תיירות — קבוצות ==========

function getTeacherDashboard({ verifiedEmail }) {
  const ss = SpreadsheetApp.openById(SHEETS.TOURISM);

  const allGroups   = sheetToObjects(ss.getSheetByName('groups'));
  const allProjects = sheetToObjects(ss.getSheetByName('projects'));
  const allUnits    = sheetToObjects(ss.getSheetByName('units'));
  const allLogs     = sheetToObjects(ss.getSheetByName('activity_log'));
  const allBlocks   = sheetToObjects(ensureLessonBlocksSheet(ss));

  const units = allUnits
    .filter(u => u.teacher_email == verifiedEmail)
    .map(u => {
      const blocks = allBlocks
        .filter(b => b.unit_id === u.unit_id)
        .sort((a, b) => (Number(a.block_order) || 99) - (Number(b.block_order) || 99))
        .map(b => {
          const block = {
            block_id: b.block_id, block_order: b.block_order, block_type: b.block_type,
            title: b.title || '', body: b.body || '',
            media_type: b.media_type || '', media_url: b.media_url || '',
            game_type: b.game_type || '', question_prompt: b.question_prompt || '',
            target_field: b.target_field || ''
          };
          if (b.game_data) { try { block.game_data = JSON.parse(b.game_data); } catch (e) { block.game_data = []; } }
          return block;
        });
      return Object.assign({}, u, { blocks });
    });
  const myGroups = allGroups.filter(g => g.teacher_email == verifiedEmail);

  const groups = myGroups.map(group => {
    const project  = allProjects.find(p => p.pair_id == group.group_id || p.group_id == group.group_id) || {};
    const members  = String(group.members || '').split(',').map(m => m.trim()).filter(Boolean);
    const groupLogs = allLogs.filter(l => l.group_id == group.group_id || l.pair_id == group.group_id);

    let completedSections = 0;
    for (let i = 1; i <= 8; i++) {
      if (project['section_' + i]) completedSections++;
    }

    return {
      group_id:        group.group_id,
      group_name:      group.group_name || group.group_id,
      members,
      site_name:       group.site_name,
      current_section: group.current_section,
      last_active:     group.last_active,
      completed:       completedSections,
      total:           8,
      percent:         Math.round((completedSections / 8) * 100),
      contribution:    calcContribution(groupLogs, members)
    };
  });

  const classes = sheetToObjects(ensureClassesSheet(ss)).filter(c => c.teacher_email == verifiedEmail);

  return { groups, units, classes };
}

function getGroupData({ verifiedEmail, group_id }) {
  const ss = SpreadsheetApp.openById(SHEETS.TOURISM);

  const groups   = sheetToObjects(ss.getSheetByName('groups'));
  const projects = sheetToObjects(ss.getSheetByName('projects'));
  const logs     = sheetToObjects(ss.getSheetByName('activity_log'));

  const group = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim()).filter(Boolean);
  const isMember = members.some(m => m.toLowerCase() === String(verifiedEmail).toLowerCase());

  const ssKP  = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const roles = getRoles(ssKP, verifiedEmail);
  const isTeacher = roles.some(r => ['teacher','homeroom','admin','school_admin'].includes(r));
  if (!isMember && !isTeacher) throw new Error('אין הרשאה לצפות בקבוצה זו');

  const project   = projects.find(p => p.group_id == group_id || p.pair_id == group_id) || {};
  const groupLogs = logs.filter(l => l.group_id == group_id || l.pair_id == group_id);

  const sections     = {};
  const teacherEdits = {};
  const comments     = {};
  for (let i = 1; i <= 8; i++) {
    sections['section_' + i] = project['section_' + i] || '';
    try { teacherEdits['section_' + i] = project['section_' + i + '_teacher'] ? JSON.parse(project['section_' + i + '_teacher']) : {}; }
    catch (e) { teacherEdits['section_' + i] = {}; }
    comments['section_' + i] = project['section_' + i + '_comment'] || '';
  }

  const answers = sheetToObjects(ensureLessonAnswersSheet(ss)).filter(a => a.group_id == group_id);
  const total_score = answers.reduce((sum, a) => sum + (Number(a.score) || 0), 0);

  return {
    group: { ...group, members },
    sections,
    teacherEdits,
    comments,
    total_score,
    contribution:  calcContribution(groupLogs, members),
    last_updated:  project.last_updated
  };
}

/**
 * שומרת עריכה/הערה של המורה על סעיף ספציפי בקבוצה — ללא דריסת הטקסט המקורי
 * של התלמיד. עריכת המורה נשמרת בנפרד (section_N_teacher) ומוצגת לתלמיד
 * כבלוק צבוע נפרד מתחת לכל שדה, לצד הערת מורה כללית לסעיף (section_N_comment).
 * לפי בקשת ניסן: "המורה צריך גישה ישיר למה שהתלמידים כתבו- עם יכולת עריכה
 * (מה שהמורה עורך יופיע בצבע אחר) ועם הערות שלו מתחת לכל סעיף".
 */
function saveTeacherSectionEdit({ verifiedEmail, group_id, section_num, teacher_fields, comment }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);

  return withLock(() => {
    const ss = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet = ss.getSheetByName('projects');
    ensureProjectsTeacherColumns(sheet);

    const projects = sheetToObjects(sheet);
    const idx = projects.findIndex(p => p.group_id == group_id || p.pair_id == group_id);
    const teacherCol  = 'section_' + section_num + '_teacher';
    const commentCol  = 'section_' + section_num + '_comment';

    if (idx === -1) {
      const newRow = { group_id };
      for (let i = 1; i <= 8; i++) newRow['section_' + i] = '';
      newRow[teacherCol] = JSON.stringify(teacher_fields || {});
      newRow[commentCol] = comment || '';
      appendRow(sheet, newRow);
    } else {
      const headers = getHeaders(sheet);
      const rowNum  = idx + 2;
      const tIdx = headers.indexOf(teacherCol) + 1;
      const cIdx = headers.indexOf(commentCol) + 1;
      if (tIdx > 0) sheet.getRange(rowNum, tIdx).setValue(JSON.stringify(teacher_fields || {}));
      if (cIdx > 0) sheet.getRange(rowNum, cIdx).setValue(comment || '');
    }

    return { saved: true };
  });
}

/** מוסיפה עמודות section_N_teacher/section_N_comment לטאב projects אם עוד לא קיימות. */
function ensureProjectsTeacherColumns(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  const needed = [];
  for (let i = 1; i <= 8; i++) {
    if (headers.indexOf('section_' + i + '_teacher') === -1) needed.push('section_' + i + '_teacher');
    if (headers.indexOf('section_' + i + '_comment') === -1) needed.push('section_' + i + '_comment');
  }
  if (needed.length === 0) return;
  const startCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, startCol, 1, needed.length).setValues([needed]);
}

/**
 * שולחת למייל שהתלמיד ציין קובץ גיבוי (JSON) עם כל נתוני הקבוצה שלו —
 * רשת ביטחון אישית מעבר לשמירה האוטומטית בגיליון, לפי בקשת ניסן.
 */
function sendBackupEmail({ verifiedEmail, group_id, to_email }) {
  const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  if (!members.includes(String(verifiedEmail).toLowerCase())) {
    throw new Error('אין הרשאה לגבות קבוצה זו');
  }
  if (!to_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
    throw new Error('כתובת מייל לא תקינה');
  }

  const projects = sheetToObjects(ss.getSheetByName('projects'));
  const project  = projects.find(p => p.group_id == group_id || p.pair_id == group_id) || {};
  const sections = {};
  for (let i = 1; i <= 8; i++) sections['section_' + i] = project['section_' + i] || '';

  const answers = sheetToObjects(ensureLessonAnswersSheet(ss))
    .filter(a => a.group_id == group_id)
    .map(a => ({ unit_id: a.unit_id, block_id: a.block_id, answer_text: a.answer_text }));

  const backup = {
    backup_version: 1,
    exported_at: new Date().toISOString(),
    group_id: group.group_id,
    group_name: group.group_name || '',
    site_name: group.site_name || '',
    site_url: group.site_url || '',
    members,
    sections,
    lesson_answers: answers
  };

  const jsonStr  = JSON.stringify(backup, null, 2);
  const fileName = 'גיבוי_' + (group.group_name || group_id) + '.json';
  const blob     = Utilities.newBlob(jsonStr, 'application/json', fileName);

  MailApp.sendEmail({
    to: to_email,
    subject: 'גיבוי לפרויקט תיירות דיגיטלית — ' + (group.group_name || group_id),
    body: 'מצורף קובץ גיבוי של כל המידע שהזנתם בפרויקט "כיתה פלוס".\n\nכדי לשחזר בעתיד: היכנסו למערכת, פתחו "💾 גיבוי ושחזור" בתפריט הצד, ובחרו את הקובץ המצורף.',
    attachments: [blob]
  });

  return { sent: true, to: to_email };
}

/**
 * משחזרת נתוני קבוצה מקובץ גיבוי (JSON) שהועלה — דורסת רק את 8 הסעיפים ופרטי
 * האתר של הקבוצה הנוכחית, לא יוצרת/מזיזה קבוצות. אישור על הדריסה נעשה בצד
 * הלקוח (confirm) לפני הקריאה הזו, כי זו פעולה שדורסת מידע קיים.
 */
function restoreBackup({ verifiedEmail, group_id, backup_json }) {
  const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  if (!members.includes(String(verifiedEmail).toLowerCase())) {
    throw new Error('אין הרשאה לשחזר לקבוצה זו');
  }

  let backup;
  try { backup = JSON.parse(backup_json); } catch (e) { throw new Error('קובץ הגיבוי פגום או לא בפורמט הנכון'); }
  if (!backup || !backup.sections) throw new Error('קובץ הגיבוי לא מכיל נתוני פרויקט תקינים');

  return withLock(() => {
    const now = new Date().toISOString();
    const projectsSheet = ss.getSheetByName('projects');
    const projects       = sheetToObjects(projectsSheet);
    const idx            = projects.findIndex(p => p.group_id == group_id || p.pair_id == group_id);

    if (idx === -1) {
      const newRow = { group_id };
      for (let i = 1; i <= 8; i++) newRow['section_' + i] = backup.sections['section_' + i] || '';
      newRow.last_updated = now;
      appendRow(projectsSheet, newRow);
    } else {
      const headers = getHeaders(projectsSheet);
      const rowNum  = idx + 2;
      for (let i = 1; i <= 8; i++) {
        const colIdx = headers.indexOf('section_' + i) + 1;
        if (colIdx > 0) projectsSheet.getRange(rowNum, colIdx).setValue(backup.sections['section_' + i] || '');
      }
      const updIdx = headers.indexOf('last_updated') + 1;
      if (updIdx > 0) projectsSheet.getRange(rowNum, updIdx).setValue(now);
    }

    if (backup.site_name || backup.site_url) {
      const groupsSheet = ss.getSheetByName('groups');
      const gIdx        = groups.findIndex(g => g.group_id == group_id);
      const gHeaders    = getHeaders(groupsSheet);
      const gRowNum     = gIdx + 2;
      const nameIdx = gHeaders.indexOf('site_name') + 1;
      const urlIdx  = gHeaders.indexOf('site_url') + 1;
      if (nameIdx > 0 && backup.site_name) groupsSheet.getRange(gRowNum, nameIdx).setValue(backup.site_name);
      if (urlIdx > 0 && backup.site_url)  groupsSheet.getRange(gRowNum, urlIdx).setValue(backup.site_url);
    }

    return { restored: true };
  });
}

/**
 * מחזירה לתלמיד את יחידות הלימוד של המורה של הקבוצה שלו.
 * getTeacherDashboard מחזיר units רק כשקוראים לו כמורה (מסנן לפי teacher_email
 * של הקורא עצמו) — תלמיד לא יכול לקבל דרכו את היחידות של המורה שלו. זו הפעולה
 * המקבילה לתלמידים: מוצאת את הקבוצה → את teacher_email שלה → מחזירה את כל
 * היחידות של אותו מורה, כולל תוכן ובלוקים (הוראה/משחק/שאלה אישית).
 * הערה: נעילת is_open כבויה בכוונה לפי בקשת המורה — כל היחידות פתוחות תמיד.
 * המנגנון (is_open/toggleUnit) נשאר קיים ולא נמחק, ישמש בעתיד לנעילת מבחנים.
 */
function getGroupLessons({ verifiedEmail, group_id }) {
  const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  if (!members.includes(String(verifiedEmail).toLowerCase())) {
    throw new Error('אין הרשאה לצפות ביחידות של קבוצה זו');
  }

  const allUnits  = sheetToObjects(ss.getSheetByName('units'));
  const allBlocks = sheetToObjects(ensureLessonBlocksSheet(ss));
  const allAnswers = sheetToObjects(ensureLessonAnswersSheet(ss))
    .filter(a => a.group_id == group_id);

  const lessons = allUnits
    .filter(u => u.teacher_email === group.teacher_email)
    .sort((a, b) => (Number(a.lesson_num) || 99) - (Number(b.lesson_num) || 99))
    .map(u => {
      const blocks = allBlocks
        .filter(b => b.unit_id === u.unit_id)
        .sort((a, b) => (Number(a.block_order) || 99) - (Number(b.block_order) || 99))
        .map(b => {
          const block = {
            block_id:        b.block_id,
            block_type:      b.block_type,
            title:           b.title || '',
            body:            b.body || '',
            media_type:      b.media_type || '',
            media_url:       b.media_url || '',
            game_type:       b.game_type || '',
            question_prompt: b.question_prompt || '',
            target_field:    b.target_field || '',
            answer_scope:    b.answer_scope || 'learning',
            project_section: b.project_section || '',
            is_exportable:   b.is_exportable === true || b.is_exportable === 'TRUE' || b.is_exportable === 'true'
          };
          if ((b.block_type === 'game' || b.block_type === 'quiz' || b.block_type === 'question_structured') && b.game_data) {
            try { block.game_data = JSON.parse(b.game_data); } catch (e) { block.game_data = []; }
          }
          if (b.block_type === 'question' || b.block_type === 'question_structured') {
            const existing = allAnswers.find(a => a.block_id === b.block_id);
            block.saved_answer   = existing ? existing.answer_text : '';
            block.saved_score    = existing && existing.score !== '' ? existing.score : null;
            block.saved_feedback = existing ? (existing.score_feedback || '') : '';
          }
          return block;
        });

      return {
        unit_id:            u.unit_id,
        unit_name:           u.unit_name,
        lesson_num:          u.lesson_num || '',
        section_linked:      u.section_linked || '',
        source_type:         u.source_type || '',
        summary:             u.summary || '',
        assignment_summary:  u.assignment_summary || '',
        image_url:           u.image_url || '',
        embed_url:           u.embed_url || '',
        blocks
      };
    });

  return { lessons, last_unit_id: group.last_unit_id || '' };
}

/**
 * שומרת תשובה של קבוצה לשאלה אישית בתוך בלוק "question" ביחידת לימוד.
 * נכתבת בטבלת lesson_answers (רשומה גרסתית לפי group_id+block_id — upsert),
 * זה המקור להערכה/ציון של המורה על השאלות האישיות. לא נוגעת בטאב projects —
 * התשובה מוצגת לתלמיד בתוך עמוד הסעיף המתאים כפריט נפרד, לא מוזגת אוטומטית
 * לתוך שדה הטקסט החופשי (כדי לא לדרוס ניסוח עצמאי של התלמיד).
 *
 * ניקוד: לפי בקשת ניסן (2026-07-20) — הצ'אטבוט מעריך את רמת הפירוט/הדיוק של
 * התשובה (לא "נכון/לא נכון", זו שאלת יישום אישית) ונותן 0-10 + משוב קצר.
 * הניקוד מצטבר לתלמיד ככל שהוא מתקדם. אם הצ'אטבוט נכשל — התשובה עדיין נשמרת,
 * רק בלי ניקוד הפעם (לא חוסם את השמירה).
 */
function saveLessonAnswer({ verifiedEmail, group_id, unit_id, block_id, answer_text }) {
  const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  if (!members.includes(String(verifiedEmail).toLowerCase())) {
    throw new Error('אין הרשאה לשמור תשובה עבור קבוצה זו');
  }

  let score = '', scoreFeedback = '';
  if (answer_text && answer_text.trim().length > 0) {
    try {
      const blocks = sheetToObjects(ensureLessonBlocksSheet(ss));
      const block  = blocks.find(b => b.block_id === block_id);
      const prompt = block ? block.question_prompt : '';
      const systemPrompt = `אתה מעריך תשובה של תלמיד תיכון לשאלה אישית בפרויקט תיירות דיגיטלית.
נוסח השאלה: "${prompt}"
זו לא שאלת נכון/לא נכון — הערך רק לפי רמת הפירוט והדיוק: האם התלמיד נתן דוגמה קונקרטית וספציפית מהאתר שבחר, או תשובה כללית וסתמית שיכולה להתאים לכל אתר.
תן משוב קצר וממוקד (משפט אחד, בעברית, טון מעודד אך כן).
בסיום, בשורה נפרדת, כתוב בדיוק: SCORE: X כאשר X הוא מספר שלם בין 0 ל-10.`;
      const reply = callGemini(systemPrompt, answer_text);
      const scoreMatch = reply.match(/SCORE:\s*(\d+)/);
      score = scoreMatch ? Math.min(10, parseInt(scoreMatch[1])) : '';
      scoreFeedback = reply.replace(/SCORE:\s*\d+/, '').trim();
    } catch (e) {
      score = ''; scoreFeedback = '';
    }
  }

  return withLock(() => {
    const sheet   = ensureLessonAnswersSheet(ss);
    ensureLessonAnswersScoreColumns(sheet);
    const answers = sheetToObjects(sheet);
    const now     = new Date().toISOString();
    const idx     = answers.findIndex(a => a.group_id == group_id && a.block_id === block_id);

    if (idx === -1) {
      appendRow(sheet, {
        answer_id:   Utilities.getUuid(),
        group_id, unit_id, block_id,
        answer_text: answer_text || '',
        updated_by:  verifiedEmail,
        updated_at:  now,
        score, score_feedback: scoreFeedback
      });
    } else {
      const headers = getHeaders(sheet);
      const rowNum  = idx + 2;
      const fields  = { answer_text: answer_text || '', updated_by: verifiedEmail, updated_at: now, score, score_feedback: scoreFeedback };
      Object.keys(fields).forEach(key => {
        const colIdx = headers.indexOf(key) + 1;
        if (colIdx > 0) sheet.getRange(rowNum, colIdx).setValue(fields[key]);
      });
    }

    upsertFinding_(ss, { group_id, unit_id, block_id, answer_text: answer_text || '', now });

    return { saved: true, updated_at: now, score, score_feedback: scoreFeedback };
  });
}

/**
 * אם הבלוק הוא תשובת-תוצר (answer_scope=project), יוצרת/מעדכנת שורה מתאימה
 * ב-findings — סטטוס תמיד חוזר ל-pending בכל שמירה חוזרת, כדי שהמורה יידע
 * שיש עדכון שממתין לבדיקה. תשובת למידה לא יוצרת ממצא בכלל.
 */
function upsertFinding_(ss, { group_id, unit_id, block_id, answer_text, now }) {
  const blocks = sheetToObjects(ensureLessonBlocksSheet(ss));
  const block  = blocks.find(b => b.block_id === block_id);
  if (!block || block.answer_scope !== 'project') return;

  const sheet    = ensureFindingsSheet(ss);
  const findings = sheetToObjects(sheet);
  const idx      = findings.findIndex(f => f.group_id == group_id && f.block_id === block_id);

  if (!answer_text.trim()) return; // אין ממצא ריק

  if (idx === -1) {
    appendRow(sheet, {
      finding_id: Utilities.getUuid(),
      group_id, unit_id, block_id,
      project_section: block.project_section || '',
      content: answer_text,
      status: 'pending',
      teacher_note: '',
      updated_at: now
    });
  } else {
    const headers = getHeaders(sheet);
    const rowNum  = idx + 2;
    const fields  = { content: answer_text, status: 'pending', updated_at: now };
    Object.keys(fields).forEach(key => {
      const colIdx = headers.indexOf(key) + 1;
      if (colIdx > 0) sheet.getRange(rowNum, colIdx).setValue(fields[key]);
    });
  }
}

/** כל הממצאים (תשובות-תוצר) של קבוצות המורה המחובר, לתצוגה לפי פרק. */
function getFindingsForTeacher({ verifiedEmail }) {
  requireRole(verifiedEmail, ['teacher', 'admin', 'school_admin']);
  const ss = SpreadsheetApp.openById(SHEETS.TOURISM);

  const myGroups   = sheetToObjects(ss.getSheetByName('groups')).filter(g => g.teacher_email == verifiedEmail);
  const myGroupIds = new Set(myGroups.map(g => String(g.group_id)));
  const allBlocks  = sheetToObjects(ensureLessonBlocksSheet(ss));
  const allUnits   = sheetToObjects(ss.getSheetByName('units'));

  const findings = sheetToObjects(ensureFindingsSheet(ss))
    .filter(f => myGroupIds.has(String(f.group_id)))
    .map(f => {
      const group = myGroups.find(g => String(g.group_id) === String(f.group_id));
      const block = allBlocks.find(b => b.block_id === f.block_id);
      const unit  = allUnits.find(u => u.unit_id === f.unit_id);
      return {
        finding_id:      f.finding_id,
        group_id:        f.group_id,
        group_name:      group ? (group.group_name || group.group_id) : f.group_id,
        unit_id:         f.unit_id,
        unit_name:       unit ? unit.unit_name : f.unit_id,
        block_id:        f.block_id,
        block_title:     block ? block.title : '',
        project_section: f.project_section || '',
        content:         f.content || '',
        status:          f.status || 'pending',
        teacher_note:    f.teacher_note || '',
        updated_at:      f.updated_at || ''
      };
    })
    .sort((a, b) => (Number(a.project_section) || 99) - (Number(b.project_section) || 99));

  return { findings };
}

/** אישור / החזרה לתיקון של ממצא בודד ע"י המורה. */
function updateFindingStatus({ verifiedEmail, finding_id, status, teacher_note }) {
  requireRole(verifiedEmail, ['teacher', 'admin', 'school_admin']);
  if (['pending', 'approved', 'returned'].indexOf(status) === -1) throw new Error('סטטוס לא תקין');

  return withLock(() => {
    const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet  = ensureFindingsSheet(ss);
    const rows   = sheetToObjects(sheet);
    const idx    = rows.findIndex(f => f.finding_id === finding_id);
    if (idx === -1) throw new Error('ממצא לא נמצא');

    const group = sheetToObjects(ss.getSheetByName('groups')).find(g => g.group_id == rows[idx].group_id);
    if (!group || group.teacher_email != verifiedEmail) {
      requireRole(verifiedEmail, ['admin', 'school_admin']); // מורה יכול לגעת רק בממצאים של הקבוצות שלו; אדמין יכול תמיד
    }

    const headers = getHeaders(sheet);
    const rowNum  = idx + 2;
    const fields  = { status, teacher_note: teacher_note || '', updated_at: new Date().toISOString() };
    Object.keys(fields).forEach(key => {
      const colIdx = headers.indexOf(key) + 1;
      if (colIdx > 0) sheet.getRange(rowNum, colIdx).setValue(fields[key]);
    });
    return { updated: true };
  });
}

/** מוסיפה עמודות score/score_feedback לטאב lesson_answers אם עוד לא קיימות. */
function ensureLessonAnswersScoreColumns(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  const needed = ['score', 'score_feedback'].filter(h => headers.indexOf(h) === -1);
  if (needed.length === 0) return;
  const startCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, startCol, 1, needed.length).setValues([needed]);
}

/**
 * בונה (פעם ראשונה) או מאתרת את טאב lesson_blocks — תוכן הבלוקים בתוך כל
 * יחידת לימוד (הוראה/משחק/שאלה אישית). לא נוגעת בטאב units עצמו.
 */
function ensureLessonBlocksSheet(ss) {
  const sheet = ensureSheetWithHeaders(ss, 'lesson_blocks', [
    'block_id', 'unit_id', 'block_order', 'block_type', 'title', 'body',
    'media_type', 'media_url', 'game_type', 'game_data', 'question_prompt', 'target_field'
  ]);
  return ensureLessonBlockScopeColumns(sheet);
}

/**
 * הוספה חד-פעמית (self-healing) של עמודות ההפרדה בין תשובת-למידה לתשובת-תוצר:
 * answer_scope (learning/project), project_section (1-8, רק אם project),
 * is_exportable. לא נוגעת בשורות קיימות מלבד הוספת עמודות ריקות.
 */
function ensureLessonBlockScopeColumns(sheet) {
  const headers = getHeaders(sheet);
  const toAdd = ['answer_scope', 'project_section', 'is_exportable'].filter(h => headers.indexOf(h) === -1);
  if (toAdd.length) {
    sheet.getRange(1, headers.length + 1, 1, toAdd.length).setValues([toAdd]);
  }
  return sheet;
}

/** טאב lesson_answers — תשובות קבוצות לשאלות האישיות שבתוך בלוקים. */
function ensureLessonAnswersSheet(ss) {
  return ensureSheetWithHeaders(ss, 'lesson_answers', [
    'answer_id', 'group_id', 'unit_id', 'block_id', 'answer_text', 'updated_by', 'updated_at'
  ]);
}

/** טאב chat_logs — תיעוד שיחות הצ'אטבוט, כדי שהמורה יוכל לגשת אליהן. */
function ensureChatLogsSheet(ss) {
  return ensureSheetWithHeaders(ss, 'chat_logs', [
    'log_id', 'group_id', 'student_email', 'section_num', 'role', 'message', 'timestamp'
  ]);
}

/**
 * טאב findings — ממצאים (תשובות-תוצר בלבד) שממתינים לאישור המורה לפני
 * שהם נכנסים בפועל לסעיפי התוצר. שורה אחת לכל (group_id, block_id).
 * status: pending / approved / returned. נוצרת/מתעדכנת מתוך saveLessonAnswer,
 * לא נכתבת ישירות ע"י התלמיד.
 */
function ensureFindingsSheet(ss) {
  return ensureSheetWithHeaders(ss, 'findings', [
    'finding_id', 'group_id', 'unit_id', 'block_id', 'project_section',
    'content', 'status', 'teacher_note', 'updated_at'
  ]);
}

function ensureSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

/**
 * CRUD לבלוקים בתוך יחידת לימוד — למורה, לעריכה ידנית אחרי הבנייה הראשונית.
 */
function addLessonBlock({ verifiedEmail, unit_id, block_order, block_type, title, body, media_type, media_url, game_type, game_data, question_prompt, target_field, answer_scope, project_section, is_exportable }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  return withLock(() => {
    const ss    = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet = ensureLessonBlocksSheet(ss);
    const block_id = 'block_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    appendRow(sheet, {
      block_id, unit_id,
      block_order: block_order || 1,
      block_type, title: title || '', body: body || '',
      media_type: media_type || '', media_url: media_url || '',
      game_type: game_type || '',
      game_data: game_data ? JSON.stringify(game_data) : '',
      question_prompt: question_prompt || '',
      target_field: target_field || '',
      answer_scope: answer_scope || 'learning',
      project_section: project_section || '',
      is_exportable: is_exportable === undefined ? (answer_scope === 'project') : !!is_exportable
    });
    return { block_id, created: true };
  });
}

function updateLessonBlock({ verifiedEmail, block_id, block_order, title, body, media_type, media_url, game_type, game_data, question_prompt, target_field, answer_scope, project_section, is_exportable }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  return withLock(() => {
    const ss      = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet   = ensureLessonBlocksSheet(ss);
    const blocks  = sheetToObjects(sheet);
    const idx     = blocks.findIndex(b => b.block_id === block_id);
    if (idx === -1) throw new Error('בלוק לא נמצא');

    const headers = getHeaders(sheet);
    const rowNum  = idx + 2;
    const fields  = { block_order, title, body, media_type, media_url, game_type, question_prompt, target_field, answer_scope, project_section, is_exportable };
    if (game_data !== undefined) fields.game_data = JSON.stringify(game_data);

    Object.keys(fields).forEach(key => {
      if (fields[key] === undefined) return;
      const colIdx = headers.indexOf(key) + 1;
      if (colIdx > 0) sheet.getRange(rowNum, colIdx).setValue(fields[key]);
    });

    return { block_id, updated: true };
  });
}

function deleteLessonBlock({ verifiedEmail, block_id }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  return withLock(() => {
    const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet  = ensureLessonBlocksSheet(ss);
    const blocks = sheetToObjects(sheet);
    const idx    = blocks.findIndex(b => b.block_id === block_id);
    if (idx === -1) throw new Error('בלוק לא נמצא');
    sheet.deleteRow(idx + 2);
    return { deleted: true };
  });
}

/**
 * מחזירה למורה את כל תשובות הקבוצה לשאלות האישיות מתוך יחידות הלימוד,
 * עם הקשר (שם היחידה, נוסח השאלה) — כדי שהמורה יוכל לקרוא ולתת ציון/משוב.
 */
function getGroupLessonAnswers({ verifiedEmail, group_id }) {
  const ssKP  = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const roles = getRoles(ssKP, verifiedEmail);
  const isTeacher = roles.some(r => ['teacher','admin','school_admin','homeroom'].includes(r));
  if (!isTeacher) throw new Error('אין הרשאה לצפות בתשובות הקבוצה');

  const ss      = SpreadsheetApp.openById(SHEETS.TOURISM);
  const answers = sheetToObjects(ensureLessonAnswersSheet(ss)).filter(a => a.group_id == group_id);
  const blocks  = sheetToObjects(ensureLessonBlocksSheet(ss));
  const units   = sheetToObjects(ss.getSheetByName('units'));

  const enriched = answers
    .filter(a => a.answer_text)
    .map(a => {
      const block = blocks.find(b => b.block_id === a.block_id) || {};
      const unit  = units.find(u => u.unit_id === a.unit_id) || {};
      return {
        unit_name:       unit.unit_name || '',
        question_prompt: block.question_prompt || '',
        answer_text:     a.answer_text,
        updated_at:      a.updated_at
      };
    })
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

  return { answers: enriched };
}

/**
 * מחזירה למורה את יומן הצ'אטבוט המלא של קבוצה — כל השאלות והתשובות,
 * לפי בקשת ניסן: "מה שהם מתכתבים עם הצאטבוט נשמר והמורה יוכל לגשת לזה".
 */
function getGroupChatLog({ verifiedEmail, group_id }) {
  const ssKP  = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const roles = getRoles(ssKP, verifiedEmail);
  const isTeacher = roles.some(r => ['teacher','admin','school_admin','homeroom'].includes(r));
  if (!isTeacher) throw new Error('אין הרשאה לצפות ביומן הצ׳אט');

  const ss   = SpreadsheetApp.openById(SHEETS.TOURISM);
  const logs = sheetToObjects(ensureChatLogsSheet(ss))
    .filter(l => l.group_id == group_id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return { logs };
}

function saveSection({ verifiedEmail, group_id, section_num, content, device_id }) {
  const ss  = SpreadsheetApp.openById(SHEETS.TOURISM);
  const now = new Date().toISOString();

  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  if (!members.includes(String(verifiedEmail).toLowerCase())) {
    throw new Error('אין הרשאה לערוך קבוצה זו');
  }

  return withLock(() => {
    const projectsSheet = ss.getSheetByName('projects');
    const projects      = sheetToObjects(projectsSheet);
    const projIdx       = projects.findIndex(p => p.group_id == group_id || p.pair_id == group_id);

    if (projIdx === -1) {
      const newRow = { group_id };
      for (let i = 1; i <= 8; i++) newRow['section_' + i] = '';
      newRow['section_' + section_num] = content;
      newRow.last_updated = now;
      appendRow(projectsSheet, newRow);
    } else {
      const headers = getHeaders(projectsSheet);
      const rowNum  = projIdx + 2;
      const colIdx  = headers.indexOf('section_' + section_num) + 1;
      const updIdx  = headers.indexOf('last_updated') + 1;
      if (colIdx > 0) projectsSheet.getRange(rowNum, colIdx).setValue(content);
      if (updIdx > 0) projectsSheet.getRange(rowNum, updIdx).setValue(now);
    }

    const groupsSheet = ss.getSheetByName('groups');
    const groupsData  = sheetToObjects(groupsSheet);
    const groupIdx    = groupsData.findIndex(g => g.group_id == group_id);
    if (groupIdx !== -1) {
      const headers = getHeaders(groupsSheet);
      const rowNum  = groupIdx + 2;
      const csIdx   = headers.indexOf('current_section') + 1;
      const laIdx   = headers.indexOf('last_active') + 1;
      if (csIdx > 0) groupsSheet.getRange(rowNum, csIdx).setValue(section_num);
      if (laIdx > 0) groupsSheet.getRange(rowNum, laIdx).setValue(now);
    }

    const logSheet   = ss.getSheetByName('activity_log');
    const soloOrPair = isGroupActive(ss, group_id, verifiedEmail) ? 'pair' : 'solo';
    appendRow(logSheet, {
      log_id:        Utilities.getUuid(),
      group_id,
      student_email: verifiedEmail,
      device_id:     device_id || 'unknown',
      action:        'save_section',
      section:       section_num,
      timestamp:     now,
      duration_sec:  0,
      solo_or_pair:  soloOrPair
    });

    return { saved: true, timestamp: now };
  });
}

function toggleUnit({ verifiedEmail, unit_id, is_open }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  const now = new Date().toISOString();

  return withLock(() => {
    const ss         = SpreadsheetApp.openById(SHEETS.TOURISM);
    const unitsSheet = ss.getSheetByName('units');
    const units      = sheetToObjects(unitsSheet);
    const headers    = getHeaders(unitsSheet);

    const idx = units.findIndex(u => u.unit_id == unit_id && u.teacher_email == verifiedEmail);
    if (idx === -1) throw new Error('יחידה לא נמצאה');

    const rowNum  = idx + 2;
    const openIdx = headers.indexOf('is_open') + 1;
    const dateIdx = headers.indexOf('open_date') + 1;
    if (openIdx > 0) unitsSheet.getRange(rowNum, openIdx).setValue(is_open ? 'TRUE' : 'FALSE');
    if (dateIdx > 0 && is_open) unitsSheet.getRange(rowNum, dateIdx).setValue(now);

    return { unit_id, is_open };
  });
}

/**
 * מסמנת שהמורה הציג (מצגת) יחידה מסוימת עכשיו — כדי שכפתור "המשך מאיפה
 * שעצרנו" בדשבורד יוכל להוביל ישר לאותה יחידה, גם ממחשב אחר (נשמר בגיליון,
 * לא רק בדפדפן). לא חוסמת אם היחידה לא נמצאה — זו פעולת מעקב "best effort".
 */
function trackUnitPresented({ verifiedEmail, unit_id }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  const now = new Date().toISOString();

  return withLock(() => {
    const ss         = SpreadsheetApp.openById(SHEETS.TOURISM);
    const unitsSheet = ensureUnitLastPresentedColumn(ss.getSheetByName('units'));
    const units      = sheetToObjects(unitsSheet);
    const headers    = getHeaders(unitsSheet);

    const idx = units.findIndex(u => u.unit_id == unit_id && u.teacher_email == verifiedEmail);
    if (idx === -1) return { tracked: false };

    const rowNum = idx + 2;
    const colIdx = headers.indexOf('last_presented_at') + 1;
    if (colIdx > 0) unitsSheet.getRange(rowNum, colIdx).setValue(now);

    return { tracked: true };
  });
}

/** הוספה חד-פעמית (self-healing) של עמודת last_presented_at לטאב units. */
function ensureUnitLastPresentedColumn(sheet) {
  const headers = getHeaders(sheet);
  if (headers.indexOf('last_presented_at') === -1) {
    sheet.getRange(1, headers.length + 1).setValue('last_presented_at');
  }
  return sheet;
}

/**
 * מסמנת שקבוצת תלמידים פתחה יחידת לימוד מסוימת — כדי שכפתור "המשך מאיפה
 * שעצרתם" יוביל ישר לשיעור האחרון שנפתח, גם ממכשיר אחר (נשמר בגיליון).
 * בדיקת הרשאה זהה לזו שב-getGroupLessons: רק חבר בקבוצה.
 */
function trackLessonView({ verifiedEmail, group_id, unit_id }) {
  return withLock(() => {
    const ss          = SpreadsheetApp.openById(SHEETS.TOURISM);
    const groupsSheet = ensureGroupLastUnitColumn(ss.getSheetByName('groups'));
    const groups      = sheetToObjects(groupsSheet);
    const headers     = getHeaders(groupsSheet);

    const idx = groups.findIndex(g => g.group_id == group_id);
    if (idx === -1) return { tracked: false };

    const members = String(groups[idx].members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
    if (!members.includes(String(verifiedEmail).toLowerCase())) return { tracked: false };

    const rowNum = idx + 2;
    const colIdx = headers.indexOf('last_unit_id') + 1;
    if (colIdx > 0) groupsSheet.getRange(rowNum, colIdx).setValue(unit_id);

    return { tracked: true };
  });
}

/** הוספה חד-פעמית (self-healing) של עמודת last_unit_id לטאב groups. */
function ensureGroupLastUnitColumn(sheet) {
  const headers = getHeaders(sheet);
  if (headers.indexOf('last_unit_id') === -1) {
    sheet.getRange(1, headers.length + 1).setValue('last_unit_id');
  }
  return sheet;
}

/**
 * יוצרת יחידת לימוד מותאמת-אישית חדשה של המורה (לא אחת מ-9 היחידות הזרועות).
 * הפרונט (teacher.html) קרא בעבר ל-toggleUnit עם unit_id חדש כדי "ליצור" —
 * זה תמיד נכשל כי toggleUnit דורש שהיחידה כבר קיימת. זה התיקון האמיתי.
 */
function addUnit({ verifiedEmail, unit_name, section_linked, is_open }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  const now = new Date().toISOString();

  return withLock(() => {
    const ss    = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet = ss.getSheetByName('units');
    const unit_id = 'unit_' + Date.now();

    appendRow(sheet, {
      unit_id,
      teacher_email:  verifiedEmail,
      unit_name,
      section_linked,
      is_open:   is_open ? 'TRUE' : 'FALSE',
      open_date: is_open ? now : ''
    });

    return { unit_id, created: true };
  });
}

/**
 * מאפשרת למורה לערוך תוכן יחידה קיימת (שם, סעיף, תקציר, תקציר עבודה) —
 * גם ליחידות שהמורה יצר וגם ל-9 יחידות הלימוד שנזרעו (שייכות אליו, teacher_email תואם).
 * לא נוגעת ב-is_open/open_date — זה עדיין דרך toggleUnit.
 */
function updateLesson({ verifiedEmail, unit_id, unit_name, section_linked, summary, assignment_summary, image_url, embed_url, planned_month }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);

  return withLock(() => {
    const ss    = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet = ss.getSheetByName('units');

    ensureUnitMediaColumns(sheet);
    ensureUnitPlannedMonthColumn(sheet);

    const units = sheetToObjects(sheet);
    const idx   = units.findIndex(u => u.unit_id == unit_id && u.teacher_email == verifiedEmail);
    if (idx === -1) throw new Error('יחידה לא נמצאה');

    const headers = getHeaders(sheet);
    const rowNum  = idx + 2;
    const fields  = { unit_name, section_linked, summary, assignment_summary, image_url, embed_url, planned_month };

    Object.keys(fields).forEach(key => {
      if (fields[key] === undefined) return;
      const colIdx = headers.indexOf(key) + 1;
      if (colIdx > 0) sheet.getRange(rowNum, colIdx).setValue(fields[key]);
    });

    return { unit_id, updated: true };
  });
}

/**
 * מוסיפה image_url/embed_url לטאב units אם הן עוד לא קיימות — כדי ש-updateLesson
 * יעבוד גם בלי להריץ שוב ידנית את seedCurriculumLessons.
 */
function ensureUnitMediaColumns(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  const needed = ['image_url', 'embed_url'].filter(h => headers.indexOf(h) === -1);
  if (needed.length === 0) return;
  const startCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, startCol, 1, needed.length).setValues([needed]);
}

/** מוסיפה עמודת planned_month (חודש מתוכנן ללימוד היחידה) לטאב units אם עוד לא קיימת. */
function ensureUnitPlannedMonthColumn(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  if (headers.indexOf('planned_month') !== -1) return;
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue('planned_month');
}

/** טאב classes — כיתות של המורה, שכבה בין בית הספר לקבוצות (בית ספר ← כיתה ← קבוצה ← תלמיד). */
function ensureClassesSheet(ss) {
  return ensureSheetWithHeaders(ss, 'classes', ['class_id', 'class_name', 'teacher_email', 'created_at']);
}

function addClass({ verifiedEmail, class_name }) {
  requireRole(verifiedEmail, ['teacher', 'admin', 'school_admin']);
  if (!class_name || !class_name.trim()) throw new Error('נא להזין שם כיתה');
  const ss    = SpreadsheetApp.openById(SHEETS.TOURISM);
  const sheet = ensureClassesSheet(ss);
  const class_id = 'class_' + Date.now();
  appendRow(sheet, { class_id, class_name: class_name.trim(), teacher_email: verifiedEmail, created_at: new Date().toISOString() });
  return { class_id, created: true };
}

function updateClass({ verifiedEmail, class_id, class_name }) {
  requireRole(verifiedEmail, ['teacher', 'admin', 'school_admin']);
  return withLock(() => {
    const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet  = ensureClassesSheet(ss);
    const rows   = sheetToObjects(sheet);
    const idx    = rows.findIndex(c => c.class_id === class_id && c.teacher_email == verifiedEmail);
    if (idx === -1) throw new Error('כיתה לא נמצאה');
    const headers = getHeaders(sheet);
    const colIdx  = headers.indexOf('class_name') + 1;
    if (colIdx > 0) sheet.getRange(idx + 2, colIdx).setValue((class_name || '').trim());
    return { updated: true };
  });
}

/** מוחקת כיתה; קבוצות ששייכות אליה לא נמחקות, רק משוחררות (class_id מתאפס). */
function deleteClass({ verifiedEmail, class_id }) {
  requireRole(verifiedEmail, ['teacher', 'admin', 'school_admin']);
  return withLock(() => {
    const ss = SpreadsheetApp.openById(SHEETS.TOURISM);

    const classesSheet = ensureClassesSheet(ss);
    const classes = sheetToObjects(classesSheet);
    const idx = classes.findIndex(c => c.class_id === class_id && c.teacher_email == verifiedEmail);
    if (idx === -1) throw new Error('כיתה לא נמצאה');
    classesSheet.deleteRow(idx + 2);

    const groupsSheet = ss.getSheetByName('groups');
    const groups = sheetToObjects(groupsSheet);
    const headers = getHeaders(groupsSheet);
    const classColIdx = headers.indexOf('class_id') + 1;
    if (classColIdx > 0) {
      groups.forEach((g, i) => {
        if (g.class_id === class_id) groupsSheet.getRange(i + 2, classColIdx).setValue('');
      });
    }

    return { deleted: true };
  });
}

function addGroup({ verifiedEmail, class_id, group_name, members }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  const ss    = SpreadsheetApp.openById(SHEETS.TOURISM);
  const sheet = ss.getSheetByName('groups');

  const memberList = Array.isArray(members)
    ? members.map(m => String(m).trim()).filter(Boolean)
    : String(members || '').split(',').map(m => m.trim()).filter(Boolean);

  const group_id = 'group_' + Date.now();

  let folderId = '';
  try {
    folderId = createGroupFolder(verifiedEmail, group_name || group_id);
  } catch(e) {
    // אם יצירת תיקייה נכשלת — ממשיכים בלעדיה
  }

  appendRow(sheet, {
    group_id,
    class_id:        class_id || '',
    group_name:      group_name || group_id,
    members:         memberList.join(','),
    teacher_email:   verifiedEmail,
    site_name:       '',
    site_url:        '',
    site_score:      '',
    current_section: 1,
    last_active:     new Date().toISOString(),
    created_date:    new Date().toISOString()
  });

  return { group_id, folderId, created: true };
}

function addMember({ verifiedEmail, group_id, member_email }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  return withLock(() => {
    const ss    = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet = ss.getSheetByName('groups');
    const groups = sheetToObjects(sheet);
    const idx    = groups.findIndex(g => g.group_id == group_id && g.teacher_email == verifiedEmail);
    if (idx === -1) throw new Error('קבוצה לא נמצאה');

    const members = String(groups[idx].members || '').split(',').map(m => m.trim()).filter(Boolean);
    const emailLower = String(member_email).trim().toLowerCase();
    if (members.some(m => m.toLowerCase() === emailLower)) {
      throw new Error('התלמיד כבר בקבוצה');
    }
    members.push(String(member_email).trim());

    const headers = getHeaders(sheet);
    const rowNum  = idx + 2;
    const colIdx  = headers.indexOf('members') + 1;
    sheet.getRange(rowNum, colIdx).setValue(members.join(','));

    return { group_id, members };
  });
}

function removeMember({ verifiedEmail, group_id, member_email }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  return withLock(() => {
    const ss    = SpreadsheetApp.openById(SHEETS.TOURISM);
    const sheet = ss.getSheetByName('groups');
    const groups = sheetToObjects(sheet);
    const idx    = groups.findIndex(g => g.group_id == group_id && g.teacher_email == verifiedEmail);
    if (idx === -1) throw new Error('קבוצה לא נמצאה');

    const emailLower = String(member_email).trim().toLowerCase();
    const members = String(groups[idx].members || '')
      .split(',').map(m => m.trim()).filter(Boolean)
      .filter(m => m.toLowerCase() !== emailLower);

    const headers = getHeaders(sheet);
    const rowNum  = idx + 2;
    const colIdx  = headers.indexOf('members') + 1;
    sheet.getRange(rowNum, colIdx).setValue(members.join(','));

    return { group_id, members };
  });
}

// ========== קבצים ==========

function uploadFile({ verifiedEmail, group_id, file_name, mime_type, base64_data }) {
  if (!file_name || !base64_data) throw new Error('חסרים נתוני קובץ');

  const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  const roles   = getRoles(SpreadsheetApp.openById(SHEETS.KITA_PLUS), verifiedEmail);
  const isTeacher = roles.some(r => ['teacher','admin','school_admin'].includes(r));
  if (!members.includes(String(verifiedEmail).toLowerCase()) && !isTeacher) {
    throw new Error('אין הרשאה להעלות קובץ לקבוצה זו');
  }

  const folderId = createGroupFolder(group.teacher_email, group.group_name || group_id);
  const folder   = DriveApp.getFolderById(folderId);

  const uniqueName = Date.now() + '_' + file_name.replace(/[^\wא-ת.\-]/g, '_');
  const blob = Utilities.newBlob(Utilities.base64Decode(base64_data), mime_type || 'application/octet-stream', uniqueName);
  const file = folder.createFile(blob);

  const filesSheet = ss.getSheetByName('files');
  appendRow(filesSheet, {
    file_id:       Utilities.getUuid(),
    group_id,
    uploaded_by:   verifiedEmail,
    file_name,
    stored_name:   uniqueName,
    file_url:      file.getUrl(),
    uploaded_date: new Date().toISOString()
  });

  return { file_url: file.getUrl(), stored_name: uniqueName };
}

function getGroupFiles({ verifiedEmail, group_id }) {
  const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  const roles   = getRoles(SpreadsheetApp.openById(SHEETS.KITA_PLUS), verifiedEmail);
  const isTeacher = roles.some(r => ['teacher','admin','school_admin'].includes(r));
  if (!members.includes(String(verifiedEmail).toLowerCase()) && !isTeacher) {
    throw new Error('אין הרשאה לצפות בקבצי קבוצה זו');
  }

  const allFiles = sheetToObjects(ss.getSheetByName('files'));
  return allFiles.filter(f => f.group_id == group_id);
}

function createGroupFolder(teacherEmail, groupName) {
  const ssKP     = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const teachers = sheetToObjects(ssKP.getSheetByName('מורים'));
  const teacher  = teachers.find(t => String(t.email).toLowerCase() === String(teacherEmail).toLowerCase());
  if (!teacher || !teacher.folder_id) throw new Error('לא נמצאה תיקיית מורה');

  const teacherFolder = DriveApp.getFolderById(teacher.folder_id);
  const subjectFolder = getOrCreateSubfolder(teacherFolder, TOURISM_SUBJECT_NAME);
  const groupFolder   = getOrCreateSubfolder(subjectFolder, groupName);

  return groupFolder.getId();
}

function getOrCreateSubfolder(parentFolder, name) {
  const existing = parentFolder.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parentFolder.createFolder(name);
}

// ========== Gemini (בחירת אתר + צ'אטבוט) ==========

/**
 * מתג כיבוי מהיר לפיצ'רי ה-AI (צ'אטבוט + התאמת אתר) בלי לגעת בקוד או לפרוס מחדש:
 * Script Properties → AI_FEATURES_ENABLED = false
 */
function areAiFeaturesEnabled() {
  const val = PropertiesService.getScriptProperties().getProperty('AI_FEATURES_ENABLED');
  return val !== 'false';
}

function callGemini(systemPrompt, userMessage) {
  if (!areAiFeaturesEnabled()) throw new Error('פיצ׳רי ה-AI כבויים זמנית');

  const res = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + getGeminiKey(),
    {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }]
      })
    }
  );
  const data = JSON.parse(res.getContentText());

  if (data.error) {
    throw new Error('Gemini החזיר שגיאה (קוד ' + data.error.code + '): ' + data.error.message);
  }

  const text = data.candidates && data.candidates[0] && data.candidates[0].content
    ? data.candidates[0].content.parts[0].text
    : '';
  if (!text) throw new Error('Gemini לא החזיר תשובה. תגובה גולמית: ' + res.getContentText().slice(0, 300));
  return text;
}

/**
 * בודק התאמה של אתר תיירות מוצע — "בשקט": לא חושף לתלמיד את הקריטריונים,
 * לא מציע חלופות, וההחלטה הסופית נשארת של התלמיד גם אם הציון נמוך.
 * קריטריונים (כפי שסוכם עם ניסן): נוכחות דיגיטלית, כמות חומר זמין, התאמה לפרויקט.
 */
function proposeSite({ verifiedEmail, group_id, site_name, site_url }) {
  if (!site_name) throw new Error('נא להזין שם אתר');

  const ss    = SpreadsheetApp.openById(SHEETS.TOURISM);
  const sheet = ss.getSheetByName('groups');
  const groups = sheetToObjects(sheet);
  const idx    = groups.findIndex(g => g.group_id == group_id);
  if (idx === -1) throw new Error('קבוצה לא נמצאה');

  const members = String(groups[idx].members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  if (!members.includes(String(verifiedEmail).toLowerCase())) {
    throw new Error('אין הרשאה לבחור אתר לקבוצה זו');
  }

  const systemPrompt = `אתה בודק התאמה של אתר תיירות פיזי (לא דיגיטלי) לפרויקט לימודי של תלמידי תיכון בנושא "ניתוח נוכחות דיגיטלית".
בדוק את שלושת הקריטריונים: (1) נוכחות דיגיטלית קיימת לאתר (אתר/סושיאל/ביקורות) שאפשר לנתח, (2) יש מספיק חומר זמין למחקר, (3) האתר מתאים לפרויקט (אתר תיירות פיזי אמיתי, לא עסק סתמי).
החזר תשובה קצרה בעברית (2-3 משפטים) לתלמיד: אם ההתאמה טובה — עידוד קצר. אם יש חשש — רמז עדין וכללי בלבד (למשל "יכול להיות שיהיה קשה למצוא מספיק מידע") בלי לפרט את הקריטריונים במפורש ובלי להציע אתר חלופי. אל תיתן ציון מספרי בתשובה עצמה.
בסיום התשובה, בשורה נפרדת, כתוב בדיוק: SCORE: X כאשר X הוא מספר 1-10 (זה לא יוצג לתלמיד).`;

  const reply = callGemini(systemPrompt, 'שם האתר: ' + site_name + (site_url ? ' | קישור: ' + site_url : ''));
  const scoreMatch = reply.match(/SCORE:\s*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : '';
  const feedback = reply.replace(/SCORE:\s*\d+/, '').trim();

  const headers = getHeaders(sheet);
  const rowNum  = idx + 2;
  const nameIdx  = headers.indexOf('site_name') + 1;
  const urlIdx   = headers.indexOf('site_url') + 1;
  const scoreIdx = headers.indexOf('site_score') + 1;
  if (nameIdx > 0)  sheet.getRange(rowNum, nameIdx).setValue(site_name);
  if (urlIdx > 0)   sheet.getRange(rowNum, urlIdx).setValue(site_url || '');
  if (scoreIdx > 0) sheet.getRange(rowNum, scoreIdx).setValue(score);

  return { site_name, site_url: site_url || '', feedback };
}

/**
 * צ'אטבוט תמיכה — מתערב רק כשתלמיד תקוע, לא המנוע המרכזי של הלמידה.
 * עקרון פדגוגי: מכוון בשאלות קודם (סוקרטי), מסביר ישירות רק אם התלמיד עדיין תקוע.
 */
function chatWithBot({ verifiedEmail, group_id, section_num, message }) {
  if (!message) throw new Error('לא סופקה הודעה');

  const ss     = SpreadsheetApp.openById(SHEETS.TOURISM);
  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) throw new Error('קבוצה לא נמצאה');

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  const roles   = getRoles(SpreadsheetApp.openById(SHEETS.KITA_PLUS), verifiedEmail);
  const isTeacher = roles.some(r => ['teacher','admin','school_admin'].includes(r));
  if (!members.includes(String(verifiedEmail).toLowerCase()) && !isTeacher) {
    throw new Error('אין הרשאה לגשת לצ׳אטבוט של קבוצה זו');
  }

  const siteContext = group.site_name ? 'האתר שהקבוצה בוחרת לנתח: ' + group.site_name + '.' : '';

  const SECTION_NAMES = ['', 'פרטי האתר', 'תיאור כללי', 'נוכחות דיגיטלית', 'מושגים', 'חוויית משתמש', 'עוצמות', 'הצעות לשיפור', 'סיכום אישי'];
  const sectionName = SECTION_NAMES[section_num] || '';

  const systemPrompt = `אתה עוזר לימודי לפרויקט תיירות דיגיטלית של תלמיד תיכון.
התלמיד עובד כרגע על סעיף ${section_num}: "${sectionName}". ${siteContext}
תפקידך: קודם כל לכוון בשאלות מנחות (שיטה סוקרטית) — לא לתת תשובה ישירה מיד.
רק אם התלמיד כותב שהוא עדיין תקוע אחרי שכיוונת אותו — הסבר ישירות וברור.
ענה בעברית, קצר וידידותי (2-4 משפטים).`;

  const reply = callGemini(systemPrompt, message);

  const logSheet = ensureChatLogsSheet(ss);
  const now = new Date().toISOString();
  appendRow(logSheet, { log_id: Utilities.getUuid(), group_id, student_email: verifiedEmail, section_num, role: 'student', message, timestamp: now });
  appendRow(logSheet, { log_id: Utilities.getUuid(), group_id, student_email: verifiedEmail, section_num, role: 'bot', message: reply, timestamp: now });

  return { reply };
}

// ========== עזרים ==========

function requireRole(email, allowedRoles) {
  const ss    = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const roles = getRoles(ss, email);
  const hasRole = roles.some(r => allowedRoles.includes(r));
  if (!hasRole) throw new Error('אין הרשאה לביצוע פעולה זו');
}

function getRoles(ss, email) {
  const roles = sheetToObjects(ss.getSheetByName('roles'));
  return roles
    .filter(r => String(r.email || r.phone).toLowerCase() === email.toLowerCase())
    .map(r => r.role)
    .filter(Boolean);
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function appendRow(sheet, obj) {
  const headers = getHeaders(sheet);
  sheet.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
}

function cleanPhone(phone) {
  let p = String(phone).replace(/[-\s]/g, '');
  if (p.startsWith('+972')) p = '0' + p.slice(4);
  if (p.startsWith('972'))  p = '0' + p.slice(3);
  return p;
}

function calcContribution(logs, members) {
  if (!members || members.length === 0) return {};
  const soloCounts = {};
  members.forEach(m => soloCounts[m] = 0);
  let pairedCount = 0;

  logs.forEach(l => {
    if (l.solo_or_pair === 'pair') {
      pairedCount++;
    } else if (soloCounts[l.student_email] !== undefined) {
      soloCounts[l.student_email]++;
    }
  });

  const total = Object.values(soloCounts).reduce((a, b) => a + b, 0) + pairedCount;
  if (total === 0) {
    const zero = {};
    members.forEach(m => zero[m] = 0);
    zero.pair = 0;
    return zero;
  }

  const result = {};
  members.forEach(m => result[m] = Math.round((soloCounts[m] / total) * 100));
  result.pair = Math.round((pairedCount / total) * 100);
  return result;
}

function isGroupActive(ss, group_id, current_email) {
  const logs   = sheetToObjects(ss.getSheetByName('activity_log'));
  const groups = sheetToObjects(ss.getSheetByName('groups'));
  const group  = groups.find(g => g.group_id == group_id);
  if (!group) return false;

  const members = String(group.members || '').split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  const others = members.filter(m => m !== String(current_email).toLowerCase());
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  return logs.some(l =>
    (l.group_id == group_id) &&
    others.includes(String(l.student_email).toLowerCase()) &&
    l.timestamp > fiveMinAgo
  );
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== addRole ==========

function addRole({ verifiedEmail, targetEmail, role }) {
  requireRole(verifiedEmail, ['admin', 'school_admin']);
  const ss    = SpreadsheetApp.openById(SHEETS.KITA_PLUS);
  const sheet = ss.getSheetByName('roles');
  const existing = sheetToObjects(sheet);

  if (existing.find(r => r.email === targetEmail && r.role === role)) {
    throw new Error('תפקיד זה כבר קיים למשתמש זה');
  }

  appendRow(sheet, {
    email:        targetEmail,
    school_id:    '',
    role:         role,
    assigned_by:  verifiedEmail,
    created_date: new Date().toISOString()
  });

  return { added: true, email: targetEmail, role };
}
