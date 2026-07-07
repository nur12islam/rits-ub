const { spawnSync } = require('child_process');
const ytdlpBin = require('path').join(process.cwd(), 'bin', 'yt-dlp');
const res = spawnSync(ytdlpBin, ['https://www.youtube.com/watch?v=7CNeqA9PBYE', '-f', 'bestaudio', '--get-url', '--cookies', 'cookies.txt', '--extractor-args', 'youtube:player_client=android']);
console.log(res.stderr.toString());
console.log(res.stdout.toString());
