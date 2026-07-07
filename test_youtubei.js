import { Innertube, UniversalCache } from 'youtubei.js';

async function test() {
  const yt = await Innertube.create({ generate_session_locally: true, client_type: 'ANDROID' });
  try {
    const info = await yt.getBasicInfo('7CNeqA9PBYE');
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    console.log(format.decipher(yt.session.player));
  } catch (e) {
    console.error(e);
  }
}
test();
