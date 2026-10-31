// Socod's App Store link: the ONE place to set it (verified 30 Oct 2026).
// The pages are built with this link already in place, so buttons work without JavaScript;
// this script keeps every button in step with it.
var SOCOD_APP_STORE_URL = 'https://apps.apple.com/us/app/socod-walk-to-unlock-apps/id6824004642';

if (SOCOD_APP_STORE_URL) {
  document.querySelectorAll('a[data-appstore]').forEach(function (a) { a.href = SOCOD_APP_STORE_URL; });
}
