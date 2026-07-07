const instances = [
  'https://co.wuk.sh/',
  'https://cobalt.q0.ooguy.com/',
  'https://cobalt.zillyhuhn.com/'
];

async function test() {
  for (const api of instances) {
    try {
      console.log(`Trying ${api}...`);
      const r = await fetch(`${api}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: 'https://www.youtube.com/watch?v=7CNeqA9PBYE',
            downloadMode: 'audio'
        })
      });
      const data = await r.json();
      if (data.url) {
        console.log("Success with", api);
        console.log(data.url);
        return;
      } else {
        console.log("Failed", api, data);
      }
    } catch (e) {
      console.log("Failed", api, e.message);
    }
  }
}
test();
