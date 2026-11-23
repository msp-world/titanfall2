# titanfall2

泰坦陨落 2 游戏桥接的 MSP World 节点。此仓库作为 [msp-world-cli](https://github.com/msp-world/msp-world-cli) 的子模块使用，依赖同级 `shared` 和主仓库中的 `msp-ts`，不能仅克隆本仓库后直接运行。

## 使用

需要 Node.js 22.6 或更新版本。

```bash
git clone --recurse-submodules https://github.com/msp-world/msp-world-cli.git
cd msp-world-cli
npm start -- titanfall2
```

主要配置：TF2_BRIDGE_URL。通用连接配置及详细说明见[主仓库](https://github.com/msp-world/msp-world-cli)。
运行时需要对应的外部桥接服务、Mod 或状态文件，详见主仓库说明。

## 上游与致谢

源码注明移植自 [cortico-world-titanfall2-assistant](https://github.com/Phantivia/cortico-world-titanfall2-assistant)；上游包元数据列出的作者：Phantivia。

本仓库是 MSP 适配实现，并非上游原仓库。感谢上游作者及贡献者。
