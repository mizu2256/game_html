// ノーツの動きを記載するクラス・中継点
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