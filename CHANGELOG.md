# Changelog

## 1.1.0

- 修复 GitHub 一键安装所需的仓库根目录结构说明
- 改进第三方扩展生命周期初始化：manifest hook + self-init 双保险
- 初始化过程幂等，避免重复创建 UI / timer
- 增加 pagehide 自动保存与 timer 清理
- `auto_update: true`
- 更新仓库主页为 `https://github.com/Flocia/SillyPet`
- 优化安卓平板触控尺寸、安全区域、竖屏/横屏布局
- 增加减少动态效果（prefers-reduced-motion）支持
- 优化按钮可访问性与悬浮球状态
- 清理旧版 care counter wrapper，避免重复刷新
