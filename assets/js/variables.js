// ★変数宣言・設定
// ノーツの幅・高さ等を管理
const defaultNotesWidth = 90;
const defaultNotesHeight = 30;
const defaultJudgeLine = 600;

// canvas関数（これがないと描画されない！削除しないように！）
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ノーツ保管
let objectsArray = [];

// スコアについての変数
let totalNotes = 0;
let notesScore = 0;
let score = 0;

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

// ノーツの落下時間を測定
let notesAppearTIme;

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
let audioStartTime; // 追加

// リザルト表示用変数
let finishGame = false;
let finishGameTime = 0;
const resultName = ["pp", "pf", "gr", "gd", "ms"];