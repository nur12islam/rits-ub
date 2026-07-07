const instances = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.in.projectsegfau.lt',
  'https://api.piped.privacydev.net',
  'https://piped-api.lunar.icu'
];

async function test() {
  for (const api of instances) {
    try {
      console.log(`Trying ${api}...`);
      const r = await fetch(`${api}/streams/7CNeqA9PBYE`);
      const data = await r.json();
      if (data.audioStreams) {
        console.log("Success with", api);
        console.log(data.audioStreams.sort((a,b) => b.bitrate - a.bitrate)[0].url);
        return;
      }
    } catch (e) {
      console.log("Failed", api);
    }
  }
}
test();
