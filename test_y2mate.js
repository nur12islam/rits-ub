fetch('https://www.y2mate.com/mates/en932/analyze/ajax', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'url=https://www.youtube.com/watch?v=7CNeqA9PBYE&q_auto=1&ajax=1'
}).then(r => r.json()).then(console.log).catch(console.error);
