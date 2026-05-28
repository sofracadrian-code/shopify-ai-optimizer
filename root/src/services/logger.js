import fs from 'fs';

export function logSuccess(message) {
fs.appendFileSync(
'./src/logs/success.log',
"${new Date().toISOString()} - ${message}\n"
);
}

export function logError(message) {
fs.appendFileSync(
'./src/logs/errors.log',
"${new Date().toISOString()} - ${message}\n"
);
}
