# 最后一张照片 · The Last Frame

**V9 公开试玩版。** 一段无需安装的第一人称沉船探索游戏。下潜找船，拍下右舷铭牌，再决定进舱寻找彩窗，还是直接返航。两条路线都要回到出发时的下潜设备，靠近舱口点「返回」才结算。

- 建议用电脑的 Chrome、Edge 或 Safari 试玩。支持 WebGL 2 的设备使用完整 3D；其他设备会切换成轻量画面。
- W 前进、S 后退、A 左移、D 右移；方向键或拖动鼠标转视角；Q 下潜，E 上浮，F 手电，空格拍照，M 静音，Esc 暂停；需要路线时按 H。触屏也可用。
- 潜水深度、气量和路线是游戏设定，不是现实潜水指南。海雾号为虚构船只。
- 如果反馈问题，欢迎带上设备、浏览器和当时的位置或截图。尤其想知道第一次是否找得到船、要拍什么，以及有无卡住或穿模。

[在线试玩](https://songeast5858.github.io/the-last-frame-dive/) · [报告反馈](https://github.com/SongEast5858/the-last-frame-dive/issues)

V9 改进船壳局部锈蚀，鱼群增至 7 种、379 条，新增刺鳐和金红鱼。

## 本地试玩

使用静态 HTTP 服务打开本目录，例如运行 `python3 -m http.server 8000`，再打开 `http://localhost:8000/`。不需构建、后端或账户。

## 第三方许可

- [Three.js r160](https://github.com/mrdoob/three.js/tree/r160)，MIT。见 [许可](vendor/THREE-LICENSE.txt)。
- 水面、海床、海藻、鱼群、珊瑚及部分水下效果改编自 [Abyssal Garden](https://github.com/Noniv/abyssal-garden/tree/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf)，MIT。见 [许可](vendor/ABYSSAL-GARDEN-MIT.txt)。
- 鱼类扫描及模型的来源和 CC0 许可见[素材说明](media/FISH-CREDITS.txt)。
- 第三方内容各自按原许可；本试玩发布不另行授予本项目原创部分的开源许可。
