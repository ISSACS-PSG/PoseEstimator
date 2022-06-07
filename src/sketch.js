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
let detectorModel = poseDetection.SupportedModels.MoveNet;

async function setup() {
    detector = await poseDetection.createDetector(detectorModel);

    startCameraCapture();

    createCanvas(windowWidth, windowHeight);
    
    loggingButton = createButton('Start');
    loggingButton.mousePressed(toggleLogging);
    loggingButton.style('background', '#00ff00');

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
        poseDetection.util.getAdjacentPairs(detectorModel).forEach(([i, j]) => {
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
}


// Logging
let loggedFrames = [];

function toggleLogging() {
    if (!logging) {
        loggedFrames = [];
        loggingButton.html("Stop");
        loggingButton.style('background', '#ff0000');
    } else {
        loggingButton.html("Start");
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

        // The order of the pose keypoints is alwasy the same
        pose.keypoints.forEach(keypoint => {
            // log a null value for invalid points to keep the frame format uniform
            const validKeypoint = (keypoint.score > scoreThreshold);
            const xValue =  validKeypoint ? keypoint.x : null;
            const yValue = validKeypoint ? keypoint.y : null;

            loggedFrame[keypoint.name + '_x'] = xValue;
            loggedFrame[keypoint.name + '_y'] = yValue;
        });
        
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
