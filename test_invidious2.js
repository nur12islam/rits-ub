const instances = [
  'https://invidious.jing.rocks',
  'https://invidious.nerdvpn.de',
  'https://iv.melmac.space',
  'https://invidious.privacyredirect.com',
  'https://invidious.fdn.fr',
  'https://yewtu.be'
];

async function test() {
  for (const api of instances) {
    try {
      console.log(`Trying ${api}...`);
      const r = await fetch(`${api}/api/v1/videos/7CNeqA9PBYE`);
      if (!r.ok) continue;
      const data = await r.json();
      if (data.formatStreams) {
        const audio = data.formatStreams.filter(s => s.type.startsWith('audio'));
        if (audio.length > 0) {
            console.log("Success with", api);
            console.log(audio[0].url);
            return;
        }
      }
    } catch (e) {
      console.log("Failed", api);
    }
  }
}
test();
