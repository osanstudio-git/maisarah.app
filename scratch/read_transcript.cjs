const fs = require('fs');
const readline = require('readline');

async function getStepsOverview() {
  const filePath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0a415721-4e6b-43ac-8eb9-d8c16ca8276e\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const requests = [];
  for await (const line of rl) {
    if (line.includes('"type":"USER_INPUT"') && line.includes('<USER_REQUEST>')) {
      try {
        const obj = JSON.parse(line);
        const match = obj.content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
        if (match && match[1].trim() !== 'yes, please') {
          requests.push({
            step: obj.step_index,
            time: obj.created_at,
            request: match[1].trim().slice(0, 150)
          });
        }
      } catch (e) {}
    }
  }

  console.log(JSON.stringify(requests.slice(-10), null, 2));
}

getStepsOverview();
