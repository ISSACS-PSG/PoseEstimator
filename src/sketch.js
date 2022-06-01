let video;
let detector;
let poses = [];
let updateRate = 30;
let scoreThreshold = 0.5;
let offset = {x: 0, y: 0};
let aspectFillScale = 1;

let logging = false;
let loggingButton;
let downloadButton;
let cameraDropdown;
let currentCameraId;

async function setup() {
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);

    startCameraCapture();

    createCanvas(windowWidth, windowHeight);
    
    loggingButton = createButton('Start');
    loggingButton.mousePressed(toggleLogging);

    downloadButton = createButton('Download');
    downloadButton.mousePressed(downloadCSV);

    downloadButton.hide();

    updateCameraDropdown();
    updateUI();
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

function updateUI() {
    const padding = 20;
    const buttonWidth = windowWidth - (2 * padding);
    const buttonHeight = min(100, (windowHeight * 0.1));
    
    loggingButton.size(buttonWidth, buttonHeight);
    loggingButton.position(padding, windowHeight - padding - buttonHeight);
    
    downloadButton.size(buttonWidth, buttonHeight);
    downloadButton.position(padding, padding);
    
    if (logging) {
        downloadButton.hide();
    } else if (loggedPoints.length > 0) {
        downloadButton.show();
    }
    
    cameraDropdown.position(padding, padding);
}


// Logging
let loggedPoints = [];

function toggleLogging() {
    if (!logging) {
        loggedPoints = [];
        loggingButton.html("Stop");
    } else {
        loggingButton.html("Start");
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
      for (let j = 0; j < pose.keypoints.length; j += 1) {
        // A keypoint is an object describing a body part (like rightArm or leftShoulder)
        const keypoint = pose.keypoints[j];
        // Only log points above the threshold
        if (keypoint.score > scoreThreshold) {
            loggedPoint = {time: timestamp,
                           name: keypoint.name,
                           x: keypoint.x,
                           y: keypoint.y, 
                           score: keypoint.score};
            loggedPoints.push(loggedPoint);
        }
      }

      return; // Only draw one pose
    }
}

function convertToCSV(arr) {
  const array = [Object.keys(arr[0])].concat(arr)

  return array.map(it => {
    return Object.values(it).toString()
  }).join('\n')
}

function downloadCSV() {
    var csvString = convertToCSV(loggedPoints);
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
