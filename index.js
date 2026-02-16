const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      // レンダラープロセスでNode.jsを使えるように設定（学習・検証用）
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("./index.html");

  // ファイルを読み込んで中身をコンソールに表示、または画面に送る
  const filePath = path.join(__dirname, "./assets/notesData/demo.txt"); // 読み込みたいファイル名

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    console.log("file:", content);

    // ウィンドウが読み込まれたらデータを送る
    mainWindow.webContents.on("did-finish-load", () => {
      mainWindow.webContents.send("file-data", content);
    });
  }
});

// レンダラープロセスから 'save-json' という名前でデータが送られてきた時の処理
// メインプロセスの修正例
ipcMain.on("save-json", (event, data) => {
  // ユーザーデータフォルダを取得（Windowsなら AppData/Roaming/アプリ名）
  // const userDataPath = app.getPath('userData');
  // const dirPath = path.join(userDataPath, "json");
  // const savePath = path.join(dirPath, "output.json");
  const savePath = path.join(__dirname, 'assets/json', 'output.json')

  try {
    // フォルダがない場合は作成する
    // if (!fs.existsSync(dirPath)) {
    //   fs.mkdirSync(dirPath, { recursive: true });
    // }

    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(savePath, jsonString, "utf8");
    
    console.log("Saved to:", savePath); // これでどこに保存されたかログに出ます
    event.reply("save-complete");
  } catch (error) {
    console.error("Failed to save JSON:", error);
  }
});
