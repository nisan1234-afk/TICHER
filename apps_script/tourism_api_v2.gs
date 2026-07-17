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

// ========== נקודת כניסה ==========

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    const protectedActions = [
      'getMyProfile', 'getTeacherDashboard', 'getGroupData',
      'saveSection', 'toggleUnit', 'getAdminData',
      'updateTeacherStatus', 'updatePassword', 'addRole',
      'addGroup', 'addMember', 'removeMember', 'uploadFile', 'getGroupFiles'
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

      addGroup:            () => addGroup(body),
      addMember:           () => addMember(body),
      removeMember:        () => removeMember(body),
      uploadFile:          () => uploadFile(body),
      getGroupFiles:       () => getGroupFiles(body),
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

  const units = allUnits.filter(u => u.teacher_email == verifiedEmail);
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

  return { groups, units };
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

  const sections = {};
  for (let i = 1; i <= 8; i++) {
    sections['section_' + i] = project['section_' + i] || '';
  }

  return {
    group: { ...group, members },
    sections,
    contribution:  calcContribution(groupLogs, members),
    last_updated:  project.last_updated
  };
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
}

function toggleUnit({ verifiedEmail, unit_id, is_open }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
  const now = new Date().toISOString();

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
}

function removeMember({ verifiedEmail, group_id, member_email }) {
  requireRole(verifiedEmail, ['teacher','admin','school_admin']);
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
