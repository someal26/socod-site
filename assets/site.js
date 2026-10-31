// Socod's App Store link: the ONE place to set it.
// PLACEHOLDER: leave '' until the link is verified, then paste it here, e.g.
// 'https://apps.apple.com/app/id0000000000'. Every "App Store" button on the site uses it.
var SOCOD_APP_STORE_URL = '';

if (SOCOD_APP_STORE_URL) {
  document.querySelectorAll('a[data-appstore]').forEach(function (a) { a.href = SOCOD_APP_STORE_URL; });
  document.querySelectorAll('[data-appstore-wrap]').forEach(function (el) { el.hidden = false; });
}
