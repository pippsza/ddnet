import 'dotenv/config'
import payload from 'payload'
import config from '@payload-config'

import enPrivacy from '../../messages/en/privacy.json'
import ruPrivacy from '../../messages/ru/privacy.json'
import ukPrivacy from '../../messages/uk/privacy.json'
import dePrivacy from '../../messages/de/privacy.json'
import zhPrivacy from '../../messages/zh/privacy.json'
import trPrivacy from '../../messages/tr/privacy.json'

import enRules from '../../messages/en/rules.json'
import ruRules from '../../messages/ru/rules.json'
import ukRules from '../../messages/uk/rules.json'
import deRules from '../../messages/de/rules.json'
import zhRules from '../../messages/zh/rules.json'
import trRules from '../../messages/tr/rules.json'

const locales = ['en', 'ru', 'uk', 'de', 'zh', 'tr'] as const

const privacyMap: Record<string, typeof enPrivacy> = { en: enPrivacy, ru: ruPrivacy, uk: ukPrivacy, de: dePrivacy, zh: zhPrivacy, tr: trPrivacy }
const rulesMap: Record<string, typeof enRules> = { en: enRules, ru: ruRules, uk: ukRules, de: deRules, zh: zhRules, tr: trRules }

const PRIVACY_KEYS = ['dataCollected', 'usage', 'cookies', 'thirdParty', 'retention', 'rights', 'children', 'changes'] as const
const RULES_KEYS = ['accounts', 'fairPlay', 'communication', 'content', 'enforcement', 'community', 'bingo', 'race'] as const

// ─── About Page localized data ───

const teamMembers = {
  pippsza: {
    skinName: 'Kirby_[4]',
    titleColor: '#3b82f6',
    links: [
      { platform: 'discord' as const, value: '@pippsza' },
      { platform: 'telegram' as const, value: '@pippsza' },
      { platform: 'github' as const, value: '@pippsza' },
      { platform: 'ddnet' as const, value: 'https://ddnet.org/players/pippsza' },
    ],
  },
  friezer: {
    skinName: 'icey-nanami',
    skinColorBody: 2169344,
    skinColorFeet: 255,
    titleColor: '#06b6d4',
    links: [{ platform: 'ddnet' as const, value: 'https://ddnet.org/players/Friezer' }],
  },
  goodSanta: {
    skinName: 'chineseRainbownami',
    titleColor: '#22c55e',
    links: [{ platform: 'ddnet' as const, value: 'https://ddnet.org/players/good+santa' }],
  },
}

const i18n: Record<string, {
  desc: string; devTitle: string; contTitle: string;
  pippTitle: string; pippDesc: string;
  friezerTitle: string; friezerDesc: string;
  santaTitle: string; santaDesc: string;
  supportTitle: string; supportDesc: string;
  contactTitle: string; contactDesc: string;
}> = {
  en: {
    desc: 'DDashBoard is a community platform built for DDNet players by a solo developer who just wanted to bring an idea to life. Play bingo, compete in races, track your stats, and connect with the community — all in one place.',
    devTitle: 'Development', contTitle: 'Contributors',
    pippTitle: 'Lead Developer', pippDesc: 'Creator and sole developer of DDashBoard. Came up with the idea and built everything from scratch — backend, frontend, bot system, and infrastructure. Just a guy trying to turn a vision into reality.',
    friezerTitle: 'Client Developer', friezerDesc: 'Laid the foundation for the DDNet client integration and gave it a solid start. Continues to work on the client alongside pippsza.',
    santaTitle: 'Tester', santaDesc: 'Helped hunt down bugs and test features during the early stages of the project. Invaluable feedback that shaped the platform.',
    supportTitle: 'Support the Project', supportDesc: "DDashBoard is completely free and open-source. This is a passion project built by one person — any help is greatly appreciated. Whether it's contributing code, reporting bugs, suggesting features, or just spreading the word — every bit counts!",
    contactTitle: 'Get in Touch', contactDesc: 'Have questions, suggestions, or want to contribute? Reach out to the lead developer through any of these platforms.',
  },
  ru: {
    desc: 'DDashBoard — это платформа для игроков DDNet, созданная одним разработчиком, который просто хотел воплотить идею в реальность. Играй в бинго, участвуй в гонках, следи за статистикой и общайся с сообществом — всё в одном месте.',
    devTitle: 'Разработка', contTitle: 'Участники',
    pippTitle: 'Ведущий разработчик', pippDesc: 'Создатель и единственный разработчик DDashBoard. Придумал идею и построил всё с нуля — бэкенд, фронтенд, систему ботов и инфраструктуру. Просто парень, который пытается воплотить идею в реальность.',
    friezerTitle: 'Разработчик клиента', friezerDesc: 'Заложил основу интеграции с клиентом DDNet и дал ей уверенный старт. Продолжает работать над клиентом вместе с pippsza.',
    santaTitle: 'Тестировщик', santaDesc: 'Помогал находить баги и тестировать функции на ранних этапах проекта. Бесценная обратная связь, которая сформировала платформу.',
    supportTitle: 'Поддержать проект', supportDesc: 'DDashBoard полностью бесплатен и имеет открытый исходный код. Это проект одного человека — любая помощь очень ценится. Будь то написание кода, сообщения о багах, предложения по функциям или просто рассказ друзьям — каждый вклад важен!',
    contactTitle: 'Связаться с нами', contactDesc: 'Есть вопросы, предложения или хотите помочь? Свяжитесь с ведущим разработчиком через любую из этих платформ.',
  },
  uk: {
    desc: 'DDashBoard — це платформа для гравців DDNet, створена одним розробником, який просто хотів втілити ідею в реальність. Грай у бінго, змагайся в перегонах, відстежуй статистику та спілкуйся зі спільнотою — все в одному місці.',
    devTitle: 'Розробка', contTitle: 'Учасники',
    pippTitle: 'Головний розробник', pippDesc: 'Творець та єдиний розробник DDashBoard. Придумав ідею та побудував все з нуля — бекенд, фронтенд, систему ботів та інфраструктуру. Просто хлопець, який намагається втілити ідею в реальність.',
    friezerTitle: 'Розробник клієнта', friezerDesc: 'Заклав основу інтеграції з клієнтом DDNet та дав їй впевнений старт. Продовжує працювати над клієнтом разом з pippsza.',
    santaTitle: 'Тестувальник', santaDesc: "Допомагав шукати баги та тестувати функції на ранніх етапах проєкту. Безцінний зворотний зв'язок, який сформував платформу.",
    supportTitle: 'Підтримати проєкт', supportDesc: 'DDashBoard повністю безкоштовний та з відкритим кодом. Це проєкт однієї людини — будь-яка допомога дуже цінується. Чи то написання коду, повідомлення про баги, пропозиції щодо функцій або просто розповідь друзям — кожен внесок має значення!',
    contactTitle: "Зв'язатися з нами", contactDesc: "Є питання, пропозиції або хочете допомогти? Зв'яжіться з головним розробником через будь-яку з цих платформ.",
  },
  de: {
    desc: 'DDashBoard ist eine Community-Plattform für DDNet-Spieler, gebaut von einem einzelnen Entwickler, der einfach eine Idee zum Leben erwecken wollte. Spiele Bingo, nimm an Rennen teil, verfolge deine Statistiken und verbinde dich mit der Community — alles an einem Ort.',
    devTitle: 'Entwicklung', contTitle: 'Mitwirkende',
    pippTitle: 'Leitender Entwickler', pippDesc: 'Schöpfer und alleiniger Entwickler von DDashBoard. Hat die Idee entwickelt und alles von Grund auf gebaut — Backend, Frontend, Bot-System und Infrastruktur. Einfach jemand, der eine Vision Wirklichkeit werden lassen will.',
    friezerTitle: 'Client-Entwickler', friezerDesc: 'Hat das Fundament für die DDNet-Client-Integration gelegt und ihr einen soliden Start gegeben. Arbeitet weiterhin gemeinsam mit pippsza am Client.',
    santaTitle: 'Tester', santaDesc: 'Hat in den frühen Phasen des Projekts beim Aufspüren von Fehlern und Testen von Funktionen geholfen. Unbezahlbares Feedback, das die Plattform geprägt hat.',
    supportTitle: 'Projekt unterstützen', supportDesc: 'DDashBoard ist völlig kostenlos und Open Source. Dies ist ein Herzensprojekt einer einzelnen Person — jede Hilfe wird sehr geschätzt. Ob Code beitragen, Fehler melden, Funktionen vorschlagen oder einfach weitererzählen — jeder Beitrag zählt!',
    contactTitle: 'Kontakt', contactDesc: 'Fragen, Vorschläge oder möchtest du beitragen? Kontaktiere den leitenden Entwickler über eine dieser Plattformen.',
  },
  zh: {
    desc: 'DDashBoard 是一个由独立开发者为 DDNet 玩家打造的社区平台，只是想把一个想法变成现实。玩宾果、参加竞速、追踪数据、与社区互动——一切尽在一处。',
    devTitle: '开发', contTitle: '贡献者',
    pippTitle: '首席开发者', pippDesc: 'DDashBoard 的创建者和唯一开发者。从零开始构思并打造了一切——后端、前端、机器人系统和基础设施。只是一个想把想法变为现实的人。',
    friezerTitle: '客户端开发者', friezerDesc: '为 DDNet 客户端集成奠定了基础并给了它一个坚实的开端。继续与 pippsza 一起开发客户端。',
    santaTitle: '测试员', santaDesc: '在项目早期阶段帮助寻找漏洞和测试功能。宝贵的反馈塑造了这个平台。',
    supportTitle: '支持项目', supportDesc: 'DDashBoard 完全免费且开源。这是一个人的热情项目——任何帮助都非常感谢。无论是贡献代码、报告问题、建议功能还是帮忙宣传——每一份贡献都很重要！',
    contactTitle: '联系我们', contactDesc: '有问题、建议或想贡献？通过以下任何平台联系首席开发者。',
  },
  tr: {
    desc: 'DDashBoard, sadece bir fikri hayata geçirmek isteyen tek bir geliştirici tarafından DDNet oyuncuları için oluşturulmuş bir topluluk platformudur. Bingo oynayın, yarışlara katılın, istatistiklerinizi takip edin ve toplulukla bağlantı kurun — hepsi tek bir yerde.',
    devTitle: 'Geliştirme', contTitle: 'Katkıda Bulunanlar',
    pippTitle: 'Baş Geliştirici', pippDesc: "DDashBoard'un yaratıcısı ve tek geliştiricisi. Fikri buldu ve her şeyi sıfırdan inşa etti — backend, frontend, bot sistemi ve altyapı. Sadece bir vizyonu gerçeğe dönüştürmeye çalışan biri.",
    friezerTitle: 'İstemci Geliştiricisi', friezerDesc: 'DDNet istemci entegrasyonunun temelini attı ve ona sağlam bir başlangıç verdi. pippsza ile birlikte istemci üzerinde çalışmaya devam ediyor.',
    santaTitle: 'Test Uzmanı', santaDesc: 'Projenin erken aşamalarında hata bulma ve özellikleri test etmeye yardımcı oldu. Platformu şekillendiren paha biçilmez geri bildirim.',
    supportTitle: 'Projeyi Destekle', supportDesc: "DDashBoard tamamen ücretsiz ve açık kaynaklıdır. Bu, bir kişi tarafından yapılmış tutkulu bir projedir — her türlü yardım büyük takdirle karşılanır. Kod yazma, hata bildirme, özellik önerme veya sadece başkalarına anlatma — her katkı değerlidir!",
    contactTitle: 'İletişim', contactDesc: 'Sorularınız, önerileriniz mi var veya katkıda bulunmak mı istiyorsunuz? Baş geliştiriciyle bu platformlardan herhangi biri aracılığıyla iletişime geçin.',
  },
}

const termsLastUpdated: Record<string, string> = {
  en: 'Last updated: March 2026', ru: 'Последнее обновление: Март 2026',
  uk: 'Останнє оновлення: березень 2026', de: 'Zuletzt aktualisiert: März 2026',
  zh: '最后更新：2026年3月', tr: 'Son güncelleme: Mart 2026',
}

const termsSections: Record<string, { title: string; content: string }[]> = {
  en: [
    { title: '1. Acceptance of Terms', content: 'By accessing and using DDashBoard, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.\n\nDDashBoard is a free community platform for DDraceNetwork players. These terms govern your use of the website and all associated services.' },
    { title: '2. User Accounts', content: 'You may create an account to access platform features. You are responsible for maintaining the security of your account and all activity under it.\n\nYou must provide accurate information during registration. One person may only have one account. Sharing accounts is not permitted.' },
    { title: '3. User Conduct', content: 'You agree not to:\n• Use the platform for any illegal purpose\n• Harass, threaten, or abuse other users\n• Attempt to exploit bugs or vulnerabilities\n• Use automated tools to access the platform without permission\n• Impersonate other users or DDNet staff\n• Manipulate game statistics or cheat in any way' },
    { title: '4. User Content', content: 'You retain ownership of content you create (forum posts, articles, etc.). By posting content, you grant DDashBoard a non-exclusive license to display and distribute it on the platform.\n\nWe reserve the right to remove content that violates these terms or our community rules.' },
    { title: '5. Third-Party Services', content: 'DDashBoard integrates with DDraceNetwork services (ddnet.org) for player data, statistics, and skin rendering. We are not affiliated with or endorsed by the DDNet team.\n\nPlayer statistics and skin data are fetched from public DDNet APIs. We do not control the availability or accuracy of this data.' },
    { title: '6. Termination', content: 'We may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through the settings page.\n\nUpon termination, your right to use the platform ceases immediately.' },
    { title: '7. Disclaimers', content: 'DDashBoard is provided "as is" without warranties of any kind. We do not guarantee uptime, data accuracy, or uninterrupted service.\n\nThis is a free community project. We are not liable for any damages arising from your use of the platform.' },
    { title: '8. Changes to Terms', content: "We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms.\n\nSignificant changes will be announced through the platform's notification system." },
  ],
  ru: [
    { title: '1. Принятие условий', content: 'Используя DDashBoard, вы соглашаетесь с настоящими Условиями использования. Если вы не согласны, пожалуйста, не используйте платформу.\n\nDDashBoard — это бесплатная платформа для игроков DDraceNetwork. Настоящие условия регулируют использование сайта и всех связанных сервисов.' },
    { title: '2. Учётные записи', content: 'Вы можете создать учётную запись для доступа к функциям платформы. Вы несёте ответственность за безопасность своей учётной записи и за все действия, совершённые под ней.\n\nПри регистрации необходимо указывать достоверную информацию. Каждый пользователь может иметь только одну учётную запись. Передача учётных записей другим лицам запрещена.' },
    { title: '3. Поведение пользователей', content: 'Вы обязуетесь не:\n• Использовать платформу в незаконных целях\n• Преследовать, угрожать или оскорблять других пользователей\n• Пытаться эксплуатировать ошибки или уязвимости\n• Использовать автоматизированные инструменты для доступа к платформе без разрешения\n• Выдавать себя за других пользователей или сотрудников DDNet\n• Манипулировать игровой статистикой или использовать читы' },
    { title: '4. Пользовательский контент', content: 'Вы сохраняете права собственности на создаваемый вами контент (посты на форуме, статьи и т.д.). Публикуя контент, вы предоставляете DDashBoard неисключительную лицензию на его отображение и распространение на платформе.\n\nМы оставляем за собой право удалять контент, нарушающий настоящие условия или правила сообщества.' },
    { title: '5. Сторонние сервисы', content: 'DDashBoard интегрируется с сервисами DDraceNetwork (ddnet.org) для получения данных об игроках, статистики и отрисовки скинов. Мы не являемся аффилированными лицами и не одобрены командой DDNet.\n\nСтатистика игроков и данные скинов получаются из публичных API DDNet. Мы не контролируем доступность и точность этих данных.' },
    { title: '6. Прекращение доступа', content: 'Мы можем приостановить или удалить вашу учётную запись в любое время за нарушение настоящих условий. Вы можете удалить свою учётную запись в любое время через страницу настроек.\n\nПосле прекращения доступа ваше право на использование платформы немедленно аннулируется.' },
    { title: '7. Отказ от ответственности', content: 'DDashBoard предоставляется «как есть» без каких-либо гарантий. Мы не гарантируем бесперебойную работу, точность данных или непрерывность сервиса.\n\nЭто бесплатный общественный проект. Мы не несём ответственности за любой ущерб, возникший в результате использования платформы.' },
    { title: '8. Изменение условий', content: 'Мы можем обновлять настоящие условия время от времени. Продолжение использования платформы после внесения изменений означает принятие новых условий.\n\nО существенных изменениях будет сообщено через систему уведомлений платформы.' },
  ],
  uk: [
    { title: '1. Прийняття умов', content: "Використовуючи DDashBoard, ви погоджуєтесь з цими Умовами використання. Якщо ви не згодні — будь ласка, не користуйтесь платформою.\n\nDDashBoard — це безкоштовна платформа спільноти для гравців DDraceNetwork. Ці умови регулюють використання вебсайту та всіх пов'язаних сервісів." },
    { title: '2. Облікові записи', content: 'Ви можете створити обліковий запис для доступу до функцій платформи. Ви несете відповідальність за безпеку свого облікового запису та всю активність під ним.\n\nПід час реєстрації необхідно вказувати достовірну інформацію. Одна особа може мати лише один обліковий запис. Передача облікових записів іншим особам заборонена.' },
    { title: '3. Поведінка користувачів', content: "Ви зобов'язуєтесь не:\n• Використовувати платформу з незаконною метою\n• Переслідувати, погрожувати або ображати інших користувачів\n• Намагатися використовувати помилки чи вразливості\n• Використовувати автоматизовані інструменти для доступу до платформи без дозволу\n• Видавати себе за інших користувачів або персонал DDNet\n• Маніпулювати ігровою статистикою або використовувати чити" },
    { title: '4. Контент користувачів', content: 'Ви залишаєте за собою право власності на створений вами контент (пости на форумі, статті тощо). Публікуючи контент, ви надаєте DDashBoard невиключну ліцензію на його відображення та розповсюдження на платформі.\n\nМи залишаємо за собою право видаляти контент, що порушує ці умови або правила спільноти.' },
    { title: '5. Сторонні сервіси', content: 'DDashBoard інтегрується з сервісами DDraceNetwork (ddnet.org) для отримання даних гравців, статистики та відображення скінів. Ми не є афілійованими з командою DDNet та не маємо їхнього офіційного схвалення.\n\nСтатистика гравців та дані скінів отримуються з публічних API DDNet. Ми не контролюємо доступність та точність цих даних.' },
    { title: '6. Припинення дії', content: 'Ми можемо призупинити або видалити ваш обліковий запис у будь-який час за порушення цих умов. Ви можете видалити свій обліковий запис у будь-який час через сторінку налаштувань.\n\nПісля припинення дії ваше право на використання платформи втрачається негайно.' },
    { title: '7. Відмова від відповідальності', content: "DDashBoard надається «як є», без будь-яких гарантій. Ми не гарантуємо безперебійну роботу, точність даних або постійну доступність сервісу.\n\nЦе безкоштовний проєкт спільноти. Ми не несемо відповідальності за будь-які збитки, пов'язані з використанням платформи." },
    { title: '8. Зміни умов', content: 'Ми можемо час від часу оновлювати ці умови. Продовження використання платформи після внесення змін означає прийняття нових умов.\n\nПро суттєві зміни буде повідомлено через систему сповіщень платформи.' },
  ],
  de: [
    { title: '1. Annahme der Bedingungen', content: 'Durch den Zugriff auf und die Nutzung von DDashBoard erklären Sie sich mit diesen Nutzungsbedingungen einverstanden. Wenn Sie nicht einverstanden sind, nutzen Sie die Plattform bitte nicht.\n\nDDashBoard ist eine kostenlose Community-Plattform für DDraceNetwork-Spieler. Diese Bedingungen regeln Ihre Nutzung der Website und aller damit verbundenen Dienste.' },
    { title: '2. Benutzerkonten', content: 'Sie können ein Konto erstellen, um auf die Funktionen der Plattform zuzugreifen. Sie sind für die Sicherheit Ihres Kontos und alle darunter stattfindenden Aktivitäten verantwortlich.\n\nBei der Registrierung müssen Sie korrekte Angaben machen. Pro Person ist nur ein Konto erlaubt. Das Teilen von Konten ist nicht gestattet.' },
    { title: '3. Nutzerverhalten', content: 'Sie verpflichten sich, Folgendes zu unterlassen:\n• Die Plattform für illegale Zwecke zu nutzen\n• Andere Nutzer zu belästigen, zu bedrohen oder zu misshandeln\n• Fehler oder Sicherheitslücken auszunutzen\n• Automatisierte Tools ohne Genehmigung für den Zugriff auf die Plattform zu verwenden\n• Andere Nutzer oder DDNet-Mitarbeiter zu imitieren\n• Spielstatistiken zu manipulieren oder auf irgendeine Weise zu betrügen' },
    { title: '4. Nutzerinhalte', content: 'Sie behalten das Eigentum an von Ihnen erstellten Inhalten (Forenbeiträge, Artikel usw.). Mit dem Veröffentlichen von Inhalten gewähren Sie DDashBoard eine nicht-exklusive Lizenz zur Anzeige und Verbreitung dieser Inhalte auf der Plattform.\n\nWir behalten uns das Recht vor, Inhalte zu entfernen, die gegen diese Bedingungen oder unsere Community-Regeln verstoßen.' },
    { title: '5. Drittanbieterdienste', content: 'DDashBoard ist mit DDraceNetwork-Diensten (ddnet.org) für Spielerdaten, Statistiken und Skin-Darstellung integriert. Wir sind weder mit dem DDNet-Team verbunden noch von diesem unterstützt.\n\nSpielerstatistiken und Skin-Daten werden von öffentlichen DDNet-APIs abgerufen. Wir haben keinen Einfluss auf die Verfügbarkeit oder Genauigkeit dieser Daten.' },
    { title: '6. Kündigung', content: 'Wir können Ihr Konto jederzeit bei Verstoß gegen diese Bedingungen sperren oder löschen. Sie können Ihr Konto jederzeit über die Einstellungsseite löschen.\n\nMit der Kündigung erlischt Ihr Recht zur Nutzung der Plattform sofort.' },
    { title: '7. Haftungsausschluss', content: 'DDashBoard wird ohne jegliche Gewährleistung zur Verfügung gestellt. Wir garantieren weder Verfügbarkeit, Datengenauigkeit noch unterbrechungsfreien Betrieb.\n\nDies ist ein kostenloses Community-Projekt. Wir haften nicht für Schäden, die aus Ihrer Nutzung der Plattform entstehen.' },
    { title: '8. Änderungen der Bedingungen', content: 'Wir können diese Bedingungen von Zeit zu Zeit aktualisieren. Die fortgesetzte Nutzung der Plattform nach Änderungen gilt als Annahme der neuen Bedingungen.\n\nWesentliche Änderungen werden über das Benachrichtigungssystem der Plattform bekannt gegeben.' },
  ],
  zh: [
    { title: '1. 条款接受', content: '访问和使用 DDashBoard 即表示您同意受这些服务条款的约束。如果您不同意，请勿使用本平台。\n\nDDashBoard 是一个面向 DDraceNetwork 玩家的免费社区平台。这些条款管辖您对网站及所有相关服务的使用。' },
    { title: '2. 用户账户', content: '您可以创建账户以使用平台功能。您有责任维护账户安全，并对账户下的所有活动负责。\n\n注册时请提供准确信息。每人只能拥有一个账户，不允许共享账户。' },
    { title: '3. 用户行为', content: '您同意不会：\n• 将平台用于任何非法目的\n• 骚扰、威胁或辱骂其他用户\n• 试图利用漏洞或系统缺陷\n• 未经许可使用自动化工具访问平台\n• 冒充其他用户或 DDNet 工作人员\n• 以任何方式操纵游戏数据或作弊' },
    { title: '4. 用户内容', content: '您保留所创建内容（论坛帖子、文章等）的所有权。发布内容即表示您授予 DDashBoard 在平台上展示和分发该内容的非独占许可。\n\n我们保留删除违反这些条款或社区规则的内容的权利。' },
    { title: '5. 第三方服务', content: 'DDashBoard 集成了 DDraceNetwork 服务（ddnet.org）以获取玩家数据、统计信息和皮肤渲染。我们与 DDNet 团队没有附属或背书关系。\n\n玩家统计和皮肤数据从公开的 DDNet API 获取。我们无法控制这些数据的可用性或准确性。' },
    { title: '6. 账户终止', content: '如果您违反这些条款，我们可能随时暂停或终止您的账户。您可以随时通过设置页面删除您的账户。\n\n账户终止后，您使用平台的权利立即终止。' },
    { title: '7. 免责声明', content: 'DDashBoard 按「原样」提供，不提供任何形式的保证。我们不保证正常运行时间、数据准确性或不间断服务。\n\n这是一个免费的社区项目。对于因使用本平台而产生的任何损失，我们不承担责任。' },
    { title: '8. 条款变更', content: '我们可能会不时更新这些条款。变更后继续使用平台即表示接受新条款。\n\n重大变更将通过平台的通知系统公布。' },
  ],
  tr: [
    { title: '1. Koşulların Kabulü', content: "DDashBoard'a erişerek ve kullanarak bu Kullanım Koşullarına bağlı kalmayı kabul etmiş olursunuz. Kabul etmiyorsanız lütfen platformu kullanmayın.\n\nDDashBoard, DDraceNetwork oyuncuları için ücretsiz bir topluluk platformudur. Bu koşullar, web sitesi ve ilgili tüm hizmetlerin kullanımını düzenler." },
    { title: '2. Kullanıcı Hesapları', content: 'Platform özelliklerine erişmek için hesap oluşturabilirsiniz. Hesabınızın güvenliğinden ve hesabınız altındaki tüm etkinliklerden siz sorumlusunuz.\n\nKayıt sırasında doğru bilgi vermelisiniz. Her kişi yalnızca bir hesap sahibi olabilir. Hesap paylaşımına izin verilmez.' },
    { title: '3. Kullanıcı Davranışı', content: 'Aşağıdakileri yapmamayı kabul ediyorsunuz:\n• Platformu herhangi bir yasadışı amaçla kullanmak\n• Diğer kullanıcılara taciz, tehdit veya kötü muamelede bulunmak\n• Hataları veya güvenlik açıklarını istismar etmeye çalışmak\n• İzinsiz otomatik araçlarla platforma erişmek\n• Diğer kullanıcıları veya DDNet ekibini taklit etmek\n• Oyun istatistiklerini manipüle etmek veya herhangi bir şekilde hile yapmak' },
    { title: '4. Kullanıcı İçeriği', content: "Oluşturduğunuz içeriklerin (forum gönderileri, makaleler vb.) mülkiyeti size aittir. İçerik yayınlayarak DDashBoard'a platformda gösterme ve dağıtma konusunda münhasır olmayan bir lisans vermiş olursunuz.\n\nBu koşulları veya topluluk kurallarımızı ihlal eden içerikleri kaldırma hakkımız saklıdır." },
    { title: '5. Üçüncü Taraf Hizmetler', content: "DDashBoard, oyuncu verileri, istatistikler ve görünüm oluşturma için DDraceNetwork hizmetleriyle (ddnet.org) entegre çalışır. DDNet ekibi tarafından desteklenmemekte veya onaylanmamaktayız.\n\nOyuncu istatistikleri ve görünüm verileri herkese açık DDNet API'lerinden alınmaktadır. Bu verilerin erişilebilirliğini veya doğruluğunu kontrol etmemiz mümkün değildir." },
    { title: '6. Hesap Sonlandırma', content: 'Bu koşulların ihlali durumunda hesabınızı herhangi bir zamanda askıya alabilir veya sonlandırabiliriz. Hesabınızı istediğiniz zaman ayarlar sayfasından silebilirsiniz.\n\nSonlandırma durumunda platformu kullanma hakkınız derhal sona erer.' },
    { title: '7. Sorumluluk Reddi', content: 'DDashBoard herhangi bir garanti olmaksızın "olduğu gibi" sunulmaktadır. Kesintisiz hizmet, veri doğruluğu veya sürekli erişim garantisi vermiyoruz.\n\nBu ücretsiz bir topluluk projesidir. Platformu kullanımınızdan doğabilecek herhangi bir zarardan sorumlu değiliz.' },
    { title: '8. Koşul Değişiklikleri', content: 'Bu koşulları zaman zaman güncelleyebiliriz. Değişikliklerden sonra platformu kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.\n\nÖnemli değişiklikler platformun bildirim sistemi aracılığıyla duyurulacaktır.' },
  ],
}

function buildTeamSections(locale: string) {
  const t = i18n[locale]
  return [
    {
      sectionTitle: t.devTitle,
      preset: 'hero' as const,
      members: [{
        name: 'pippsza', ...teamMembers.pippsza,
        title: t.pippTitle, description: t.pippDesc,
      }],
    },
    {
      sectionTitle: t.contTitle,
      preset: 'spotlight' as const,
      members: [
        { name: 'Friezer', ...teamMembers.friezer, title: t.friezerTitle, description: t.friezerDesc },
        { name: 'good santa', ...teamMembers.goodSanta, title: t.santaTitle, description: t.santaDesc },
      ],
    },
  ]
}

async function seed() {
  await payload.init({ config })
  console.log('Seeding all globals with localized data...\n')

  for (const locale of locales) {
    const t = i18n[locale]
    console.log(`  [about-page] ${locale}`)
    await payload.updateGlobal({
      slug: 'about-page', locale,
      data: {
        projectDescription: t.desc,
        teamSections: buildTeamSections(locale),
        ...(locale === 'en' ? {
          specialThanks: [
            { name: 'Generale43', skinName: 'bluekitty', skinColorBody: 4915200, skinColorFeet: 5832448 },
            { name: 'BagleR', skinName: 'aperbop', skinColorBody: 14134117, skinColorFeet: 14325048 },
          ],
        } : {}),
        supportSection: { enabled: true, title: t.supportTitle, description: t.supportDesc },
        contact: {
          enabled: true, title: t.contactTitle, description: t.contactDesc,
          links: [
            { platform: 'discord', value: '@pippsza' },
            { platform: 'telegram', value: '@pippsza' },
            { platform: 'github', value: '@pippsza' },
          ],
        },
      },
    })
  }
  console.log('  Done!\n')

  for (const locale of locales) {
    console.log(`  [terms-page] ${locale}`)
    await payload.updateGlobal({
      slug: 'terms-page', locale,
      data: { lastUpdated: termsLastUpdated[locale], sections: termsSections[locale] },
    })
  }
  console.log('  Done!\n')

  for (const locale of locales) {
    console.log(`  [privacy-page] ${locale}`)
    const p = privacyMap[locale]
    await payload.updateGlobal({
      slug: 'privacy-page', locale,
      data: {
        lastUpdated: p.lastUpdated,
        sections: PRIVACY_KEYS.map((key) => ({ title: p.sections[key].title, content: p.sections[key].content })),
      },
    })
  }
  console.log('  Done!\n')

  for (const locale of locales) {
    console.log(`  [rules-page] ${locale}`)
    const r = rulesMap[locale]
    await payload.updateGlobal({
      slug: 'rules-page', locale,
      data: {
        sections: RULES_KEYS.map((key) => ({ title: r.sections[key].title, content: r.sections[key].content })),
      },
    })
  }
  console.log('  Done!\n')

  console.log('All globals seeded successfully!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
