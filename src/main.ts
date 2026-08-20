import Phaser from 'phaser';
<<<<<<< HEAD
import { GameScene } from './scenes/GameScene';
=======
import { HelloScene } from './scenes/HelloScene';
>>>>>>> origin/master

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
<<<<<<< HEAD
  backgroundColor: '#fff4d6',
=======
  backgroundColor: '#ffffff',
>>>>>>> origin/master
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
<<<<<<< HEAD
  scene: [GameScene],
=======
  scene: [HelloScene],
>>>>>>> origin/master
};

const game = new Phaser.Game(config);

// HMR: src 配下を編集したら、古い Game インスタンスを破棄して作り直す
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
  import.meta.hot.accept();
}
