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
    targetTime,
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
  // MovingObject クラス内
  update(ctx, canvas) {
    // すでに削除フラグが立っている、または Tick の場合はスキップ
    if (this.isRemovable || this.type === "tick") {
      this.y += this.dy;
      this.draw(ctx);
      return;
    }

    // 通常ノーツ(tap / critical)の自動MISS判定
    if (this.type !== "long") {
      // 判定ライン + 最大ヒット距離 を超えたら確実に MISS
      if (this.y > defaultJudgeLine + maxHitDistance) {
        if (!this.isRemovable) {
          // 二重判定防止
          judge = "MISS";
          FAST_OR_LATE = "";
          gameResult.ms++;
          debug_NOTES++; // ここでカウント
          this.isRemovable = true;
          combo = 0;
          judgeTimer = 20;
        }
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
    duration,
  ) {
    super(x, y, width, height, color, dx, dy, colIndex, spawnTime, targetTime);
    this.type = "long";
    this.initialDuration = duration;
    this.duration = duration;
    this.isHolding = false;
    this.endTime = targetTime + duration;
    this.headProcessed = false;
    this.headMissed = false;
  }

  draw(ctx) {
    const pixelsPerMs = (this.dy * 60) / 1000;
    const currentTime = performance.now();

    // 1. 描画上の「お尻」の残存時間を計算
    const timeLeft = this.endTime - currentTime;

    // --- 修正ポイント ---
    // もし終了まであとわずか（例: 10ms以内）なら描画をスキップする
    // これにより、見た目上は「判定ラインに吸い込まれるように」消えます。
    // かといって isRemovable は true にしないので、判定（Tick）は死にません。
    if (timeLeft < 83.33) return;

    let drawHeadY = this.isHolding
      ? defaultJudgeLine
      : this.y + defaultNotesHeight / 2;

    const tailY = defaultJudgeLine - timeLeft * pixelsPerMs;

    // 物理的にお尻が頭を越えた場合も描画終了
    if (tailY >= drawHeadY) return;

    const currentBodyHeight = drawHeadY - tailY;

    // 帯（ボディ）
    ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
    ctx.fillRect(this.x, tailY, this.width, currentBodyHeight);

    // 始点（頭）
    if (drawHeadY < canvas.height + 50) {
      ctx.fillStyle = "#0000ff";
      ctx.fillRect(
        this.x,
        drawHeadY - this.height / 2,
        this.width,
        this.height,
      );
    }

    // 終点（尻尾）
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(this.x, tailY, this.width, 5);
  }

  update(ctx, canvas) {
    const currentTime = performance.now();
    this.y += this.dy;

    // 1. 頭の見逃し判定
    if (!this.headProcessed && this.y > defaultJudgeLine + maxHitDistance) {
      this.headProcessed = true;
      processJudge(currentTime, this);
    }

    // 2. 削除ロジックの修正
    // 判定猶予（108.33ms）が過ぎるまで、オブジェクトを消さない
    // これにより、途中で離しても「再度押されるチャンス」が維持されます
    if (currentTime > this.endTime + 108.33) {
      this.isRemovable = true;
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
    parentLongNote,
  ) {
    super(x, y, width, height, color, dx, dy, colIndex, spawnTime, targetTime);
    this.type = "tick";
    this.parentLongNote = parentLongNote; // 紐付いているロングノーツ本体
  }

  draw(ctx) {
    // 何も描画しない（透明）
  }

  update(ctx, canvas) {
    // --- 修正ポイント：判定タイミングのオフセット ---
    // typeが "tick" でも、実際には spawnNotes で生成される際に
    // 末端（end由来のtick）かどうかを判別できるようにするか、
    // あるいは一律で「判定ラインの少し手前」で判定を完了させます。

    // 判定猶予の境界（GOODの末尾など）に合わせて 108.33ms 手前で判定を終わらせる
    const isEndTick = true; // 今回は end 由来の Tick として扱います
    const judgeOffset = isEndTick ? 100 : 0; // 100ms手前で判定

    if (this.y >= defaultJudgeLine - judgeOffset * ((this.dy * 60) / 1000)) {
      if (this.parentLongNote && this.parentLongNote.isHolding) {
        judge = "PERFECT+";
        gameResult.pp++;
        notesScore = notesScore + 101;
        combo++;
        maxCombo = Math.max(maxCombo, combo);
      } else {
        // 離していれば MISS
        judge = "MISS";
        gameResult.ms++;
        combo = 0;
      }
      debug_NOTES++;
      judgeTimer = 20;
      this.isRemovable = true;
    }

    this.y += this.dy;
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

// スコアについての変数
let totalNotes = 0;
let notesScore = 0;
let score = 0;

// ノーツスピード
const notesSpeed = 10.1;

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

let fastNotes = 0;
let lateNotes = 0;

let debug_NOTES = 0;

let combo = 0;
let maxCombo = 0;

// 音声管理変数
let music_DATA = "";
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;
let musicSource = null;

// リザルト表示用変数
let finishGame = false;
let finishGameTime = 0;
const resultName = ["pp", "pf", "gr", "gd", "ms"];

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
      targetTime,
    ),
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
      targetTime,
    ),
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
    duration,
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
      parentLongNote,
    ),
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
    if (gameResult.gd + gameResult.ms == 0) {
      if (gameResult.gr == 0) {
        if (gameResult.pf == 0) {
          ctx.fillStyle = "#ff0088";
        } else {
          ctx.fillStyle = "#ff4444";
        }
      } else {
        ctx.fillStyle = "#ffaa00";
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

function displayScore() {
  ctx.fillStyle = "#000000";
  ctx.font = "36px Arial";
  ctx.fillText(`SCORE: ${score}`, 10, 45);
  ctx.textAlign = "left";
  ctx.fillStyle = "#0000ff";
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
        const endNote = data.notes.find(
          (n) => n.lane === noteData.lane && n.type === "end",
        );
        const duration = endNote ? endNote.time - noteData.time : 0;

        const newLong = createLongNote(noteData.lane, noteData.time, duration);
        activeLongNotesByLane[noteData.lane] = newLong;
        break;

      case "tick":
        // すでにデータにあるTickを生成
        if (activeLongNotesByLane[noteData.lane]) {
          createTickNote(
            noteData.lane,
            noteData.time,
            activeLongNotesByLane[noteData.lane],
          );
        }
        break;

      case "end":
        // ロング終了。最後のTickとしての判定を行い、参照を消す
        if (activeLongNotesByLane[noteData.lane]) {
          createTickNote(
            noteData.lane,
            noteData.time,
            activeLongNotesByLane[noteData.lane],
          );
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

  // --- ロングノーツの復帰・ヒット判定 ---
  // すでに頭を処理(headProcessed)していても、時間内なら isHolding を復活させる
  for (let i = 0; i < objectsArray.length; i++) {
    const obj = objectsArray[i];
    if (obj.colIndex === targetColIndex && obj.type === "long") {
      // 始点から終点（の少し後）までの間にいれば復帰対象
      if (
        pressTime >= obj.targetTime - 108.33 &&
        pressTime <= obj.endTime + 108.33
      ) {
        hitObject = obj;

        // 既に頭を叩いている場合は、isHolding を true に戻すだけで終了
        if (hitObject.headProcessed) {
          hitObject.isHolding = true;
          return; // 通常ノーツ判定に行かせない
        }
        break;
      }
    }
  }

  // --- 通常ノーツの判定 (hitObjectがまだ見つかっていない場合) ---
  if (!hitObject) {
    let minDistance = Infinity;
    for (let i = objectsArray.length - 1; i >= 0; i--) {
      const obj = objectsArray[i];
      if (
        obj.colIndex === targetColIndex &&
        obj.type !== "tick" &&
        !obj.isRemovable
      ) {
        const distance = Math.abs(defaultJudgeLine - obj.y);
        if (distance <= maxHitDistance && distance < minDistance) {
          minDistance = distance;
          hitObject = obj;
        }
      }
    }
  }

  // --- ヒット時の新規処理 ---
  if (hitObject) {
    if (hitObject.type === "long") {
      hitObject.isHolding = true;
      hitObject.headProcessed = true;
      processJudge(pressTime, hitObject);
    } else {
      hitObject.isRemovable = true;
      processJudge(pressTime, hitObject);
    }
  }
});

// 判定処理を共通関数化するとスッキリします
function processJudge(pressTime, hitObject) {
  const timeDifference = pressTime - hitObject.targetTime;
  const timeDifferenceAbs = Math.abs(timeDifference);
  let isUpdateFL = false;

  FAST_OR_LATE = timeDifference < 0 ? "FAST" : "LATE";
  debug_NOTES++;

  if (hitObject.type == "critical") {
    if (timeDifferenceAbs <= 108.33) {
      judge = "PERFECT+";
      gameResult.pp++;
      notesScore = notesScore + 101;
      combo++;
    } else {
    }
  } else {
    if (timeDifferenceAbs <= 33.33) {
      judge = "PERFECT+";
      gameResult.pp++;
      notesScore = notesScore + 101;
      combo++;
    } else if (timeDifferenceAbs <= 50.0) {
      judge = "PERFECT";
      gameResult.pf++;
      notesScore = notesScore + 100;
      isUpdateFL = true;
      combo++;
    } else if (timeDifferenceAbs <= 83.33) {
      judge = "GREAT";
      gameResult.gr++;
      notesScore = notesScore + 70;
      isUpdateFL = true;
      combo++;
    } else if (timeDifferenceAbs <= 108.33) {
      judge = "GOOD";
      gameResult.gd++;
      notesScore = notesScore + 30;
      isUpdateFL = true;
      combo = 0;
    } else {
      judge = "MISS";
      FAST_OR_LATE = "";
      gameResult.ms++;
      combo = 0;
    }
  }

  if (isUpdateFL) {
    if (FAST_OR_LATE == "FAST") {
      fastNotes++;
    } else if (FAST_OR_LATE == "LATE") {
      lateNotes++;
    }
  }

  maxCombo = Math.max(maxCombo, combo);
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
  for (let i = 0; i < 100; i++) {
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

// 以下リザルト画面
function displayGameResult() {
  let temp = "";
  // score
  ctx.font = "64px Arial";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE`, 120, 100);
  ctx.font = "72px Arial";
  ctx.textAlign = "center";
  ctx.fillText(score, 600, 100);

  // result_txt
  ctx.font = "40px Arial";
  ctx.fillStyle = "#ff0088";
  ctx.fillText("PERFECT+", 300, 300);
  ctx.fillStyle = "#ff4444";
  ctx.fillText("PERFECT", 300, 360);
  ctx.fillStyle = "#ffaa00";
  ctx.fillText("GREAT", 300, 420);
  ctx.fillStyle = "#0000ff";
  ctx.fillText("GOOD", 300, 480);
  ctx.fillStyle = "#000000";
  ctx.fillText("MISS", 300, 540);

  resultName.forEach((name, i) => {
    ctx.fillText(gameResult[name], 540, 300 + 60 * i);
  });

  // MAX COMBO
  ctx.fillText("MAX COMBO", 900, 270);
  ctx.font = "56px Arial";
  ctx.fillText(maxCombo, 900, 340);

  // CLEAR_CHECK
  ctx.font = "42px Arial";
  if (gameResult.pp == totalNotes) {
    ctx.fillStyle = "#ff0088";
    temp = "ALL PERFECT+!!";
  } else if (gameResult.pp + gameResult.pf == totalNotes) {
    ctx.fillStyle = "#ff4444";
    temp = "ALL PERFECT!!";
  } else if (gameResult.pp + gameResult.pf + gameResult.gr == totalNotes) {
    ctx.fillStyle = "#ffaa00";
    temp = "FULL COMBO!";
  } else {
    temp = "";
  }

  if (temp != "") {
    ctx.fillText(temp, 900, 405);
  }

  // FAST_LATE
  ctx.font = "36px Arial";
  ctx.fillStyle = "#0000ff";
  ctx.fillText("FAST", 830, 500);
  ctx.fillStyle = "#ff0000";
  ctx.fillText("LATE", 830, 550);

  ctx.fillStyle = "#000000";
  ctx.fillText(fastNotes, 970, 500);
  ctx.fillText(lateNotes, 970, 550);
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
