const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "Golden Bridge AI Optimizer",
    autoHideMenuBar: true // Ascunde meniul clasic de sus pentru un aspect curat
  });

  // Electron se va conecta la serverul local Next.js
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
