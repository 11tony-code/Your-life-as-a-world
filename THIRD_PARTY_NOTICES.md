# 开源来源与素材说明

| 依赖 | 版本 | 用途 | 官方来源 |
| --- | --- | --- | --- |
| React / React DOM | 19.3.0 | UI 与状态 | https://react.dev/ |
| Vite | 8.3.4 | 开发与编译 | https://vite.dev/ |
| PixiJS | 8.22.0 | 二维地图渲染 | https://pixijs.com/ |
| Three.js | 0.186.1 | 三维岛屿与 OrbitControls | https://threejs.org/ |
| Lucide React | 1.55.0 | 基础界面图标 | https://lucide.dev/ |

精确依赖和传递依赖见 `package-lock.json`，完整许可证汇集在 `THIRD_PARTY_LICENSES.txt`。React、Vite、PixiJS、Three.js 为 MIT；Lucide 为 ISC。代码生成的图形为本项目新增内容，基础图标使用 Lucide。构建工具所需的传递依赖没有作为本项目原创内容声明。

未使用远程图像、音乐封面、第三方字体或歌曲音频。二维光晕、纹理、明信片和三维几何均由本项目代码生成；截图为本应用的实际运行界面。环境音通过 Web Audio 合成。

`playlist.csv` 是用户提供的音乐元数据；不含歌曲录音。歌曲名称、艺人名称仅用于记录与识别，不表示与这些艺人存在合作或授权关系。

比赛选题及用户 UI 参考作为需求来源；没有复制其中的作品角色、名称与设定。关于相似产品的比较见 `docs/SUBMISSION.md`。
