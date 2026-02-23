// ノーツの動きを記載するクラス・長押し
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