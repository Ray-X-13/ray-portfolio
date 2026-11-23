# 指尖生花 · Gesture Bloom

把拇指与食指的距离映射为花朵开合进度。摄像头画面只在本机使用，不会上传。

![指尖生花预览](./preview.png)

## 运行

摄像头 API 需要 `localhost` 或 HTTPS 环境，不能直接双击 `index.html` 打开。

```bash
cd /Users/x/Documents/ChatGPT/地瓜/花朵手势交互
python3 -m http.server 8080
```

然后访问 <http://localhost:8080>，点击右上角「开启手势」，允许摄像头权限。

没有摄像头时，也可以按住画面左右拖动，或用方向键控制。点击「自动演示」可循环展示花开过程。

## 实现方式

- 使用 MediaPipe Hand Landmarker 获取手部 21 个关键点。
- 读取拇指指尖 `landmark 4` 与食指指尖 `landmark 8`。
- 用「两指距离 ÷ 手掌尺寸」消除手离镜头远近造成的误差。
- 将归一化距离映射到 `0–1` 的花开进度，并加入弹簧缓动，避免画面抖动。
- 花朵由 Canvas 实时绘制，不依赖视频素材；每一帧的开合度都由手指距离驱动。

MediaPipe 的 JS 与模型默认从 CDN 加载，首次开启手势需要联网。当前固定使用
`@mediapipe/tasks-vision@1.2.3`，避免未锁定版本更新后出现接口变化。
