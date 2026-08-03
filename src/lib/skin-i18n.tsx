import { useEffect, useState } from "react";
import { getSkinLang, type SkinLang } from "@/components/SkinLanguageSwitcher";

type Dict = Record<string, string>;

const en: Dict = {
  // Header / page
  backToSite: "Duo Forge Games",
  title1: "Unboxed",
  title2: "Skin Creator",
  intro:
    "Pick a weapon, paint your pixel art skin on the template and submit it to the team. Approved community skins can make it into the game, but approval is no guarantee that a skin will be added to Unboxed.",
  loading: "Loading",
  loadingGallery: "Loading gallery",

  // Stepper
  stepCategory: "Category",
  stepWeapon: "Weapon",
  stepDesign: "Design",
  stepSubmit: "Submit",

  // Categories / weapons
  noCategories: "No weapon categories yet, check back soon.",
  noWeapons: "No weapons in this category yet.",
  weaponCountOne: "weapon",
  weaponCountMany: "weapons",
  couldNotLoadWeapons: "Could not load weapons",

  // Submit step
  preview: "Preview",
  paintedPixels: "painted pixels",
  keepEditing: "Keep editing",
  yourDetails: "Your details",
  skinNameLabel: "Skin name *",
  skinNamePlaceholder: "Give your skin a name",
  yourNameLabel: "Your Name",
  emailLabel: "Email (optional)",
  submitSkin: "Submit skin",
  submitting: "Submitting",
  submitConsent:
    "By submitting you allow Duo Forge Games to use your artwork in Unboxed. We may contact you about your submission.",
  skinNameRequired: "Skin name is required",
  completeCaptcha: "Please complete the verification checkbox",
  submissionFailed: "Submission failed",
  previewUploadFailed: "Preview upload failed",
  savingAnyway: "Saving skin data anyway.",

  // Done
  doneTitle: "Skin submitted!",
  doneBody:
    "Thanks for forging with us. Our team will review your skin. Keep an eye on our Discord for updates.",
  createAnother: "Create another skin",
  backToSiteBtn: "Back to site",

  // Account bar
  signedInAs: "Signed in as",
  mySkins: "My skins",
  signOut: "Sign out",
  guestLine1: "You are creating",
  guestAsGuest: "as a guest",
  guestLine2: ", no account needed. Create one to track the status of your submissions.",
  signIn: "Sign in",
  createAccount: "Create account",
  forgotPassword: "Forgot password?",
  resetDescription:
    "Enter your username or email. If an email is on file, we will send you a reset link.",
  resetSentShort: "Check your inbox for the reset link.",
  signInDescription:
    "No email required, just a username and password so you can follow your submissions.",
  resetSentLong:
    "If an account with this email exists, we just sent you a link to reset your password. The link is valid for one hour. Check your inbox, and also check your spam folder if you do not see it.",
  backToSignIn: "Back to sign in",
  usernameOrEmail: "Username or email",
  sendResetLink: "Send reset link",
  username: "Username",
  password: "Password",
  confirmPassword: "Confirm password",
  emailOptionalReset: "Email (optional, for password reset)",
  noEmailWarning: "Without an email, your password cannot be reset if lost.",
  haveAccount: "Already have an account? Sign in",
  noAccountYet: "No account yet? Create one",
  passwordsNoMatch: "Passwords do not match",
  somethingWrong: "Something went wrong",
  accountCreated: "Account created, welcome",
  welcomeBack: "Welcome back",

  // Editor
  backToWeapons: "Back to weapons",
  doneSubmit: "Done / Submit",
  toolBrush: "Brush (1px)",
  toolEraser: "Eraser",
  toolFill: "Fill",
  toolPicker: "Pick colour",
  toolPan: "Pan",
  undo: "Undo",
  redo: "Redo",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  toggleTemplate: "Toggle template",
  template: "Template",
  clearCanvas: "Clear canvas",
  clearCanvasTitle: "Delete this progress?",
  clearCanvasBody: "Are you sure you want to delete this progress? This action cannot be undone.",
  palette: "Palette",
  colour: "Colour",
  brushOpacity: "Brush opacity",
  brightness: "Brightness",
  helpMasked:
    "You can only paint inside the weapon shape. The darkened area is ignored. Fill floods matching pixels and stops at the weapon's edges.",
  helpPlain: "Brush paints single pixels. Fill floods matching pixels.",
  helpTail:
    "Pipette picks a colour from your layer. Your export contains only your painted pixels, the background stays transparent. Touch/stylus painting is supported. Use the Pan tool to move the canvas.",

  // Gallery
  galleryTitle1: "Community",
  galleryTitle2: "Gallery",
  galleryIntro:
    "Skins created by the community and approved by our team. Sign in with your Skin Creator account to upvote, one vote per skin, click again to take it back.",
  sortNewest: "Newest",
  sortTop: "Most upvoted",
  noApprovedSkins: "No approved skins yet, yours could be the first.",
  loadMore: "Load more",
  inGame: "In Game",
  noPreview: "No preview",
  untitledSkin: "Untitled skin",
  unknownWeapon: "Unknown weapon",
  by: "by",
  anonymous: "Anonymous",
  signInToUpvote: "Please sign in to upvote skins",
  signInToUpvoteShort: "Sign in to upvote",
  upvoteThis: "Upvote this skin",
  removeUpvote: "Remove your upvote",
  couldNotLoadGallery: "Could not load the community gallery",
  couldNotLoadMore: "Could not load more skins",
  couldNotSaveVote: "Could not save your vote",

  // My skins
  mySkinsTitle1: "My",
  mySkinsTitle2: "Skins",
  skinCreator: "Skin Creator",
  signInToSeeSubmissions: "Sign in on the Skin Creator page to see your submissions.",
  goToSkinCreator: "Go to Skin Creator",
  noSubmissionsYet: "You haven't submitted any skins yet.",
  createFirstSkin: "Create your first skin",
  statusPending: "Pending",
  statusApproved: "Approved",
  statusRejected: "Rejected",
  statusInGame: "In Game",

  // Drafts
  cancel: "Cancel",
  saveDraft: "Save draft",
  updateDraft: "Update draft",
  draftSaved: "Draft saved",
  draftSaveFailed: "Could not save the draft",
  draftNameLabel: "Draft name",
  draftNamePlaceholder: "For example Flame AK",
  draftHelp: "Save your current paint job and continue later from My Skins.",
  tabSubmissions: "Submissions",
  tabDrafts: "My drafts",
  noDraftsYet: "You have not saved any drafts yet.",
  untitledDraft: "Untitled draft",
  continueEditing: "Continue editing",
  deleteDraftTitle: "Delete this draft?",
  deleteDraftBody: "The draft will be deleted permanently and cannot be restored.",
  deleteDraftConfirm: "Delete",
  draftDeleted: "Draft deleted",
  draftDeleteFailed: "Could not delete the draft",


  // Reset password page
  newPassword1: "New",
  newPassword2: "password",
  linkInvalid: "Link invalid or expired.",
  passwordChanged:
    "Your password has been changed. You can now sign in to the Skin Creator with the new password.",
  newPasswordLabel: "New password",
  savePassword: "Save password",
  resetLinkNote: "The reset link is valid for 1 hour and can only be used once.",
  passwordTooShort: "Password must be at least 8 characters",

  // How it works
  howItWorks: "How it works",
  hiwTitle: "How the Skin Creator works",
  hiwDescription: "A short guide from your first pixel to the Community Gallery.",
  hiwStep1Title: "1. Pick a category",
  hiwStep1Body: "Start by choosing a weapon category, for example Assault Rifles or Knifes.",
  hiwStep2Title: "2. Choose a weapon",
  hiwStep2Body:
    "Every weapon has its own canvas size and template. The template shape is what you will paint on.",
  hiwStep3Title: "3. Design your skin",
  hiwStep3Body:
    "Use the brush, eraser, bucket fill and color picker to paint. You can only paint inside the weapon shape, the bucket fill stops at the template's color regions. Adjust brush size and opacity, and use undo if something goes wrong. You can download your artwork as a transparent PNG at any time.",
  hiwStep4Title: "4. Submit",
  hiwStep4Body:
    "Give your skin a name, add your in-game or artist name so we can credit you. An email is optional. Then send it to the team.",
  hiwStep5Title: "5. Review",
  hiwStep5Body:
    "Our team reviews every submission. If you created an account, you can follow the status of your skins under My Skins. Approved skins appear in the Community Gallery at the bottom of this page.",
  hiwGoodToKnow: "Good to know",
  hiwGoodToKnowBody:
    "An approved skin does not automatically make it into the game. Approval means your submission passed our review and can be shown in the Community Gallery. Which skins are actually added to Unboxed depends on the game's art direction, balance and technical requirements, so only a part of the approved skins will end up in the game.",
  hiwAccountTitle: "Account or guest",
  hiwAccountBody:
    "You can submit as a guest without signing up. With a free account (username and password, email optional) you can track your submissions and their status.",
};

const de: Dict = {
  backToSite: "Duo Forge Games",
  title1: "Unboxed",
  title2: "Skin Creator",
  intro:
    "Wähle eine Waffe, male deinen Pixel-Art-Skin auf die Vorlage und schicke ihn dem Team. Freigegebene Community-Skins können es ins Spiel schaffen, eine Freigabe ist aber keine Garantie dafür, dass ein Skin in Unboxed aufgenommen wird.",
  loading: "Lädt",
  loadingGallery: "Galerie lädt",

  stepCategory: "Kategorie",
  stepWeapon: "Waffe",
  stepDesign: "Design",
  stepSubmit: "Absenden",

  noCategories: "Noch keine Waffenkategorien, schau bald wieder vorbei.",
  noWeapons: "In dieser Kategorie gibt es noch keine Waffen.",
  weaponCountOne: "Waffe",
  weaponCountMany: "Waffen",
  couldNotLoadWeapons: "Waffen konnten nicht geladen werden",

  preview: "Vorschau",
  paintedPixels: "gemalte Pixel",
  keepEditing: "Weiter bearbeiten",
  yourDetails: "Deine Angaben",
  skinNameLabel: "Skin-Name *",
  skinNamePlaceholder: "Gib deinem Skin einen Namen",
  yourNameLabel: "Dein Name",
  emailLabel: "E-Mail (optional)",
  submitSkin: "Skin absenden",
  submitting: "Wird gesendet",
  submitConsent:
    "Mit dem Absenden erlaubst du Duo Forge Games, dein Artwork in Unboxed zu verwenden. Wir melden uns eventuell zu deiner Einsendung.",
  skinNameRequired: "Skin-Name ist erforderlich",
  completeCaptcha: "Bitte bestätige die Verifizierung",
  submissionFailed: "Absenden fehlgeschlagen",
  previewUploadFailed: "Vorschau-Upload fehlgeschlagen",
  savingAnyway: "Die Skin-Daten werden trotzdem gespeichert.",

  doneTitle: "Skin abgeschickt!",
  doneBody:
    "Danke, dass du mit uns schmiedest. Unser Team prüft deinen Skin. Halte unseren Discord im Auge für Updates.",
  createAnother: "Noch einen Skin erstellen",
  backToSiteBtn: "Zurück zur Seite",

  signedInAs: "Angemeldet als",
  mySkins: "Meine Skins",
  signOut: "Abmelden",
  guestLine1: "Du erstellst gerade",
  guestAsGuest: "als Gast",
  guestLine2:
    ", kein Konto nötig. Erstelle eines, um den Status deiner Einsendungen zu verfolgen.",
  signIn: "Anmelden",
  createAccount: "Konto erstellen",
  forgotPassword: "Passwort vergessen?",
  resetDescription:
    "Gib deinen Benutzernamen oder deine E-Mail ein. Wenn eine E-Mail hinterlegt ist, senden wir dir einen Link zum Zurücksetzen.",
  resetSentShort: "Prüfe dein Postfach auf den Link zum Zurücksetzen.",
  signInDescription:
    "Keine E-Mail nötig, nur Benutzername und Passwort, damit du deine Einsendungen verfolgen kannst.",
  resetSentLong:
    "Falls ein Konto mit dieser E-Mail existiert, haben wir dir gerade einen Link zum Zurücksetzen deines Passworts geschickt. Der Link ist eine Stunde gültig. Prüfe dein Postfach und auch deinen Spam-Ordner, falls du nichts siehst.",
  backToSignIn: "Zurück zur Anmeldung",
  usernameOrEmail: "Benutzername oder E-Mail",
  sendResetLink: "Link senden",
  username: "Benutzername",
  password: "Passwort",
  confirmPassword: "Passwort bestätigen",
  emailOptionalReset: "E-Mail (optional, zum Zurücksetzen des Passworts)",
  noEmailWarning:
    "Ohne E-Mail kann dein Passwort nicht zurückgesetzt werden, wenn du es vergisst.",
  haveAccount: "Schon ein Konto? Anmelden",
  noAccountYet: "Noch kein Konto? Jetzt erstellen",
  passwordsNoMatch: "Passwörter stimmen nicht überein",
  somethingWrong: "Etwas ist schiefgelaufen",
  accountCreated: "Konto erstellt, willkommen",
  welcomeBack: "Willkommen zurück",

  backToWeapons: "Zurück zu den Waffen",
  doneSubmit: "Fertig / Absenden",
  toolBrush: "Pinsel (1px)",
  toolEraser: "Radierer",
  toolFill: "Füllen",
  toolPicker: "Farbe aufnehmen",
  toolPan: "Verschieben",
  undo: "Rückgängig",
  redo: "Wiederholen",
  zoomIn: "Vergrößern",
  zoomOut: "Verkleinern",
  toggleTemplate: "Vorlage ein-/ausblenden",
  template: "Vorlage",
  clearCanvas: "Leinwand leeren",
  clearCanvasTitle: "Diesen Fortschritt löschen?",
  clearCanvasBody: "Bist du sicher, dass du diesen Fortschritt löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.",
  palette: "Palette",
  colour: "Farbe",
  brushOpacity: "Deckkraft",
  brightness: "Helligkeit",
  helpMasked:
    "Du kannst nur innerhalb der Waffenform malen. Der abgedunkelte Bereich wird ignoriert. Das Füllwerkzeug füllt passende Pixel und stoppt an den Kanten der Waffe.",
  helpPlain: "Der Pinsel malt einzelne Pixel. Das Füllwerkzeug füllt passende Pixel.",
  helpTail:
    "Die Pipette nimmt eine Farbe aus deiner Ebene auf. Dein Export enthält nur deine gemalten Pixel, der Hintergrund bleibt transparent. Malen mit Touch oder Stift wird unterstützt. Mit dem Verschieben-Werkzeug bewegst du die Leinwand.",

  galleryTitle1: "Community",
  galleryTitle2: "Galerie",
  galleryIntro:
    "Skins aus der Community, die von unserem Team freigegeben wurden. Melde dich mit deinem Skin-Creator-Konto an, um zu voten, eine Stimme pro Skin, noch einmal klicken nimmt sie zurück.",
  sortNewest: "Neueste",
  sortTop: "Meiste Votes",
  noApprovedSkins: "Noch keine freigegebenen Skins, deiner könnte der erste sein.",
  loadMore: "Mehr laden",
  inGame: "Im Spiel",
  noPreview: "Keine Vorschau",
  untitledSkin: "Skin ohne Namen",
  unknownWeapon: "Unbekannte Waffe",
  by: "von",
  anonymous: "Anonym",
  signInToUpvote: "Bitte melde dich an, um Skins zu voten",
  signInToUpvoteShort: "Zum Voten anmelden",
  upvoteThis: "Diesen Skin voten",
  removeUpvote: "Vote zurücknehmen",
  couldNotLoadGallery: "Die Community-Galerie konnte nicht geladen werden",
  couldNotLoadMore: "Weitere Skins konnten nicht geladen werden",
  couldNotSaveVote: "Dein Vote konnte nicht gespeichert werden",

  mySkinsTitle1: "Meine",
  mySkinsTitle2: "Skins",
  skinCreator: "Skin Creator",
  signInToSeeSubmissions:
    "Melde dich auf der Skin-Creator-Seite an, um deine Einsendungen zu sehen.",
  goToSkinCreator: "Zum Skin Creator",
  noSubmissionsYet: "Du hast noch keine Skins eingesendet.",
  createFirstSkin: "Erstelle deinen ersten Skin",
  statusPending: "In Prüfung",
  statusApproved: "Freigegeben",
  statusRejected: "Abgelehnt",
  statusInGame: "Im Spiel",

  // Drafts
  cancel: "Abbrechen",
  saveDraft: "Entwurf speichern",
  updateDraft: "Entwurf aktualisieren",
  draftSaved: "Entwurf gespeichert",
  draftSaveFailed: "Entwurf konnte nicht gespeichert werden",
  draftNameLabel: "Name des Entwurfs",
  draftNamePlaceholder: "z. B. Flammen AK",
  draftHelp: "Speichere deinen aktuellen Paint-Job und mach unter Meine Skins später weiter.",
  tabSubmissions: "Einsendungen",
  tabDrafts: "Meine Entwürfe",
  noDraftsYet: "Du hast noch keine Entwürfe gespeichert.",
  untitledDraft: "Unbenannter Entwurf",
  continueEditing: "Weiterbearbeiten",
  deleteDraftTitle: "Diesen Entwurf löschen?",
  deleteDraftBody: "Der Entwurf wird endgültig gelöscht und kann nicht wiederhergestellt werden.",
  deleteDraftConfirm: "Löschen",
  draftDeleted: "Entwurf gelöscht",
  draftDeleteFailed: "Entwurf konnte nicht gelöscht werden",


  newPassword1: "Neues",
  newPassword2: "Passwort",
  linkInvalid: "Link ungültig oder abgelaufen.",
  passwordChanged:
    "Dein Passwort wurde geändert. Du kannst dich jetzt mit dem neuen Passwort im Skin Creator anmelden.",
  newPasswordLabel: "Neues Passwort",
  savePassword: "Passwort speichern",
  resetLinkNote: "Der Link ist 1 Stunde gültig und kann nur einmal verwendet werden.",
  passwordTooShort: "Das Passwort muss mindestens 8 Zeichen lang sein",

  howItWorks: "So funktioniert es",
  hiwTitle: "So funktioniert der Skin Creator",
  hiwDescription: "Eine kurze Anleitung vom ersten Pixel bis zur Community-Galerie.",
  hiwStep1Title: "1. Kategorie wählen",
  hiwStep1Body:
    "Wähle zuerst eine Waffenkategorie, zum Beispiel Sturmgewehre oder Messer.",
  hiwStep2Title: "2. Waffe auswählen",
  hiwStep2Body:
    "Jede Waffe hat ihre eigene Leinwandgröße und Vorlage. Die Form der Vorlage ist das, was du bemalst.",
  hiwStep3Title: "3. Skin gestalten",
  hiwStep3Body:
    "Nutze Pinsel, Radierer, Füllwerkzeug und Farbwähler zum Malen. Du kannst nur innerhalb der Waffenform malen, das Füllwerkzeug stoppt an den Farbregionen der Vorlage. Passe Pinselgröße und Deckkraft an und nutze Rückgängig, wenn etwas schiefgeht. Du kannst dein Artwork jederzeit als transparentes PNG herunterladen.",
  hiwStep4Title: "4. Absenden",
  hiwStep4Body:
    "Gib deinem Skin einen Namen und trage deinen Ingame- oder Künstlernamen ein, damit wir dich nennen können. Eine E-Mail ist optional. Dann schicke ihn dem Team.",
  hiwStep5Title: "5. Prüfung",
  hiwStep5Body:
    "Unser Team prüft jede Einsendung. Wenn du ein Konto erstellt hast, kannst du den Status deiner Skins unter Meine Skins verfolgen. Freigegebene Skins erscheinen unten in der Community-Galerie.",
  hiwGoodToKnow: "Gut zu wissen",
  hiwGoodToKnowBody:
    "Ein freigegebener Skin schafft es nicht automatisch ins Spiel. Freigabe bedeutet, dass deine Einsendung unsere Prüfung bestanden hat und in der Community-Galerie gezeigt werden darf. Welche Skins tatsächlich in Unboxed aufgenommen werden, hängt von Art Direction, Balance und technischen Anforderungen ab, daher schafft es nur ein Teil der freigegebenen Skins ins Spiel.",
  hiwAccountTitle: "Konto oder Gast",
  hiwAccountBody:
    "Du kannst als Gast ohne Anmeldung einsenden. Mit einem kostenlosen Konto (Benutzername und Passwort, E-Mail optional) kannst du deine Einsendungen und ihren Status verfolgen.",
};

const zh: Dict = {
  backToSite: "Duo Forge Games",
  title1: "Unboxed",
  title2: "皮肤创作器",
  intro:
    "选择一把武器，在模板上绘制你的像素艺术皮肤，然后提交给团队。通过审核的社区皮肤有机会进入游戏，但通过审核并不保证皮肤一定会被加入 Unboxed。",
  loading: "加载中",
  loadingGallery: "画廊加载中",

  stepCategory: "分类",
  stepWeapon: "武器",
  stepDesign: "设计",
  stepSubmit: "提交",

  noCategories: "暂无武器分类，请稍后再来。",
  noWeapons: "此分类下暂无武器。",
  weaponCountOne: "把武器",
  weaponCountMany: "把武器",
  couldNotLoadWeapons: "无法加载武器",

  preview: "预览",
  paintedPixels: "个已绘制像素",
  keepEditing: "继续编辑",
  yourDetails: "你的信息",
  skinNameLabel: "皮肤名称 *",
  skinNamePlaceholder: "为你的皮肤取个名字",
  yourNameLabel: "你的名字",
  emailLabel: "邮箱（可选）",
  submitSkin: "提交皮肤",
  submitting: "提交中",
  submitConsent:
    "提交即表示你允许 Duo Forge Games 在 Unboxed 中使用你的作品。我们可能会就你的投稿与你联系。",
  skinNameRequired: "必须填写皮肤名称",
  completeCaptcha: "请完成人机验证",
  submissionFailed: "提交失败",
  previewUploadFailed: "预览图上传失败",
  savingAnyway: "皮肤数据仍会被保存。",

  doneTitle: "皮肤已提交！",
  doneBody: "感谢你与我们一同锻造。我们的团队会审核你的皮肤，请关注我们的 Discord 获取更新。",
  createAnother: "再创建一个皮肤",
  backToSiteBtn: "返回网站",

  signedInAs: "已登录为",
  mySkins: "我的皮肤",
  signOut: "退出登录",
  guestLine1: "你正在",
  guestAsGuest: "以访客身份",
  guestLine2: "创作，无需账号。注册后可以追踪你的投稿状态。",
  signIn: "登录",
  createAccount: "创建账号",
  forgotPassword: "忘记密码？",
  resetDescription: "输入你的用户名或邮箱。如果已绑定邮箱，我们会发送重置链接。",
  resetSentShort: "请查看你的邮箱以获取重置链接。",
  signInDescription: "无需邮箱，只要用户名和密码即可追踪你的投稿。",
  resetSentLong:
    "如果存在使用该邮箱的账号，我们刚刚已发送重置密码的链接。链接有效期为一小时。请查看收件箱，如果没有看到也请检查垃圾邮件文件夹。",
  backToSignIn: "返回登录",
  usernameOrEmail: "用户名或邮箱",
  sendResetLink: "发送重置链接",
  username: "用户名",
  password: "密码",
  confirmPassword: "确认密码",
  emailOptionalReset: "邮箱（可选，用于重置密码）",
  noEmailWarning: "没有邮箱的话，密码遗失后将无法重置。",
  haveAccount: "已有账号？登录",
  noAccountYet: "还没有账号？立即创建",
  passwordsNoMatch: "两次输入的密码不一致",
  somethingWrong: "出错了",
  accountCreated: "账号已创建，欢迎",
  welcomeBack: "欢迎回来",

  backToWeapons: "返回武器列表",
  doneSubmit: "完成 / 提交",
  toolBrush: "画笔（1像素）",
  toolEraser: "橡皮擦",
  toolFill: "填充",
  toolPicker: "取色",
  toolPan: "平移",
  undo: "撤销",
  redo: "重做",
  zoomIn: "放大",
  zoomOut: "缩小",
  toggleTemplate: "显示/隐藏模板",
  template: "模板",
  clearCanvas: "清空画布",
  clearCanvasTitle: "删除这些进度？",
  clearCanvasBody: "确定要删除这些进度吗？此操作无法撤销。",
  palette: "调色板",
  colour: "颜色",
  brushOpacity: "画笔不透明度",
  brightness: "亮度",
  helpMasked:
    "你只能在武器形状内绘制，变暗的区域会被忽略。填充工具会填充相同的像素并在武器边缘处停止。",
  helpPlain: "画笔逐个绘制像素。填充工具会填充相同的像素。",
  helpTail:
    "吸管可以从你的图层中取色。导出的文件只包含你绘制的像素，背景保持透明。支持触屏和手写笔绘制。使用平移工具可以移动画布。",

  galleryTitle1: "社区",
  galleryTitle2: "画廊",
  galleryIntro:
    "由社区创作并经我们团队审核通过的皮肤。使用你的皮肤创作器账号登录即可点赞，每个皮肤一票，再次点击可取消。",
  sortNewest: "最新",
  sortTop: "最多点赞",
  noApprovedSkins: "还没有通过审核的皮肤，你的可能是第一个。",
  loadMore: "加载更多",
  inGame: "已入游戏",
  noPreview: "无预览",
  untitledSkin: "未命名皮肤",
  unknownWeapon: "未知武器",
  by: "作者",
  anonymous: "匿名",
  signInToUpvote: "请登录后再为皮肤点赞",
  signInToUpvoteShort: "登录后点赞",
  upvoteThis: "为这个皮肤点赞",
  removeUpvote: "取消点赞",
  couldNotLoadGallery: "无法加载社区画廊",
  couldNotLoadMore: "无法加载更多皮肤",
  couldNotSaveVote: "无法保存你的投票",

  mySkinsTitle1: "我的",
  mySkinsTitle2: "皮肤",
  skinCreator: "皮肤创作器",
  signInToSeeSubmissions: "请在皮肤创作器页面登录以查看你的投稿。",
  goToSkinCreator: "前往皮肤创作器",
  noSubmissionsYet: "你还没有提交过皮肤。",
  createFirstSkin: "创建你的第一个皮肤",
  statusPending: "审核中",
  statusApproved: "已通过",
  statusRejected: "已拒绝",
  statusInGame: "已入游戏",

  // Drafts
  cancel: "取消",
  saveDraft: "保存草稿",
  updateDraft: "更新草稿",
  draftSaved: "草稿已保存",
  draftSaveFailed: "无法保存草稿",
  draftNameLabel: "草稿名称",
  draftNamePlaceholder: "例如：火焰 AK",
  draftHelp: "保存当前的绘制进度，之后可以在我的皮肤中继续编辑。",
  tabSubmissions: "已提交",
  tabDrafts: "我的草稿",
  noDraftsYet: "你还没有保存任何草稿。",
  untitledDraft: "未命名草稿",
  continueEditing: "继续编辑",
  deleteDraftTitle: "删除这个草稿？",
  deleteDraftBody: "该草稿将被永久删除，无法恢复。",
  deleteDraftConfirm: "删除",
  draftDeleted: "草稿已删除",
  draftDeleteFailed: "无法删除草稿",


  newPassword1: "新",
  newPassword2: "密码",
  linkInvalid: "链接无效或已过期。",
  passwordChanged: "你的密码已更改。现在可以使用新密码登录皮肤创作器。",
  newPasswordLabel: "新密码",
  savePassword: "保存密码",
  resetLinkNote: "重置链接有效期为 1 小时，且只能使用一次。",
  passwordTooShort: "密码至少需要 8 个字符",

  howItWorks: "使用说明",
  hiwTitle: "皮肤创作器如何使用",
  hiwDescription: "从第一个像素到社区画廊的简短指南。",
  hiwStep1Title: "1. 选择分类",
  hiwStep1Body: "先选择一个武器分类，例如突击步枪或刀具。",
  hiwStep2Title: "2. 选择武器",
  hiwStep2Body: "每把武器都有自己的画布尺寸和模板。模板的形状就是你要绘制的区域。",
  hiwStep3Title: "3. 设计皮肤",
  hiwStep3Body:
    "使用画笔、橡皮擦、填充工具和取色器进行绘制。你只能在武器形状内绘制，填充工具会在模板的颜色区域边界处停止。可以调整画笔大小和不透明度，出错时使用撤销。你随时可以将作品下载为透明 PNG。",
  hiwStep4Title: "4. 提交",
  hiwStep4Body:
    "为皮肤取个名字，填写你的游戏内名称或作者名，方便我们署名。邮箱为可选项。然后发送给团队。",
  hiwStep5Title: "5. 审核",
  hiwStep5Body:
    "我们的团队会审核每一份投稿。如果你注册了账号，可以在“我的皮肤”中查看状态。通过审核的皮肤会显示在页面底部的社区画廊中。",
  hiwGoodToKnow: "请注意",
  hiwGoodToKnowBody:
    "通过审核的皮肤不会自动进入游戏。通过审核仅表示你的投稿符合要求并可以展示在社区画廊中。哪些皮肤真正加入 Unboxed 取决于游戏的美术方向、平衡性和技术要求，因此只有部分通过审核的皮肤会进入游戏。",
  hiwAccountTitle: "账号或访客",
  hiwAccountBody:
    "你可以以访客身份投稿，无需注册。使用免费账号（用户名和密码，邮箱可选）可以追踪你的投稿及其状态。",
};

const ja: Dict = {
  backToSite: "Duo Forge Games",
  title1: "Unboxed",
  title2: "スキンクリエイター",
  intro:
    "武器を選び、テンプレートにピクセルアートのスキンを描いてチームに送信しましょう。承認されたコミュニティスキンはゲームに採用される可能性がありますが、承認は Unboxed への収録を保証するものではありません。",
  loading: "読み込み中",
  loadingGallery: "ギャラリーを読み込み中",

  stepCategory: "カテゴリー",
  stepWeapon: "武器",
  stepDesign: "デザイン",
  stepSubmit: "送信",

  noCategories: "武器カテゴリーはまだありません。また後でご確認ください。",
  noWeapons: "このカテゴリーにはまだ武器がありません。",
  weaponCountOne: "個の武器",
  weaponCountMany: "個の武器",
  couldNotLoadWeapons: "武器を読み込めませんでした",

  preview: "プレビュー",
  paintedPixels: "個の描画ピクセル",
  keepEditing: "編集を続ける",
  yourDetails: "あなたの情報",
  skinNameLabel: "スキン名 *",
  skinNamePlaceholder: "スキンに名前を付けてください",
  yourNameLabel: "お名前",
  emailLabel: "メールアドレス（任意）",
  submitSkin: "スキンを送信",
  submitting: "送信中",
  submitConsent:
    "送信することで、Duo Forge Games があなたの作品を Unboxed で使用することに同意したことになります。投稿についてご連絡する場合があります。",
  skinNameRequired: "スキン名は必須です",
  completeCaptcha: "認証にチェックを入れてください",
  submissionFailed: "送信に失敗しました",
  previewUploadFailed: "プレビューのアップロードに失敗しました",
  savingAnyway: "スキンデータはそのまま保存されます。",

  doneTitle: "スキンを送信しました！",
  doneBody:
    "一緒に鍛えてくれてありがとう。チームがスキンを確認します。最新情報は Discord をチェックしてください。",
  createAnother: "別のスキンを作る",
  backToSiteBtn: "サイトへ戻る",

  signedInAs: "ログイン中",
  mySkins: "マイスキン",
  signOut: "ログアウト",
  guestLine1: "現在",
  guestAsGuest: "ゲストとして",
  guestLine2:
    "作成しています。アカウントは不要です。作成すると投稿の状況を追跡できます。",
  signIn: "ログイン",
  createAccount: "アカウント作成",
  forgotPassword: "パスワードをお忘れですか？",
  resetDescription:
    "ユーザー名またはメールアドレスを入力してください。メールが登録されていればリセットリンクを送信します。",
  resetSentShort: "受信トレイでリセットリンクをご確認ください。",
  signInDescription:
    "メールは不要です。ユーザー名とパスワードだけで投稿を追跡できます。",
  resetSentLong:
    "このメールアドレスのアカウントが存在する場合、パスワードをリセットするリンクを送信しました。リンクの有効期限は1時間です。受信トレイと、見当たらない場合は迷惑メールフォルダもご確認ください。",
  backToSignIn: "ログインに戻る",
  usernameOrEmail: "ユーザー名またはメールアドレス",
  sendResetLink: "リセットリンクを送信",
  username: "ユーザー名",
  password: "パスワード",
  confirmPassword: "パスワードの確認",
  emailOptionalReset: "メールアドレス（任意、パスワード再設定用）",
  noEmailWarning: "メールアドレスがないと、パスワードを忘れた場合に再設定できません。",
  haveAccount: "すでにアカウントをお持ちですか？ログイン",
  noAccountYet: "アカウントがまだですか？作成する",
  passwordsNoMatch: "パスワードが一致しません",
  somethingWrong: "問題が発生しました",
  accountCreated: "アカウントを作成しました。ようこそ",
  welcomeBack: "おかえりなさい",

  backToWeapons: "武器一覧に戻る",
  doneSubmit: "完了 / 送信",
  toolBrush: "ブラシ（1px）",
  toolEraser: "消しゴム",
  toolFill: "塗りつぶし",
  toolPicker: "スポイト",
  toolPan: "移動",
  undo: "元に戻す",
  redo: "やり直す",
  zoomIn: "拡大",
  zoomOut: "縮小",
  toggleTemplate: "テンプレートの表示切替",
  template: "テンプレート",
  clearCanvas: "キャンバスを消去",
  clearCanvasTitle: "この進捗を削除しますか",
  clearCanvasBody: "この進捗を削除してもよろしいですか。この操作は元に戻せません。",
  palette: "パレット",
  colour: "カラー",
  brushOpacity: "ブラシの不透明度",
  brightness: "明るさ",
  helpMasked:
    "武器の形の内側にのみ描画できます。暗くなっている部分は無視されます。塗りつぶしは同じ色のピクセルを塗り、武器の輪郭で止まります。",
  helpPlain: "ブラシは1ピクセルずつ描画します。塗りつぶしは同じ色のピクセルを塗ります。",
  helpTail:
    "スポイトは自分のレイヤーから色を取得します。書き出しには描いたピクセルのみが含まれ、背景は透明のままです。タッチやスタイラスでの描画にも対応しています。移動ツールでキャンバスを動かせます。",

  galleryTitle1: "コミュニティ",
  galleryTitle2: "ギャラリー",
  galleryIntro:
    "コミュニティが作成し、チームが承認したスキンです。スキンクリエイターのアカウントでログインすると投票できます。1つのスキンにつき1票、もう一度押すと取り消せます。",
  sortNewest: "新着順",
  sortTop: "投票数順",
  noApprovedSkins: "承認済みのスキンはまだありません。あなたが最初かもしれません。",
  loadMore: "もっと見る",
  inGame: "ゲーム収録",
  noPreview: "プレビューなし",
  untitledSkin: "無題のスキン",
  unknownWeapon: "不明な武器",
  by: "作者",
  anonymous: "匿名",
  signInToUpvote: "投票するにはログインしてください",
  signInToUpvoteShort: "ログインして投票",
  upvoteThis: "このスキンに投票",
  removeUpvote: "投票を取り消す",
  couldNotLoadGallery: "コミュニティギャラリーを読み込めませんでした",
  couldNotLoadMore: "これ以上スキンを読み込めませんでした",
  couldNotSaveVote: "投票を保存できませんでした",

  mySkinsTitle1: "マイ",
  mySkinsTitle2: "スキン",
  skinCreator: "スキンクリエイター",
  signInToSeeSubmissions:
    "投稿を見るには、スキンクリエイターのページでログインしてください。",
  goToSkinCreator: "スキンクリエイターへ",
  noSubmissionsYet: "まだスキンを投稿していません。",
  createFirstSkin: "最初のスキンを作る",
  statusPending: "審査中",
  statusApproved: "承認済み",
  statusRejected: "却下",
  statusInGame: "ゲーム収録",

  // Drafts
  cancel: "キャンセル",
  saveDraft: "下書きを保存",
  updateDraft: "下書きを更新",
  draftSaved: "下書きを保存しました",
  draftSaveFailed: "下書きを保存できませんでした",
  draftNameLabel: "下書きの名前",
  draftNamePlaceholder: "例: 炎のAK",
  draftHelp: "作業中のペイントを保存して、あとでマイスキンから続きを描けます。",
  tabSubmissions: "投稿済み",
  tabDrafts: "下書き",
  noDraftsYet: "保存された下書きはまだありません。",
  untitledDraft: "名称未設定の下書き",
  continueEditing: "編集を続ける",
  deleteDraftTitle: "この下書きを削除しますか",
  deleteDraftBody: "この下書きは完全に削除され、元に戻せません。",
  deleteDraftConfirm: "削除する",
  draftDeleted: "下書きを削除しました",
  draftDeleteFailed: "下書きを削除できませんでした",


  newPassword1: "新しい",
  newPassword2: "パスワード",
  linkInvalid: "リンクが無効か、有効期限が切れています。",
  passwordChanged:
    "パスワードを変更しました。新しいパスワードでスキンクリエイターにログインできます。",
  newPasswordLabel: "新しいパスワード",
  savePassword: "パスワードを保存",
  resetLinkNote: "リセットリンクの有効期限は1時間で、1回のみ使用できます。",
  passwordTooShort: "パスワードは8文字以上にしてください",

  howItWorks: "使い方",
  hiwTitle: "スキンクリエイターの使い方",
  hiwDescription: "最初の1ピクセルからコミュニティギャラリーまでの簡単なガイドです。",
  hiwStep1Title: "1. カテゴリーを選ぶ",
  hiwStep1Body: "まずは武器のカテゴリー、例えばアサルトライフルやナイフを選びます。",
  hiwStep2Title: "2. 武器を選ぶ",
  hiwStep2Body:
    "武器ごとにキャンバスサイズとテンプレートが異なります。テンプレートの形が描画できる範囲です。",
  hiwStep3Title: "3. スキンをデザインする",
  hiwStep3Body:
    "ブラシ、消しゴム、塗りつぶし、カラーピッカーで描画します。武器の形の内側にのみ描画でき、塗りつぶしはテンプレートの色領域で止まります。ブラシのサイズや不透明度を調整でき、失敗したら元に戻せます。作品はいつでも透過PNGとしてダウンロードできます。",
  hiwStep4Title: "4. 送信する",
  hiwStep4Body:
    "スキンに名前を付け、クレジット用にゲーム内名またはアーティスト名を入力してください。メールは任意です。そしてチームに送信します。",
  hiwStep5Title: "5. 審査",
  hiwStep5Body:
    "チームがすべての投稿を確認します。アカウントを作成していれば、マイスキンで状況を確認できます。承認されたスキンはページ下部のコミュニティギャラリーに表示されます。",
  hiwGoodToKnow: "知っておいてください",
  hiwGoodToKnowBody:
    "承認されたスキンが自動的にゲームに入るわけではありません。承認は審査を通過し、コミュニティギャラリーに掲載できることを意味します。実際に Unboxed に追加されるかは、ゲームのアートディレクション、バランス、技術的要件によって決まるため、承認されたスキンの一部のみがゲームに採用されます。",
  hiwAccountTitle: "アカウントまたはゲスト",
  hiwAccountBody:
    "登録せずゲストとして投稿できます。無料アカウント（ユーザー名とパスワード、メールは任意）を作れば、投稿とその状況を追跡できます。",
};

const DICTS: Record<SkinLang, Dict> = { en, de, zh, ja };

export function translate(lang: SkinLang, key: string): string {
  return DICTS[lang]?.[key] ?? en[key] ?? key;
}

/** Reactive Skin Creator translator, updates when the flag buttons change the language. */
export function useSkinT() {
  const [lang, setLang] = useState<SkinLang>(() => getSkinLang());

  useEffect(() => {
    setLang(getSkinLang());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<SkinLang>).detail;
      setLang(detail ?? getSkinLang());
    };
    const onStorage = () => setLang(getSkinLang());
    window.addEventListener("skinlangchange", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("skinlangchange", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const t = (key: string) => translate(lang, key);
  return { t, lang };
}
