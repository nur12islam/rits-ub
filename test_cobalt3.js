fetch('https://api.cobalt.tools/api/instances', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => r.json()).then(console.log).catch(console.error);
