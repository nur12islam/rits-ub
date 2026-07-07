fetch('https://saavn.me/search/songs?query=Kyaa+Baat+Haii+2.0')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
