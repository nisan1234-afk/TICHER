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
      game_data: (function () {
        const t = STRUCTURED_SITE_CHECK_TEMPLATE();
        t.categories = ['אטרקציה טבעית', 'אתר היסטורי או תרבותי', 'יעד עירוני', 'אירוע תיירותי', 'מתחם בילוי או פנאי'];
        return t;
      })()
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

  // ===== יחידה 2 — רקע היסטורי לתיירות דיגיטלית =====
  lesson_2: [
    {
      block_type: 'teach',
      title: 'מהפכת הדיגיטציה: מטיסה עם חוברות למסך אחד',
      body: 'מהפכת הדיגיטציה היא המעבר מעולם אנלוגי (ניירת, חוברות, סוכנויות נסיעות פיזיות) לעולם דיגיטלי (מידע בענן, בכמה לחיצות). בעבר, תכנון חופשה דרש ללכת פיזית לסוכנות נסיעות, לדפדף בחוברות, ולהזמין הכול על סמך מידע מוגבל. היום — חקירת יעדים, קריאת ביקורות, הזמנת טיסה ומלון וניווט ב-GPS קורים כולם מהטלפון, תוך דקות.',
      media_type: 'video', media_url: 'https://www.youtube.com/embed/r9Sn-Eeu2yc'
    },
    {
      block_type: 'teach',
      title: 'מהפכת האינטרנט: איך זה שינה הכול',
      body: 'האינטרנט חיבר את העולם ויצר כמה שינויים מכריעים: קישוריות גלובלית (תקשורת מיידית עם כל מקום), גישה למידע (מנועי חיפוש הפכו כל ידע לנגיש), מסחר אלקטרוני (קניה מכל מקום, בכל שעה), ומדיה חברתית (שיתוף וקהילות). לתיירות ספציפית, זה אומר: אין יותר תלות בסוכן נסיעות אחד — יש גישה ישירה למידע וללקוחות מכל העולם.',
      media_type: 'video', media_url: 'https://www.youtube.com/embed/ad8EOsXFuxE'
    },
    {
      block_type: 'teach',
      title: 'הפער הדיגיטלי (Digital Divide)',
      body: 'לא כולם נהנים מהמהפכה הדיגיטלית באותה מידה. "פער דיגיטלי" הוא הפער בגישה ובשימוש בטכנולוגיה בין אנשים/קהילות/אזורים שונים. בתיירות זה בא לידי ביטוי ב-5 דרכים: (1) גישה למידע — מי שאין לו סמארטפון מתקשה לתכנן טיול. (2) הזמנה ותשלום מקוון — לא לכולם יש ביטחון או ידע לבצע הזמנה דיגיטלית. (3) קידום יעד — עסקים ללא נוכחות דיגיטלית "נעלמים" מהמפה. (4) ביקורות ומשוב — מי שלא משתתף באונליין, לא משפיע ולא נהנה ממנו. (5) מיומנויות דיגיטליות — תפקידים רבים בתיירות היום דורשים ידע טכנולוגי.',
      media_type: '', media_url: ''
    },
    {
      block_type: 'game',
      title: 'התאימו: התבטאות הפער הדיגיטלי ↔ דוגמה',
      game_type: 'flashcards',
      game_data: [
        { term: 'גישה למידע', definition: 'נוסע ללא סמארטפון לא מוצא מידע חיוני על טיסות ולינה' },
        { term: 'הזמנה ותשלום מקוון', definition: 'קושי לבצע הזמנה מקוונת בגלל חוסר ביטחון בתשלום דיגיטלי' },
        { term: 'קידום יעד', definition: 'עסק תיירות ללא נוכחות דיגיטלית לא נראה בחיפוש' },
        { term: 'ביקורות ומשוב', definition: 'מי שלא כותב ביקורות אונליין, לא משפיע על מוניטין היעד' },
        { term: 'מיומנויות דיגיטליות', definition: 'תפקידי שיווק דיגיטלי ונתונים דורשים הכשרה שלא לכולם יש' }
      ]
    },
    {
      block_type: 'question',
      title: 'נגישות באתר שלכם',
      question_prompt: 'האם האתר שבחרתם נגיש גם למי שפחות בקיא בטכנולוגיה? הביאו דוגמה למאפיין באתר שעלול ליצור "פער דיגיטלי" עבור מבקרים מסוימים.',
      target_field: 'concepts_apply'
    }
  ],

  // ===== יחידה 3 — מעטפת דיגיטלית =====
  lesson_3: [
    {
      block_type: 'teach',
      title: 'מסע התייר הדיגיטלי',
      body: '"מעטפת דיגיטלית" מתארת איך טכנולוגיה מלווה תייר לאורך כל המסע: לפני הטיול (חיפוש השראה, השוואת מחירים, הזמנה), במהלכו (ניווט, תרגום, שיתוף), ואחריו (שיתוף תמונות וביקורות שמשפיעות על התייר הבא). ההשראה הדיגיטלית לבחירת יעד מגיעה מ-6 מקורות עיקריים: פלטפורמות מדיה חברתית (אינסטגרם, טיקטוק), אתרי תיירות ובלוגים (TripAdvisor, Lonely Planet), מגזיני טיולים מקוונים, ערוצי טיולים ביוטיוב, קהילות נסיעות מקוונות (כמו r/travel ברדיט), ואפליקציות נסיעות (Google Trips, TripIt).',
      media_type: '', media_url: ''
    },
    {
      block_type: 'teach',
      title: '"Seamless Travel" — ביקור בלי חיכוכים',
      body: 'נסיעות Seamless שואפות להסיר "חיכוך" מהמסע: הזמנה חלקה במקום אחד, צ\'ק-אין מהיר (קיוסקים, זיהוי ביומטרי), תחבורה משולבת בין כלי תחבורה שונים, זמני המתנה מינימליים, טיפול בכבודה עם מעקב, מידע בזמן אמת (עדכוני טיסה/שער), התאמה אישית (המלצות לפי הפרופיל שלך), ופתרונות דיגיטליים (אפליקציות וקונסיירג\' חכם) שמחברים הכול.',
      media_type: '', media_url: ''
    },
    {
      block_type: 'teach',
      title: 'גאדג\'טים בתיירות',
      body: 'טכנולוגיות שמייצרות ביקור "חלק" בפועל: צ\'ק-אין אוטומטי (לפני ההגעה לטיסה/מלון), פתיחת דלת המלון מהסמארטפון (בלי מפתח פיזי), וכרטיסים חכמים (סריקת ברקוד בתחבורה ציבורית ובאטרקציות, בלי הדפסה).',
      media_type: 'video', media_url: 'https://www.youtube.com/embed/2xRfFZ-HwQM'
    },
    {
      block_type: 'game',
      title: 'התאימו: מרכיב ב-Seamless Travel ↔ מה זה אומר בפועל',
      game_type: 'memory',
      game_data: [
        { term: 'הזמנה חלקה', definition: 'פלטפורמה אחת שבה מזמינים טיסה, לינה ופעילויות יחד' },
        { term: 'צ\'ק-אין חלק', definition: 'קיוסק שירות עצמי או זיהוי ביומטרי במקום תור בדלפק' },
        { term: 'תחבורה משולבת', definition: 'מעבר חלק בין טיסה, רכבת ומונית בלי "פערים"' },
        { term: 'מידע בזמן אמת', definition: 'עדכון מיידי על שינוי שער טיסה או עיכוב' },
        { term: 'התאמה אישית', definition: 'המלצות טיול שמבוססות על ההעדפות שלך באופן ספציפי' }
      ]
    },
    {
      block_type: 'question',
      title: 'המסע הדיגיטלי באתר שלכם',
      question_prompt: 'עברו על אתר/רשתות התיירות שבחרתם: אילו שלבים ממסע התייר הדיגיטלי (השראה ← הזמנה ← שיתוף) אתם רואים בפועל שם? תנו דוגמה קונקרטית לפחות לשני שלבים.',
      target_field: 'digital_social'
    }
  ],

  // ===== יחידה 4 — ניהול מבקרים דיגיטלי ואינפואתיקה =====
  lesson_4: [
    {
      block_type: 'teach',
      title: 'כושר נשיאה, תיירות בר-קיימא ותיירות יתר',
      body: '"כושר נשיאה" הוא השיעור המרבי של שימוש באתר בלי לפגוע בו לטווח ארוך. כשמספר המבקרים חורג מהכושר הזה — נוצרת "תיירות יתר" (Over-tourism): צפיפות שפוגעת גם בחוויית המבקר וגם באיכות החיים של התושבים המקומיים. "תיירות בת-קיימא" היא הגישה ההפוכה: פיתוח מתוכנן שמאפשר לאתר להתקיים ולשגשג לאורך זמן, לא רק לטווח מיידי.',
      media_type: '', media_url: ''
    },
    {
      block_type: 'teach',
      title: 'ניהול מבקרים דיגיטלי — הכלים בפועל',
      body: 'טכנולוגיה שעוזרת לנהל עומסי מבקרים ולשפר את חווייתם: הזמנות מקוונות עם משבצות כניסה מתוזמנות, צ\'ק-אין וכרטוס ללא מגע, חוויות מותאמות אישית לפי ניתוח נתונים, מידע בזמן אמת (מזג אוויר, זמני המתנה), מדריכים אינטראקטיביים באפליקציה, ואיסוף משוב/ביקורות. דוגמאות אמיתיות: מוזיאון הלובר מאפשר הזמנת כרטיסים עם משבצות זמן מתוזמנות כדי לפזר עומסים; יוניברסל סינגפור נותנים מידע חי על זמני המתנה דרך אפליקציה.',
      media_type: 'video', media_url: 'https://www.youtube.com/embed/U0Eb5fAptgI'
    },
    {
      block_type: 'teach',
      title: 'אינפואתיקה — כשטכנולוגיה יוצרת דילמות',
      body: 'כל כלי דיגיטלי חדש בתיירות מעלה גם שאלה ערכית: פרטיות מול נוחות (זיהוי פנים מזרז צ\'ק-אין, אבל אוסף מידע אישי), קיימות מול נגישות (יותר נסיעות זמינות = יותר זיהום), כלכלה מקומית מול תאגידים גלובליים (הזמנות אונליין עוקפות לפעמים עסקים מקומיים), אבטחה מול חופש (מעקב מגן — אבל גם פוגע בפרטיות), ואינטראקציה אנושית מול אוטומציה (צ\'אטבוט חוסך זמן, אבל מצמצם מגע אנושי).',
      media_type: 'video', media_url: 'https://www.youtube.com/embed/-wZnHu2qmbY'
    },
    {
      block_type: 'game',
      title: 'התאימו: דילמה ↔ דוגמה מהשטח',
      game_type: 'flashcards',
      game_data: [
        { term: 'פרטיות מול נוחות', definition: 'זיהוי פנים לצ\'ק-אין מהיר בשדה תעופה' },
        { term: 'קיימות מול נגישות', definition: 'טיסות זולות פותחות תיירות לכולם — אבל מגדילות זיהום פחמן' },
        { term: 'כלכלה מקומית מול תאגידים גלובליים', definition: 'אפליקציית הזמנות בינלאומית מתחרה בעסק משפחתי מקומי' },
        { term: 'אבטחה מול חופש', definition: 'מצלמות ומעקב ברחבי אתר תיירותי בשם הביטחון' },
        { term: 'אדם מול אוטומציה', definition: 'צ\'אטבוט עונה ללקוחות במקום נציג שירות אנושי' }
      ]
    },
    {
      block_type: 'question',
      title: 'הצעת שיפור לניהול מבקרים',
      question_prompt: 'בהשראת דוגמאות כמו הלובר ויוניברסל סינגפור — הציעו כלי דיגיטלי אחד לניהול מבקרים שהאתר שבחרתם יכול לאמץ. איזו בעיה ממשית הוא פותר?',
      target_field: 'improve_ideas'
    }
  ],

  // ===== יחידה 5 — כלכלה שיתופית =====
  lesson_5: [
    {
      block_type: 'teach',
      title: 'מהי כלכלה שיתופית?',
      body: 'כלכלה שיתופית (Sharing Economy) היא מודל שבו אנשים פרטיים משכירים/משתפים משאבים שממילא יש להם (דירה, רכב, זמן פנוי, כישרון) ישירות עם אחרים, בדרך כלל דרך פלטפורמה דיגיטלית. זה מנצל ביעילות רבה יותר משאבים קיימים, מוזיל עלויות, יוצר הכנסה נוספת, ומחזק קהילות. דוגמאות מרכזיות בתיירות: Airbnb (לינה בבתים פרטיים), BlaBlaCar (שיתוף נסיעה בין עירונית), Uber/Lyft (נסיעה עם רכב פרטי), Hipcamp (קמפינג בשטח פרטי), Couchsurfing (לינה בחינם אצל מקומיים), Airbnb Experiences ו-EatWith (סיורים וארוחות עם מקומיים).',
      media_type: '', media_url: ''
    },
    {
      block_type: 'game',
      title: 'התאימו: פלטפורמה ↔ מה בדיוק היא משתפת',
      game_type: 'memory',
      game_data: [
        { term: 'Airbnb', definition: 'השכרת דירה או חדר פרטי במקום מלון' },
        { term: 'BlaBlaCar', definition: 'שיתוף מקום פנוי ברכב בנסיעה בין ערים' },
        { term: 'Hipcamp', definition: 'קמפינג בשטח פרטי של מארח מקומי' },
        { term: 'Couchsurfing', definition: 'לינה בחינם על הספה אצל מקומי' },
        { term: 'Airbnb Experiences / EatWith', definition: 'סיור או ארוחה מודרכים ע"י תושב מקומי' }
      ]
    },
    {
      block_type: 'question',
      title: 'כלכלה שיתופית באתר שלכם',
      question_prompt: 'האם האתר שבחרתם משתמש (או יכול להשתמש) בעיקרון של כלכלה שיתופית — למשל לינה, סיורים או המלצות מבתושבים מקומיים? תנו דוגמה ספציפית.',
      target_field: 'concepts_apply'
    }
  ],

  // ===== יחידה 6 — ביג דאטה =====
  lesson_6: [
    {
      block_type: 'teach',
      title: 'מהו ביג דאטה, ולמה זה חשוב בתיירות?',
      body: 'ביג דאטה הוא כמויות ענק של מידע שעסק אוסף כל הזמן. מה שחשוב זה לא הכמות, אלא מה עושים עם המידע. בתיירות זה משמש ל: שיווק מותאם אישית (התאמת קמפיינים לפי התנהגות לקוחות), אופטימיזציה של תמחור (הבנת דפוסי ביקוש), שיפור חוויית לקוח (ניתוח משוב מכל נקודות המגע), יעילות תפעולית (ניהול מלאי וחיזוי ביקוש), וניהול סיכונים (ניתוח מזג אוויר ואירועים).',
      media_type: '', media_url: ''
    },
    {
      block_type: 'teach',
      title: 'תמחור דינמי — כשהמחיר משתנה כל הזמן',
      body: 'תמחור דינמי הוא שינוי אוטומטי של מחיר בהתאם לביקוש, עונתיות ותחרות. Booking.com משתמשת בכלי "Pulse" שמנתח ביקוש ותמחור מתחרים כדי להציע מחיר אופטימלי למארחים. Airbnb מציעה "תמחור חכם" (Smart Pricing) שמתאים מחיר לילה אוטומטית לפי עונתיות ואירועים מקומיים. מקרה מפורסם: Caesars Entertainment בלאס וגאס השתמשו בביג דאטה כדי לזהות לקוחות מרכזיים ולחזק את נאמנותם — ומאגר הנתונים שלהם הוערך במיליארד דולר.',
      media_type: '', media_url: ''
    },
    {
      block_type: 'game',
      title: 'התאימו: מושג ↔ פירוש פשוט',
      game_type: 'flashcards',
      game_data: [
        { term: 'תמחור דינמי', definition: 'מחיר שמשתנה אוטומטית לפי ביקוש בזמן אמת' },
        { term: 'פילוח לקוחות', definition: 'חלוקת תיירים לקבוצות לפי מאפיינים משותפים' },
        { term: 'ניתוח חזוי', definition: 'שימוש בנתוני עבר כדי לחזות מה יקרה בעתיד' },
        { term: 'CRM (ניהול קשרי לקוחות)', definition: 'התאמת תקשורת ושירות אישית לכל לקוח' },
        { term: 'ניתוח סנטימנטים', definition: 'הבנת רגשות ודעות מתוך פוסטים וביקורות ברשת' }
      ]
    },
    {
      block_type: 'question',
      title: 'ביג דאטה באתר שלכם',
      question_prompt: 'לו היה לאתר שבחרתם גישה לנתוני מבקרים (ביג דאטה) — איזה שימוש אחד היה הכי מועיל לו? נמקו את הבחירה.',
      target_field: 'concepts_apply'
    }
  ],

  // ===== יחידה 7 — יעד חכם ותיירות חכמה =====
  lesson_7: [
    {
      block_type: 'teach',
      title: '⚠️ הערה: אין מצגת מקור ליחידה זו',
      body: 'ליחידה זו לא נמצא קובץ מצגת מקורי בחומרי הקורס — קיימת רק עבודת ההגשה. התוכן שלפניכם נבנה כדי לתמוך במטלה עצמה, ולא מבוסס על הרצאה מתועדת. אם יש למורה מצגת נוספת שלא אותרה, כדאי להשלים אותה בעריכה.',
      media_type: '', media_url: ''
    },
    {
      block_type: 'teach',
      title: 'מהי "תיירות חכמה"?',
      body: '"יעד חכם" משתמש בטכנולוגיה כדי לשפר את חוויית המבקר לאורך חמישה תחומים: סביבה (ניטור איכות אוויר/משאבי טבע), תחבורה (ניווט חכם, תחבורה ציבורית בזמן אמת), כלכלה (תשלומים דיגיטליים, תמחור מותאם), חיים (Wi-Fi ציבורי, שירותים דיגיטליים לתושבים ולמבקרים), ואנשים (הכשרה דיגיטלית לעובדי התיירות המקומיים). אילת היא דוגמה ישראלית שמיישמת חלק מהתחומים הללו כבר היום.',
      media_type: 'video', media_url: 'https://www.youtube.com/embed/GCDWne7Lk7A'
    },
    {
      block_type: 'question',
      title: 'תיירות וירטואלית באתר שלכם',
      question_prompt: 'בחרו דרך אחת לתיירות וירטואלית (למשל: סיור VR, מפה אינטראקטיבית, מצלמת LIVE), ותארו כיצד היא תבוא לידי ביטוי באתר הפרויקט שלכם.',
      target_field: 'improve_ideas'
    }
  ],

  // ===== יחידה 8 — תחבורה אוטונומית =====
  lesson_8: [
    {
      block_type: 'teach',
      title: 'תחבורה אוטונומית בתיירות — למה זה משנה?',
      body: 'רכבים אוטונומיים (בנהיגה עצמית) כבר נמצאים בשימוש ניסיוני בשדות תעופה. היתרונות לתיירות: חוויית נסיעה משופרת (אפשר ליהנות מהנוף בלי לנווט), בטיחות (פחות טעויות אנוש), יעילות ועלות (נתיבים מהירים יותר), קיימות (רוב הרכבים חשמליים), נגישות (פתרון לאנשים עם מוגבלויות ניידות), וחוויות חדשניות. חזון עתידי: "תיירות אוטונומית" — רכב שמתכנן סיור עירוני מותאם אישית לכל קבוצת תיירים, כולל עצירות בנקודות עניין ייחודיות.',
      media_type: '', media_url: ''
    },
    {
      block_type: 'teach',
      title: 'מ-Carpooling ל-Uber ועד Moovit',
      body: 'הדרך לתחבורה אוטונומית עברה דרך תחבורה שיתופית: ב-2004 קמה Carpooling (שיתוף נסיעות), ב-2006 קמה BlaBlaCar (לוח מודעות דיגיטלי לטרמפים בתשלום), וב-2008 קמה Uber (רכב פרטי כשירות הסעה בתשלום). בתחבורה הציבורית, Moovit — פיתוח ישראלי — נותן לתייר מידע עדכני ומתכנן מסלול המשלב כמה אמצעי תחבורה יחד.',
      media_type: '', media_url: ''
    },
    {
      block_type: 'game',
      title: 'התאימו: חברה/אפליקציה ↔ מה היא הביאה לעולם',
      game_type: 'memory',
      game_data: [
        { term: 'Carpooling (2004)', definition: 'הפלטפורמה הראשונה לשיתוף נסיעות בין אנשים פרטיים' },
        { term: 'BlaBlaCar (2006)', definition: 'לוח מודעות דיגיטלי להצעת/הזמנת טרמפים בתשלום' },
        { term: 'Uber (2008)', definition: 'רכב פרטי כשירות הסעה מקצה לקצה, במחיר משתנה לפי ביקוש' },
        { term: 'Moovit', definition: 'פיתוח ישראלי לניווט ותכנון מסלול בתחבורה ציבורית' }
      ]
    },
    {
      block_type: 'question',
      title: 'תחבורה והגעה לאתר שלכם',
      question_prompt: 'כיצד תחבורה (רגילה או עתידית-אוטונומית) משפיעה על חוויית ההגעה לאתר שבחרתם? האם קיים כבר פתרון דיגיטלי לתכנון ההגעה?',
      target_field: 'concepts_apply'
    }
  ],

  // ===== יחידה 9 — אינטרנט של דברים (IoT) =====
  lesson_9: [
    {
      block_type: 'teach',
      title: 'מהו IoT, ואיך הוא נראה במלון?',
      body: 'האינטרנט של הדברים (IoT) הוא רשת של מכשירים יומיומיים שמחוברים לאינטרנט ומתקשרים ביניהם. בתיירות, זה מתבטא למשל בשליטה בחדר המלון מהסמארטפון — פתיחת דלת, וילונות, מיזוג, תאורה ומוזיקה — הכול מהטלפון, בלי לגעת בכלום בחדר.',
      media_type: 'video', media_url: 'https://www.youtube.com/embed/6mBO2vqLv38'
    },
    {
      block_type: 'teach',
      title: 'IoT מאחורי הקלעים: ניהול מבקרים ומטבחים',
      body: 'חיישני נפח ותנועה עוזרים לנהל עומסי מבקרים באתרי תיירות בזמן אמת. גם מטבחי מלונות ומסעדות משתמשים בחיישני IoT לניהול מלאי וטמפרטורה. שימושים נוספים: מעקב נכסים (ציוד, כלי רכב), ניהול משאבים (חשמל, מים), ותחבורה חכמה (חניה חכמה, ניהול תנועה).',
      media_type: 'video', media_url: 'https://www.youtube.com/embed/VxqZQHugLRc'
    },
    {
      block_type: 'game',
      title: 'התאימו: שימוש ב-IoT ↔ דוגמה',
      game_type: 'flashcards',
      game_data: [
        { term: 'שליטה בחדר מהסמארטפון', definition: 'פתיחת דלת, וילונות ומיזוג מהטלפון' },
        { term: 'חיישני נפח', definition: 'ניטור וניהול עומסי מבקרים באתר בזמן אמת' },
        { term: 'מעקב נכסים', definition: 'איתור ציוד וכלי רכב יקרי-ערך באתר' },
        { term: 'ניהול משאבים', definition: 'תאורה וחימום חכמים שחוסכים אנרגיה אוטומטית' },
        { term: 'תחבורה חכמה', definition: 'חניה חכמה וניהול תנועה בזמן אמת' }
      ]
    },
    {
      block_type: 'question',
      title: 'הצעת IoT לאתר שלכם',
      question_prompt: 'הציעו פתרון IoT יצירתי אחד לשיפור חוויית המבקר או היעילות התפעולית באתר הפרויקט שלכם.',
      target_field: 'improve_ideas'
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
