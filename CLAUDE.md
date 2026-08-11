# CLAUDE.md — כיתה פלוס (Kita Plus)

הנחיות תפעוליות לקלוד קוד בעבודה על הריפו הזה. לרקע המלא, החזון הפדגוגי וההיסטוריה של החלטות — קרא קודם את `רקע_וחזון_הפרויקט.md` באותה תיקייה.

## מה הפרויקט הזה

פלטפורמת ניהול לימודי מודולרית ("כיתה פלוס"), מקצוע ראשון = תיירות דיגיטלית ("tourismdigi"). Frontend סטטי ב-GitHub Pages, Backend = Google Apps Script יחיד, נתונים ב-Google Sheets/Docs/Drive, אימות ב-Google Sign-In בלבד.

## מבנה הריפו (עודכן 2026-07-24 — מבנה כתובות נקי, בלי שמות repo)

**חשוב:** יש לאמת מבנה זה מול הריפו בפועל בתחילת כל סשן — יכול להיות שהתווסף/שונה משהו מאז כתיבת מסמך זה.

הכתובות הפומביות רוכזו ב-repo של `nisan1234-afk.github.io` (בלי `.html`, בלי שם repo פנימי בכתובת):
```
nisan1234-afk.github.io/           # התחברות (Google Sign-In) — היה TICHER/index.html
nisan1234-afk.github.io/teacher/   # דשבורד "כל המקצועות" למורה — היה TICHER/teacher.html
nisan1234-afk.github.io/student/   # דשבורד "כל המקצועות" לתלמיד — היה TICHER/student.html
nisan1234-afk.github.io/homeroom/  # היה TICHER/homeroom.html
nisan1234-afk.github.io/admin/     # היה TICHER/admin.html
nisan1234-afk.github.io/tourism/teacher/  # ממשק מורה תיירות דיגיטלית — repo tourism (שונה שם מ-tourismdigi)
nisan1234-afk.github.io/tourism/student/  # ממשק תלמיד תיירות דיגיטלית
```

**מבנה קבצים בפועל בכל repo:**
```
nisan1234-afk.github.io/   (repo)
  index.html                # התחברות
  teacher/index.html
  student/index.html
  homeroom/index.html
  admin/index.html
  manifest.json, sw.js, icons  # PWA, משותף לכל האתר

TICHER/   (repo — עדיין באותו שם, אבל כבר לא מארח דפים ציבוריים)
  index.html, teacher.html, student.html, homeroom.html, admin.html
    # כולם עכשיו stub-ים קטנים שמפנים (redirect) לכתובת החדשה ב-root —
    # רשת ביטחון לקישורים ישנים ש-Nisan אולי כבר שיתף, לא נמחקו
  apps_script/clasp_project/   # קוד ה-backend האמיתי, כאן זה נשאר
  CLAUDE.md, רקע_וחזון_הפרויקט.md

tourismdigi/   (תיקייה מקומית — ה-repo המרוחק נקרא tourism, לא tourismdigi;
                שינוי שם repo לא שינה את שם התיקייה המקומית, זה תקין)
  teacher.html, student.html   # stub-ים שמפנים ל-/tourism/teacher/ ו-/tourism/student/
  teacher/index.html, student/index.html   # התוכן האמיתי
```

**קריטי לזכור:** שינוי שם ה-repo מ-`tourismdigi` ל-`tourism` **שבר לגמרי** את הכתובת הישנה `nisan1234-afk.github.io/tourismdigi/...` — GitHub לא מפנה אוטומטית כתובות Pages אחרי שינוי שם repo (בניגוד ל-`git clone`/remote, ששם עדיין עובד). אושר עם Nisan מראש שזה מקובל כי האתר עדיין לפני ההשקה לתלמידים אמיתיים (ספטמבר). לעומת זאת, כתובות `TICHER/...` **כן** ממשיכות לעבוד — כי שם ה-repo לא השתנה, רק תוכן הקבצים הוחלף ב-stub-ים.

## מוסכמות ארכיטקטוניות (אין לשנות בלי לוודא מול ניסן)

- מודולריות: כל מקצוע/שירות = ריפו + Sheet נפרדים, מחוברים ל-API מרכזי אחד.
- אימות: Google Sign-In בלבד. אימייל = מזהה משתמש אוניברסלי. אין סיסמאות.
- Backend: Apps Script **אחד** מרכזי — לא לפצל לכמה סקריפטים.
- תפקידים: admin / school_admin / teacher / homeroom / student. משתמש יכול להחזיק כמה תפקידים בו-זמנית; ניהול דרך לשונית `roles` בלבד, ע"י admin. Homeroom = צפייה בלבד, ללא יצירת קשר עם תלמידים.
- ה-UI של דשבורד המורה חייב להישאר דינמי — מציג רק מה שרלוונטי לתפקידי המשתמש המחובר.
- מודל קבוצות (v2, נוכחי): קבוצה בכל גודל, שדה `members` מופרד-פסיקים, שם קבוצה חופשי. **לא** מודל "זוגות" ישן (student1/student2) — זה deprecated.

## החלטות עיצוב שאסור לשנות בלי אישור

- הצ'אטבוט (Gemini) מתערב רק כשתלמיד תקוע — אינו מנוע הלמידה הראשי. אם נכשל, השיעור ממשיך בלי תלות בו. אין להפוך אותו למרכזי בתהליך.
- מדור 7 ("הצעות לשיפור") הוא המשוקלל ביותר בהערכה — אם עובדים על משהו שנוגע לניקוד/הערכה, הסדר יחסי חשוב.
- מנגנון בדיקת התאמת אתר תיירות שנבחר צריך לפעול "בשקט" — לא לחשוף לתלמיד את הקריטריונים ולא להציע חלופות.
- סדר בנייה: ממשק מורה לפני ממשק תלמיד, בכל פיצ'ר חדש.

## מלכודות ידועות — קרא לפני שאתה מתחיל לדבג

1. **Apps Script "עדכנתי את הקוד אבל שום דבר לא משתנה":** כמעט תמיד כי הפריסה נעשתה עם "manage existing deployment" ולא "New Deployment". צריך New Deployment אחרי כל שינוי קוד.
2. **מקבלים HTML גולמי במקום JSON מה-API:** זה *לא* CORS. זה אומר שהסקריפט נמחק, לא נשמר, או שהפריסה לא עדכנית.
3. **עריכת GitHub Pages:** עדיפות לעריכה ישירה בעורך הווב של GitHub על פני הורדה-ועריכה-מקומית-והעלאה — האחרון גרם לתקריות rollback בעבר. שינויים לוקחים 1-3 דקות להשתקף; יש לעשות hard refresh / incognito לבדיקה.
4. **Google Drive MCP/API:** קריאה בלבד. כל כתיבה (יצירת/עדכון קבצים) חייבת לעבור דרך Apps Script, לא ישירות מול Drive. חיפוש תוכן תיקייה: להשתמש ב-query מהצורה `'FOLDER_ID' in parents` (listing לפי folder ID ישירות לא אמין).
5. **Google Sign-In:** צריך `use_fedcm_for_prompt: true` ב-`google.accounts.id.initialize`, אחרת אזהרות deprecation של FedCM.
6. אתרי Canva ודפים מבוססי JS לא ניתנים ל-scraping אוטומטי — לתעד לניסן שצריך העתקה-הדבקה/ייצוא ידני.

## איך לעבוד מול ניסן

- ניסן מקבל את כל ההחלטות הפדגוגיות/ניהוליות. אל תציע לשנות את השיטה הפדגוגית, שקלול המדורים, או מבנה הקורס — זה לא בסמכות טכנית.
- החלטות טכניות (ארכיטקטורה, ספריות, מבנה קוד) — בשיקול דעת עצמאי, אין צורך לאשר כל פרט.
- ניסן מעדיף קצב איטי וזהיר. לפני שינוי גדול/פריסה — לעצור ולוודא, לא "לרוץ קדימה" עם כמה שינויים בבת אחת.
- כשמשהו לא ברור לגבי דרישה פדגוגית (למשל שינוי במדורי ההערכה) — לשאול, לא להניח.

## עבודה פתוחה (עודכן לאחר מיגרציית קבוצות v2)

כל הפריטים הבאים **מוכנים בקוד, ב-commit מקומי, טרם נפרסו לפרודקשן**:

- [x] עדכון 5 הממשקים למודל הקבוצות v2 — הושלם (homeroom/teacher/student ב-TICHER, teacher/student ב-tourismdigi)
- [x] סקריפט מיגרציה + API v2 — כתובים ב-`TICHER/apps_script/` (setup_groups_structure.gs, tourism_api_v2.gs), טרם הורצו/נפרסו
- [x] מנגנון ניקוד/התאמה של אתר תיירות נבחר — `proposeSite` ב-API, UI בסעיף 1 של tourismdigi/student.html. שקט כמתוכנן — לא חושף קריטריונים, לא חוסם בחירה
- [x] הטמעת צביעת התראה לקבוצות ללא עדכון נתונים שבוע+ — התברר שכבר היה קיים ב-homeroom.html, רק עבר למודל הקבוצות
- [x] חיבור צ'אטבוט Gemini — `chatWithBot` ב-API, קריאה מהשרת (לא מהדפדפן — תוקן פער אבטחה: מפתח היה אמור להיחשף ב-HTML הציבורי)

**נותר לניסן בלבד (לא ניתן לביצוע ע"י קלוד):**
- [ ] להשיג מפתח Gemini API ולהגדיר אותו ב-Script Properties של ה-Apps Script (`GEMINI_API_KEY`)
- [ ] לאשר: הרצת סקריפט המיגרציה על ה-Sheet האמיתי, פריסת API v2 כ-New Deployment, ו-git push לשני הריפואים

## משאבים

ראה `רקע_וחזון_הפרויקט.md` → סעיף "משאבים וזיהויים מרכזיים" ל-URLs, Sheet IDs, ותיקיית Drive.
