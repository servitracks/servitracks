import fs from 'fs';

try {
  const content = fs.readFileSync('conversations_audit.txt', 'utf8');
  console.log("Conversations Audit contents:");
  console.log(content.substring(0, 4000)); // Print first 4000 chars
} catch (e) {
  console.error("Error reading file:", e);
}
