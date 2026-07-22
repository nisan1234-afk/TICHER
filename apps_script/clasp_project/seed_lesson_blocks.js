/**
 * מיגרציה חד-פעמית: זורעת בלוקים (הוראה / משחק / שאלה אישית) לתוך כל אחת
 * מ-9 יחידות הלימוד הקיימות בטאב units. לא נוגעת בטאב units עצמו, רק מוסיפה
 * שורות לטאב lesson_blocks (נוצר אוטומטית אם לא קיים, ע"י ensureLessonBlocksSheet ב-code.js).
 *
 * תוכן מבוסס קריאה ישירה של המצגות/עבודות המקוריות
 * (G:\האחסון שלי\תיירות דיגיטלית\תיירות דיגיטלית חומרים). סרטוני יוטיוב
 * שכבר היו מוטמעים במצגות המקור עצמן שולבו כ-media (embed) — לא הומצאו.
 *
 * ליחידות שאין בהן וידאו מקור אמיתי, media_url נשאר ריק בכוונה (לא הומצא נתון).
 * הרצה בטוחה חוזרת: בודקת אם ליחידה כבר יש בלוקים ומדלגת עליה אם כן.
 */
function seedLessonBlocks() {
  const ss    = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const sheet = ensureLessonBlocksSheet(ss);
  const existing = sheetToObjects(sheet);

  let addedUnits = 0, addedBlocks = 0;

  Object.keys(LESSON_BLOCKS_SEED_DATA).forEach(unit_id => {
    if (existing.some(b => b.unit_id === unit_id)) {
      Logger.log('ליחידה ' + unit_id + ' כבר יש בלוקים — דילוג.');
      return;
    }
    const blocks = LESSON_BLOCKS_SEED_DATA[unit_id];
    blocks.forEach((block, i) => {
      const block_id = unit_id + '_block_' + (i + 1);
      appendRow(sheet, {
        block_id, unit_id,
        block_order: i + 1,
        block_type: block.block_type,
        title: block.title || '',
        body: block.body || '',
        media_type: block.media_type || '',
        media_url: block.media_url || '',
        game_type: block.game_type || '',
        game_data: block.game_data ? JSON.stringify(block.game_data) : '',
        question_prompt: block.question_prompt || '',
        target_field: block.target_field || ''
      });
      addedBlocks++;
    });
    addedUnits++;
  });

  Logger.log('נזרעו בלוקים ל-' + addedUnits + ' יחידות (' + addedBlocks + ' בלוקים בסה"כ).');
}

/**
 * הוספה חד-פעמית של בלוק משחק/מילון-מושגים ליחידה 7 (יעד חכם) — במקור לא
 * נוספה יחידת משחק כי החומר המקורי (ראו הערה ב-LESSON_BLOCKS_SEED_DATA) דל,
 * אבל התוכן הזה מבוסס ישירות על מה שכבר כתוב בבלוק ההוראה של היחידה עצמה,
 * לא הומצא. גם משמש כמקור למילון-המושגים (טולטיפים) בשאלות. הרצה בטוחה חוזרת.
 */
function seedLesson7Game() {
  const ss    = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const sheet = ensureLessonBlocksSheet(ss);
  const existing = sheetToObjects(sheet).filter(b => b.unit_id === 'lesson_7');

  if (existing.some(b => b.block_type === 'game')) {
    Logger.log('ליחידה 7 כבר יש בלוק משחק — דילוג.');
    return;
  }

  const gameData = [
    { term: 'יעד חכם', definition: 'יעד תיירותי שמשתמש בטכנולוגיה לשיפור חוויית המבקר' },
    { term: 'סביבה (בתיירות חכמה)', definition: 'ניטור איכות אוויר ומשאבי טבע ביעד' },
    { term: 'תחבורה (בתיירות חכמה)', definition: 'ניווט חכם ותחבורה ציבורית בזמן אמת' },
    { term: 'כלכלה (בתיירות חכמה)', definition: 'תשלומים דיגיטליים ותמחור מותאם אישית' },
    { term: 'חיים ואנשים (בתיירות חכמה)', definition: 'Wi-Fi ציבורי, שירותים דיגיטליים, הכשרת עובדים' }
  ];

  const nextOrder = existing.length + 1;
  appendRow(sheet, {
    block_id: 'lesson_7_block_' + nextOrder,
    unit_id: 'lesson_7',
    block_order: nextOrder,
    block_type: 'game',
    title: 'התאימו: תחום ↔ איך זה בא לידי ביטוי',
    body: '', media_type: '', media_url: '',
    game_type: 'memory',
    game_data: JSON.stringify(gameData),
    question_prompt: '', target_field: ''
  });
  Logger.log('נוסף בלוק משחק ליחידה 7.');
}

/**
 * תבנית game_data משותפת למסך "בודקים באתר שלנו" (structured_product_question),
 * שחוזרת זהה כמעט לכל מפגש בחוברת המפורטת (רק ה-question_prompt, project_section
 * ו-target_field משתנים לפי מפגש). מחזירה עותק חדש בכל קריאה כדי שעריכה של
 * מפגש אחד (כמו הוספת categories) לא תשפיע על מפגשים אחרים.
 */
function STRUCTURED_SITE_CHECK_TEMPLATE() {
  return {
    categories: [],
    fillPrompt: 'כתבו במשפט אחד מה מצאתם.',
    evidenceLabel: 'תארו מה רואים בראיה ואיפה היא נמצאת.',
    evidenceLinkLabel: 'הדבקת URL או העלאת תמונה. לפחות אחד חובה.',
    explainParts: ['הראיה מוכיחה ש-', 'משום ש-'],
    ratingLabel: 'הערכה:',
    ratingOptions: ['טוב', 'חלקי', 'חסר', 'דורש שיפור'],
    ratingReasonLabel: 'בחרנו בהערכה זו מפני ש־________.',
    checklist: ['בדקתי שהראיה תומכת במה שכתבתי.']
  };
}

const LESSON_BLOCKS_SEED_DATA = {

  // ===== יחידה 1 — מבוא לתיירות דיגיטלית (4 מפגשים, מהחוברת המפורטת חוברת_תלמיד_מפורטת) =====
  lesson_1: [
    // ----- מפגש 1: מה הקשר בין תיירות לדיגיטל? (45 דק') -----
    {
      block_type: 'teach',
      title: 'מה הקשר בין תיירות לדיגיטל?',
      body: 'עוד לפני שמגיעים לאתר תיירותי, המבקר כבר פוגש אותו דרך מסך. הוא מחפש מידע, רואה תמונות, קורא ביקורות, בודק דרך ומחליט אם להגיע. לכן החוויה התיירותית מתחילה עוד לפני היציאה מהבית.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'משפחה רוצה לצאת מחר לטיול. מהי הפעולה הדיגיטלית הראשונה שסביר שתבצע, ומה הערך שהיא נותנת לה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['חיפוש מידע על שעות פתיחה ומיקום', 'נסיעה ללא בדיקה מוקדמת', 'המתנה עד ההגעה כדי לברר הכול', 'התעלמות מהמידע ברשת'],
        correct: [0],
        feedbackCorrect: 'המידע מאפשר למשפחה לתכנן, לצמצם אי־ודאות ולקבל החלטה לפני היציאה.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל פעולה: מתי במסע התייר היא קורית?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['לפני היציאה מהבית', 'בזמן הביקור', 'אחרי הביקור'],
        items: ['בודקים שעות פתיחה ומחיר כניסה', 'צופים בתמונות וסרטונים של המקום', 'קוראים ביקורות של מבקרים קודמים', 'מצלמים ומשתפים ברשתות בזמן הביקור', 'כותבים ביקורת על החוויה', 'משתמשים בניווט כדי להגיע למקום'],
        correctMap: [0, 0, 0, 1, 2, 1],
        feedbackCorrect: 'נכון! כל פעולה דיגיטלית שייכת לשלב אחר במסע — עוד לפני שיוצאים מהבית, החוויה כבר מתחילה.',
        feedbackIncorrect: 'כמעט. שאלו את עצמכם: זה קורה כשמתכננים בבית, כשנמצאים בפועל במקום, או אחרי שחוזרים?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בחרו אתר תיירותי אפשרי לפרויקט. כתבו את שמו, מיקומו, קישור אחד שמצאתם ומשפט המסביר מדוע יש בו מספיק נוכחות דיגיטלית למחקר.',
      answer_scope: 'project',
      project_section: '1',
      target_field: 'site_basic',
      game_data: {
        categories: ['אטרקציה טבעית', 'אתר היסטורי או תרבותי', 'יעד עירוני', 'אירוע תיירותי', 'מתחם בילוי או פנאי'],
        fillPrompt: 'כתבו את שם האתר ומיקומו.',
        evidenceLabel: 'הקישור שמצאתם הוא הראיה: תארו בקצרה מה רואים בו (למשל: אתר רשמי, דף פייסבוק, פרופיל אינסטגרם).',
        evidenceLinkLabel: 'הדביקו כאן את הקישור שמצאתם.',
        explainParts: ['הקישור הזה מוכיח שיש לאתר מספיק נוכחות דיגיטלית למחקר, מפני ש-'],
        ratingLabel: 'הערכה:',
        ratingOptions: ['טוב', 'חלקי', 'חסר', 'דורש שיפור'],
        ratingReasonLabel: 'בחרנו בהערכה זו מפני ש־________.',
        checklist: ['בדקתי שהקישור אכן מראה נוכחות דיגיטלית של האתר, ולא רק תוצאת חיפוש כללית.']
      }
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 2: מהי תיירות וכיצד בוחרים אתר מתאים? (90 דק') -----
    {
      block_type: 'teach',
      title: 'מהי תיירות וכיצד בוחרים אתר מתאים?',
      body: 'תיירות היא יציאה מהסביבה הרגילה לצורך חוויה, בילוי, עסקים או ביקור. אטרקציה תיירותית היא מוקד שמושך מבקרים, והיא יכולה להיות טבעית, מעשה ידי אדם או אירוע.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו מן הדוגמאות היא אירוע תיירותי ולא אתר קבוע?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['שמורת טבע', 'מוזיאון', 'פסטיבל מוזיקה שנתי', 'מלון'],
        correct: [2],
        feedbackCorrect: 'פסטיבל הוא אירוע המתקיים בזמן מוגדר ומושך מבקרים במיוחד.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל דוגמה: טבעית / מעשה ידי אדם / אירוע / לא בהכרח אטרקציה.',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['טבעית', 'מעשה ידי אדם', 'אירוע', 'לא בהכרח אטרקציה'],
        items: ['חרמון', 'מוזיאון', 'פסטיבל מוזיקה שנתי', 'מרכז קניות מקומי', 'נחל', 'משחק כדורגל בינלאומי'],
        correctMap: [0, 1, 2, 3, 0, 2],
        feedbackCorrect: 'נכון! זיהיתם את סוג האטרקציה נכון.',
        feedbackIncorrect: 'כמעט. שאלו את עצמכם: זה קיים בטבע, נבנה בידי אדם, או שזה אירוע שקורה רק לזמן מסוים?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'סווגו את האתר שבחרתם: טבעי, מעשה ידי אדם או אירוע. הוסיפו משפט: "מבקרים מגיעים לאתר זה בעיקר כדי ________".',
      answer_scope: 'project',
      project_section: '1',
      target_field: 'site_unique',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['טבעי', 'מעשה ידי אדם', 'אירוע'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 3: מהי תיירות דיגיטלית וחמש הקטגוריות (90 דק') -----
    {
      block_type: 'teach',
      title: 'מהי תיירות דיגיטלית וחמש הקטגוריות',
      body: 'תיירות דיגיטלית היא שימוש בטכנולוגיות ובפלטפורמות מקוונות לתכנון, מידע, הזמנה, שיווק וחוויית ביקור. בחומר הקורס מופיעות חמש קטגוריות: הזמנות מקוונות, תיירות וירטואלית, מידע וביקורות, שיווק יעד ברשתות ואפליקציות סיוע לנוסע.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'תייר רואה סרטון באינסטגרם, קורא ביקורות ומזמין כרטיס. אילו קטגוריות מופיעות בתרחיש?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['רק שיווק יעד', 'שיווק יעד, מידע וביקורות והזמנה מקוונת', 'רק אפליקציות ניווט', 'רק תיירות וירטואלית'],
        correct: [1],
        feedbackCorrect: 'התרחיש כולל השראה ושיווק, בדיקת ביקורות וביצוע הזמנה.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל דוגמה לאחת מחמש הקטגוריות של תיירות דיגיטלית.',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['הזמנות מקוונות', 'תיירות וירטואלית', 'אתרי מידע וביקורת', 'שיווק ברשתות החברתיות', 'אפליקציות סיוע לנוסע'],
        items: ['Booking.com — הזמנת חדר במלון', 'סיור וירטואלי של 360 מעלות במוזיאון', 'דירוג וביקורות באתר Tripadvisor', 'סרטון באינסטגרם שמציג יעד תיירותי', 'Moovit — תכנון נסיעה בתחבורה ציבורית'],
        correctMap: [0, 1, 2, 3, 4],
        feedbackCorrect: 'נכון! כל כלי משתייך לקטגוריה שמתאימה לתפקיד שלו במסע התייר.',
        feedbackIncorrect: 'כמעט. חשבו: התייר מזמין, מתרשם מרחוק, בודק מידע, מקבל השראה, או מסתדר בדרך?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'סמנו אילו מחמש הקטגוריות קיימות באתר שלכם. לכל קטגוריה שסימנתם צרפו קישור או צילום מסך ודוגמה קצרה.',
      answer_scope: 'project',
      project_section: '3',
      target_field: 'digital_website',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['הזמנות מקוונות', 'תיירות וירטואלית', 'אתרי מידע וביקורת', 'שיווק ברשתות החברתיות', 'אפליקציות סיוע לנוסע'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 4: ביקורות ומקורות מידע (45 דק') -----
    {
      block_type: 'teach',
      title: 'ביקורות ומקורות מידע',
      body: 'ביקורות מסייעות לתייר להעריך מקום דרך חוויות של מבקרים אחרים. כדי להשתמש בהן באופן אחראי צריך לבדוק כמה ביקורות, מתי נכתבו, מהו ההקשר והאם העסק מגיב.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו דרך היא האמינה ביותר להעריך אתר על סמך ביקורות?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['להסתמך על ביקורת אחת קיצונית', 'לקרוא כמה ביקורות עדכניות ממקורות שונים', 'לבחור רק ביקורות עם תמונות יפות', 'להתעלם מתאריך הפרסום'],
        correct: [1],
        feedbackCorrect: 'השוואה בין כמה ביקורות עדכניות מצמצמת את הסיכון להסתמך על חוויה חריגה או מידע ישן.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: מצאתם ביקורת יחידה משנת 2019 שמשבחת מלון בלי שום פירוט, ואין אף ביקורת עדכנית יותר. מה נכון לעשות?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['לסמוך על הביקורת כי היא חיובית', 'לחפש ביקורות נוספות ועדכניות יותר לפני שמחליטים', 'להזמין בכל מקרה בלי לבדוק עוד', 'לפסול את המלון רק כי אין הרבה ביקורות'],
        correct: [1],
        feedbackCorrect: 'נכון! ביקורת בודדת וישנה לא מספיקה כדי לסמוך על מקום — צריך כמה ביקורות עדכניות ממקורות שונים לפני שמחליטים.',
        feedbackIncorrect: 'עדיין לא. חשבו: כמה אפשר לסמוך על ביקורת אחת בת חמש שנים, בלי שום אימות נוסף?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'מצאו שתי ביקורות על האתר שלכם. כתבו מה משותף להן, במה הן שונות, ומה ניתן ללמוד מהן על חוויית המבקר.',
      answer_scope: 'project',
      project_section: '3',
      target_field: 'digital_reviews',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['דירוג גבוה (4 ומעלה)', 'דירוג בינוני (2.5–4)', 'דירוג נמוך (מתחת ל-2.5)'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידה 2 — התפתחות ופער דיגיטלי (4 מפגשים, מהחוברת המפורטת) =====
  lesson_2: [
    // ----- מפגש 5: מהפכת הדיגיטציה: לפני ואחרי (45 דק') -----
    {
      block_type: 'teach',
      title: 'מהפכת הדיגיטציה: לפני ואחרי',
      body: 'דיגיטציה היא מעבר של מידע ותהליכים לפורמט דיגיטלי. בתיירות היא שינתה פעולות כמו חיפוש, מפות, הזמנות ותיעוד חוויות, והפכה אותן למהירות, זמינות ונגישות יותר.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו דוגמה מתארת שינוי של תהליך ולא רק המרה של מידע?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['סריקת עלון מודפס לקובץ PDF', 'מערכת שמאפשרת להזמין, לשלם ולקבל אישור מיד', 'צילום מפה מודפסת', 'הקלדת טקסט של עלון'],
        correct: [1],
        feedbackCorrect: 'כאן לא רק המידע עבר למסך; כל תהליך ההזמנה השתנה והפך לפעולה עצמאית ומיידית.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל דוגמה: האם זו רק המרת מידע לדיגיטלי, או שינוי אמיתי של התהליך עצמו?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['רק המרת מידע לדיגיטלי', 'שינוי אמיתי של התהליך'],
        items: ['סריקת חוברת טיסות לקובץ PDF', 'הזמנת מלון ותשלום מיידי באתר', 'צילום תפריט מסעדה', 'צ׳ק-אין עצמאי בקיוסק בשדה התעופה', 'הקלדת כתובת מהמפה הנייר למחשב', 'קבלת עדכון על עיכוב טיסה בזמן אמת'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! כשהתהליך עצמו משתנה — לא רק הפורמט — זה שינוי אמיתי, לא רק דיגיטציה של מידע.',
        feedbackIncorrect: 'כמעט. שאלו: המידע רק "עבר למסך", או שהמבקר עכשיו עושה משהו שהוא לא יכול היה לעשות לפני כן?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בחרו פעולה אחת באתר שלכם והשוו: כיצד מבקר היה מבצע אותה לפני העידן הדיגיטלי וכיצד הוא מבצע אותה כיום.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['הזמנה', 'מידע ותכנון', 'ניווט או הגעה', 'תיעוד ושיתוף'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 6: מהפכת האינטרנט בתיירות (90 דק') -----
    {
      block_type: 'teach',
      title: 'מהפכת האינטרנט בתיירות',
      body: 'האינטרנט איפשר לתייר לקבל מידע ישירות, להשוות אפשרויות, לבצע הזמנות ולשתף חוויות. הוא הפחית את התלות בגורם מתווך והגדיל את הכוח של התייר העצמאי.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'מהו שינוי מרכזי שהאינטרנט יצר עבור התייר?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['הפך כל יעד לחינמי', 'אפשר גישה ישירה למידע ולהזמנות', 'ביטל את הצורך בתחבורה', 'מנע השוואה בין ספקים'],
        correct: [1],
        feedbackCorrect: 'האינטרנט נתן לתייר גישה ישירה למידע, מחירים, ביקורות ושירותים.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל פעולה: הדרך הישנה (עם מתווך) או הדרך החדשה (ישירות, בלי מתווך)?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['הדרך הישנה (עם מתווך)', 'הדרך החדשה (ישירות, בלי מתווך)'],
        items: ['להזמין טיסה מסוכן נסיעות טלפונית', 'להזמין טיסה ישירות באתר החברה', 'לקבל המלצה ליעד מחבר בלבד', 'לקרוא ביקורות של אלפי מטיילים באתר', 'לשלם במזומן בסוכנות נסיעות', 'לשלם בכרטיס אשראי ישירות באתר ההזמנות'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! בדרך החדשה התייר פועל ישירות מול הספק, בלי גורם מתווך באמצע.',
        feedbackIncorrect: 'כמעט. שאלו: יש כאן מישהו באמצע (סוכן, דלפק פיזי), או שהתייר פועל ישירות מול הספק?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בדקו האם האתר שלכם מאפשר פעולה ישירה ללא מתווך. תארו את הפעולה והסבירו כיצד היא מחזקת את עצמאות המבקר.',
      answer_scope: 'project',
      project_section: '3',
      target_field: 'digital_website',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['הזמנה ישירה', 'תשלום ישיר', 'יצירת קשר ישירה', 'מידע ללא מתווך'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 7: גורמים טכנולוגיים וחברתיים (45 דק') -----
    {
      block_type: 'teach',
      title: 'גורמים טכנולוגיים וחברתיים',
      body: 'התיירות הדיגיטלית התפתחה בעקבות שילוב של גורמים טכנולוגיים וחברתיים: טלפונים חכמים, חיבור מהיר, רשתות חברתיות, ציפייה לזמינות, רצון לעצמאות ושיתוף חוויות.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו דוגמה היא גורם חברתי ולא טכנולוגי?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['טלפון חכם', 'חיבור אינטרנט מהיר', 'ציפייה לקבל תשובה מיידית', 'מערכת GPS'],
        correct: [2],
        feedbackCorrect: 'הציפייה לשירות מיידי היא שינוי בהתנהגות ובתרבות הצרכנית.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל גורם: טכנולוגי או חברתי?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['גורם טכנולוגי', 'גורם חברתי'],
        items: ['טלפון חכם', 'חיבור אינטרנט מהיר', 'ציפייה לקבל תשובה מיידית', 'מערכת GPS', 'רצון לשתף חוויות ברשת', 'הרצון להיות עצמאי בלי תלות בסוכן'],
        correctMap: [0, 0, 1, 0, 1, 1],
        feedbackCorrect: 'נכון! גורמים טכנולוגיים הם כלים; גורמים חברתיים הם ציפיות ורצונות של אנשים.',
        feedbackIncorrect: 'כמעט. שאלו: זה מכשיר/תשתית, או שזו ציפייה/רצון של בני אדם?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בחרו גורם טכנולוגי אחד וגורם חברתי אחד שמשפיעים על האתר שלכם. לכל גורם צרפו ראיה והסבר.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['גורם טכנולוגי', 'גורם חברתי'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 8: הפער הדיגיטלי ונגישות (90 דק') -----
    {
      block_type: 'teach',
      title: 'הפער הדיגיטלי ונגישות',
      body: 'לא כל אדם יכול להשתמש באותה קלות בשירותים דיגיטליים. פער דיגיטלי יכול לנבוע מחוסר ציוד, חיבור, מיומנות, שפה, גיל או מוגבלות. נגישות טובה מצמצמת את הפער.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'אתר מציע הזמנה רק דרך אפליקציה מורכבת. מי עלול להיפגע במיוחד?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['רק עובדים באתר', 'מבקרים שמתקשים בטכנולוגיה או שאין להם מכשיר מתאים', 'רק מי שכבר הזמין', 'אף אחד'],
        correct: [1],
        feedbackCorrect: 'שירות דיגיטלי בלבד עלול להרחיק קהלים שאין להם גישה, מיומנות או התאמה.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: אתר תיירות עבר להזמנות דרך אפליקציה בלבד, בלי אפשרות טלפונית. מבקר מבוגר בלי סמארטפון מתקשר ומבקש עזרה. מה משקף את הבעיה בצורה הכי מדויקת?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['בעיית שפה בלבד', 'חוסר גישה למכשיר מתאים ומיומנות טכנולוגית', 'בעיה בחיבור האינטרנט של האתר עצמו', 'המבקר פשוט לא מעוניין בשירות'],
        correct: [1],
        feedbackCorrect: 'נכון! זהו פער דיגיטלי הנובע מציוד ומיומנות — בדיוק כמו שלמדנו.',
        feedbackIncorrect: 'עדיין לא. חשבו: מה בדיוק מונע מהמבקר להשתמש בשירות — זו לא בעיה בתוכן עצמו.'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בדקו את האתר שלכם בטלפון. העריכו בהירות, גודל טקסט, ניווט, שפה ואפשרות לקבל עזרה. צרפו שתי ראיות והמלצה אחת.',
      answer_scope: 'project',
      project_section: '5',
      target_field: 'ux_mobile',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['בהירות', 'גודל טקסט', 'ניווט', 'שפה', 'אפשרות לעזרה'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידה 3 — המעטפת הדיגיטלית (5 מפגשים, מהחוברת המפורטת) =====
  lesson_3: [
    // ----- מפגש 9: מסע התייר הדיגיטלי (45 דק') -----
    {
      block_type: 'teach',
      title: 'מסע התייר הדיגיטלי',
      body: 'מסע התייר כולל שלבים לפני הביקור, במהלכו ואחריו. בכל שלב יש לתייר צרכים אחרים: השראה, מידע, הזמנה, ניווט, שירות, שיתוף וזיכרון.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'באיזה שלב נמצאת פעולה של פרסום ביקורת לאחר החזרה הביתה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['לפני הביקור', 'במהלך הביקור', 'אחרי הביקור', 'אין קשר למסע'],
        correct: [2],
        feedbackCorrect: 'פרסום ביקורת מתרחש אחרי החוויה ומשפיע גם על תיירים עתידיים.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל פעולה: באיזה שלב במסע התייר היא קורית?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['לפני הביקור', 'במהלך הביקור', 'אחרי הביקור'],
        items: ['חיפוש השראה ליעד', 'הזמנת מלון וטיסה', 'ניווט להגעה למקום', 'תרגום שלט או תפריט במקום', 'פרסום תמונות מהטיול', 'כתיבת ביקורת על החוויה'],
        correctMap: [0, 0, 1, 1, 2, 2],
        feedbackCorrect: 'נכון! כל פעולה שייכת לשלב אחר במסע — לכל שלב יש צרכים משלו.',
        feedbackIncorrect: 'כמעט. שאלו: זה קורה בזמן התכנון בבית, בזמן שהמבקר בפועל במקום, או אחרי שהוא חוזר?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בנו רשימה ראשונית של נקודות המגע הדיגיטליות של האתר שלכם לפני, במהלך ואחרי הביקור.',
      answer_scope: 'project',
      project_section: '3',
      target_field: 'digital_website',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['לפני הביקור', 'במהלך הביקור', 'אחרי הביקור'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 10: השראה דיגיטלית ותוכן משתמשים (90 דק') -----
    {
      block_type: 'teach',
      title: 'השראה דיגיטלית ותוכן משתמשים',
      body: 'השראה דיגיטלית נוצרת באמצעות תמונות, סרטונים, סיפורים ותוכן משתמשים. תוכן משתמשים נוצר בידי מבקרים ולא בידי האתר, ולכן הוא עשוי להיתפס כאותנטי, אך גם דורש בדיקת אמינות.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה פריט הוא תוכן משתמשים?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['מודעה רשמית של האתר', 'סרטון שפרסם מבקר לאחר הביקור', 'לוגו האתר', 'תקנון ההזמנה'],
        correct: [1],
        feedbackCorrect: 'התוכן נוצר על ידי מבקר ולכן הוא UGC, גם אם האתר משתף אותו מחדש.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל פריט: תוכן רשמי של האתר, או תוכן משתמשים (UGC)?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['תוכן רשמי של האתר', 'תוכן משתמשים (UGC)'],
        items: ['פוסט רשמי בדף הפייסבוק של האתר', 'סרטון שתייר פרסם מהביקור שלו', 'תמונה מקצועית בעמוד הבית', 'ביקורת שכתב מבקר בגוגל מפות', 'מודעת פרסום ממומנת של האתר', 'סטורי באינסטגרם ששיתף מבקר מהמקום'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! תוכן שנוצר בידי האתר עצמו הוא רשמי; תוכן שיצר מבקר, גם אם האתר משתף אותו, הוא UGC.',
        feedbackIncorrect: 'כמעט. שאלו: מי יצר את התוכן הזה במקור — האתר, או מבקר?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'מצאו פריט רשמי אחד ופריט תוכן משתמשים אחד על האתר. השוו ביניהם: מה כל אחד מנסה לגרום לצופה לחשוב או לעשות?',
      answer_scope: 'project',
      project_section: '3',
      target_field: 'digital_website',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['תוכן רשמי', 'תוכן משתמשים (UGC)'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 11: הזמנה מקוונת, ביקורות ותכנון (45 דק') -----
    {
      block_type: 'teach',
      title: 'הזמנה מקוונת, ביקורות ותכנון',
      body: 'תהליך דיגיטלי טוב מספק מידע ברור, מחיר, זמינות, תנאי ביטול ואישור. ביקורות ומפות תומכות בהחלטה, אך הן אינן מחליפות מידע רשמי ועדכני.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'מהו סימן לתהליך הזמנה ברור?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['מחיר שמופיע רק בסוף ללא הסבר', 'שלבים ברורים ואישור לאחר ההזמנה', 'אין מידע על ביטול', 'המשתמש נדרש להתחיל מחדש בכל שלב'],
        correct: [1],
        feedbackCorrect: 'שלבים ברורים ואישור מפחיתים אי־ודאות ומחזקים אמון.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל מאפיין: תהליך הזמנה ברור, או תהליך הזמנה מבלבל?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['תהליך הזמנה ברור', 'תהליך הזמנה מבלבל'],
        items: ['מחיר מוצג מראש עם כל התוספות', 'מחיר מתגלה רק בסוף התהליך', 'שלבים ברורים עם אישור בסיום', 'המשתמש נדרש להתחיל מחדש כמה פעמים', 'תנאי ביטול כתובים בבירור', 'אין שום מידע על אפשרות ביטול'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! תהליך ברור מספק מידע מלא מראש; תהליך מבלבל מסתיר או דוחה מידע חשוב.',
        feedbackIncorrect: 'כמעט. שאלו: המידע ניתן מראש וברור, או שהוא מתגלה באיחור ומפתיע את המשתמש?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'נסו לבצע תהליך הזמנה עד לשלב שלפני תשלום. תעדו מספר שלבים, מידע שניתן, נקודת קושי אחת וחוזקה אחת.',
      answer_scope: 'project',
      project_section: '3',
      target_field: 'digital_website',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['מחיר וזמינות', 'שלבי ההזמנה', 'תנאי ביטול', 'אישור סופי'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 12: מסע חלק – Seamless Travel (90 דק') -----
    {
      block_type: 'teach',
      title: 'מסע חלק – Seamless Travel',
      body: 'מסע חלק הוא מעבר רציף בין השלבים והערוצים בלי שהמבקר יצטרך להתחיל מחדש, לחפש שוב את אותו מידע או להזין פרטים שוב ושוב.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה תרחיש מתאר מסע חלק?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['הזמנה באתר ואחר כך חיפוש נפרד של הכתובת', 'אישור הזמנה כולל קישור ניווט ומידע מעודכן לביקור', 'כל ערוץ מציג שעות שונות', 'המשתמש מקבל אישור ללא פרטים'],
        correct: [1],
        feedbackCorrect: 'האישור מחבר בין ההזמנה, ההגעה והמידע לביקור ולכן יוצר רצף.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: תייר הזמין מלון באתר, ואז נאלץ לפתוח אתר נפרד ולחפש בעצמו את הכתובת, כי לא קיבל שום קישור ניווט. מה חסר כאן?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['שום דבר, זה תקין', 'חיבור בין ההזמנה לבין המידע הדרוש כדי להגיע בפועל', 'מחיר נמוך יותר להזמנה', 'עיצוב יפה יותר לאתר ההזמנות'],
        correct: [1],
        feedbackCorrect: 'נכון! מסע חלק מחבר בין השלבים — אין צורך לחפש מחדש מידע שכבר צריך היה להימסר יחד עם ההזמנה.',
        feedbackIncorrect: 'עדיין לא. חשבו: מה גורם לתייר "להתחיל מחדש" במשהו שלא באמת היה צריך?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בחרו מעבר אחד במסע באתר שלכם, למשל מהזמנה לניווט. העריכו אם הוא רציף והציעו שינוי אחד שיחבר בין השלבים.',
      answer_scope: 'project',
      project_section: '5',
      target_field: 'ux_ease',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['מעבר בין הזמנה לניווט', 'מעבר בין מידע לתשלום', 'מעבר בין מחשב לטלפון'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 13: סדנת מפת מסע: לפני, במהלך ואחרי (90 דק') -----
    {
      block_type: 'teach',
      title: 'סדנת מפת מסע: לפני, במהלך ואחרי',
      body: 'מפת מסע מציגה את פעולות המבקר, נקודות המגע, המידע, הרגש והקשיים לאורך החוויה. היא מאפשרת לראות את השירות מנקודת מבטו של המבקר.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'מה צריך להופיע במפת מסע מלאה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['רק שם האתר', 'רק תמונות', 'שלבים, פעולות, נקודות מגע וקשיים', 'רק מחיר הכניסה'],
        correct: [2],
        feedbackCorrect: 'מפה טובה מתארת את הרצף ואת חוויית המשתמש, ולא רק מידע כללי.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל נקודת מגע: לפני, במהלך או אחרי הביקור?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['לפני הביקור', 'במהלך הביקור', 'אחרי הביקור'],
        items: ['קריאת תיאור היעד באתר', 'בדיקת מזג אוויר לפני הנסיעה', 'שאלת שאלה בצ׳אט תמיכה בזמן הביקור', 'תשלום בקופה דיגיטלית במקום', 'מענה לסקר שביעות רצון אחרי הביקור', 'שיתוף הרשמים ברשת החברתית'],
        correctMap: [0, 0, 1, 1, 2, 2],
        feedbackCorrect: 'נכון! מפת מסע טובה ממקמת כל נקודת מגע בשלב הנכון שלה.',
        feedbackIncorrect: 'כמעט. שאלו: זה קורה בזמן התכנון, בפועל במקום, או אחרי שחוזרים הביתה?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'השלימו מפת מסע מלאה לאתר: לפני, במהלך ואחרי. בכל שלב כתבו פעולה, כלי דיגיטלי, צורך, קושי וראיה.',
      answer_scope: 'project',
      project_section: '5',
      target_field: 'ux_design',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['לפני הביקור', 'במהלך הביקור', 'אחרי הביקור'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידה 4 — ניהול מבקרים ואינפואתיקה (4 מפגשים, מהחוברת המפורטת) =====
  lesson_4: [
    // ----- מפגש 14: ניהול מבקרים דיגיטלי (45 דק') -----
    {
      block_type: 'teach',
      title: 'ניהול מבקרים דיגיטלי',
      body: 'ניהול מבקרים הוא תכנון הזרימה, העומסים, המידע והבטיחות באתר. כלים דיגיטליים יכולים לסייע באמצעות הזמנה לפי שעות, מידע בזמן אמת, ספירה וניווט.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה כלי מסייע ישירות לפיזור עומס?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['הזמנה לפי חלונות זמן', 'תמונה יפה בעמוד הבית', 'לוגו חדש', 'מוזיקת רקע'],
        correct: [0],
        feedbackCorrect: 'חלונות זמן מחלקים את הביקוש ומאפשרים לאתר לשלוט בכמות המבקרים בכל שעה.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל כלי: מסייע בניהול מבקרים, או לא קשור לניהול מבקרים?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['מסייע בניהול מבקרים', 'לא קשור לניהול מבקרים'],
        items: ['הזמנה לפי חלונות זמן', 'ספירת מבקרים בזמן אמת בכניסה', 'תמונה יפה בעמוד הבית', 'ניווט פנימי באפליקציה', 'לוגו חדש לאתר', 'עדכון על עומס נוכחי במקום'],
        correctMap: [0, 0, 1, 0, 1, 0],
        feedbackCorrect: 'נכון! כלים שמסייעים בניהול מבקרים שולטים בזרימה, בעומס או במידע בזמן אמת.',
        feedbackIncorrect: 'כמעט. שאלו: הכלי הזה משפיע על מספר המבקרים או על הזרימה שלהם, או שהוא רק עיצובי?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בדקו האם האתר שלכם מנהל זמן, תורים או עומס באמצעי דיגיטלי. צרפו ראיה והסבירו איזה קושי הוא פותר.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['הזמנה לפי זמן', 'ספירת מבקרים', 'ניווט או הכוונה', 'מידע בזמן אמת'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 15: כושר נשיאה, קיימות ותיירות יתר (90 דק') -----
    {
      block_type: 'teach',
      title: 'כושר נשיאה, קיימות ותיירות יתר',
      body: 'כושר נשיאה הוא היכולת של אתר לקבל מבקרים בלי לפגוע בסביבה, בקהילה, בחוויה או בתשתיות. תיירות יתר נוצרת כאשר היקף הביקור חורג מהיכולת הזו.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה סימן עשוי להעיד על חריגה מכושר הנשיאה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['זמינות מידע ברורה', 'עומס קבוע שפוגע באתר ובתושבים', 'שלט הכוונה', 'מערכת הזמנות'],
        correct: [1],
        feedbackCorrect: 'עומס שפוגע במשאבים, בקהילה או בחוויית הביקור מצביע על בעיית נשיאה.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: יעד תיירותי פופולרי מדווח על תורים ארוכים בכל יום, זיהום מוגבר ותלונות תושבים על רעש. איזה כלי דיגיטלי הכי ישיר יכול לצמצם את הבעיה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['הוספת עוד תמונות באתר', 'מגבלת כניסה יומית עם הזמנה מראש', 'הגדלת תקציב הפרסום', 'הוספת מוזיקת רקע לאתר'],
        correct: [1],
        feedbackCorrect: 'נכון! מגבלת כניסה עם הזמנה מראש מאפשרת לשלוט בכמות המבקרים ולמנוע חריגה מכושר הנשיאה.',
        feedbackIncorrect: 'עדיין לא. חשבו: מה משפיע ישירות על כמות האנשים שנכנסים בפועל, ולא רק על השיווק?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'זהו סיכון אחד של עומס באתר שלכם והציעו דרך דיגיטלית אחת לצמצם אותו.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['עומס פיזי', 'פגיעה בסביבה', 'פגיעה בחוויית המבקר', 'פגיעה בתושבים המקומיים'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 16: חוויית המבקר לאורך המסע (45 דק') -----
    {
      block_type: 'teach',
      title: 'חוויית המבקר לאורך המסע',
      body: 'חוויית המבקר מושפעת מהמידע, מההגעה, מהתורים, מהשירות ומהיכולת לקבל עזרה. מערכת טובה רואה את כל המסע ולא רק את רגע הכניסה.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'מהי הדרך הטובה ביותר להעריך חוויית מבקר?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['לבדוק רק את עיצוב דף הבית', 'לבחון את כל הרצף לפני, במהלך ואחרי', 'לבדוק רק מספר עוקבים', 'להסתמך על פרסום רשמי בלבד'],
        correct: [1],
        feedbackCorrect: 'חוויה נוצרת לאורך רצף של נקודות מגע ולכן צריך לבחון את כולן.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל דוגמה לתחום בחוויית המבקר שהיא הכי שייכת אליו: מידע, הגעה, תורים, שירות או עזרה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['מידע', 'הגעה', 'תורים', 'שירות', 'עזרה'],
        items: ['עמוד שאלות נפוצות באתר', 'ניווט GPS לחניה הקרובה ביותר', 'הזמנת שעת כניסה מראש כדי לדלג על התור', 'הדרכה קולית באפליקציה תוך כדי הסיור', 'כפתור "קריאה לעזרה" לצוות באפליקציה'],
        correctMap: [0, 1, 2, 3, 4],
        feedbackCorrect: 'נכון! לכל תחום בחוויית המבקר יש כלי דיגיטלי שתומך בו.',
        feedbackIncorrect: 'כמעט. חשבו על השלב במסע: זה עוזר להבין, להגיע, לדלג על המתנה, לקבל שירות, או לקבל עזרה כשתקועים?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בחרו שלוש נקודות מגע באתר שלכם. לכל נקודה תנו ציון 1–5 והסבירו את הציון באמצעות ראיה.',
      answer_scope: 'project',
      project_section: '5',
      target_field: 'ux_ease',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['מידע', 'הגעה', 'תורים', 'שירות', 'עזרה'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 17: אינפואתיקה: פרטיות, תרבות ומסחור (90 דק') -----
    {
      block_type: 'teach',
      title: 'אינפואתיקה: פרטיות, תרבות ומסחור',
      body: 'אינפואתיקה עוסקת בשימוש אחראי במידע. בתיירות עולות שאלות של פרטיות, הסכמה, ייצוג תרבותי, מעקב ומסחור של חוויות ומקומות.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'מערכת אוספת מיקום של מבקרים בלי להסביר מדוע. מה הבעיה המרכזית?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['האתר משתמש במפה', 'אין שקיפות והסכמה מספקת', 'המבקר מקבל מידע', 'המערכת דיגיטלית'],
        correct: [1],
        feedbackCorrect: 'איסוף מידע צריך להיות שקוף, מוצדק ומבוסס על הסכמה.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: אתר תיירות מפרסם תמונות מטקס דתי מקומי בלי לבקש רשות מהקהילה, כדי למשוך יותר מבקרים. מה הבעיה המרכזית מבחינת אינפואתיקה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['התמונות לא איכותיות מספיק', 'שימוש בתרבות ובחוויה מקומית ללא הסכמה, למטרות מסחריות', 'האתר לא דיגיטלי מספיק', 'אין מספיק תמונות באתר'],
        correct: [1],
        feedbackCorrect: 'נכון! זהו מקרה של מסחור תרבות מקומית בלי הסכמה — בדיוק הדילמה שאינפואתיקה עוסקת בה.',
        feedbackIncorrect: 'עדיין לא. חשבו: מה קורה כאן מבחינת כבוד, הסכמה ושימוש בתרבות של אנשים אחרים?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בדקו האם באתר שלכם מופיעה מדיניות פרטיות או הודעה על איסוף מידע. תארו מה ברור ומה חסר.',
      answer_scope: 'project',
      project_section: '5',
      target_field: 'ux_ease',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['מדיניות פרטיות', 'הסכמה לאיסוף מידע', 'ייצוג תרבותי', 'שימוש מסחרי בתוכן'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידה 5 — כלכלה שיתופית (3 מפגשים, מהחוברת המפורטת) =====
  lesson_5: [
    // ----- מפגש 18: מהי כלכלה שיתופית? (45 דק') -----
    {
      block_type: 'teach',
      title: 'מהי כלכלה שיתופית?',
      body: 'כלכלה שיתופית מחברת בין אנשים באמצעות פלטפורמה שמאפשרת שימוש בנכס, זמן או ידע של אדם אחר. הפלטפורמה מסייעת באיתור, תשלום, דירוג ואמון.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה מקרה מתאים לכלכלה שיתופית?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['מלון שמוכר חדרים בבעלותו', 'אדם שמציע חדר פנוי דרך פלטפורמה', 'מוזיאון שמוכר כרטיסים', 'חברת תעופה שמפעילה מטוס'],
        correct: [1],
        feedbackCorrect: 'האדם משתף שימוש בנכס פרטי באמצעות פלטפורמה שמחברת בינו לבין המשתמש.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל דוגמה: כלכלה שיתופית, או עסק מסורתי?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['כלכלה שיתופית', 'עסק מסורתי'],
        items: ['אדם שמשכיר חדר פנוי בביתו דרך אפליקציה', 'מלון שמוכר חדרים בבעלותו', 'נהג פרטי שמסיע נוסעים בזמנו הפנוי', 'חברת תעופה שמפעילה צי מטוסים', 'מדריך מקומי שמציע סיור פרטי דרך פלטפורמה', 'מוזיאון שמוכר כרטיסי כניסה'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! בכלכלה שיתופית אדם פרטי משתף נכס או זמן שלו; בעסק מסורתי הגוף עצמו הוא הבעלים והספק.',
        feedbackIncorrect: 'כמעט. שאלו: מי בעל הנכס או השירות — אדם פרטי, או חברה/מוסד?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בדקו האם קיימת סביב האתר שלכם פעילות שיתופית רלוונטית: לינה, נסיעה, חוויה או ציוד. תארו את הקשר.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['לינה', 'נסיעה', 'חוויה', 'ציוד'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 19: שימושים של כלכלה שיתופית בתיירות (90 דק') -----
    {
      block_type: 'teach',
      title: 'שימושים של כלכלה שיתופית בתיירות',
      body: 'בתיירות כלכלה שיתופית מופיעה בלינה, נסיעות, אירוח, חוויות ושימוש בשטחים. היא יכולה להרחיב את ההיצע ולחבר תיירים למקומיים.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו התאמה נכונה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['Couchsurfing – אירוח בין אנשים', 'BlaBlaCar – הזמנת חדר במלון', 'Hipcamp – חברת תעופה', 'Airbnb Experiences – מפה מודפסת'],
        correct: [0],
        feedbackCorrect: 'Couchsurfing מחבר בין מארחים למטיילים לצורך אירוח וחיבור חברתי.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל פלטפורמה לתחום השיתוף שהיא מייצגת.',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['לינה', 'נסיעה משותפת', 'אירוח חינמי אצל מקומי', 'חוויה או סיור', 'שטח קמפינג'],
        items: ['Airbnb', 'BlaBlaCar', 'Couchsurfing', 'Airbnb Experiences', 'Hipcamp'],
        correctMap: [0, 1, 2, 3, 4],
        feedbackCorrect: 'נכון! לכל פלטפורמה יש תחום שיתוף משלה — מה בדיוק היא מאפשרת לשתף.',
        feedbackIncorrect: 'כמעט. חשבו: מה בדיוק המשתמש משתף כאן — מקום לינה, מקום ברכב, ספה, חוויה, או שטח קמפינג?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בחרו שירות שיתופי אחד שיכול להשלים ביקור באתר שלכם. הסבירו למי הוא מועיל ובאיזה שלב במסע.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['לפני הביקור', 'במהלך הביקור', 'אחרי הביקור'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 20: יתרונות, חסרונות והשפעה קהילתית (45 דק') -----
    {
      block_type: 'teach',
      title: 'יתרונות, חסרונות והשפעה קהילתית',
      body: 'לכלכלה שיתופית יתרונות כמו גיוון, מחיר וחיבור מקומי, אך גם חסרונות כמו פגיעה בעסקים, עומס, רגולציה ואי־ודאות באיכות.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו תשובה מציגה הערכה מאוזנת?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['כלכלה שיתופית תמיד טובה', 'כלכלה שיתופית תמיד מזיקה', 'יש לבחון תועלת לתייר לצד השפעה על הקהילה', 'אין לה קשר לתיירות'],
        correct: [2],
        feedbackCorrect: 'הערכה אחראית שוקלת כמה בעלי עניין ולא מסתפקת בסיסמה.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: שכונה מקומית מדווחת שיותר ויותר דירות הפכו להשכרות קצרות טווח לתיירים, והמחירים לדיירים הקבועים עלו. מה זה מדגים?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['רק את היתרונות של כלכלה שיתופית', 'חיסרון אפשרי: פגיעה בקהילה המקומית ובזמינות הדיור', 'שזו בעיה שקשורה רק לתחבורה', 'ששירותי לינה שיתופיים תמיד אסורים'],
        correct: [1],
        feedbackCorrect: 'נכון! זו דוגמה מדויקת לאחד החסרונות שלמדנו — השפעה שלילית על הקהילה המקומית.',
        feedbackIncorrect: 'עדיין לא. חשבו: מי נפגע כאן, ולמה זה קשור בדיוק למה שלמדנו על חסרונות הכלכלה השיתופית?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'כתבו יתרון אחד, חיסרון אחד ותנאי אחד שבו שירות שיתופי יהיה מתאים לאתר או ליעד שלכם.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['יתרון', 'חיסרון', 'תנאי מתאים'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידה 6 — ביג דאטה, AI ו-CRM (4 מפגשים, מהחוברת המפורטת) =====
  lesson_6: [
    // ----- מפגש 21: מהו ביג דאטה? (45 דק') -----
    {
      block_type: 'teach',
      title: 'מהו ביג דאטה?',
      body: 'ביג דאטה מתייחס לכמויות גדולות ומגוונות של נתונים שנוצרות במהירות. בתיירות הנתונים יכולים להגיע מחיפושים, הזמנות, מיקום, ביקורות ופעילות דיגיטלית.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו דוגמה היא מקור נתונים תיירותי?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['היסטוריית הזמנות וחיפושים', 'צבע קיר ללא תיעוד', 'שם אקראי ללא הקשר', 'שלט שאינו נמדד'],
        correct: [0],
        feedbackCorrect: 'חיפושים והזמנות יוצרים נתונים שניתן לנתח כדי לזהות דפוסים.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל דוגמה: מקור נתונים תיירותי, או לא מקור נתונים רלוונטי?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['מקור נתונים תיירותי', 'לא מקור נתונים רלוונטי'],
        items: ['היסטוריית חיפושים באתר', 'מיקום GPS של מבקר שהסכים לשתף', 'צבע קיר במשרד ללא תיעוד', 'דירוג וביקורת שכתב מבקר', 'שם אקראי שהוזכר בשיחה', 'לחיצות על כפתורים באתר'],
        correctMap: [0, 0, 1, 0, 1, 0],
        feedbackCorrect: 'נכון! נתון תיירותי הוא כל מידע שנוצר מפעילות אמיתית של המבקר ואפשר לנתח.',
        feedbackIncorrect: 'כמעט. שאלו: זה מידע שנוצר מפעולה של מבקר באתר, או משהו שלא קשור בכלל?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'זהו שלושה סוגי נתונים שהאתר שלכם עשוי לאסוף והסבירו מה ניתן ללמוד מכל אחד.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['חיפושים', 'הזמנות', 'מיקום', 'ביקורות', 'פעילות דיגיטלית'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 22: מנתון לתובנה ולהחלטה (90 דק') -----
    {
      block_type: 'teach',
      title: 'מנתון לתובנה ולהחלטה',
      body: 'נתון בפני עצמו אינו החלטה. התהליך הוא איסוף, ארגון, ניתוח, זיהוי תבנית, הפקת תובנה ובחירת פעולה.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'האתר רואה שרוב ההזמנות מתבצעות בערב. מהי תובנה אפשרית?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['אין קשר לשעה', 'כדאי לוודא שהמערכת יציבה ושירות זמין בערב', 'לבטל הזמנות בערב', 'להסתיר מידע'],
        correct: [1],
        feedbackCorrect: 'הדפוס יכול להוביל להחלטה שירותית שמותאמת לזמן הפעילות של המשתמשים.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל דוגמה: זהו נתון גולמי, תובנה, או החלטה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['נתון גולמי', 'תובנה', 'החלטה'],
        items: ['שעת ההזמנה של כל לקוח נרשמת במערכת', '80% מההזמנות בוצעו בשעות הערב', 'כדאי לוודא שהשירות זמין וטוב גם בערב', 'כתובת ה-IP של כל כניסה לאתר נשמרת', 'רוב המבקרים מגיעים מהנייד ולא ממחשב', 'להשקיע בשיפור גרסת המובייל של האתר'],
        correctMap: [0, 1, 2, 0, 1, 2],
        feedbackCorrect: 'נכון! נתון גולמי הוא מה שנרשם; תובנה היא הדפוס שמתגלה; החלטה היא הפעולה שנובעת מהתובנה.',
        feedbackIncorrect: 'כמעט. שאלו: זה תיעוד גולמי, מסקנה על דפוס, או פעולה שצריך לבצע?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בחרו נתון אחד שהאתר שלכם יכול למדוד. השלימו: נתון → דפוס אפשרי → תובנה → החלטה.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['נתון', 'דפוס אפשרי', 'תובנה', 'החלטה'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 23: תמחור דינמי (45 דק') -----
    {
      block_type: 'teach',
      title: 'תמחור דינמי',
      body: 'תמחור דינמי משנה מחיר לפי ביקוש, זמן, זמינות ועונה. הוא יכול לסייע בניהול ביקוש, אך צריך להיות ברור והוגן.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'מתי תמחור דינמי עלול להיתפס כלא הוגן?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['כאשר הכללים שקופים', 'כאשר המחיר משתנה בלי הסבר ונראה מפלה', 'כאשר יש מחיר קבוע', 'כאשר מוצגים תנאי ביטול'],
        correct: [1],
        feedbackCorrect: 'חוסר שקיפות או תחושה של אפליה פוגעים באמון המשתמש.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: שני משתמשים בודקים את אותה טיסה באותו הרגע, ומקבלים שני מחירים שונים בלי שום הסבר גלוי. איך הכי נכון להעריך את המצב?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['זה בסדר, זה פשוט תמחור דינמי', 'זה עלול להיראות לא הוגן אם אין שקיפות לגבי הסיבה להבדל', 'המחיר הזול תמיד נכון', 'אין להשתמש בתמחור דינמי בכלל'],
        correct: [1],
        feedbackCorrect: 'נכון! תמחור דינמי עצמו לגיטימי, אבל בלי שקיפות הוא עלול להיראות מפלה ולפגוע באמון.',
        feedbackIncorrect: 'עדיין לא. חשבו: האם הבעיה היא בעצם קיום תמחור משתנה, או במשהו אחר?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בדקו האם המחיר באתר משתנה לפי תאריך, שעה או סוג מבקר. תעדו ראיה והעריכו את רמת השקיפות.',
      answer_scope: 'project',
      project_section: '5',
      target_field: 'ux_ease',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['תאריך', 'שעה', 'סוג מבקר'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 24: AI כמסייע ולא כמחליף חשיבה (90 דק') -----
    {
      block_type: 'teach',
      title: 'AI כמסייע ולא כמחליף חשיבה',
      body: 'בינה מלאכותית יכולה לנתח נתונים, להציע המלצות, לתמוך בשירות ולסייע בתמחור. עם זאת, היא אינה מחליפה בדיקת מקור, שיקול דעת ואחריות אנושית.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו דרך שימוש היא האחראית ביותר?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['לקבל כל תשובת AI ללא בדיקה', 'להשתמש ב-AI להצעה ואז לבדוק מול מקור', 'להסתיר מהמשתמש שהופעלה מערכת', 'להעלות מידע אישי ללא צורך'],
        correct: [1],
        feedbackCorrect: 'ה-AI מסייע, אך האדם בודק, מאמת ומקבל אחריות על ההחלטה.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: צ\'אטבוט מבוסס AI נתן לתייר מידע שגוי על שעות פתיחה של אתר, והתייר הגיע כשהמקום סגור. איפה הייתה הטעות בתהליך?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['בכך שהשתמשו ב-AI בכלל', 'בכך שלא הייתה בדיקה אנושית של המידע שה-AI סיפק לפני שהוצג', 'בכך שהתייר בכלל שאל שאלה', 'אין כאן שום טעות'],
        correct: [1],
        feedbackCorrect: 'נכון! ה-AI יכול לטעות — לכן תמיד צריך אימות אנושי של מידע קריטי לפני שהוא מוצג למשתמש.',
        feedbackIncorrect: 'עדיין לא. חשבו: איפה בתהליך היה צריך להיות בן אדם שבודק את המידע?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'נסחו הצעה אחת לשימוש ב-AI באתר שלכם. כתבו את התועלת, המידע הנדרש, סיכון אחד ובדיקה אנושית נדרשת.',
      answer_scope: 'project',
      project_section: '7',
      target_field: 'improve_ideas',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['תועלת', 'מידע נדרש', 'סיכון', 'בדיקה אנושית נדרשת'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידה 7 — ארגון התוצר (2 מפגשים, מהחוברת המפורטת — מחליף את "יעד חכם", שעבר ליחידה 9) =====
  lesson_7: [
    // ----- מפגש 25: כלים דיגיטליים וראיה טובה לתוצר (90 דק') -----
    {
      block_type: 'teach',
      title: 'כלים דיגיטליים וראיה טובה לתוצר',
      body: 'ראיה טובה היא פריט שמאפשר לקורא לבדוק את הטענה: קישור, צילום מסך, מחיר, מסך הזמנה, ביקורת או עמוד רשמי. ראיה צריכה להיות רלוונטית, ברורה ועדכנית.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו ראיה היא החזקה ביותר לטענה "אפשר להזמין מראש"?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['צילום של לוגו', 'קישור לעמוד ההזמנה וצילום מסך של בחירת תאריך', 'תמונה של הנוף', 'מספר העוקבים'],
        correct: [1],
        feedbackCorrect: 'העמוד והצילום מראים באופן ישיר שהפעולה קיימת.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל דוגמת ראיה: ראיה חזקה לטענה, או ראיה חלשה ולא רלוונטית?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['ראיה חזקה לטענה', 'ראיה חלשה או לא רלוונטית'],
        items: ['קישור לעמוד ההזמנה + צילום מסך של בחירת תאריך', 'תמונה כללית של הנוף בלי הקשר לטענה', 'צילום מסך של מסך תשלום עם תאריך נראה', 'לוגו האתר בלבד', 'ביקורת מתוארכת שמתייחסת ישירות לטענה', 'מספר עוקבים ברשת חברתית'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! ראיה חזקה מוכיחה בדיוק את מה שנטען — לא רק קשורה בכללי לנושא.',
        feedbackIncorrect: 'כמעט. שאלו: זה מוכיח ישירות את הטענה הספציפית, או שזה רק "מסביב" לנושא?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בחרו שלוש טענות שכבר כתבתם. לכל אחת בדקו אם הראיה ישירה, עדכנית וברורה. החליפו ראיה חלשה במקרה הצורך.',
      answer_scope: 'learning',
      game_data: STRUCTURED_SITE_CHECK_TEMPLATE()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 26: אמינות, עדכניות וסתירות בין מקורות (45 דק') -----
    {
      block_type: 'teach',
      title: 'אמינות, עדכניות וסתירות בין מקורות',
      body: 'מקורות דיגיטליים עלולים להיות ישנים, חלקיים או סותרים. יש להעדיף מקור רשמי לעובדות תפעוליות, להשוות למקורות נוספים ולציין סתירה שאינה נפתרת.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'האתר הרשמי מציג שעה אחת ומפות Google שעה אחרת. מה עושים?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['בוחרים באקראי', 'מציינים את הסתירה ובודקים מקור עדכני נוסף', 'מתעלמים', 'משנים את הנתון בעצמנו'],
        correct: [1],
        feedbackCorrect: 'יש לתעד את הסתירה, לבדוק עדכניות ולא להציג עובדה לא מאומתת.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: מצאתם באתר הרשמי שהכניסה חינם, אבל בביקורת מלפני שנתיים כתוב שיש תשלום. מה הכי נכון לעשות?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['לכתוב שהכניסה חינם בלי לציין את הסתירה', 'לציין את הסתירה, להעדיף את המידע הרשמי העדכני, ולציין שהמידע הישן עשוי היה להשתנות', 'להתעלם משני המקורות ולנחש', 'לכתוב שהכניסה בתשלום כי זה מה שנמצא ראשון'],
        correct: [1],
        feedbackCorrect: 'נכון! מקור רשמי ועדכני עדיף, אבל חשוב לתעד את הסתירה ולא להעלים אותה.',
        feedbackIncorrect: 'עדיין לא. חשבו: איזה מהמקורות סביר שיהיה מעודכן יותר, ומה עושים עם הסתירה עצמה?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'מצאו פרט אחד על האתר בשני מקורות. השוו תאריך, ניסוח ואמינות. אם יש סתירה, תעדו אותה והסבירו כיצד הכרעתם.',
      answer_scope: 'project',
      project_section: '1',
      target_field: 'site_basic',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['תאריך', 'ניסוח', 'אמינות'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידה 8 — תחבורה אוטונומית ודיגיטלית (3 מפגשים, מהחוברת המפורטת) =====
  lesson_8: [
    // ----- מפגש 27: תחבורה אוטונומית: מהי ומה המחיר שלה? (90 דק') -----
    {
      block_type: 'teach',
      title: 'תחבורה אוטונומית: מהי ומה המחיר שלה?',
      body: 'תחבורה אוטונומית משתמשת בחיישנים, מפות ומערכות בקרה כדי לבצע חלק מפעולות הנהיגה או את כולן. היא עשויה לשפר נגישות ויעילות, אך מעלה שאלות של בטיחות, אחריות ותעסוקה.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזו שאלה היא שאלה אתית מרכזית בתחבורה אוטונומית?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['איזה צבע הרכב', 'מי אחראי במקרה של תקלה או תאונה', 'מה שם האפליקציה', 'כמה תמונות יש באתר'],
        correct: [1],
        feedbackCorrect: 'כאשר מערכת מקבלת החלטות תפעוליות, נדרשת הגדרה ברורה של אחריות.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: רכב אוטונומי לסיורים תיירותיים עצר פתאום בגלל טעות בזיהוי מכשול. אף אחד לא נפגע, אבל התיירים נבהלו. מי צריך לבדוק את האירוע?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['אף אחד, זה סתם תקלה טכנית', 'החברה המפעילה, כדי לוודא אחריות ובטיחות בעתיד', 'רק התיירים שהיו ברכב', 'התקשורת בלבד'],
        correct: [1],
        feedbackCorrect: 'נכון! כשמערכת אוטונומית מקבלת החלטות, הגוף המפעיל אחראי לבדוק ולתקן.',
        feedbackIncorrect: 'עדיין לא. חשבו: מי בעל האחריות התפעולית כשמערכת אוטומטית טועה?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'העריכו אם תחבורה אוטונומית יכולה לסייע בהגעה לאתר שלכם. כתבו תועלת, סיכון וקהל שירוויח במיוחד.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['תועלת', 'סיכון', 'קהל נהנה במיוחד'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 28: סיור אוטונומי מותאם אישית (45 דק') -----
    {
      block_type: 'teach',
      title: 'סיור אוטונומי מותאם אישית',
      body: 'סיור מותאם אישית משתמש בהעדפות, זמן, מיקום ונגישות כדי להציע מסלול. במערכת אוטונומית המסלול עשוי להשתנות בזמן אמת.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה מידע חיוני להתאמת מסלול?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['העדפות, זמן ומגבלות נגישות', 'צבע חולצת המשתמש בלבד', 'שם המורה', 'מספר אקראי'],
        correct: [0],
        feedbackCorrect: 'התאמה רלוונטית דורשת מידע שמחובר לצרכים ולמגבלות של המבקר.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל סוג מידע: רלוונטי להתאמת מסלול, או לא רלוונטי?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['רלוונטי להתאמת מסלול', 'לא רלוונטי'],
        items: ['משך הזמן שיש למבקר', 'צבע הבגדים של המבקר', 'מגבלת נגישות (למשל כיסא גלגלים)', 'תחביבים ותחומי עניין', 'שם המשפחה הפרטי', 'שעת היום הנוכחית'],
        correctMap: [0, 1, 0, 0, 1, 0],
        feedbackCorrect: 'נכון! מידע רלוונטי קשור לצרכים, זמן ומגבלות של המבקר — לא לפרטים אישיים סתמיים.',
        feedbackIncorrect: 'כמעט. שאלו: המידע הזה משפיע בפועל על המסלול שיוצע, או שהוא לא קשור בכלל?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'תכננו מסלול מותאם לאחד מקהלי היעד של האתר. כתבו קהל, זמן, שלוש תחנות והתאמה מיוחדת.',
      answer_scope: 'project',
      project_section: '2',
      target_field: 'general_offer',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['קהל', 'זמן', 'תחנות', 'התאמה מיוחדת'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 29: תחבורה שיתופית ותכנון מסלול ב-Moovit (90 דק') -----
    {
      block_type: 'teach',
      title: 'תחבורה שיתופית ותכנון מסלול ב-Moovit',
      body: 'תחבורה דיגיטלית משלבת תכנון מסלול, מידע בזמן אמת, כרטוס ושיתוף נסיעות. הקטע האחרון מהתחנה לאתר חשוב במיוחד לחוויית המבקר.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'מהו "הקטע האחרון" במסע?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['הדרך מהבית לשדה תעופה בלבד', 'החיבור האחרון מתחנה או חניה אל האתר', 'השלב של כתיבת ביקורת', 'רכישת מזכרת'],
        correct: [1],
        feedbackCorrect: 'זהו החלק האחרון של ההגעה, שלעתים קרובות קובע אם האתר באמת נגיש.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל פעולה: שייכת לתכנון המוקדם של הנסיעה, או לקטע האחרון (מתחנה/חניה לאתר)?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['תכנון מוקדם של הנסיעה', 'הקטע האחרון (מתחנה או חניה לאתר)'],
        items: ['בחירת קו אוטובוס מהעיר ליעד', 'הליכה מהתחנה האחרונה לכניסת האתר', 'רכישת כרטיס דיגיטלי מראש', 'שילוט הכוונה מהחניון לכניסה', 'השוואת זמני נסיעה בין כמה אמצעי תחבורה', 'ניווט הליכה קצרה מהרכבת לשער הכניסה'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! התכנון המוקדם קורה לפני היציאה; הקטע האחרון קורה ממש ליד האתר עצמו.',
        feedbackIncorrect: 'כמעט. שאלו: זה קורה כשמתכננים את הנסיעה מראש, או ממש בסוף הדרך ליד האתר?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'תכננו מסלול בתחבורה ציבורית לאתר. תעדו החלפות, זמן, קטע הליכה ומכשול אפשרי, והציעו שיפור אחד.',
      answer_scope: 'project',
      project_section: '3',
      target_field: 'digital_website',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['החלפות', 'זמן נסיעה', 'קטע הליכה', 'מכשול אפשרי'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידה 9 — אינטרנט של הדברים ויעד חכם (2 מפגשים, מהחוברת המפורטת — כולל "יעד חכם" שעבר לכאן מיחידה 7) =====
  lesson_9: [
    // ----- מפגש 30: מהו האינטרנט של הדברים? (45 דק') -----
    {
      block_type: 'teach',
      title: 'מהו האינטרנט של הדברים?',
      body: 'האינטרנט של הדברים הוא רשת של חפצים וחיישנים שמחוברים, אוספים מידע ומגיבים. בתיירות הוא משמש בחדרים חכמים, ניטור תפוסה, תחזוקה, בטיחות ומידע בזמן אמת.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה מוצר הוא IoT?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['מנורה רגילה ללא חיבור', 'חיישן תפוסה שמעביר נתונים למערכת', 'שלט מודפס', 'מפתח מכני בלבד'],
        correct: [1],
        feedbackCorrect: 'החיישן מחובר, אוסף מידע ומעביר אותו למערכת ולכן הוא חלק מ-IoT.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל מכשיר: IoT, או לא IoT?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['IoT', 'לא IoT'],
        items: ['חיישן תפוסה שמעביר נתונים למערכת', 'מנורה רגילה ללא חיבור', 'מנעול חכם שנפתח מהטלפון', 'מפתח מכני רגיל', 'תרמוסטט שמתעדכן מרחוק', 'שלט מודפס על הקיר'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! מכשיר IoT מחובר, אוסף מידע ומגיב אליו; מכשיר רגיל לא עושה אף אחד מהשניים.',
        feedbackIncorrect: 'כמעט. שאלו: המכשיר הזה מחובר ומעביר מידע, או שהוא סתם חפץ פיזי רגיל?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'זהו שימוש אפשרי אחד ב-IoT באתר שלכם. כתבו איזה חיישן או מכשיר, איזה מידע הוא אוסף ומה הפעולה שנעשית בעקבותיו.',
      answer_scope: 'project',
      project_section: '4',
      target_field: 'concepts_apply',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['חיישן או מכשיר', 'מידע שנאסף', 'פעולה שננקטת'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 31: יעד חכם: שימושי IoT או גימיק? (90 דק') -----
    {
      block_type: 'teach',
      title: 'יעד חכם: שימושי IoT או גימיק?',
      body: 'פתרון חכם אינו נמדד בכמות הטכנולוגיה אלא בבעיה שהוא פותר. כדי להעריך פתרון צריך לבדוק משתמש, תועלת, מידע, עלות, פרטיות ונגישות.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה פתרון הוא שימושי יותר?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['מסך יקר ללא צורך ברור', 'חיישן שמתריע על עומס ומציע מסלול חלופי', 'רובוט לקישוט בלבד', 'אפליקציה שמכפילה מידע שכבר קיים'],
        correct: [1],
        feedbackCorrect: 'החיישן פותר בעיה מוגדרת ומשפר את זרימת המבקרים.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: יעד תיירותי מתקין רובוט יקר שרק מקבל תמונות סלפי עם מבקרים, בלי לפתור שום בעיה תפעולית. איך הכי נכון לסווג את זה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['פתרון חכם מצוין', 'ככל הנראה גימיק — עלות גבוהה בלי בעיה ברורה שהוא פותר', 'זה IoT קלאסי', 'זה זול ויעיל'],
        correct: [1],
        feedbackCorrect: 'נכון! פתרון חכם אמיתי פותר בעיה מוגדרת. בלי בעיה ברורה, זה נשמע יותר כמו גימיק שיווקי.',
        feedbackIncorrect: 'עדיין לא. חשבו: איזו בעיה אמיתית של מבקר או של האתר זה פותר?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'העריכו רעיון IoT אחד לאתר לפי שישה סעיפים: בעיה, משתמש, מידע, פעולה, תועלת וסיכון.',
      answer_scope: 'project',
      project_section: '7',
      target_field: 'improve_ideas',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['בעיה', 'משתמש', 'מידע', 'פעולה', 'תועלת', 'סיכון'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ],

  // ===== יחידת סיכום — בניית התוצר, הצגה ורפלקציה (3 מפגשים, יחידה חדשה מהחוברת המפורטת) =====
  lesson_10: [
    // ----- מפגש 32: בניית הצעת שיפור דיגיטלית מלאה (90 דק') -----
    {
      block_type: 'teach',
      title: 'בניית הצעת שיפור דיגיטלית מלאה',
      body: 'הצעת שיפור טובה מתחילה בבעיה מבוססת ראיה, מגדירה משתמש, מציעה פתרון ישים ומסבירה תועלת, מגבלה ומדד הצלחה.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה ניסוח הוא הצעת שיפור חזקה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['כדאי לשפר את האתר', 'נוסיף מערכת הזמנה לפי שעות כדי לצמצם עומס שנצפה בביקורות; נמדוד זמני המתנה', 'נוסיף הרבה טכנולוגיה', 'נשנה הכול'],
        correct: [1],
        feedbackCorrect: 'הניסוח מחבר בין בעיה, פתרון ומדד שניתן לבדוק.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'תרחיש: שתי הצעות שיפור הוצגו. הצעה א: "נוסיף בינה מלאכותית לאתר." הצעה ב: "נוסיף צ\'אטבוט שעונה על שעות פתיחה, כי בביקורות חוזרת תלונה על חוסר מענה; נמדוד כמה פניות הוא פותר." מה ההבדל המרכזי?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['אין הבדל, שתיהן טובות באותה מידה', 'הצעה ב מבוססת בעיה מוכחת ומדד הצלחה ברור; הצעה א כללית מדי', 'הצעה א יקרה יותר', 'הצעה ב לא כוללת טכנולוגיה'],
        correct: [1],
        feedbackCorrect: 'נכון! הצעה טובה מחברת בעיה מבוססת ראיה לפתרון קונקרטי ומדד שאפשר לבדוק.',
        feedbackIncorrect: 'עדיין לא. חשבו: מה חסר בהצעה הכללית שקיים בהצעה הממוקדת?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'בנו הצעת שיפור מלאה: בעיה וראיה, קהל יעד, פתרון, שלבי שימוש, תועלת, סיכון, מדד הצלחה והמחשה.',
      answer_scope: 'project',
      project_section: '7',
      target_field: 'improve_priority',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['בעיה וראיה', 'קהל יעד', 'פתרון', 'שלבי שימוש', 'תועלת', 'סיכון', 'מדד הצלחה', 'המחשה'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 33: עריכת התוצר ובדיקת איכות (45 דק') -----
    {
      block_type: 'teach',
      title: 'עריכת התוצר ובדיקת איכות',
      body: 'עריכה אינה רק תיקון שגיאות. היא בדיקה שכל טענה ברורה, שיש לה ראיה, שהמקור אמין, שאין כפילות ושההמלצות נובעות מהממצאים.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה משפט דורש תיקון?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['באתר קיימת הזמנה מקוונת, כפי שמוצג בקישור', 'האתר מצוין כי הוא יפה', 'בביקורות חוזר קושי בחניה, ולכן מוצעת מפה עדכנית', 'המחיר מופיע בעמוד הרשמי'],
        correct: [1],
        feedbackCorrect: '"מצוין כי הוא יפה" הוא ניסוח כללי ללא קריטריון, ראיה או הסבר.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל משפט: טענה חזקה עם ראיה, או טענה חלשה בלי ראיה?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['טענה חזקה עם ראיה', 'טענה חלשה בלי ראיה'],
        items: ['באתר קיימת הזמנה מקוונת, כפי שמוצג בקישור', 'האתר מצוין כי הוא יפה', 'בביקורות חוזר קושי בחניה, ולכן מוצעת מפה עדכנית', 'המחיר טוב', 'המחיר מופיע בעמוד הרשמי ועומד על 45 ש"ח', 'השירות נחמד'],
        correctMap: [0, 1, 0, 1, 0, 1],
        feedbackCorrect: 'נכון! טענה חזקה נשענת על ראיה קונקרטית שאפשר לבדוק; טענה חלשה היא רק דעה כללית.',
        feedbackIncorrect: 'כמעט. שאלו: יש כאן פרט קונקרטי וניתן-לבדיקה, או רק תואר כללי כמו "יפה" או "טוב"?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'עברו על שמונת פרקי התוצר באמצעות רשימת הבדיקה. סמנו: מוכן, דורש תיקון או חסר, ובצעו תיקון אחד לפחות בכל פרק שאינו מוכן.',
      answer_scope: 'learning',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['מוכן', 'דורש תיקון', 'חסר'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    },

    // ----- מפגש 34: הצגות, משוב ורפלקציה (90 דק') -----
    {
      block_type: 'teach',
      title: 'הצגות, משוב ורפלקציה',
      body: 'הצגה טובה בוחרת מסר מרכזי, מציגה ראיות ומסבירה את ההמלצה. רפלקציה אישית מתארת תרומה, קושי, שינוי בהבנה ומה התלמיד היה עושה אחרת.',
      media_type: '', media_url: '',
      answer_scope: 'learning'
    },
    {
      block_type: 'quiz',
      title: 'מראים שהבנו',
      question_prompt: 'איזה משוב עמיתים הוא מועיל?',
      answer_scope: 'learning',
      game_data: {
        mode: 'select',
        options: ['היה יפה', 'הראיה על תהליך ההזמנה ברורה; כדאי להסביר יותר כיצד ההצעה פותרת את הקושי', 'לא אהבתי', 'אין מה לשנות'],
        correct: [1],
        feedbackCorrect: 'המשוב מציין חוזקה ברורה והצעה ממוקדת לשיפור.',
        feedbackIncorrect: 'עדיין לא. חזרו לקטע המידע ובדקו מהו העיקרון המרכזי, לא רק איזו מילה הופיעה.'
      }
    },
    {
      block_type: 'quiz',
      title: 'מתרגלים',
      question_prompt: 'מיינו כל משוב: משוב מועיל, או משוב לא מועיל?',
      answer_scope: 'learning',
      game_data: {
        mode: 'classify',
        categories: ['משוב מועיל', 'משוב לא מועיל'],
        items: ['היה יפה', 'הראיה על תהליך ההזמנה ברורה; כדאי להסביר יותר איך ההצעה פותרת את הקושי', 'לא אהבתי', 'ההצעה טובה, אבל המדד להצלחה לא ברור — כדאי להוסיף מספר קונקרטי', 'אין מה לשנות', 'הבעיה מוצגת היטב, אך חסרה דוגמה מהאתר עצמו'],
        correctMap: [1, 0, 1, 0, 1, 0],
        feedbackCorrect: 'נכון! משוב מועיל הוא ספציפי ומצביע על מה טוב ומה אפשר לשפר; משוב לא מועיל הוא כללי מדי.',
        feedbackIncorrect: 'כמעט. שאלו: המשוב הזה נותן משהו קונקרטי לפעול לפיו, או שהוא רק דעה כללית?'
      }
    },
    {
      block_type: 'question_structured',
      title: 'בודקים באתר שלנו',
      question_prompt: 'כתבו רפלקציה אישית: מה תרמתי, מה היה לי קשה, מה למדתי על תיירות דיגיטלית ומה אשנה בעבודה הבאה.',
      answer_scope: 'project',
      project_section: '8',
      target_field: 'personal_learned',
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['מה תרמתי', 'מה היה לי קשה', 'מה למדתי', 'מה אשנה בעבודה הבאה'];
        return t;
      })()
    },
    {
      block_type: 'question',
      title: 'סיכום המפגש',
      question_prompt: 'כתבו במשפט אחד: מה הדבר החשוב ביותר שהמושג שלמדנו משנה עבור המבקר?',
      answer_scope: 'learning'
    }
  ]
};

/**
 * מיגרציה חד-פעמית: מחליפה את הבלוקים הקיימים של יחידה 1 בגרסה המורחבת
 * (לפי הנוסח שניסן כתב מחדש — בלוק הוראה נפרד לכל אחת מ-5 הקטגוריות,
 * משחק זיכרון עם משוב, בדיקת הבנה קצרה, ושאלה אישית מובנית).
 * הרצה בטוחה חוזרת: בודקת אם כבר יש ליחידה 1 בלוק מסוג quiz (סימן שהמיגרציה
 * כבר רצה) ומדלגת אם כן.
 */
function replaceLesson1Blocks() {
  const ss      = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const sheet   = ensureLessonBlocksSheet(ss);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const unitIdCol = headers.indexOf('unit_id');

  const existingQuiz = sheetToObjects(sheet).some(b => b.unit_id === 'lesson_1' && b.block_type === 'quiz');
  if (existingQuiz) {
    Logger.log('ליחידה 1 כבר יש את הגרסה המורחבת — דילוג.');
    return;
  }

  // מוחקים מלמטה למעלה כדי לא לקלקל את מספור השורות בזמן המחיקה
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][unitIdCol] === 'lesson_1') sheet.deleteRow(i + 1);
  }

  const blocks = LESSON_BLOCKS_SEED_DATA.lesson_1;
  blocks.forEach((block, i) => {
    appendRow(sheet, {
      block_id: 'lesson_1_block_' + (i + 1),
      unit_id: 'lesson_1',
      block_order: i + 1,
      block_type: block.block_type,
      title: block.title || '', body: block.body || '',
      media_type: block.media_type || '', media_url: block.media_url || '',
      game_type: block.game_type || '',
      game_data: block.game_data ? JSON.stringify(block.game_data) : '',
      question_prompt: block.question_prompt || '',
      target_field: block.target_field || ''
    });
  });
  Logger.log('יחידה 1 עודכנה: ' + blocks.length + ' בלוקים חדשים.');
}

/**
 * מיגרציה חד-פעמית שנייה: מחליפה שוב את בלוקי יחידה 1 — הפעם בגרסה המדויקת
 * מהחוברת המפורטת (חוברת_תלמיד_מפורטת_תיירות_דיגיטלית), 4 מפגשים אמיתיים
 * (מפגש 1–4) במקום 4 "מחזורים" מהתכנון הכללי. מחליפה גם את הריצה הקודמת של
 * replaceLesson1Blocks (שהייתה תקינה תוכנית אך לא כתבה answer_scope/
 * project_section/is_exportable לגיליון — תוקן כאן).
 * הרצה בטוחה חוזרת: בודקת אם כבר קיים בלוק עם הכותרת המדויקת של מפגש 1
 * מהחוברת ("מה הקשר בין תיירות לדיגיטל?") ומדלגת אם כן.
 */
function replaceLesson1BlocksV2() {
  const ss      = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const sheet   = ensureLessonBlocksSheet(ss);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const unitIdCol = headers.indexOf('unit_id');

  const alreadyMigrated = sheetToObjects(sheet)
    .some(b => b.unit_id === 'lesson_1' && b.title === 'מה הקשר בין תיירות לדיגיטל?');
  if (alreadyMigrated) {
    Logger.log('ליחידה 1 כבר יש את גרסת החוברת המפורטת — דילוג.');
    return;
  }

  // מוחקים מלמטה למעלה כדי לא לקלקל את מספור השורות בזמן המחיקה
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][unitIdCol] === 'lesson_1') sheet.deleteRow(i + 1);
  }

  const blocks = LESSON_BLOCKS_SEED_DATA.lesson_1;
  blocks.forEach((block, i) => {
    const answerScope = block.answer_scope || 'learning';
    appendRow(sheet, {
      block_id: 'lesson_1_block_' + (i + 1),
      unit_id: 'lesson_1',
      block_order: i + 1,
      block_type: block.block_type,
      title: block.title || '', body: block.body || '',
      media_type: block.media_type || '', media_url: block.media_url || '',
      game_type: block.game_type || '',
      game_data: block.game_data ? JSON.stringify(block.game_data) : '',
      question_prompt: block.question_prompt || '',
      target_field: block.target_field || '',
      answer_scope: answerScope,
      project_section: block.project_section || '',
      is_exportable: answerScope === 'project'
    });
  });
  Logger.log('יחידה 1 עודכנה לגרסת החוברת המפורטת: ' + blocks.length + ' בלוקים חדשים.');
}

/**
 * מיגרציה חד-פעמית שלישית: משדרגת את בלוקי "מתרגלים" (המיון/התרחיש בכל מפגש)
 * ממשחקי טקסט חופשי גנרי למשחקי מיון/בחירה אמיתיים עם תוכן קונקרטי, ומשלימה
 * רשימות קטגוריות אמיתיות בבלוקי "בודקים באתר שלנו" שהיו ריקות — במקום להשאיר
 * את הפערים שהבוט הכותב לא מילא. פועלת בלי בדיקת דילוג: תמיד מוחקת ומחדשת
 * את כל בלוקי יחידה 1 מ-LESSON_BLOCKS_SEED_DATA.lesson_1 העדכני.
 */
function replaceLesson1BlocksV3() {
  const ss      = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const sheet   = ensureLessonBlocksSheet(ss);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const unitIdCol = headers.indexOf('unit_id');

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][unitIdCol] === 'lesson_1') sheet.deleteRow(i + 1);
  }

  const blocks = LESSON_BLOCKS_SEED_DATA.lesson_1;
  blocks.forEach((block, i) => {
    const answerScope = block.answer_scope || 'learning';
    appendRow(sheet, {
      block_id: 'lesson_1_block_' + (i + 1),
      unit_id: 'lesson_1',
      block_order: i + 1,
      block_type: block.block_type,
      title: block.title || '', body: block.body || '',
      media_type: block.media_type || '', media_url: block.media_url || '',
      game_type: block.game_type || '',
      game_data: block.game_data ? JSON.stringify(block.game_data) : '',
      question_prompt: block.question_prompt || '',
      target_field: block.target_field || '',
      answer_scope: answerScope,
      project_section: block.project_section || '',
      is_exportable: answerScope === 'project'
    });
  });
  Logger.log('יחידה 1 שודרגה (V3): ' + blocks.length + ' בלוקים, כולל משחקי מיון/בחירה אמיתיים.');
}

/**
 * מיגרציה חד-פעמית, מרוכזת: מחליפה את יחידות 2–9 בתוכן המדויק מהחוברת
 * המפורטת (מפגשים 5–31), מוסיפה יחידה חדשה — יחידת סיכום (lesson_10,
 * מפגשים 32–34) — וכן מעדכנת שמות יחידה בטאב units:
 *   - lesson_7: "יעד חכם ותיירות חכמה" → "ארגון התוצר" (הנושא "יעד חכם" עבר ליחידה 9)
 *   - lesson_9: "אינטרנט של דברים (IoT)" → "אינטרנט של הדברים ויעד חכם"
 *   - הוספת שורה חדשה ל-lesson_10 בטאב units
 * מריצים פעם אחת בלבד. הרצה בטוחה חוזרת: בודקת אם כבר קיימת שורת
 * lesson_10 בטאב units (סימן שהמיגרציה כבר רצה) ומדלגת אם כן.
 */
function finishBookletMigration() {
  const ss = SpreadsheetApp.openById(TOURISM_SHEET_ID);
  const unitsSheet = ss.getSheetByName('units');
  const existingUnits = sheetToObjects(unitsSheet);

  if (existingUnits.some(u => u.unit_id === 'lesson_10')) {
    Logger.log('המיגרציה הכוללת כבר רצה (קיימת lesson_10) — דילוג.');
    return;
  }

  const blocksSheet = ensureLessonBlocksSheet(ss);
  const unitIdsToReplace = ['lesson_2', 'lesson_3', 'lesson_4', 'lesson_5', 'lesson_6', 'lesson_7', 'lesson_8', 'lesson_9'];

  // מוחקים את כל הבלוקים הישנים של יחידות 2-9, מלמטה למעלה כדי לא לקלקל מספור שורות
  const data = blocksSheet.getDataRange().getValues();
  const headers = data[0];
  const unitIdCol = headers.indexOf('unit_id');
  for (let i = data.length - 1; i >= 1; i--) {
    if (unitIdsToReplace.indexOf(data[i][unitIdCol]) !== -1) blocksSheet.deleteRow(i + 1);
  }

  // כותבים מחדש את יחידות 2-9, ומוסיפים את יחידת הסיכום (lesson_10) בפעם הראשונה
  let totalBlocks = 0;
  unitIdsToReplace.concat(['lesson_10']).forEach(unitId => {
    const blocks = LESSON_BLOCKS_SEED_DATA[unitId];
    blocks.forEach((block, i) => {
      const answerScope = block.answer_scope || 'learning';
      appendRow(blocksSheet, {
        block_id: unitId + '_block_' + (i + 1),
        unit_id: unitId,
        block_order: i + 1,
        block_type: block.block_type,
        title: block.title || '', body: block.body || '',
        media_type: block.media_type || '', media_url: block.media_url || '',
        game_type: block.game_type || '',
        game_data: block.game_data ? JSON.stringify(block.game_data) : '',
        question_prompt: block.question_prompt || '',
        target_field: block.target_field || '',
        answer_scope: answerScope,
        project_section: block.project_section || '',
        is_exportable: answerScope === 'project'
      });
      totalBlocks++;
    });
  });

  // מעדכנים שמות יחידה שהשתנו (lesson_7 ו-lesson_9), לפי המבנה החדש מהחוברת
  const unitsData = unitsSheet.getDataRange().getValues();
  const unitsHeaders = unitsData[0];
  const unitIdColU = unitsHeaders.indexOf('unit_id');
  const nameColU = unitsHeaders.indexOf('unit_name');
  for (let i = 1; i < unitsData.length; i++) {
    if (unitsData[i][unitIdColU] === 'lesson_7') {
      unitsSheet.getRange(i + 1, nameColU + 1).setValue('ארגון התוצר');
    }
    if (unitsData[i][unitIdColU] === 'lesson_9') {
      unitsSheet.getRange(i + 1, nameColU + 1).setValue('אינטרנט של הדברים ויעד חכם');
    }
  }

  // מוסיפים שורת יחידה חדשה ל-lesson_10 (יחידת הסיכום), לאותו מורה שכבר מלמד את שאר היחידות
  const teacherEmail = existingUnits.length ? existingUnits[0].teacher_email : '';
  appendRow(unitsSheet, {
    unit_id: 'lesson_10',
    unit_name: 'יחידת סיכום — בניית התוצר, הצגה ורפלקציה',
    section_linked: '7',
    is_open: 'TRUE',
    open_date: new Date().toISOString(),
    teacher_email: teacherEmail,
    lesson_num: 10,
    summary: 'סוגרת את הקורס: בניית הצעת שיפור דיגיטלית מלאה (בעיה, פתרון, מדד הצלחה), עריכת התוצר ובדיקת איכות מול רשימת בדיקה, והצגה ורפלקציה אישית מסכמת.',
    assignment_summary: 'להשלים הצעת שיפור מלאה לסעיף 7, לעבור על כל 8 פרקי התוצר ולתקן מה שדורש שיפור, ולכתוב רפלקציה אישית לסעיף 8.',
    source_type: 'product_feeding',
    image_url: '',
    embed_url: '',
    planned_month: 'מרץ'
  });

  Logger.log('המיגרציה הכוללת הושלמה: ' + totalBlocks + ' בלוקים נכתבו ליחידות 2-10, ושמות יחידה 7/9 עודכנו.');
}
