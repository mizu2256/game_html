// メインのJS

// 譜面ロード用関数
async function loadChart() {
  try {
    // パスはindex.htmlからの相対パス
    const response = await fetch("./assets/json/output.json"); // ここのパスがそのまま譜面コード
    dataLoad = await response.json();
    data = JSON.parse(JSON.stringify(dataLoad));

    console.log("譜面データ:", dataLoad);
    console.log(dataLoad);
  } catch (error) {
    console.error("読み込み失敗:", error);
  }
}

// オフセット設定用にノーツ落下時間を求める関数
function calculateTravelTime() {
  // 1. 移動距離の算出
  // 出現時のy座標は -defaultNotesHeight です。
  // 判定線の中心は defaultJudgeLine です。
  // 上端が判定線に重なるまでの距離：
  const startY = -defaultNotesHeight;
  const targetY = defaultJudgeLine;
  const distance = targetY - startY;

  // 2. 速度の算出 (1フレームあたりの移動ピクセル)
  const dy = notesSpeed * 2;

  // 3. 必要なフレーム数を計算
  const requiredFrames = distance / dy;

  // 4. フレーム数をミリ秒に変換 (1フレーム = 1000/60 ms)
  const MS_PER_FRAME = 1000 / 60;
  const travelTimeMs = requiredFrames * MS_PER_FRAME;

  return travelTimeMs;
} 

// 処理落ち対策のウォーミングアップ関数
function warmup() {
  console.log("Warming up...");
  // 偽のノーツを100個くらい作って一瞬で更新・削除させる
  for (let i = 0; i < 100; i++) {
    const dummy = new MovingObject(0, 0, 90, 30, "#0000ff00", 0, 10.2, 0, 0, 0);
    dummy.update(ctx, canvas);
  }
  // Canvasのテキスト描画も重いので一度実行しておく
  ctx.font = "72px Arial";
  ctx.fillText("Warmup", -100, -100);
}

// 以下音声ロード・再生関数
async function loadAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}


// 最後にanimate関数
function animate() {
  // リザルト画面テスト用
  // finishGame = true;
  // リザルト表示テスト用
  // gameResult.pp = totalNotes;

  // 前のフレームをクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  displayBackground();

  if (!finishGame) {
    displayJudge();
    spawnNotes();
    judgeLine();
    notesLine();
    displayCombo();

    for (let i = 0; i < objectsArray.length; i++) {
      objectsArray[i].update(ctx, canvas);

      if (objectsArray[i].isRemovable) {
        objectsArray.splice(i, 1);
        i--;
      }
    }

    score = Math.floor((notesScore / totalNotes) * 10000);
    displayScore();

    if (data.notes.length == 0 && objectsArray.length == 0) {
      if (finishGameTime == 0) {
        finishGameTime = performance.now();
      } else if (performance.now() > finishGameTime + 1000) {
        finishGame = true;
      }
    } else {
      finishGameTime = 0;
    }
  } else {
    displayGameResult();
  }

  // 次のフレーム
  requestAnimationFrame(animate);
}

// 以下処理

// init関数を書き換え
async function init() {
  // 1. 譜面と音源を両方ロード
  await loadChart();
  music_DATA = data.music;
  console.log(music_DATA);
  audioBuffer = await loadAudio(`./assets/music/${music_DATA}`); // 曲のパスを指定

  // totalNotesを計測
  totalNotes = data.notes.length;
  console.log(totalNotes);

  // ノーツの表示時間
  notesAppearTIme = calculateTravelTime();
  console.log(`TIME:${notesAppearTIme}`);

  // ラグ防止措置
  warmup();

  // 2. ブラウザの音声再生制限を解除するための待機（画面クリックで開始）
  console.log("Click to Start");
  window.addEventListener("mousedown", startBuffer, { once: true });
}

async function startBuffer() {
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  musicSource = audioContext.createBufferSource();
  musicSource.buffer = audioBuffer;
  musicSource.connect(audioContext.destination);

  // 重要：音楽が鳴り始める「オーディオクロック上の時間」を記録
  audioStartTime = audioContext.currentTime;
  musicSource.start(audioStartTime + 1 + (notesAppearTIme / 1000) + (notesTimingA / 1000));

  animate();
}

init();
