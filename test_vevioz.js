fetch('https://api.vevioz.com/api/button/mp3/7CNeqA9PBYE')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
