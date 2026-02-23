// 本体描画用
// 背景の色を表示する関数
function displayBackground() {
  ctx.beginPath();
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 判定ライン（横線）を表示する関数
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

// ノーツライン（縦線）を表示する関数
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

// 判定結果を表示する関数
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

// コンボ数を表示する関数
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

// スコアを表示させる関数
function displayScore() {
  ctx.fillStyle = "#000000";
  ctx.font = "36px Arial";
  ctx.fillText(`SCORE: ${score}`, 10, 45);
  ctx.textAlign = "left";
  ctx.fillStyle = "#0000ff";
}

// 以下リザルト画面表示関数
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