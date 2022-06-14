let video;
let detector;
let poses = [];
let updateRate = 30;
let scoreThreshold = 0.3;
let offset = {x: 0, y: 0};
let aspectFillScale = 1;

let logging = false;
let loggingButton;
let downloadButton;
let cameraDropdown;
let currentCameraId;

let jointsEnabled = {
    // nose: false, // nose is good for quick testing without needing fully body in frame
    left_elbow: true,
    right_elbow: true,
    left_shoulder: true,
    right_shoulder: true,
    left_hip: true,
    right_hip: true,
    left_knee: true,
    right_knee: true
};

let jointTargets = {};
const jointTargetSize = {width: 50, height: 50};

let loggingTypeDropdown;
const LoggingTypes = {
    Joint_Angles: "Record angles",
    Keypoints: "Record positions",
    Both: "Record both"
}; 
let loggingType = LoggingTypes.Joint_Angles; 

const detectorModel = poseDetection.SupportedModels.MoveNet;
const keypointIndexes = poseDetection.util.getKeypointIndexByName(detectorModel);

async function setup() {
    detector = await poseDetection.createDetector(detectorModel);

    startCameraCapture();

    createCanvas(windowWidth, windowHeight);
    
    loggingButton = createButton('Start data log');
    loggingButton.mousePressed(toggleLogging);
    loggingButton.style('background', '#00ff00');

    downloadButton = createButton('Download');
    downloadButton.mousePressed(downloadCSV);

    downloadButton.hide();

    loggingTypeDropdown = createSelect();
    loggingTypeDropdown.changed(handleLoggingTypeSelection);
    Object.keys(LoggingTypes).forEach(t => {
        loggingTypeDropdown.option(LoggingTypes[t]);
    });

    updateCameraDropdown();
    updateUI();
    
    Object.keys(jointsEnabled).forEach(key => {
        jointTargets[key] = touchDivFor(key);
    });
}

// Camera Handling
async function startCameraCapture(deviceId) {
    if (video) {
        video.remove();
    }
    
    let videoConstraints = {
        audio: false,
        video: {
            facingMode: "environment",
        }
    };
    
    if (deviceId && deviceId.length > 0) {
        videoConstraints.video = {
            deviceId: deviceId
        }
    }
    
    video = await createCapture(videoConstraints, videoReady);
   
    // Hide the video element, and just show the canvas
    video.hide();
}

async function getCameras() {
    let cameras = [];

    await navigator.mediaDevices.enumerateDevices().then(function(devices) {
        devices.forEach(function(device) {
            if (device.kind == 'videoinput') {
                cameras.push({
                    label: device.label,
                    id: device.deviceId
                });
            }
        });
        return cameras;
    }).catch(function(err) {
        console.log(err.name + ": " + err.message);
    });


    console.log("Loaded Cameras");
    console.log(cameras);
    return cameras;
}

async function updateCameraDropdown() {
    console.log("Update Camera Dropdown");
    
    if (cameraDropdown !== undefined) {
        cameraDropdown.remove();
    }
    
    cameraDropdown = createSelect();
    cameraDropdown.changed(handleCameraSelection);

    await getCameras().then(function(devices){
        devices.forEach(function(device) {
            cameraDropdown.option(device.label, device.id);
        });
    });
    
    if (currentCameraId) {
        cameraDropdown.selected(currentCameraId);
    }
}

function handleCameraSelection() {
    startCameraCapture(cameraDropdown.value());
}

function handleLoggingTypeSelection() {
    loggingType = loggingTypeDropdown.value();
}

async function videoReady() {
    while (!video.loadedmetadata) {}
    
    currentCameraId = video.elt.srcObject.getVideoTracks()[0].getSettings().deviceId;
    
    updateCameraDropdown();
    updateUI();
    
    console.log("video ready");
    frameRate(updateRate);
    
    getPoses();
}


function windowResized() {
    resizeCanvas(windowWidth, windowHeight); 
    updateUI(); 
}


async function getPoses() {
    setTimeout(getPoses, (1/updateRate) * 1000.0);
    
    if (video === undefined || !video.loadedmetadata) {
        return;
    }
    
    poses = await detector.estimatePoses(video.elt);
}


// Drawing
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

    // // We can call both functions to draw all keypoints and the skeletons
    drawKeypoints();
    drawSkeleton();
    drawAngles();
    
    logPoints();
}

function drawKeypoints() {
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i += 1) {
    // For each pose detected, loop through all the keypoints
    const pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j += 1) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      const keypoint = pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than threshold
      if (keypoint.score > scoreThreshold) {
        fill(255, 0, 0);
        stroke(255, 255, 255);
        strokeWeight(1);
        ellipse((keypoint.x * aspectFillScale) + offset.x, (keypoint.y * aspectFillScale) + offset.y, 10, 10);
      }
    }

    return; // Only draw one pose
  }
}

function drawSkeleton() {
    // Loop through all the poses detected
    for (let i = 0; i < poses.length; i += 1) {
        const pose = poses[i];
        poseDetection.util.getAdjacentPairs(detectorModel).forEach(([i, j]) => {
            const kp1 = pose.keypoints[i];
            const kp2 = pose.keypoints[j];

            // If score is null, just show the keypoint.
            const score1 = kp1.score != null ? kp1.score : 1;
            const score2 = kp2.score != null ? kp2.score : 1;
            if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
              stroke(255, 0, 0);
              strokeWeight(1);
              line((kp1.x * aspectFillScale) + offset.x, (kp1.y * aspectFillScale) + offset.y, (kp2.x * aspectFillScale) + offset.x, (kp2.y * aspectFillScale) + offset.y);
            }
        });
        
        return; // Only draw one pose
    }
}

function drawAngles() {
    angleMode(DEGREES);
    
    let fontSize = 32;
    textSize(fontSize);
    textAlign(CENTER);
    
    for (let i = 0; i < poses.length; i += 1) {
        const pose = poses[i];
        const joints = getJointsFor(pose);
        
        Object.keys(joints).forEach(jointName => {
            const j = joints[jointName];
            
            let jointPoint = convertPointForCanvas(j.position);
            
            if (j.enabled && j.isValid) {
                let angle = j.angle;
                let jointPoint = convertPointForCanvas(j.position);

                stroke(255);
                strokeWeight(4);
                text(angle, jointPoint.x, jointPoint.y);
            }
            
            // console.log(jointTargets);
            // !!!: This will lead to unexpected results when doing more than one pose
            jointTargets[jointName].position(jointPoint.x - (jointTargetSize.width/2), jointPoint.y - (jointTargetSize.height/2));
        });
        
        return; // Only draw angles for one pose
    }
}

function convertPointForCanvas(point) {
    return {
        x: (point.x * aspectFillScale) + offset.x,
        y: (point.y * aspectFillScale) + offset.y,
    };
}

function touchDivFor(joint) {
    div = createDiv();
    div.style('font-size', '16px');
    div.position(0, 0);
    div.size(jointTargetSize.width, jointTargetSize.height);
    div.style('background', 'rgba(0,0,0,0)');

    div.mouseClicked(function() {
        console.log("Clicked: " + joint);
        if (!logging) {
            jointsEnabled[joint] = !jointsEnabled[joint];            
        }
    });
    
    return div;
}

class Joint {
    constructor(keypoints, enabled=true) {
        this.keypoints = keypoints;
        this.enabled = enabled;
    }

    get position() {
          return {x: this.keypoints[1].x, y: this.keypoints[1].y}
    }

    get vectors() {
        const v1 = createVector(this.keypoints[1].x - this.keypoints[0].x, this.keypoints[1].y - this.keypoints[0].y);
        const v2 = createVector(this.keypoints[1].x - this.keypoints[2].x, this.keypoints[1].y - this.keypoints[2].y);

        return {
            angle: v1.angleBetween(v2),
            v1: v1,
            v2: v2
        };    
    }

    get angle() {
        return this.vectors.angle.toFixed(0);
    }
    
    get isValid() {
        return this.keypoints[0].score > scoreThreshold && this.keypoints[1].score > scoreThreshold && this.keypoints[2].score > scoreThreshold;
    }
}

function getJointsFor(pose) {
    const keypoints = pose.keypoints;
    return {
        // nose is good for quick testing without needing fully body in frame
        // nose: new Joint([keypoints[keypointIndexes.left_eye], keypoints[keypointIndexes.nose], keypoints[keypointIndexes.right_eye]], jointsEnabled.nose),
        left_elbow: new Joint([keypoints[keypointIndexes.left_shoulder], keypoints[keypointIndexes.left_elbow], keypoints[keypointIndexes.left_wrist]], jointsEnabled.left_elbow),
        right_elbow: new Joint([keypoints[keypointIndexes.right_shoulder], keypoints[keypointIndexes.right_elbow], keypoints[keypointIndexes.right_wrist]], jointsEnabled.right_elbow),
        left_shoulder: new Joint([keypoints[keypointIndexes.left_hip], keypoints[keypointIndexes.left_shoulder], keypoints[keypointIndexes.left_elbow]], jointsEnabled.left_shoulder),
        right_shoulder: new Joint([keypoints[keypointIndexes.right_hip], keypoints[keypointIndexes.right_shoulder], keypoints[keypointIndexes.right_elbow]], jointsEnabled.right_shoulder),
        left_hip: new Joint([keypoints[keypointIndexes.left_shoulder], keypoints[keypointIndexes.left_hip], keypoints[keypointIndexes.left_knee]], jointsEnabled.left_hip),
        right_hip: new Joint([keypoints[keypointIndexes.right_shoulder], keypoints[keypointIndexes.right_hip], keypoints[keypointIndexes.right_knee]], jointsEnabled.right_hip),
        left_knee: new Joint([keypoints[keypointIndexes.left_hip], keypoints[keypointIndexes.left_knee], keypoints[keypointIndexes.left_ankle]], jointsEnabled.left_knee),
        right_knee: new Joint([keypoints[keypointIndexes.right_hip], keypoints[keypointIndexes.right_knee], keypoints[keypointIndexes.right_ankle]], jointsEnabled.right_knee),
    };
}


function updateUI() {
    const padding = 20;
    let buttonWidth = windowWidth - (2 * padding);
    const buttonHeight = windowHeight * 0.1;
    
    loggingButton.size(buttonWidth, buttonHeight);
    loggingButton.position(padding, windowHeight - padding - buttonHeight);
    
    const showDownloadButton = !logging && loggedFrames.length > 0;
    
    if (showDownloadButton) {
        downloadButton.show();
        
        buttonWidth = (windowWidth - (3 * padding)) / 2 ;
        loggingButton.size(buttonWidth, buttonHeight);        
        
        downloadButton.size(buttonWidth, buttonHeight);
        downloadButton.position(buttonWidth + (2 * padding), windowHeight - padding - buttonHeight);
    } else {
        downloadButton.hide();
    }
    
    cameraDropdown.position(padding, padding);
    
    loggingTypeDropdown.position(windowWidth - loggingTypeDropdown.size().width - padding, padding);
}


// Logging
let loggedFrames = [];

function toggleLogging() {
    if (!logging) {
        loggedFrames = [];
        loggingButton.html("Stop data log");
        loggingButton.style('background', '#ff0000');
    } else {
        loggingButton.html("Start data log");
        loggingButton.style('background', '#00ff00');
    }

    logging = !logging;

    updateUI();
}


function logPoints() {
    if (!logging) {
        return;
    }
    
    let timestamp = luxon.DateTime.now().toISO();
    
    for (let i = 0; i < poses.length; i += 1) {
        // For each pose detected, loop through all the keypoints
        const pose = poses[i];
        let loggedFrame = {time: timestamp};

        if (loggingType == LoggingTypes.Joint_Angles || loggingType == LoggingTypes.Both) {
            const joints = getJointsFor(pose);
        
            Object.keys(joints).forEach(jointName => {
                const j = joints[jointName];

                if (j.enabled) {
                    let jointAngle = null;

                    if (j.isValid) {
                        jointAngle = j.angle;
                    }

                    loggedFrame[jointName + '_angle'] = jointAngle;
                }
            });
        }
        
        if (loggingType == LoggingTypes.Keypoints || loggingType == LoggingTypes.Both) {
            // The order of the pose keypoints is alwasy the same
            pose.keypoints.forEach(keypoint => {
                
                if (!keypoint.name.includes("ear") && !keypoint.name.includes("eye")) {
                    // log a null value for invalid points to keep the frame format uniform
                    const validKeypoint = (keypoint.score > scoreThreshold);
                    const xValue =  validKeypoint ? keypoint.x : null;
                    const yValue = validKeypoint ? keypoint.y : null;

                    loggedFrame[keypoint.name + '_x'] = xValue;
                    loggedFrame[keypoint.name + '_y'] = yValue;
                }
            });
        }
        
        loggedFrames.push(loggedFrame);

      return; // Only log one pose
    }
}

function convertToCSV(arr) {
    const array = [Object.keys(arr[0])].concat(arr);

    return array.map(it => {
        return Object.values(it).toString()
    }).join('\n');
}

function downloadCSV() {
    var csvString = convertToCSV(loggedFrames);
    var csvBlob = new Blob([csvString]);
    
    var a = window.document.createElement("a");
    a.href = window.URL.createObjectURL(csvBlob, {
        type: "text/plain"
    });
    a.download = "data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
