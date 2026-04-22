let video;
let bodyPose;
let poses = [];

// 儀表板變數
let leftNumber, rightNumber;
let alertColorLeft, alertColorRight;
let normalColor, activeColor;

// 響應式佈局變數
let scaleFactor = 1;
let canvasW, canvasH;
let videoW = 320;
let videoH = 240;

function preload() {
  // 使用 MoveNet，這是手機執行最順暢的模型
  bodyPose = ml5.bodyPose("MoveNet");
}

function setup() {
  // 建立響應式畫布：自動充滿視窗，但維持 4:3 或自動適應
  canvasW = windowWidth;
  canvasH = windowHeight;
  createCanvas(canvasW, canvasH);

  // 初始化視訊 (強制 640x480 以獲得最佳偵測品質)
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  
  // 產生相異數字
  initNumbers();
  
  // 顏色設定
  normalColor = color(30, 30, 35, 220); 
  activeColor = color(255, 150, 0, 240); 
  alertColorLeft = normalColor;
  alertColorRight = normalColor;
  
  bodyPose.detectStart(video, gotPoses);
}

function draw() {
  background(10);

  // --- 1. 計算縮放比例與位置 (確保置中) ---
  let dashboardH = height / 2;
  let offsetX = (width - videoW) / 2;
  let offsetY = dashboardH;

  // --- 2. 上方：數字儀表板 ---
  drawDashboard(dashboardH);

  // --- 3. 下方：AI 影像區 (鏡射處理) ---
  push();
  // 鏡射邏輯
  translate(width, 0);
  scale(-1, 1);
  
  // 畫出影像 (320x240 置中)
  image(video, offsetX, offsetY, videoW, videoH);

  if (poses.length > 0) {
    let pose = poses[0];
    
    // 映射點位：原始 640x480 -> 320x240 置中
    let lw = getMappedPoint(pose.keypoints[9], offsetX, offsetY);
    let rw = getMappedPoint(pose.keypoints[10], offsetX, offsetY);
    let ls = getMappedPoint(pose.keypoints[5], offsetX, offsetY);
    let rs = getMappedPoint(pose.keypoints[6], offsetX, offsetY);

    drawKeypoints(lw, rw, ls, rs);

    // --- 動作狀態監聽 ---
    // 左手 (鏡射後座標一致)
    if (lw.confidence > 0.4 && ls.confidence > 0.4 && lw.y < ls.y) {
      alertColorLeft = activeColor;
    } else {
      alertColorLeft = normalColor;
    }

    // 右手
    if (rw.confidence > 0.4 && rs.confidence > 0.4 && rw.y < rs.y) {
      alertColorRight = activeColor;
    } else {
      alertColorRight = normalColor;
    }
  }
  pop();
}

// 輔助函式：座標轉換
function getMappedPoint(kp, offX, offY) {
  return {
    x: kp.x * (videoW / 640) + offX,
    y: kp.y * (videoH / 480) + offY,
    confidence: kp.confidence
  };
}

function drawDashboard(h) {
  let padding = 20;
  let rectW = (width / 2) - (padding * 1.5);
  let rectH = h - (padding * 2);

  noStroke();
  // 左側
  fill(alertColorLeft);
  rect(padding, padding, rectW, rectH, 15);
  // 右側
  fill(alertColorRight);
  rect(width / 2 + padding/2, padding, rectW, rectH, 15);

  fill(255);
  textAlign(CENTER, CENTER);
  textFont('Courier New');
  textSize(min(width/6, 100)); // 根據螢幕寬度自動縮放字體
  text(leftNumber, width/4, h/2);
  text(rightNumber, width*0.75, h/2);
}

function drawKeypoints(lw, rw, ls, rs) {
  fill(0, 255, 150);
  noStroke();
  [lw, rw, ls, rs].forEach(p => {
    if (p.confidence > 0.3) circle(p.x, p.y, 8);
  });
}

function initNumbers() {
  leftNumber = floor(random(10, 100));
  rightNumber = floor(random(10, 100));
  while (rightNumber === leftNumber) {
    rightNumber = floor(random(10, 100));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function gotPoses(results) {
  poses = results;
}
