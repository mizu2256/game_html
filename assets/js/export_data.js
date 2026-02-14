let tempData, exportData;

function parseScore(rawText) {
  let beat, bpm;

  const lines = rawText.split("\n"); // 改行で分割
  const result = {
    startBpm: 0,
    notes: [],
  };

  lines.forEach((line) => {
    line = line.trim(); // 前後の空白を削除

    // BPMを抽出 (#BPM: 120,)
    if (line.startsWith("#BPM:")) {
      const bpmMatch = line.match(/#BPM:\s*(\d+)/);
      if (bpmMatch) {
        result.startBpm = parseInt(bpmMatch[1]);
        bpm = parseInt(bpmMatch[1]);
      }
    }

    if (line.startsWith("#OFFSET:")) {
      const offsetMatch = line.match(/#OFFSET:\s*(\d+)/);
      if (offsetMatch) {
        result.offset = parseInt(offsetMatch[1]);
      }
    }

    // 譜面部分を抽出 (#(8)3,4,3,4...)
    // 先頭が #( で始まる行を対象にする
    if (line.startsWith("#(")) {
      const beatMatch = line.match(/^#\((\d+)\)/);
      if (beatMatch) beat = parseInt(beatMatch[1]);
      // 例: "#(8)3,4,[2,5]" -.> "3,4,[2,5]" の部分を取り出す
      const noteData = line.replace(/^#\(\d+\)/, "").replace(/,$/, "");

      // カンマで区切って配列にする
      // ※ [2,5] のような同時押しも1要素として扱う工夫が必要
      const notesArray = noteData.split(",").filter((n) => n !== "");

      notesArray.forEach((notesArray) => {
        result.notes.push({
          lane: notesArray,
          beat: beat,
          bpm: bpm,
        });
      });
    }
  });

  return result;
}

function exportScore(data) {
  let eachFlag = false;
  let timer = parseInt(data.offset, 10);
  const finalData = { notes: [] };
  let activeLongNotes = {};

  data.notes.forEach((value, index) => {
    let laneValue = value.lane.toString();
    if (laneValue.includes("[")) {
      eachFlag = true;
      laneValue = laneValue.replace("[", "");
    }
    if (laneValue.includes("]")) {
      eachFlag = false;
      laneValue = laneValue.replace("]", "");
    }

    let type = "tap";
    let laneNum = 0;

    if (laneValue.includes("l")) {
      type = "long";
      laneNum = parseInt(laneValue.replace("l", ""));
    } else if (laneValue.includes("e")) {
      type = "end";
      laneNum = parseInt(laneValue.replace("e", ""));
    } else if (laneValue.includes("c")) {
      type = "critical";
      laneNum = parseInt(laneValue.replace("c", ""));
    } else {
      laneNum = parseInt(laneValue);
    }

    if (laneNum !== 0) {
      const currentNote = { time: timer, lane: laneNum, type: type };

      if (type === "long") {
        activeLongNotes[laneNum] = timer; // 開始時間を記録
        finalData.notes.push(currentNote);
      } else if (type === "end") {
        const startTime = activeLongNotes[laneNum];
        if (startTime !== undefined) {
          const bpm = value.bpm;
          const msPer8th = 30000 / bpm; // 8分音符1つ分のミリ秒 (60000 / bpm / 2)

          // --- 音楽的な8分音符グリッドへのスナップ ---
          // offsetを基準とした、startTime直後の「音楽的な8分音符」のタイミングを探す
          // timer % msPer8th だとズレる可能性があるので、(現在時間 - offset) で計算
          let firstTickTime =
            Math.ceil((startTime - data.offset) / msPer8th) * msPer8th +
            data.offset;

          // もし始点と重なりすぎたら次のTickから開始
          if (firstTickTime < startTime + msPer8th / 32) {
            firstTickTime += msPer8th;
          }

          let tickTime = firstTickTime;
          // 終点(timer)の少し手前まで、正確な8分音符間隔で刻む
          while (tickTime < timer) {
            finalData.notes.push({
              time: tickTime,
              lane: laneNum,
              type: "tick",
            });
            tickTime += msPer8th;
          }
          delete activeLongNotes[laneNum];
        }
        finalData.notes.push(currentNote);
      } else {
        finalData.notes.push(currentNote);
      }
    }

    if (!eachFlag) {
      const beat = value.beat;
      const bpm = value.bpm;
      timer += ((4 / beat) * 60000) / bpm;
    }
  });

  finalData.notes.sort((a, b) => a.time - b.time);
  return finalData;
}

const { ipcRenderer } = require("electron");

// メインプロセスからデータを受け取る
ipcRenderer.on("file-data", (event, data) => {
  console.log(data);
  tempData = parseScore(data);
  console.log(tempData);
  exportData = exportScore(tempData);
  console.log(exportData);
  ipcRenderer.send("save-json", exportData);

  // 保存完了の合図を受け取った後の処理
  ipcRenderer.on("save-complete", () => {
    console.log("保存が完了したので、ゲームを起動します...");

    // game.jsを動的に読み込む
    const script = document.createElement("script");
    script.src = "./assets/js/game.js"; // ゲーム本体のパス
    document.body.appendChild(script);
  });
});
