# 开源来源与素材说明

| 依赖 | 版本 | 用途 | 官方来源 |
| --- | --- | --- | --- |
| React / React DOM | 19.3.0 | UI 与状态 | https://react.dev/ |
| Vite | 8.3.4 | 开发与编译 | https://vite.dev/ |
| PixiJS | 8.22.0 | 二维地图渲染 | https://pixijs.com/ |
| Three.js | 0.186.1 | 三维岛屿与 OrbitControls | https://threejs.org/ |
| Lucide React | 1.55.0 | 基础界面图标 | https://lucide.dev/ |
| opencc-js | 1.4.2 | 中文元数据的简繁转换，按需加载 | https://github.com/nk2028/opencc-js |

精确依赖和传递依赖见 `package-lock.json`，完整许可证汇集在 `THIRD_PARTY_LICENSES.txt`。React、Vite、PixiJS、Three.js 为 MIT；Lucide 为 ISC；opencc-js 代码为 MIT，其 OpenCC 字典数据为 Apache-2.0，许可文本均已附上。代码生成的图形为本项目新增内容，基础图标使用 Lucide。构建工具所需的传递依赖没有作为本项目原创内容声明。

二维光晕、纹理、明信片和三维几何均由本项目代码生成；截图为本应用的实际运行界面。环境音通过 Web Audio 合成。没有使用音乐封面或第三方字体。

`public/itunes-store-badge.svg` 是 Apple 官方提供的 Get it on iTunes Store 标识，原图未修改，来自 [官方商店标识指引](https://marketing.services.apple/itunes-identity-guidelines) 的 US / UK 素材包。该标识不属于本项目 MIT 原创素材；使用遵循 Apple 指引。

用户点击查询商店试听时，应用使用 [iTunes Search API](https://performance-partners.apple.com/search-api) 返回的元数据、商店链接和短试听流。录音没有下载到项目或交付包中；界面显示实际歌名、艺人、专辑与来源署名，标识直接链接至对应商店曲目。第三方曲库与试听可用性由 Apple 提供，不能保证所有歌曲均有对应版本。

`playlist.csv` 是用户提供的音乐元数据；不含歌曲录音。歌曲名称、艺人名称仅用于记录与识别，不表示与这些艺人存在合作或授权关系。

比赛选题及用户 UI 参考作为需求来源；没有复制其中的作品角色、名称与设定。关于相似产品的比较见 `docs/SUBMISSION.md`。
