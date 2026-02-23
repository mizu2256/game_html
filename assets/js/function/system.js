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

// ここからアニメーション関数
// ノーツを表示させる関数
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

// キーが押された時のノーツ判定関数
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

// 判定処理関数
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

// キーを離したときの関数
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