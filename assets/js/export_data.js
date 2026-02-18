let tempData, exportData;

function parseScore(rawText) {
  let beat, bpm; // musicはここから削除してresultで管理します

  const lines = rawText.split("\n");
  const result = {
    startBpm: 0,
    music: "", // 初期値を設定
    offset: 0,
    notes: [],
  };

  lines.forEach((line) => {
    line = line.trim();

    // BPMの抽出
    if (line.startsWith("#BPM:")) {
      const bpmMatch = line.match(/#BPM:\s*(\d+)/);
      if (bpmMatch) {
        result.startBpm = parseInt(bpmMatch[1]);
        bpm = parseInt(bpmMatch[1]);
      }
    }

    // OFFSETの抽出
    if (line.startsWith("#OFFSET:")) {
      const offsetMatch = line.match(/#OFFSET:\s*(\d+)/);
      if (offsetMatch) {
        result.offset = parseInt(offsetMatch[1]);
      }
    }

    // MUSICの抽出
    if (line.startsWith("#MUSIC:")) {
      const musicMatch = line.match(/#MUSIC:\s*(.+)/);
      if (musicMatch) {
        // 重要：result.music に代入し、末尾のカンマを除去
        result.music = musicMatch[1].replace(/,$/, "").trim();
      }
    }

    // ノーツ部分の抽出
    if (line.startsWith("#(")) {
      const beatMatch = line.match(/^#\((\d+)\)/);
      if (beatMatch) beat = parseInt(beatMatch[1]);
      const noteData = line.replace(/^#\(\d+\)/, "").replace(/,$/, "");
      const notesArray = noteData.split(",").filter((n) => n !== "");

      notesArray.forEach((note) => { // 引数名が重複していたので修正
        result.notes.push({
          lane: note,
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
  const finalData = {
    music: "",
    notes: [],
  };
  
  // レーンごとのロングノーツ開始時間を保持
  let activeLongNotes = {};

  finalData.music = data.music;

  data.notes.forEach((value, index) => {
    let laneValue = value.lane.toString();
    // [ ] (同時押し) 判定
    if (laneValue.includes("[")) { eachFlag = true; laneValue = laneValue.replace("[", ""); }
    if (laneValue.includes("]")) { eachFlag = false; laneValue = laneValue.replace("]", ""); }

    let type = "tap";
    let laneNum = 0;

    // タイプ判定
    if (laneValue.includes("l")) { type = "long"; laneNum = parseInt(laneValue.replace("l", "")); }
    else if (laneValue.includes("e")) { type = "end"; laneNum = parseInt(laneValue.replace("e", "")); }
    else if (laneValue.includes("c")) { type = "critical"; laneNum = parseInt(laneValue.replace("c", "")); }
    else { laneNum = parseInt(laneValue); }

    if (laneNum !== 0) {
      if (type === "long") {
        activeLongNotes[laneNum] = timer; 
        finalData.notes.push({ time: timer, lane: laneNum, type: "long" });
      } 
      else if (type === "end") {
        const startTime = activeLongNotes[laneNum];
        if (startTime !== undefined) {
          const bpm = value.bpm;
          const msPer8th = 30000 / bpm; // 8分音符間隔

          // --- Tickの先行生成ロジック ---
          let tickTime = Math.ceil((startTime - data.offset) / msPer8th) * msPer8th + data.offset;
          
          // 始点と重なりすぎるのを防ぐ
          if (tickTime < startTime + msPer8th) { tickTime += msPer8th; }

          // 終点(timer)より手前までTickを追加
          while (tickTime < timer - 500) { // ★500ms手前でTickが生成されないようにした
            finalData.notes.push({
              time: tickTime,
              lane: laneNum,
              type: "tick"
            });
            tickTime += msPer8th;
          }
          delete activeLongNotes[laneNum];
        }
        // 終点ノーツを追加
        finalData.notes.push({ time: timer, lane: laneNum, type: "end" });
      } 
      else {
        // tap, critical
        finalData.notes.push({ time: timer, lane: laneNum, type: type });
      }
    }

    if (!eachFlag) {
      const beat = value.beat;
      const bpm = value.bpm;
      timer += ((4 / beat) * 60000) / bpm;
    }
  });

  // 時間順に並び替え（重要：Tickを途中に挿入したため）
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
