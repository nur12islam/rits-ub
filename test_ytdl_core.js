import ytdl from '@distube/ytdl-core';

ytdl.getInfo('https://www.youtube.com/watch?v=7CNeqA9PBYE')
  .then(info => {
    let format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    console.log(format.url);
  })
  .catch(console.error);
