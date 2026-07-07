fetch('https://jiosaavn-api.vercel.app/search/songs?query=Kyaa+Baat+Haii')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
