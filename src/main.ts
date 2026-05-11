import Phaser from "phaser";
import "./style.css";
import { BootScene } from "./scenes/BootScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { HoleScene } from "./scenes/HoleScene";
import { ScoreScene } from "./scenes/ScoreScene";
import { TitleScene } from "./scenes/TitleScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#172419",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },
  input: {
    activePointers: 3,
  },
  dom: {
    createContainer: true,
  },
  scene: [BootScene, TitleScene, CharacterSelectScene, HoleScene, ScoreScene],
};

new Phaser.Game(config);
