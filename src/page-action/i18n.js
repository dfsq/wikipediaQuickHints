document.querySelectorAll('[data-i18n]').forEach(function (el) {
  el.innerHTML = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
});
