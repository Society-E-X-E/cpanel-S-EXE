function insertVWOLink() {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://dev.visualwebsiteoptimizer.com';
  document.head.appendChild(link);
}

function insertVWOScript() {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = './assets/vwo/vwo.js';
  script.id = 'vwoCode';
  document.head.appendChild(script);
}

function load() {
  insertVWOLink();
  insertVWOScript();
}

const vwoFeatureFlag = 'false';
const shouldInsert = vwoFeatureFlag === 'true';
if (shouldInsert) {
  load();
}