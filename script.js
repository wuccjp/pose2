// ==== 1. 取得 DOM 元素 ====
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('msg');

// ==== 2. 啟用相機 ====
async function initCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },   // 前鏡頭
    audio: false
  });
  video.srcObject = stream;
  await video.play();

  // 設定 canvas 大小與 video 一致
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}
initCamera().catch(e => console.error('相機錯誤:', e));

// ==== 3. 初始化 MediaPipe Pose ====
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
});

pose.setOptions({
  modelComplexity: 1,          // 0~2，2 為最高精度(較慢)
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults(onResults);

// ==== 4. 每幀送影像給 Pose ====
const fps = 30;  // 目標 FPS，可自行調整
function onFrame() {
  pose.send({ image: video });
}
setInterval(onFrame, 1000 / fps);

// ==== 5. 處理偵測結果 ====
function onResults(results) {
  // 清空 canvas
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  // 若沒有偵測到骨架，直接返回
  if (!results.poseLandmarks) {
    msg.textContent = '';
    ctx.restore();
    return;
  }

  // 繪製骨架（可自行調色）
  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS,
                 { color: '#00FF00', lineWidth: 4 });
  drawLandmarks(ctx, results.poseLandmarks,
                { color: '#FF0000', lineWidth: 2 });

  // ---------- 判斷右手抬高 ----------
  // 右手腕 (15)、右手肘 (13)、右肩 (11) 的 y 座標 (0 = 頂部)
  const wrist = results.poseLandmarks[15];
  const elbow = results.poseLandmarks[13];
  const shoulder = results.poseLandmarks[11];

  // 判斷條件：手腕高於肩膀（y 值較小）且手腕在手肘上方
  const isRightHandRaised = wrist.y < shoulder.y && wrist.y < elbow.y;

  // 顯示文字
  if (isRightHandRaised) {
    msg.textContent = '右手';
    // 也可以在手腕位置寫出文字
    const x = wrist.x * canvas.width;
    const y = wrist.y * canvas.height - 30; // 手上方 30px
    ctx.font = '48px Noto Sans TC';
    ctx.fillStyle = 'yellow';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.fillText('右手', x, y);
    ctx.strokeText('右手', x, y);
  } else {
    msg.textContent = '';
  }

  ctx.restore();
}
