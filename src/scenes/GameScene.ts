import Phaser from 'phaser';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';
type Turn = 'player' | 'enemy';
type EnemyPattern = '慎重' | '攻撃的' | '様子見';

export class GameScene extends Phaser.Scene {
  private gameState: GameState = 'title';
  private turn: Turn = 'player';
  private bombValue = 0;
  private totalValue = 0;
  private playerRoll = 0;
  private enemyRoll = 0;
  private enemyTurnPending = false;
  private resultMessage = '';
  private bombVisible = true;
  private passCount = 0;
  private enemyPattern: EnemyPattern = '様子見';

  private spaceKey!: Phaser.Input.Keyboard.Key;
  private dangerousKey!: Phaser.Input.Keyboard.Key;
  private backKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private statusText!: Phaser.GameObjects.Text;
  private totalText!: Phaser.GameObjects.Text;
  private bombText!: Phaser.GameObjects.Text;
  private playerRollText!: Phaser.GameObjects.Text;
  private enemyRollText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private safeChoiceText!: Phaser.GameObjects.Text;
  private dangerousChoiceText!: Phaser.GameObjects.Text;
  private safeKeyText!: Phaser.GameObjects.Text;
  private dangerousKeyText!: Phaser.GameObjects.Text;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private explosionGraphics!: Phaser.GameObjects.Graphics;
  private sweatGraphics!: Phaser.GameObjects.Graphics;
  private sweatActive = false;
  private overlayText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.dangerousKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.backKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.boardGraphics = this.add.graphics();
    this.explosionGraphics = this.add.graphics().setVisible(false);
    this.sweatGraphics = this.add.graphics().setVisible(false);
    this.add.text(72, 48, 'オーバースロー', {
      fontFamily: 'Yu Gothic, Meiryo, sans-serif',
      fontSize: '54px',
      color: '#293462',
      fontStyle: 'bold',
    });
    this.add.text(76, 112, '一歩先を越えたら負け', {
      fontFamily: 'Yu Gothic, Meiryo, sans-serif',
      fontSize: '15px',
      color: '#ed6a5a',
      letterSpacing: 4,
    });
    this.statusText = this.add.text(940, 150, '', this.labelStyle(30, '#ed6a5a')).setOrigin(0.5);
    this.totalText = this.add.text(640, 298, '', this.numberStyle(82, '#293462')).setOrigin(0.5);
    this.bombText = this.add.text(640, 456, '', this.numberStyle(52, '#ed6a5a')).setOrigin(0.5);
    this.playerRollText = this.add.text(264, 392, '', this.numberStyle(52, '#293462')).setOrigin(0.5);
    this.enemyRollText = this.add.text(1016, 392, '', this.numberStyle(52, '#293462')).setOrigin(0.5);
    this.detailText = this.add.text(640, 590, '', this.labelStyle(17, '#52616b')).setOrigin(0.5);
    this.instructionText = this.add.text(640, 666, '', this.labelStyle(16, '#293462')).setOrigin(0.5);
    this.safeChoiceText = this.add.text(205, 392, '安', this.numberStyle(30, '#293462')).setOrigin(0.5);
    this.dangerousChoiceText = this.add.text(323, 392, '危', this.numberStyle(30, '#293462')).setOrigin(0.5);
    this.safeKeyText = this.add.text(205, 454, 'スペース', this.keyStyle(16)).setOrigin(0.5);
    this.dangerousKeyText = this.add.text(323, 454, 'D', this.keyStyle(18)).setOrigin(0.5);

    this.startTitle();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      if (this.gameState === 'playing') {
        this.gameState = 'paused';
        this.refreshView();
      } else if (this.gameState === 'paused') {
        this.gameState = 'playing';
        this.refreshView();
        if (this.turn === 'enemy' && this.enemyTurnPending) {
          this.time.delayedCall(260, () => this.enemyTurn());
        }
      }
    }

    if (this.gameState === 'title' && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.startGame();
    } else if (this.gameState === 'playing' && this.turn === 'player') {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.playerTurn(1, 3);
      } else if (Phaser.Input.Keyboard.JustDown(this.dangerousKey)) {
        this.playerTurn(2, 6);
      } else if (Phaser.Input.Keyboard.JustDown(this.backKey)) {
        this.passTurn();
      }
    } else if (this.gameState === 'gameover') {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.startGame();
      } else if (Phaser.Input.Keyboard.JustDown(this.backKey)) {
        this.startTitle();
      }
    }
  }

  private startTitle(): void {
    this.gameState = 'title';
    this.resultMessage = '';
    this.enemyTurnPending = false;
    this.passCount = 0;
    this.enemyPattern = '様子見';
    this.bombVisible = false;
    this.bombText.setVisible(false);
    this.bombText.setAlpha(1);
    this.resetExplosion();
    this.resetSweat();
    this.statusText.setText('爆弾が待っている');
    this.totalText.setText('');
    this.bombText.setText('');
    this.playerRollText.setText('');
    this.enemyRollText.setText('');
    this.detailText.setText('爆弾の数値を超えないように耐えよう');
    this.instructionText.setText('[ スペース ]  ゲーム開始');
    this.updateChoiceDisplay();
    this.drawBoard();
  }

  private startGame(): void {
    this.gameState = 'playing';
    this.turn = 'player';
    this.bombValue = Phaser.Math.Between(20, 40);
    this.totalValue = 0;
    this.playerRoll = 0;
    this.enemyRoll = 0;
    this.enemyTurnPending = false;
    this.resultMessage = '';
    this.passCount = 0;
    const patterns: EnemyPattern[] = ['慎重', '攻撃的', '様子見'];
    this.enemyPattern = patterns[Phaser.Math.Between(0, patterns.length - 1)] ?? '様子見';
    this.bombVisible = true;
    this.bombText.setVisible(true).setAlpha(1);
    this.resetExplosion();
    this.resetSweat();
    this.refreshView();
  }

  private playerTurn(minRoll: number, maxRoll: number): void {
    this.turn = 'enemy';
    this.enemyTurnPending = true;
    this.playerRoll = Phaser.Math.Between(minRoll, maxRoll);
    this.totalValue += this.playerRoll;
    if (this.totalValue > this.bombValue) {
      this.endGame('あなたが超過', 'あなたの出目で合計が爆弾の数値を超えました。');
      return;
    }
    this.refreshView();
    this.time.delayedCall(520, () => this.enemyTurn());
  }

  private passTurn(): void {
    if (this.passCount >= 2) {
      return;
    }
    this.passCount += 1;
    this.turn = 'enemy';
    this.enemyTurnPending = true;
    this.playerRoll = 0;
    this.refreshView();
    this.time.delayedCall(520, () => this.enemyTurn());
  }

  private enemyTurn(): void {
    if (this.gameState !== 'playing' || !this.enemyTurnPending) {
      return;
    }
    this.enemyTurnPending = false;
    this.enemyRoll = this.enemyRollForPattern();
    this.totalValue += this.enemyRoll;
    if (this.totalValue > this.bombValue) {
      this.endGame('敵が超過', '敵の出目で合計が爆弾の数値を超えました。あなたの勝ちです。');
      return;
    }
    this.turn = 'player';
    this.refreshView();
  }

  private enemyRollForPattern(): number {
    const remaining = this.bombValue - this.totalValue;
    if (this.enemyPattern === '慎重') {
      return Phaser.Math.Between(1, 3);
    }
    if (this.enemyPattern === '攻撃的') {
      return Phaser.Math.Between(2, 6);
    }
    return remaining <= 6 ? Phaser.Math.Between(1, 3) : Phaser.Math.Between(2, 5);
  }

  private endGame(title: string, detail: string): void {
    this.gameState = 'gameover';
    this.enemyTurnPending = false;
    this.resultMessage = title;
    this.detailText.setText(detail);
    this.instructionText.setText('[ スペース ]  もう一度遊ぶ     [ B ]  タイトル');
    this.refreshView();
    this.playExplosion();
  }

  private refreshView(): void {
    this.statusText.setText(this.gameState === 'paused' ? 'ポーズ中' : this.resultMessage || (this.turn === 'player' ? 'あなたのターン' : '敵が考え中…'));
    this.totalText.setText(`${this.totalValue}`);
    this.bombText.setText(`爆弾  ${this.bombValue}`);
    this.playerRollText.setText(this.playerRoll ? `${this.playerRoll}` : '-');
    this.enemyRollText.setText(this.enemyRoll ? `${this.enemyRoll}` : '-');
    if (this.gameState === 'paused') {
      this.instructionText.setText('[ ESC ]  再開');
    } else if (this.gameState === 'playing' && this.turn === 'player') {
      this.instructionText.setText('');
    }
    if (this.gameState === 'playing') {
      this.detailText.setText(`敵：${this.enemyPattern} / 安全 1-3 / 危険 2-6`);
    }
    this.updateChoiceDisplay();
    this.drawBoard();
  }

  private updateChoiceDisplay(): void {
    const isPlayerChoice = this.gameState === 'playing' && this.turn === 'player';
    this.safeChoiceText.setVisible(isPlayerChoice);
    this.dangerousChoiceText.setVisible(isPlayerChoice);
    this.safeKeyText.setVisible(isPlayerChoice);
    this.dangerousKeyText.setVisible(isPlayerChoice);
    this.playerRollText.setVisible(!isPlayerChoice);
  }

  private drawBoard(): void {
    this.overlayText?.destroy();
    this.overlayText = undefined;
    this.boardGraphics.clear();
    this.boardGraphics.fillStyle(0xfff4d6, 1);
    this.boardGraphics.fillRect(0, 0, 1280, 720);
    this.boardGraphics.lineStyle(1, 0xf5c6a5, 1);
    this.boardGraphics.lineBetween(640, 220, 640, 546);
    if (this.bombVisible) {
      this.boardGraphics.fillStyle(0xffdf76, 1);
      this.boardGraphics.fillCircle(640, 350, 112);
      this.boardGraphics.lineStyle(3, 0xed6a5a, 1);
      this.boardGraphics.strokeCircle(640, 350, 112);
    }
    this.boardGraphics.fillStyle(0xb9f0df, 1);
    this.boardGraphics.fillRoundedRect(150, 312, 228, 160, 8);
    this.boardGraphics.fillStyle(0xffc6d3, 1);
    this.boardGraphics.fillRoundedRect(902, 312, 228, 160, 8);
    this.drawGhost(264, 270, 0x55c7bd, 0x293462, false);
    this.drawGhost(1016, 270, 0xf07f9f, 0x293462, true);
    if (this.gameState === 'playing' && this.turn === 'player') {
      this.drawChoiceDie(205, 392, 0x6ed0b1);
      this.drawChoiceDie(323, 392, 0xef9c68);
    } else {
      this.drawDie(264, 392, this.playerRoll, 0x6ed0b1);
    }
    this.drawDie(1016, 392, this.enemyRoll, 0xef9c68);
    if (this.bombVisible) {
      this.boardGraphics.fillStyle(0xed6a5a, 1);
      this.boardGraphics.fillCircle(640, 350, 8);
      this.boardGraphics.lineStyle(3, 0xed6a5a, 1);
      this.boardGraphics.lineBetween(640, 238, 640, 220);
      this.boardGraphics.lineBetween(640, 220, 660, 220);
      this.boardGraphics.strokeCircle(640, 350, 72);
    }
    this.updateSweat();

    if (this.gameState === 'title') {
      this.boardGraphics.fillStyle(0xfff4d6, 0.9);
      this.boardGraphics.fillRect(73, 189, 1134, 400);
      this.boardGraphics.lineStyle(1, 0xed6a5a, 0.5);
      this.boardGraphics.strokeRect(330, 286, 620, 130);
      this.overlayText = this.add.text(640, 350, '爆発する前に振ろう', this.labelStyle(28, '#293462')).setOrigin(0.5);
    }
    if (this.gameState === 'paused') {
      this.boardGraphics.fillStyle(0xfff4d6, 0.92);
      this.boardGraphics.fillRect(73, 189, 1134, 400);
      this.overlayText = this.add.text(640, 350, 'ポーズ中', this.numberStyle(48, '#293462')).setOrigin(0.5);
    }
  }

  private drawDie(x: number, y: number, value: number, color: number): void {
    this.boardGraphics.fillStyle(0xffffff, 1);
    this.boardGraphics.fillRoundedRect(x - 42, y - 42, 84, 84, 10);
    this.boardGraphics.lineStyle(2, color, 1);
    this.boardGraphics.strokeRoundedRect(x - 42, y - 42, 84, 84, 10);

    if (value === 0) {
      return;
    }

    const pipPositions: Record<number, Array<[number, number]>> = {
      1: [[0, 0]],
      2: [[-1, -1], [1, 1]],
      3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
      6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    };
    this.boardGraphics.fillStyle(color, 1);
    for (const [column, row] of pipPositions[value] ?? []) {
      this.boardGraphics.fillCircle(x + column * 22, y + row * 22, 6);
    }
  }

  private drawChoiceDie(x: number, y: number, color: number): void {
    this.boardGraphics.fillStyle(0xffffff, 1);
    this.boardGraphics.fillRoundedRect(x - 38, y - 38, 76, 76, 12);
    this.boardGraphics.lineStyle(3, color, 1);
    this.boardGraphics.strokeRoundedRect(x - 38, y - 38, 76, 76, 12);
  }

  private drawGhost(x: number, y: number, bodyColor: number, faceColor: number, isEnemy: boolean): void {
    this.boardGraphics.fillStyle(bodyColor, 1);
    this.boardGraphics.fillCircle(x, y - 18, 34);
    this.boardGraphics.fillRect(x - 34, y - 18, 68, 48);
    this.boardGraphics.fillCircle(x - 22, y + 28, 12);
    this.boardGraphics.fillCircle(x, y + 28, 12);
    this.boardGraphics.fillCircle(x + 22, y + 28, 12);

    this.boardGraphics.fillStyle(faceColor, 1);
    this.boardGraphics.fillCircle(x - 12, y - 20, 5);
    this.boardGraphics.fillCircle(x + 12, y - 20, 5);
    this.boardGraphics.fillStyle(0xffffff, 1);
    this.boardGraphics.fillCircle(x - 10, y - 22, 2);
    this.boardGraphics.fillCircle(x + 14, y - 22, 2);
    this.boardGraphics.fillStyle(faceColor, 1);
    if (isEnemy) {
      this.boardGraphics.fillTriangle(x - 8, y - 2, x + 8, y - 2, x, y + 10);
    } else {
      this.boardGraphics.fillCircle(x, y + 4, 6);
    }
  }

  private resetExplosion(): void {
    this.tweens.killTweensOf(this.explosionGraphics);
    this.explosionGraphics.clear();
    this.explosionGraphics.setVisible(false).setAlpha(1).setScale(1).setPosition(0, 0);
  }

  private updateSweat(): void {
    const isDangerous = this.bombValue > this.totalValue && this.bombValue - this.totalValue < 7;
    if (isDangerous && !this.sweatActive) {
      this.playSweat();
    } else if (!isDangerous && this.sweatActive) {
      this.resetSweat();
    }
  }

  private resetSweat(): void {
    this.tweens.killTweensOf(this.sweatGraphics);
    this.sweatGraphics.clear();
    this.sweatGraphics.setVisible(false).setAlpha(1).setY(0);
    this.sweatActive = false;
  }

  private playSweat(): void {
    this.sweatGraphics.clear();
    this.sweatGraphics.fillStyle(0x62c8ef, 1);
    this.sweatGraphics.fillCircle(225, 250, 6);
    this.sweatGraphics.fillTriangle(219, 250, 231, 250, 225, 238);
    this.sweatGraphics.fillCircle(303, 250, 6);
    this.sweatGraphics.fillTriangle(297, 250, 309, 250, 303, 238);
    this.sweatGraphics.fillCircle(977, 250, 6);
    this.sweatGraphics.fillTriangle(971, 250, 983, 250, 977, 238);
    this.sweatGraphics.fillCircle(1055, 250, 6);
    this.sweatGraphics.fillTriangle(1049, 250, 1061, 250, 1055, 238);
    this.sweatGraphics.setVisible(true).setAlpha(1).setY(0);
    this.sweatActive = true;
    this.tweens.add({
      targets: this.sweatGraphics,
      y: 12,
      alpha: 0.55,
      duration: 480,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private playExplosion(): void {
    const centerX = 640;
    const centerY = 350;
    this.explosionGraphics.clear();
    this.explosionGraphics.setPosition(centerX, centerY);
    this.explosionGraphics.fillStyle(0xfff0a3, 1);
    this.explosionGraphics.fillCircle(0, 0, 72);
    this.explosionGraphics.lineStyle(12, 0xef765d, 1);
    this.explosionGraphics.strokeCircle(0, 0, 92);
    this.explosionGraphics.lineStyle(8, 0xffb35c, 1);
    for (let index = 0; index < 24; index += 1) {
      const angle = (Math.PI * 2 * index) / 24;
      const innerRadius = 12;
      const outerRadius = index % 2 === 0 ? 210 : 170;
      this.explosionGraphics.lineBetween(
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius,
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius,
      );
    }
    this.explosionGraphics.setVisible(true).setAlpha(1).setScale(0.35);
    this.tweens.add({
      targets: this.explosionGraphics,
      scale: 1.35,
      alpha: 0,
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.explosionGraphics.setVisible(false);
        this.bombVisible = false;
        this.bombText.setVisible(false).setAlpha(0).setText('');
        this.drawBoard();
      },
    });
  }

  private labelStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'Yu Gothic, Meiryo, sans-serif', fontSize: `${fontSize}px`, color, align: 'center' };
  }

  private keyStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return { ...this.labelStyle(fontSize, '#293462'), fontStyle: 'bold' };
  }

  private numberStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'Yu Gothic, Meiryo, sans-serif', fontSize: `${fontSize}px`, color, fontStyle: 'bold', align: 'center' };
  }
}