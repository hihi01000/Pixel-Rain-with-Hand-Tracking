const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const rainSound = document.getElementById('rain-sound'); // 빗소리 요소 가져오기
const startButton = document.getElementById('start-button');
const video = document.getElementById('video');
const umbrella = document.createElement('img'); // 우산 이미지 요소 생성
umbrella.id = 'umbrella';
umbrella.src = 'umbrella.png'; // 우산 이미지 경로 설정

document.body.appendChild(umbrella); // 우산 이미지 요소를 문서에 추가

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Pixel {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speedY = Math.random() * 2 + 1;
        this.color = 'white';
    }

    update() {
        this.y += this.speedY;
        if (this.y >= canvas.height - this.size) {
            this.y = canvas.height - this.size;
            this.split();
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    split() {
        for (let i = 0; i < 8; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 3 + 1;
            particles.push(new Particle(this.x, this.y, this.size / 2, angle, speed));
        }
    }
}

class Particle {
    constructor(x, y, size, angle, speed) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.angle = angle;
        this.speed = speed;
        this.color = 'white';
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.size *= 0.95;
        if (this.size < 0.5) {
            this.size = 0;
        }
    }

    draw() {
        if (this.size > 0) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

let pixels = [];
let particles = [];

function createPixelGroup() {
    let x = Math.random() * canvas.width;
    let y = 0;
    for (let i = 0; i < 50; i++) {
        pixels.push(new Pixel(x, y, 4));  // 픽셀 크기를 4로 증가
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pixels.forEach((pixel, index) => {
        pixel.update();
        pixel.draw();
        if (pixel.y >= canvas.height - pixel.size) {
            pixels.splice(index, 1);
        }
    });

    particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        if (particle.size <= 0) {
            particles.splice(index, 1);
        }
    });

    if (Math.random() < 0.1) {
        createPixelGroup();
    }

    requestAnimationFrame(animate);
}

function startRainSound() {
    rainSound.play();
}

startButton.addEventListener('click', async () => {
    rainSound.play();
    startButton.style.display = 'none'; // 버튼 숨기기
    await setupCamera();
    main();
    animate();
});

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function main() {
    const model = await handpose.load();
    video.play();

    async function detectHands() {
        const predictions = await model.estimateHands(video);
        if (predictions.length > 0) {
            const landmarks = predictions[0].landmarks;
            updateHandPoints(landmarks);
            const indexFingerTip = landmarks[8];
            updateUmbrellaPosition(indexFingerTip);
            detectUmbrellaCollision(indexFingerTip);
        }
        requestAnimationFrame(detectHands);
    }
    detectHands();
}

function createHandPoints() {
    for (let i = 0; i < 21; i++) {
        const point = document.createElement('div');
        point.classList.add('hand-point');
        document.body.appendChild(point);
    }
}

function updateHandPoints(landmarks) {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const points = document.getElementsByClassName('hand-point');

    for (let i = 0; i < landmarks.length; i++) {
        const [x, y] = landmarks[i];
        const screenX = window.innerWidth - (x / videoWidth) * window.innerWidth; // 좌우 반전
        const screenY = (y / videoHeight) * window.innerHeight;

        points[i].style.left = `${screenX}px`;
        points[i].style.top = `${screenY}px`;
    }
}

function updateUmbrellaPosition(fingerTip) {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const screenX = window.innerWidth - (fingerTip[0] / videoWidth) * window.innerWidth; // 좌우 반전
    const screenY = (fingerTip[1] / videoHeight) * window.innerHeight;

    umbrella.style.left = `${screenX - umbrella.width / 2}px`; // 중앙 정렬
    umbrella.style.top = `${screenY - umbrella.height / 2}px`;
}

function detectUmbrellaCollision(fingerTip) {
    const umbrellaRect = umbrella.getBoundingClientRect();
    pixels.forEach((pixel, index) => {
        if (pixel.x >= umbrellaRect.left && pixel.x <= umbrellaRect.right &&
            pixel.y >= umbrellaRect.top && pixel.y <= umbrellaRect.bottom) {
            pixel.split();
            pixels.splice(index, 1);
        }
    });
}

createHandPoints();
