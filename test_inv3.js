const instances = [
  'https://invidious.jing.rocks',
  'https://invidious.nerdvpn.de',
  'https://iv.melmac.space',
  'https://invidious.privacyredirect.com',
  'https://invidious.fdn.fr',
  'https://yewtu.be',
  'https://inv.tux.pizza',
  'https://invidious.protokolla.fi'
];

async function test() {
  for (const api of instances) {
    try {
      const r = await fetch(`${api}/api/v1/videos/7CNeqA9PBYE?fields=formatStreams`, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) continue;
      const data = await r.json();
      if (data.formatStreams && data.formatStreams.length > 0) {
        console.log("Success with", api);
        return;
      }
    } catch (e) {}
  }
  console.log("None worked");
}
test();
