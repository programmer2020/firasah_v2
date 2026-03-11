const https = require('https');
const fs = require('fs');
const path = require('path');

// Create a test file
const testFile = path.join(__dirname, 'test_arabic.mp3');
fs.writeFileSync(testFile, 'test audio content');

const boundary = '----FormBoundary' + Date.now();
const filename = '\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0639\u0644\u0649 \u0627\u0644\u0627\u0639\u062f\u0627\u062f.mp3';

const header = '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="file"; filename="' + filename + '"\r\n' +
  'Content-Type: audio/mpeg\r\n\r\n';

const footer = '\r\n--' + boundary + '--\r\n';

const body = Buffer.concat([
  Buffer.from(header, 'utf-8'),
  fs.readFileSync(testFile),
  Buffer.from(footer, 'utf-8')
]);

const options = {
  hostname: 'firasahv2-production.up.railway.app',
  port: 443,
  path: '/api/sound-files/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    fs.unlinkSync(testFile);
  });
});
req.write(body);
req.end();
