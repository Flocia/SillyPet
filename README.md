# SillyPet · 电子宠物小屋

一个纯前端、无服务器依赖、无第三方运行时依赖的 SillyTavern 第三方扩展。入口是聊天界面右下角的猫爪悬浮球。

## 一键 GitHub 安装（推荐）

1. 将本仓库的以下文件**直接放在 GitHub 仓库根目录**：

```text
SillyPet/
├── manifest.json
├── index.js
├── style.css
├── README.md
└── CHANGELOG.md
```

2. 在 SillyTavern：`Extensions → Install Extension`。
3. 粘贴：

`https://github.com/Flocia/SillyPet`

也可以粘贴带 `.git` 的形式：

`https://github.com/Flocia/SillyPet.git`

> 不要把 `manifest.json` 再放进第二层子目录。SillyTavern 下载第三方扩展时会以这个 Git 仓库作为扩展目录。

## 功能

- 白兔子 / 黑猫 / 灰色小狗
- 6 种食物：胡萝卜、小鱼、肉肉、牛奶、小蛋糕、莓莓
- 2 种洗澡工具：肥皂、沐浴露
- 6 套服装：水手服、魔法师、软萌卫衣、透明雨衣、夏日浴衣、小小王冠
- 心情 / 清洁 / 饱肚三项数值随时间自动衰减
- 饥饿、变脏、低落时有专属动画和表情
- 每次互动随机增加相应数值
- 宠物名字、服装、状态本地保存
- 不依赖外部图片/CDN/API
- 移动端安全区适配，适合安卓平板竖屏/横屏
- 悬浮猫爪不占用 SillyTavern 原有功能按钮

## 生命周期与兼容性

`manifest.json` 使用 SillyTavern 的 `hooks.activate` 声明，同时 `index.js` 还带有第三方扩展自初始化回退，因此即使某些版本/启动路径不触发 manifest hook，也会在页面加载后自动初始化。

初始化是幂等的：重复触发不会创建第二只猫爪或第二个定时器。

## 更新

`manifest.json` 设置了 `auto_update: true`，仓库主页指向本仓库。发布新版时提高 `version` 并提交到 GitHub；SillyTavern 可以从扩展管理界面检查/更新扩展。

## 数据

状态存储在浏览器 `localStorage`。不向聊天消息写入数据，也不请求网络接口。


### v1.4.0 Android compatibility
- Third-party manifest no longer depends on `hooks.activate`.
- Self-initialization uses DOM ready plus SillyTavern/jQuery ready when available.
- The floating layer is a dedicated full-screen fixed top layer and can recover if the host UI rerenders.
- Optimized for Android WebView/Chrome touch input and safe-area insets.


### v1.4.0 浮球兼容性
悬浮猫爪采用与 Silly-Game 参考项目相同的 body-level fixed launcher 思路：悬浮按钮独立追加到 `document.body`，不依赖扩展钩子导出；同时提供 inline visibility fallback，针对 Android WebView / 移动端主题覆盖进行兼容。
