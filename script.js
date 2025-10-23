import {
    blockRandomization,
    finalizeBlockRandomization,
    firebaseUserId,
    writeRealtimeDatabase,
    writeURLParameters
} from "./firebasepsych.js";

console.log(firebaseUserId);

/*
data saved as FirebaseID /
1. pid: Prolific URL parameters
2. exp: experiment-wide data
3. trial: trial data
*/

// constants
const redirectURL = "https://app.prolific.com/submissions/complete?cc=C1P1YP97"

const minDots = 512;
const maxDots = 512;

const dotSize = 8;
const numTrial = 5;

// https://davidmathlogic.com/colorblind/#%23D81B60-%231E88E5-%23FFC107-%23004D40
const clrs = {"Blue": "#1E88E5", "Yellow": "#FFC107"}
const clrsArr = ["Blue", "Yellow"]

const studyId = "ai1";
const dbPath = studyId + '/participantData/' + firebaseUserId + "/";

const expData = {};

// variables
let isIntro

let aiData

let trialData
let maxClr;

let aiClr
let aiCnf

let curTrial = 1;
let curScore = 0;

// consent
const loading = document.querySelector('.loading');

const consent = document.querySelector('.consent');
const consentCheckbox = document.querySelector('.consentCheckbox');
const startButton = document.querySelector('.startButton');

// experiment
const experiment = document.querySelector('.experiment');
const progressDisplay = document.querySelector('.progressDisplay');
const trial = document.querySelector('.trial');
const score = document.querySelector('.score');
const question = document.querySelector('.question');

const questionDisplay = document.querySelector('.questionDisplay');

const aiForm = document.querySelector('.aiForm');
const aiField = document.querySelector('.aiField');

const afterForm = document.querySelector('.afterForm');
const afterField = document.querySelector('.afterField');
const afterSubmit = document.querySelector('.afterSubmit');

// canvas
const canvasDisplay = document.querySelector('.canvasDisplay');
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// complete
const complete = document.querySelector(".complete")

const commentDisplay = document.querySelector(".commentDisplay");
const commentField = document.getElementById("commentField");
const commentSubmit = document.querySelector(".commentSubmit")

const redirectDisplay = document.querySelector(".redirectDisplay");
const redirectButton = document.querySelector(".redirectButton");


// helpers
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const timePassed = () => Math.round(performance.now())

const rndIdx = len => Math.floor(Math.random() * len);

const rndDots = hex => {
    let coords = {}

    let x = rndIdx(canvas.width);
    let y = rndIdx(canvas.height);

    coords.x = x;
    coords.y = y;

    ctx.fillStyle = hex;
    ctx.fillRect(x, y, dotSize, dotSize);

    return coords;
};

const repeatDots = (len, hex) => {
    let coords = []
    for (let i = 0; i < len; i++) {
        coords.push(rndDots(hex));
    }
    return coords;
}

const getData = async () => {
    try {
        const response = await fetch(dataPath);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        aiData = await response.json();
    } catch (error) {
        console.error(error.message);
    }
};

const setData = () => {
    trialData = structuredClone(aiData[rndIdx(aiData.length)]);
    trialData.trial = curTrial;

    trialData.maxClr = clrsArr[trialData.maxClr]
    trialData.aiClr = clrsArr[trialData.aiClr]
    trialData.aiCnf = Math.round(trialData.aiCnf * 10) * 10;

    maxClr = trialData.maxClr;
    aiClr = trialData.aiClr;
    aiCnf = trialData.aiCnf;

    let minClrs = structuredClone(clrs)
    delete minClrs[maxClr]

    let coords = {}

    coords[maxClr] = repeatDots(maxDots, clrs[maxClr]);

    for (const [eng, hex] of Object.entries(minClrs)) {
        coords[eng] = repeatDots(minDots, hex)
    }

    trialData.coords = coords;
    console.log(trialData);
}

const resetTrial = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    aiForm.reset()
    aiForm.classList.add("hidden");

    afterForm.reset()
    afterField.disabled = false;
    afterForm.classList.add("hidden");
    afterSubmit.classList.remove("hidden");

    canvasDisplay.classList.remove("hidden")
    questionDisplay.classList.add("hidden")

    setData()
}

// events
consentCheckbox.onchange = () => {
    startButton.disabled = !consentCheckbox.checked;
};

// onboarding
startButton.onclick = async () => {
    expData.startTime = Date.now();
    await writeRealtimeDatabase(dbPath + "/exp", expData);

    consent.classList.add("hidden");
    experiment.classList.remove("hidden");

    isIntro = true;

    introJs().setOptions({
        exitOnEsc: false, exitOnOverlayClick: false,
        showBullets: false, keyboardNavigation: false,

        steps: [{
            title: 'Welcome',
            intro: '<p>We aim to study the way humans verify artificial intelligence (AI).</p>' +
                '<p>Your results will help us design safer AI.</p>'
        }, {
            title: 'Objective',
            element: question,
            intro: '<p>The AI will watch the animation and answer the question.</p>' +
                '<p>Your aim is to predict whether the AI is correct or wrong.</p>'
        }, {
            title: 'Stimulus',
            element: canvasDisplay,
            intro: '<p>There are 2 dot colors in the animation.</p>' +
                '<p>The animation stops after 1 second.</p>'
        }, {
            title: 'AI',
            intro: '<p>Note that the AI is trained on static images rather than animations.</p>' +
                '<p>Therefore, it is not always correct.</p>'
        }, {
            title: 'Answer',
            element: aiForm,
            intro: '<p>The AI will give you its answer and confidence.</p>' +
                '<p>The confidence (between 0% and 100%) indicates whether the AI is sure or not.</p>',
        }, {
            title: 'Evaluate the AI',
            element: afterForm,
            intro: '<p>Judge whether the AI\'s answer is correct or wrong.</p>' +
                '<p>Then click submit.</p>'
        }, {
            title: 'Feedback',
            intro: '<p>Evaluate the AI correctly, and you will gain 1 point.</p>' +
                '<p>If you are wrong, no points will be deducted.</p>'
        }, {
            title: 'Trial',
            element: trial,
            intro: '<p>The progress will be shown on the top left.</p>' +
                '<p>It shows the current trial/total trials.</p>'
        }, {
            title: 'Score',
            element: score,
            intro: '<p>Your score will be shown on the top right.</p>' +
                '<p>It shows the number of correct judgments/total number of judgments.</p>'
        }, {
            title: 'Start',
            intro: '<p>Let\'s begin the experiment!</p>',
        }, {
            title: 'Reminder',
            intro: '<p><strong>Use the AI, with its confidence level, to decide if it is correct or wrong.</strong></p>'
        }]
    }).onchange((ele) => {
        if (ele === canvasDisplay) {
            canvas.classList.add("slide-in");
        }


        if (ele === aiForm) {
            canvasDisplay.classList.add("hidden")
            questionDisplay.classList.remove("hidden")

            document.getElementById(`ai${maxClr}`).checked = true;
            document.getElementById(`ai${50}`).checked = true;
        }

        if (ele === afterForm) {
            afterForm.classList.remove("hidden");
        }
    }).oncomplete(() => {
        isIntro = false;
        resetTrial();
    }).start();
}


canvas.onanimationend = async () => {
    if (!isIntro) {
        trialData.startTime = timePassed()

        canvasDisplay.classList.add("hidden")
        questionDisplay.classList.remove("hidden")

        aiForm.classList.remove("hidden");
        await sleep(1000);
        document.getElementById(`ai${aiClr}`).checked = true;
        await sleep(1000);
        document.getElementById(`ai${aiCnf}`).checked = true;
        await sleep(1000);

        afterForm.classList.remove("hidden");
        trialData.aiTime = timePassed()
    }
}


afterForm.onsubmit = async event => {
    trialData.afterTime = timePassed()

    event.preventDefault();
    afterField.disabled = true;

    if (!isIntro) {
        let afterAns = document.querySelector('input[name="afterAns"]:checked').value;
        trialData.afterAns = afterAns;


        afterSubmit.classList.add("hidden");

        let title
        let descr

        let aiCor = aiClr.toLowerCase() === maxClr.toLowerCase();
        let aiCorTxt = aiCor ? "correct" : "wrong"

        if ((aiCor && afterAns === "yes") || (!aiCor && afterAns === "no")) {
            curScore++
            trialData.correct = true

            title = "&#x2714; You're Correct!"
            descr = `Yes, the AI was ${aiCorTxt}. Your score increased by 1!`
        } else {
            trialData.correct = false

            title = "&#x2718; You're Wrong"
            descr = `No, the AI was ${aiCorTxt}. Try harder!`
        }

        score.textContent = `Score: ${curScore}/${curTrial} (${Math.round(curScore / curTrial * 100)}%)`;
        trialData.endTime = timePassed()

        writeRealtimeDatabase(dbPath + '/trial/' + curTrial, trialData);

        introJs().setOptions({
            exitOnEsc: false, exitOnOverlayClick: false, showBullets: false, keyboardNavigation: false, steps: [{
                title: title, intro: descr
            }]
        }).oncomplete(() => {
            curTrial++
            trial.textContent = `Trial: ${curTrial}/${numTrial} (${Math.round(curTrial / numTrial * 100)}%)`;

            if (curTrial <= numTrial) {
                resetTrial()

            } else {
                expData.score = curScore;

                experiment.classList.add("hidden");
                complete.classList.remove("hidden");
            }
        }).start();
    }
}

commentSubmit.onclick = async () => {
    expData.comment = commentField.value;
    expData.endTime = Date.now();

    await writeRealtimeDatabase(dbPath + "/exp", expData);
    console.log("Wrote to database");

    await finalizeBlockRandomization(studyId, "ai")

    commentDisplay.classList.add("hidden");
    redirectDisplay.classList.remove("hidden");

    await sleep(3000);
    window.location.replace(redirectURL)
}

redirectButton.onclick = () => {
    window.location.replace(redirectURL)
}

// initialize
writeURLParameters(dbPath + '/pid')

const condition = await blockRandomization(studyId, "ai", 3, 100, 1)
expData.condition = condition[0];

const dataPath = `data${expData.condition}.json`;
console.log(expData.condition);

getData().then(() => setData())

trial.textContent = `Trial: 1/${numTrial} (${Math.round(1 / numTrial * 100)}%)`;
score.textContent = `Score: 0/0 (0%)`;

loading.classList.add('hidden');
consent.classList.remove('hidden');
