fetch('https://co.wuk.sh/api/json', {
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=7CNeqA9PBYE',
        isAudioOnly: true
    })
}).then(r => r.json()).then(console.log).catch(console.error);
