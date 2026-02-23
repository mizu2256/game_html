// ノーツの動きを記載するクラス・単押し
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