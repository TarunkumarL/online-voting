const video = document.getElementById("video");
const scanBtn = document.getElementById("scanBtn");

let currentUser = null;

// ---------------------- LOAD MODELS ----------------------
window.addEventListener("load", async () => {

    if (typeof faceapi === "undefined") {
        alert("face-api.js not loaded!");
        return;
    }

    console.log("face-api loaded ✅");

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('./models')
    ]);

    startVideo();
    showResults();
});

// ---------------------- START CAMERA ----------------------
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                video.play();
                console.log("Camera ready ✅");
            };
        })
        .catch(err => {
            alert("Camera access denied!");
            console.error(err);
        });
}

// ---------------------- STORAGE HELPERS ----------------------
function getStoredFaces() {
    return JSON.parse(localStorage.getItem("faces")) || [];
}

function saveFaces(faces) {
    localStorage.setItem("faces", JSON.stringify(faces));
}

// ---------------------- SCAN FACE ----------------------
scanBtn.onclick = async () => {

    if (!video.srcObject) {
        alert("Camera not ready!");
        return;
    }

    // wait for stable frame
    await new Promise(resolve => setTimeout(resolve, 500));

    let detection = await faceapi
        .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.3
            })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        alert("Face not detected! Try again.");
        return;
    }

    const newDescriptor = detection.descriptor;
    let storedFaces = getStoredFaces();

    let matchedUser = null;

    // 🔥 FACE MATCHING
    for (let face of storedFaces) {
        const distance = faceapi.euclideanDistance(face.descriptor, newDescriptor);

        if (distance < 0.5) {  // threshold
            matchedUser = face.id;
            break;
        }
    }

    // EXISTING USER
    if (matchedUser) {
        currentUser = matchedUser;

        document.getElementById("user").innerText =
            "User: " + currentUser + " (recognized)";

        if (localStorage.getItem(currentUser)) {
            alert("You already voted!");
        }

        return;
    }

    // NEW USER
    const newId = "user_" + Date.now();
    currentUser = newId;

    storedFaces.push({
        id: newId,
        descriptor: Array.from(newDescriptor)
    });

    saveFaces(storedFaces);

    document.getElementById("user").innerText =
        "New User Registered: " + currentUser;
};

// ---------------------- VOTE ----------------------
function vote(party) {

    if (!currentUser) {
        alert("Scan face first!");
        return;
    }

    if (localStorage.getItem(currentUser)) {
        alert("You already voted!");
        return;
    }

    localStorage.setItem(currentUser, party);

    let results = JSON.parse(localStorage.getItem("results")) || {
        A: 0, B: 0, C: 0
    };

    results[party]++;
    localStorage.setItem("results", JSON.stringify(results));

    alert("Vote submitted!");
    showResults();
}

// ---------------------- RESULTS ----------------------
function showResults() {

    let results = JSON.parse(localStorage.getItem("results")) || {
        A: 0, B: 0, C: 0
    };

    document.getElementById("results").innerHTML = `
        Party A: ${results.A} votes <br>
        Party B: ${results.B} votes <br>
        Party C: ${results.C} votes
    `;
}