// メインのJS
// ノーツの動きを記載するクラス
class MovingObject {
  // コンストラクタ: オブジェクトの初期状態を設定
  constructor(
    x,
    y,
    width,
    height,
    color,
    dx,
    dy,
    colIndex,
    spawnTime,
    targetTime
  ) {
    this.x = x; // X座標
    this.y = y; // Y座標
    this.width = width;
    this.height = height;
    this.color = color; // 色
    this.dx = dx; // X方向の速度 (現在は未使用)
    this.dy = dy; // Y方向の速度
    this.colIndex = colIndex;
    this.spawnTime = spawnTime;
    this.targetTime = targetTime;
    this.isRemovable = false; // ★ 削除フラグを追加

    if (this.color == "#0000ff") {
      this.type = "tap";
    } else {
      this.type = "critical";
    }
  }

  // 描画メソッド: オブジェクトをキャンバスに描画
  draw(ctx) {
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  // 更新メソッド: 次のフレームの状態を計算
  update(ctx, canvas) {
    // 通常ノーツ(tap)だけがこの画面外消去ロジックを使うようにする
    if (this.type !== "long" && this.type !== "tick") {
      if (this.y + this.height > canvas.height) {
        judge = "MISS";
        FAST_OR_LATE = "";
        gameResult.ms++;
        this.isRemovable = true;
        combo = 0;
        judgeTimer = 20;
      }
    }
    this.y += this.dy;
    this.draw(ctx);
  }
}

class LongNoteObject extends MovingObject {
  constructor(
    x,
    y,
    width,
    height,
    color,
    dx,
    dy,
    colIndex,
    spawnTime,
    targetTime,
    duration
  ) {
    super(x, y, width, height, color, dx, dy, colIndex, spawnTime, targetTime);
    this.type = "long";
    this.initialDuration = duration;
    this.duration = duration;
    this.isHolding = false;
    this.endTime = targetTime + duration;
    this.headProcessed = false; // ヒットまたは見逃しが確定したか
    this.headMissed = false; // 見逃しカウント済みか
  }

  draw(ctx) {
    const pixelsPerMs = (this.dy * 60) / 1000;
    const currentTime = performance.now();

    // 描画上の「頭」のY座標を決定
    // 押している間は判定ラインに固定、離している間は本来の落下位置(this.y)
    let drawHeadY = this.isHolding
      ? defaultJudgeLine
      : this.y + defaultNotesHeight / 2;

    // お尻のY座標を計算（これは常に一定の速度で降りてくる）
    const tailY = defaultJudgeLine - (this.endTime - currentTime) * pixelsPerMs;
    const currentBodyHeight = drawHeadY - tailY;

    // お尻が頭（判定ライン）を通り過ぎたら描画終了
    if (currentBodyHeight <= 0) return;

    // 1. 帯（ボディ）
    ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
    ctx.fillRect(this.x, tailY, this.width, currentBodyHeight);

    // 2. 始点（頭）
    ctx.fillStyle = "#0000ff";
    ctx.fillRect(this.x, drawHeadY - this.height / 2, this.width, this.height);

    // 3. 終点（尻尾）
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(this.x, tailY, this.width, 5);
  }

  update(ctx, canvas) {
    const currentTime = performance.now();
    this.y += this.dy;

    // 1. 頭の見逃し判定
    if (
      !this.headProcessed &&
      !this.isHolding &&
      this.y > defaultJudgeLine + maxHitDistance
    ) {
      processJudge(performance.now(), this);
      this.headProcessed = true;
    }

    // 2. 消去ロジック
    if (this.isShort) {
      // 疑似ロングは頭の判定が終われば即削除
      if (this.headProcessed) this.isRemovable = true;
    } else {
      // 【修正】時間ベースで「これ以上描画・判定する必要がない」タイミングで消去
      // endTime (お尻が判定ラインに重なる時間) に少し猶予(100ms)を持たせる
      if (currentTime > this.endTime - 83.33) {
        this.isRemovable = true;
      }
    }

    this.draw(ctx);
  }
}

class TickNoteObject extends MovingObject {
  constructor(
    x,
    y,
    width,
    height,
    color,
    dx,
    dy,
    colIndex,
    spawnTime,
    targetTime,
    parentLongNote
  ) {
    super(x, y, width, height, color, dx, dy, colIndex, spawnTime, targetTime);
    this.type = "tick";
    this.parentLongNote = parentLongNote; // 紐付いているロングノーツ本体
  }

  draw(ctx) {
    // 何も描画しない（透明）
  }

  update(ctx, canvas) {
    // 判定ライン（defaultJudgeLine）に到達したかチェック
    // y座標が判定ラインを超えたら判定処理
    if (this.y >= defaultJudgeLine) {
      if (this.parentLongNote && this.parentLongNote.isHolding) {
        // 押されている：PERFECT+
        judge = "PERFECT+";
        judgeTimer = 20; // 中継点では文字を出さないならコメントアウト
        gameResult.pp++;
        combo++;
      } else {
        // 押されていない：MISS
        judge = "MISS";
        FAST_OR_LATE = "";
        judgeTimer = 20;
        gameResult.ms++;
        combo = 0;
      }
      this.isRemovable = true; // 判定が終わったら消す
    }

    this.y += this.dy;
    // drawは呼ばない
  }
}

// 変数宣言
// ノーツの幅・高さ等を管理
const defaultNotesWidth = 90;
const defaultNotesHeight = 30;
const defaultJudgeLine = 600;

// canvas関数（これがないと描画されない）
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ノーツ保管
let objectsArray = [];

// ノーツスピード
const notesSpeed = 10.2;

// 最大MISS幅
const maxHitDistance = notesSpeed * 2 * 7.5;

// 判定の変数
let judge = "";
let FAST_OR_LATE = "";
let judgeTimer = 0;

let isLongTap = false;

// 譜面データの元変数を定義
let data, dataLoad;

// startTimeの定義
let startTime;

// forループで譜面の番号を設定
let gameNumber;

// レーンごとのロングノーツ保持確認
let activeLongNotesByLane = {}; // レーンごとの稼働中ロングノーツを保持

// キーマッピング
const keyMap = {
  s: 0,
  d: 1,
  f: 2,
  j: 3,
  k: 4,
  l: 5,
};

const keyStates = {};

// リザルト用
let gameResult = {
  pp: 0,
  pf: 0,
  gr: 0,
  gd: 0,
  ms: 0,
};

let combo = 0;
let maxCombo = 0;

// 音声管理変数
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;
let musicSource = null;

// ここから先はfunction記載ゾーン

// 複数のクローンを作成
function clone(line, time) {
  let width = defaultNotesWidth;
  let height = defaultNotesHeight;
  let colIndex = line - 1;
  let x = colIndex * width + (canvas.width / 2 - 3 * width);
  let y = -height;
  let dx = 0;
  let dy = notesSpeed * 2;
  let color = `#0000ff`;

  const spawnTime = performance.now();

  const requiredDistance = defaultJudgeLine - -height / 2 - notesSpeed * 2;
  const requiredFrames = requiredDistance / dy;
  const MS_PER_FRAME = 1000 / 60;
  const timeToReach = requiredFrames * MS_PER_FRAME;
  const targetTime = spawnTime + timeToReach;

  objectsArray.push(
    new MovingObject(
      x,
      y,
      width,
      height,
      color,
      dx,
      dy,
      colIndex,
      spawnTime,
      targetTime
    )
  );
}

function createCriticalNote(line, time) {
  let width = defaultNotesWidth;
  let height = defaultNotesHeight;
  let colIndex = line - 1;
  let x = colIndex * width + (canvas.width / 2 - 3 * width);
  let y = -height;
  let dx = 0;
  let dy = notesSpeed * 2;
  let color = `#fdb200`;

  const spawnTime = performance.now();

  const requiredDistance = defaultJudgeLine - -height / 2 - notesSpeed * 2;
  const requiredFrames = requiredDistance / dy;
  const MS_PER_FRAME = 1000 / 60;
  const timeToReach = requiredFrames * MS_PER_FRAME;
  const targetTime = spawnTime + timeToReach;

  objectsArray.push(
    new MovingObject(
      x,
      y,
      width,
      height,
      color,
      dx,
      dy,
      colIndex,
      spawnTime,
      targetTime
    )
  );
}

function createLongNote(line, time, duration) {
  let width = defaultNotesWidth;
  let height = defaultNotesHeight;
  let colIndex = line - 1;
  let x = colIndex * width + (canvas.width / 2 - 3 * width);
  let y = -height;
  let dy = notesSpeed * 2;

  // 到達時間の計算ロジックはcloneと同じ
  const spawnTime = performance.now();
  const requiredDistance = defaultJudgeLine - -height / 2 - notesSpeed * 2;
  const targetTime = spawnTime + (requiredDistance / dy) * (1000 / 60);

  const newObj = new LongNoteObject(
    x,
    y,
    width,
    height,
    "#00ffff",
    0,
    dy,
    colIndex,
    spawnTime,
    targetTime,
    duration
  );

  objectsArray.push(newObj);
  return newObj;
}

function createTickNote(lane, time, parentLongNote) {
  let width = defaultNotesWidth;
  let height = defaultNotesHeight;
  let colIndex = lane - 1;
  let x = colIndex * width + (canvas.width / 2 - 3 * width);
  let y = -height;
  let dy = notesSpeed * 2;

  const spawnTime = performance.now();
  const requiredDistance = defaultJudgeLine - -height / 2;
  const targetTime = spawnTime + (requiredDistance / dy) * (1000 / 60);

  objectsArray.push(
    new TickNoteObject(
      x,
      y,
      width,
      height,
      "transparent",
      0,
      dy,
      colIndex,
      spawnTime,
      targetTime,
      parentLongNote
    )
  );
}

// 本体描画用

function displayBackground() {
  ctx.beginPath();
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function judgeLine() {
  ctx.beginPath();
  ctx.moveTo(0, defaultJudgeLine);
  ctx.lineTo(canvas.width, defaultJudgeLine);
  ctx.strokeStyle = "#ff000055";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, defaultJudgeLine - defaultNotesHeight / 2);
  ctx.lineTo(canvas.width, defaultJudgeLine - defaultNotesHeight / 2);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, defaultJudgeLine + defaultNotesHeight / 2);
  ctx.lineTo(canvas.width, defaultJudgeLine + defaultNotesHeight / 2);
  ctx.stroke();
}

function notesLine() {
  let canvasWidth = canvas.width;
  for (i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2 + defaultNotesWidth * i, 0);
    ctx.lineTo(canvasWidth / 2 + defaultNotesWidth * i, 720);
    if (i == 0 || i == -3 || i == 3) {
      ctx.lineWidth = 3;
    } else {
      ctx.lineWidth = 1;
    }
    ctx.stroke();
  }
}

function displayJudge() {
  if (judge !== "" && judgeTimer > 0) {
    ctx.font = `${judgeTimer * 0.5 + 25}px Arial`;
    ctx.textAlign = "center";

    if (judge === "PERFECT+") {
      ctx.fillStyle = "#ff0088";
    } else if (judge === "PERFECT") {
      ctx.fillStyle = "#ff4444";
    } else if (judge === "GREAT") {
      ctx.fillStyle = "#ffaa00";
    } else if (judge === "GOOD") {
      ctx.fillStyle = "#5555ff";
    } else {
      ctx.fillStyle = "#333333";
    }

    ctx.fillText(judge, 640, 500);

    if (judge !== "PERFECT+") {
      ctx.font = "18px Arial";
      if (FAST_OR_LATE === "LATE") {
        ctx.fillStyle = "#ff0000";
      } else {
        ctx.fillStyle = "#0000ff";
      }
      ctx.fillText(FAST_OR_LATE, 640, 470);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "#0000ff";

    judgeTimer--;
  } else {
    judge = "";
  }
}

function displayCombo() {
  if (combo != 0) {
    if (gameResult.gr + gameResult.gd + gameResult.ms == 0) {
      if (gameResult.pf == 0) {
        ctx.fillStyle = "#ff0088";
      } else {
        ctx.fillStyle = "#ff4444";
      }
    } else {
      ctx.fillStyle = "#0000ff";
    }
    ctx.textAlign = "center";
    ctx.font = `${judgeTimer > 15 ? (judgeTimer - 15) * 3 + 72 : 72}px Arial`;
    ctx.fillText(combo, 1125, 360);
    ctx.font = "28px Arial";
    ctx.fillText("COMBO", 1125, 400);
    ctx.textAlign = "left";
    ctx.fillStyle = "#0000ff";
  }
}


function spawnNotes() {
  const currentTime = (audioContext.currentTime - audioStartTime) * 1000;
  if (!data) return;

  while (data.notes.length > 0 && data.notes[0].time <= currentTime) {
    const noteData = data.notes.shift(); // 先頭を取り出す

    switch (noteData.type) {
      case "long":
        // ロング開始。後続のTickやEndが親を参照できるように保持
        // durationは後でEndが来た時に計算するのではなく、
        // 描画クラス側で「Endが来るまで描く」か、事前に計算しておく必要があります。
        // ここでは、描画クラスに渡すために「対になるEnd」を一度だけ探します。
        const endNote = data.notes.find(n => n.lane === noteData.lane && n.type === "end");
        const duration = endNote ? (endNote.time - noteData.time) : 0;
        
        const newLong = createLongNote(noteData.lane, noteData.time, duration);
        activeLongNotesByLane[noteData.lane] = newLong;
        break;

      case "tick":
        // すでにデータにあるTickを生成
        if (activeLongNotesByLane[noteData.lane]) {
          createTickNote(noteData.lane, noteData.time, activeLongNotesByLane[noteData.lane]);
        }
        break;

      case "end":
        // ロング終了。最後のTickとしての判定を行い、参照を消す
        if (activeLongNotesByLane[noteData.lane]) {
          createTickNote(noteData.lane, noteData.time, activeLongNotesByLane[noteData.lane]);
          delete activeLongNotesByLane[noteData.lane];
        }
        break;

      case "critical":
        createCriticalNote(noteData.lane, noteData.time);
        break;

      default: // tap
        clone(noteData.lane, noteData.time);
        break;
    }
  }
}

// キーが押された時のノーツ判定
document.addEventListener("keydown", (event) => {
  const pressTime = performance.now();
  const key = event.key.toLowerCase();
  const targetColIndex = keyMap[key];

  if (keyStates[key] === true || targetColIndex === undefined) return;
  keyStates[key] = true;

  let hitObject = null;
  let minDistance = Infinity;

  // --- 1. ロングノーツの復帰判定 (時間軸で判定) ---
  for (let i = objectsArray.length - 1; i >= 0; i--) {
    const obj = objectsArray[i];
    if (obj.colIndex === targetColIndex && obj.type === "long") {
      // 始点(targetTime)から終点(endTime)までの間にいれば復帰対象
      if (pressTime >= obj.targetTime && pressTime <= obj.endTime) {
        hitObject = obj;
        break;
      }
    }
  }

  // --- 2. 通常ノーツの判定 (距離で判定: hitObjectがまだ無い場合のみ) ---
  if (!hitObject) {
    for (let i = objectsArray.length - 1; i >= 0; i--) {
      const obj = objectsArray[i];
      if (obj.colIndex === targetColIndex && obj.type !== "tick") {
        // tickは距離判定しない
        const distance = Math.abs(defaultJudgeLine - obj.y);
        if (distance <= maxHitDistance && distance < minDistance) {
          minDistance = distance;
          hitObject = obj;
        }
      }
    }
  }

  // --- 3. ヒット時の処理 ---
  if (hitObject) {
    if (hitObject.type === "long") {
      // ★既に判定済みのロングノーツ（押し直しなど）は無視する
      if (hitObject.headProcessed) return;

      hitObject.isHolding = true;
      hitObject.headProcessed = true; // 判定完了フラグを立てる
      isLongTap = true;

      processJudge(pressTime, hitObject);
    } else {
      hitObject.isRemovable = true;
      processJudge(pressTime, hitObject);
      isLongTap = false;
    }
  }
});

// 判定処理を共通関数化するとスッキリします
function processJudge(pressTime, hitObject) {
  const timeDifference = pressTime - hitObject.targetTime;
  const timeDifferenceAbs = Math.abs(timeDifference);

  FAST_OR_LATE = timeDifference < 0 ? "FAST" : "LATE";

  if (hitObject.type == "critical") {
    if (timeDifferenceAbs <= 108.33) {
      judge = "PERFECT+";
      gameResult.pp++;
      combo++;
    } else {
    }
  } else {
    if (timeDifferenceAbs <= 33.33) {
      judge = "PERFECT+";
      gameResult.pp++;
      combo++;
    } else if (timeDifferenceAbs <= 50.0) {
      judge = "PERFECT";
      gameResult.pf++;
      combo++;
    } else if (timeDifferenceAbs <= 83.33) {
      judge = "GREAT";
      gameResult.gr++;
      combo++;
    } else if (timeDifferenceAbs <= 108.33) {
      judge = "GOOD";
      gameResult.gd++;
      combo = 0;
    } else {
      judge = "MISS";
      gameResult.ms++;
      combo = 0;
    }
  }

  judgeTimer = 20;
}

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (keyStates.hasOwnProperty(key)) {
    keyStates[key] = false;
  }

  const colIndex = keyMap[key];
  for (let obj of objectsArray) {
    if (obj.type === "long" && obj.colIndex === colIndex) {
      obj.isHolding = false; // 離したフラグだけ立てる（MISSは出さない）
    }
  }
});

// loading
async function loadChart() {
  try {
    // パスはindex.htmlからの相対パス
    const response = await fetch("./assets/json/output.json");
    dataLoad = await response.json();
    data = JSON.parse(JSON.stringify(dataLoad));

    console.log("譜面データ:", dataLoad);
    console.log(dataLoad);
  } catch (error) {
    console.error("読み込み失敗:", error);
  }
}

// warm-UP
function warmup() {
    console.log("Warming up...");
    // 偽のノーツを100個くらい作って一瞬で更新・削除させる
    for(let i=0; i<100; i++) {
        const dummy = new MovingObject(0, 0, 90, 30, "#0000ff00", 0, 10.2, 0, 0, 0);
        dummy.update(ctx, canvas);
    }
    // Canvasのテキスト描画も重いので一度実行しておく
    ctx.font = "72px Arial";
    ctx.fillText("Warmup", -100, -100); 
}

// 以下音声ロード・再生
async function loadAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

// 最後にanimate関数
function animate() {
  // 前のフレームをクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  displayBackground();

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

  // 次のフレーム
  requestAnimationFrame(animate);
}

// 以下処理

// init関数を書き換え
async function init() {
  // 1. 譜面と音源を両方ロード
  await loadChart();
  audioBuffer = await loadAudio("./assets/music/music.mp3"); // 曲のパスを指定

  // ラグ防止措置
  warmup();

  // 2. ブラウザの音声再生制限を解除するための待機（画面クリックで開始）
  console.log("Click to Start");
  window.addEventListener("mousedown", startBuffer, { once: true });
}

let audioStartTime; // 追加
async function startBuffer() {
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  
  musicSource = audioContext.createBufferSource();
  musicSource.buffer = audioBuffer;
  musicSource.connect(audioContext.destination);

  // 重要：音楽が鳴り始める「オーディオクロック上の時間」を記録
  audioStartTime = audioContext.currentTime;
  musicSource.start(audioStartTime + 1);
  
  animate();
}

init();
