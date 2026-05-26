const { exec, spawn } = require('child_process');
const path = require('path');

console.log('🚀 Se pornește Golden Bridge AI Optimizer...');

// 1. Pornim serverul Next.js pe portul 3000
const nextServer = spawn('npm', ['run', 'dev'], {
  shell: true,
  env: process.env
});

nextServer.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Next.js]: ${output.trim()}`);

  // Când serverul Next.js e gata, deschidem fereastra Electron
  if (output.includes('ready') || output.includes('started server')) {
    console.log('💻 Deschidem interfața grafică...');
    
    const electronApp = spawn('npm', ['run', 'electron'], { shell: true });

    electronApp.on('close', () => {
      console.log('🛑 Aplicația a fost închisă. Oprim serverele...');
      process.exit(0);
    });
  }
});

nextServer.stderr.on('data', (data) => {
  console.error(`[Error]: ${data}`);
});
