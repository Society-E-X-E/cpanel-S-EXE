/* eslint-disable no-var */

function checkSupport(userAgent) {
  if (/safari/i.test(userAgent)) {
    var iosRegex =
      /(CPU[ +]OS|iPhone[ +]OS|CPU[ +]iPhone|CPU IPhone OS|CPU iPad OS)[ +]+(8|9|10|1{2}|12|13|14|15)[._]\d+([._]\d+|)/;
    return { supported: !iosRegex.test(userAgent) };
  }

  return { supported: true };
}

function redirectUpdateBrowserPage() {
  window.location.href = './actualizar-navegador.html';
}

function detectCompatibility() {
  var result = checkSupport(window.navigator.userAgent);
  if (!result.supported) {
    redirectUpdateBrowserPage();
  }
}

var onSyntax = function (event) {
  var isSyntaxError = event.error instanceof SyntaxError;
  if (isSyntaxError) {
    redirectUpdateBrowserPage();
  }
};

var featureFlag = String('true');
var shouldDetect = featureFlag === 'true';
if (shouldDetect) {
  try {
    detectCompatibility();
    window.onSyntax = onSyntax;
    window.addEventListener('error', onSyntax);
  } catch (error) {}
}