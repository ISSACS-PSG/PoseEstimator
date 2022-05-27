let video;
let detector;
let poses = [];
let updateRate = 30;
let scoreThreshold = 0.5;
let offset = {x: 0, y: 0};
let aspectFillScale = 1;


async function setup() {
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);

    createCanvas(windowWidth, windowHeight);
    video = createCapture(VIDEO, videoReady);

    // Hide the video element, and just show the canvas
    video.hide();
}

function videoReady() {
    console.log("video ready");
    frameRate(updateRate);
    
    getPoses();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);  
}

async function getPoses() {
    poses = await detector.estimatePoses(video.elt);
    setTimeout(getPoses, (1/updateRate) * 1000.0);
}

function draw() {
    
    if (video === undefined) {
        return;
    }
    
    xFillScale = width / video.width;
    yFillScale = height / video.height;
    
    aspectFillScale = max(xFillScale, yFillScale);
    aspectFillWidth = video.width * aspectFillScale;
    aspectFillHeight = video.height * aspectFillScale;
    
    xOffset = (width - aspectFillWidth)/2;
    yOffset = (height - aspectFillHeight)/2;
    
    offset = {x: xOffset, y: yOffset};
    
    image(video, offset.x, offset.y, aspectFillWidth, aspectFillHeight);
    
    // We can call both functions to draw all keypoints and the skeletons
    drawKeypoints();
    drawSkeleton();
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i += 1) {
    // For each pose detected, loop through all the keypoints
    const pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j += 1) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      const keypoint = pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > scoreThreshold) {
        fill(255, 0, 0);
        stroke(255, 255, 255);
        ellipse((keypoint.x * aspectFillScale) + offset.x, (keypoint.y * aspectFillScale) + offset.y, 10, 10);
      }
    }
    
    return; // Only draw one pose
  }
}

// A function to draw the skeletons
function drawSkeleton() {
    // Loop through all the skeletons detected
    for (let i = 0; i < poses.length; i += 1) {
        const pose = poses[i];
        poseDetection.util.getAdjacentPairs("MoveNet").forEach(([i, j]) => {
            const kp1 = pose.keypoints[i];
            const kp2 = pose.keypoints[j];

            // If score is null, just show the keypoint.
            const score1 = kp1.score != null ? kp1.score : 1;
            const score2 = kp2.score != null ? kp2.score : 1;
            if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
              stroke(255, 0, 0);
              line((kp1.x * aspectFillScale) + offset.x, (kp1.y * aspectFillScale) + offset.y, (kp2.x * aspectFillScale) + offset.x, (kp2.y * aspectFillScale) + offset.y);
            }
        });
        
        return; // Only draw one pose
    }
}
