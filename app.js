// ============================================================================
// SOLACE HAVEN - CLIENT LOGIC & WEB AUDIO SYNTHESIZER
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
    // ------------------------------------------------------------------------
    // STATE & CONFIG
    // ------------------------------------------------------------------------
    let state = {
        theme: localStorage.getItem("solace-theme") || "light",
        currentTab: "home",
        moodHistory: JSON.parse(localStorage.getItem("solace-moods")) || [],
        journals: JSON.parse(localStorage.getItem("solace-journals")) || [],
        currentJournalDraft: JSON.parse(localStorage.getItem("solace-journal-draft")) || { title: "", body: "" },
        groundingStep: 0,
        groundingAnswers: [],
        breathingState: "idle", // 'idle', 'breathing', 'paused'
        breathingMode: "box", // 'box', 'calm', 'equal'
        breathingTimerId: null,
        breathingCycleIndex: 0,
        modalBreathingActive: false,
        modalBreathingTimerId: null
    };

    // Affirmations database
    const affirmations = [
        "You do not have to be perfect to be worthy of love, peace, and belonging.",
        "My feelings are valid, and it is okay to not be okay right now.",
        "I breathe in peace, I breathe out worry. I am safe here.",
        "This feeling is a wave. It will rise, it will peak, and it will gently wash away.",
        "I am doing the best I can with what I have, and that is enough.",
        "I give myself permission to rest, slow down, and just exist.",
        "I am gentle with myself. I treat my mind and heart like a garden.",
        "There is no rush. I can take this day one single breath at a time.",
        "I hold space for all my emotions, knowing they are here to guide, not control me.",
        "My mind is settling, my body is relaxing, and my heart is at ease.",
        "I release the things I cannot control and embrace the quiet of the present moment."
    ];

    // Reflection Prompts database
    const journalPrompts = [
        "What is a small, quiet moment of beauty you noticed today?",
        "Write down three things you are grateful for, no matter how small.",
        "What is a feeling you want to gently let go of right now?",
        "Describe a place where you feel completely safe and comfortable.",
        "What does your heart need to hear from you today?",
        "If you could send a warm message of love to your younger self, what would it say?",
        "Name a challenge you faced recently, and identify one small way you showed strength.",
        "What does self-compassion look like for you in this very moment?"
    ];

    // Lumi Conversational Templates (Compassionate, Rogerian active listening)
    const lumiResponses = {
        anxious: [
            "I hear how tight things feel for you right now. It's okay to feel anxious. Shall we slow down and try a 4-7-8 breathing exercise together? Click on the 'Breathe' tab when you're ready, or we can just stay here and talk.",
            "Anxiety can feel like a storm in the chest. Please remember you are safe. Can you notice three things in your room that are a soft color? Describe them to me.",
            "I'm here with you. Let's take a slow breath in... and let it go. You don't have to figure everything out right now. What is the main thought running through your mind?"
        ],
        sad: [
            "It sounds like there is a heavy cloud over you today. I want to tell you that it's completely okay to feel sad. You don't have to smile or pretend. I'm right here to sit with you in the quiet.",
            "Sadness is a way our soul asks for gentle care. Are you warm enough? Would it feel nice to wrap a blanket around yourself? Tell me a little bit about what is hurting.",
            "I hear the pain in your words, and I value your courage in sharing that with me. Your tears and sadness are a valid part of your journey. I'm listening."
        ],
        overwhelmed: [
            "It sounds like too many demands are piling up at once. When we are overwhelmed, our scope gets flooded. Let's shrink the world down together. What is just one small thing we can focus on right now?",
            "You are carrying so much. Please give yourself permission to drop the bags for a moment. You don't have to carry them all today. Can we take a moment to rest our thoughts?",
            "I hear the strain. When the volume of life gets too loud, it helps to ground ourselves. Have you tried our 'Grounding' tab? It's a gentle way to soothe an overloaded mind."
        ],
        lonely: [
            "Even though I am a digital companion, I am holding space for you. Loneliness can be a quiet ache. I am glad you connected with me. What is something you love to do that brings you a sense of quiet comfort?",
            "It is hard to feel disconnected from the world. I am here, listening. What is a story, a book, or a song that makes you feel a little more understood?",
            "I'm sending a soft bubble of warmth your way. You are a valued person in this world, and you are not alone in having lonely moments. I am here for as long as you need."
        ],
        neutral: [
            "Thank you for sharing that with me. Tell me more about how that makes you feel.",
            "I am listening. How does that sound to your inner self?",
            "That sounds like an important reflection. How can I support you best with this today?",
            "I appreciate you talking to me about this. What is the kindest thing you can do for yourself today?"
        ],
        happy: [
            "That sounds lovely! I am so glad to hear you share a moment of brightness. What made this moment feel so sweet?",
            "It is beautiful when we can feel a spark of light. Let's hold onto this feeling gently. What are you most grateful for in this moment?",
            "A happy heart is a wonderful place to rest. Thank you for sharing your light with me. How can we carry this warmth into the rest of your week?"
        ]
    };

    // ------------------------------------------------------------------------
    // TAB SYSTEM LOGIC
    // ------------------------------------------------------------------------
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    function switchTab(tabId) {
        state.currentTab = tabId;
        
        // Update nav active classes
        navButtons.forEach(btn => {
            if (btn.getAttribute("data-tab") === tabId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Update tabpane active classes
        tabPanes.forEach(pane => {
            if (pane.id === `tab-${tabId}`) {
                pane.classList.add("active");
            } else {
                pane.classList.remove("active");
            }
        });

        // Specific Tab Init Logic
        if (tabId === "journal") {
            renderJournalHistory();
        }
    }

    // ------------------------------------------------------------------------
    // THEME CONTROLLER
    // ------------------------------------------------------------------------
    const btnLight = document.getElementById("theme-light");
    const btnTwilight = document.getElementById("theme-twilight");

    function setTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("solace-theme", theme);

        if (theme === "twilight") {
            btnTwilight.classList.add("active");
            btnLight.classList.remove("active");
        } else {
            btnLight.classList.add("active");
            btnTwilight.classList.remove("active");
        }
    }

    btnLight.addEventListener("click", () => setTheme("light"));
    btnTwilight.addEventListener("click", () => setTheme("twilight"));
    setTheme(state.theme); // Initial application

    // ------------------------------------------------------------------------
    // DATE & GREETING WIDGET
    // ------------------------------------------------------------------------
    function updateHeaderGreeting() {
        const dateElement = document.getElementById("header-date");
        const greetingTitle = document.getElementById("greeting-title");
        const now = new Date();

        // Format Date
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);

        // Format Greeting based on local time
        const hour = now.getHours();
        if (hour < 12) {
            greetingTitle.textContent = "Good morning, friend";
        } else if (hour < 17) {
            greetingTitle.textContent = "Good afternoon, friend";
        } else {
            greetingTitle.textContent = "Good evening, friend";
        }
    }
    updateHeaderGreeting();

    // ------------------------------------------------------------------------
    // AFFIRMATION CONTROLLER
    // ------------------------------------------------------------------------
    const affirmationText = document.getElementById("daily-affirmation-text");
    const btnRefreshAffirmation = document.getElementById("refresh-affirmation");

    function setRandomAffirmation() {
        const randomIndex = Math.floor(Math.random() * affirmations.length);
        affirmationText.textContent = `"${affirmations[randomIndex]}"`;
    }
    btnRefreshAffirmation.addEventListener("click", setRandomAffirmation);
    setRandomAffirmation(); // Initial load

    // ------------------------------------------------------------------------
    // MOOD DAILY CHECK-IN & HISTORY LOG
    // ------------------------------------------------------------------------
    const moodButtons = document.querySelectorAll(".mood-btn");
    const feedbackContainer = document.getElementById("mood-feedback-container");
    const feedbackText = document.getElementById("mood-feedback-text");
    const emptyHistoryView = document.getElementById("empty-history-view");
    const moodLogList = document.getElementById("mood-log-list");

    const moodComfortingPhrases = {
        peaceful: "What a beautiful state of being. May this serenity rest with you and radiate to those around you.",
        anxious: "It's okay that you feel anxious. Breathe gently. You are in a safe space, and this storm will pass.",
        sad: "Tears or a heavy heart are proof of your deep capacity to feel. Be extra gentle with yourself today.",
        tired: "Your body and spirit are asking for rest. Let go of expectations and allow yourself to recharge.",
        grateful: "Gratitude anchors us. Savor this sweet feeling, and feel free to write it down in your reflection journal.",
        overwhelmed: "When everything feels like too much, remember: you only need to handle the next minute. Slow down."
    };

    moodButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const mood = btn.getAttribute("data-mood");
            
            // Highlight selected mood button
            moodButtons.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");

            // Display calming feedback
            feedbackContainer.style.display = "block";
            feedbackText.textContent = moodComfortingPhrases[mood] || "Thank you for sharing your heart. You are safe here.";

            // Save to state & local storage
            logMood(mood);
        });
    });

    function logMood(moodName) {
        const newLog = {
            id: Date.now(),
            mood: moodName,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
        };

        state.moodHistory.unshift(newLog); // Prepend
        // Limit log size to 15
        if (state.moodHistory.length > 15) {
            state.moodHistory.pop();
        }

        localStorage.setItem("solace-moods", JSON.stringify(state.moodHistory));
        renderMoodHistory();
    }

    function renderMoodHistory() {
        if (state.moodHistory.length === 0) {
            emptyHistoryView.style.display = "flex";
            moodLogList.style.display = "none";
            return;
        }

        emptyHistoryView.style.display = "none";
        moodLogList.style.display = "flex";
        moodLogList.innerHTML = "";

        // Mood colors mapped for border highlights
        const moodColorMap = {
            peaceful: "var(--sage)",
            anxious: "var(--blue)",
            sad: "var(--lavender)",
            tired: "var(--beige-dark)",
            grateful: "var(--teal-light)",
            overwhelmed: "var(--coral-soft)"
        };

        const moodEmojiMap = {
            peaceful: "😌",
            anxious: "🥺",
            sad: "😢",
            tired: "🥱",
            grateful: "🌸",
            overwhelmed: "🤯"
        };

        state.moodHistory.forEach(item => {
            const logItem = document.createElement("div");
            logItem.className = "mood-log-item";
            logItem.style.setProperty("--mood-color", moodColorMap[item.mood] || "var(--sage)");

            logItem.innerHTML = `
                <div class="mood-log-left">
                    <span class="mood-log-emoji">${moodEmojiMap[item.mood] || "😌"}</span>
                    <div>
                        <span class="mood-log-name">${item.mood.charAt(0).toUpperCase() + item.mood.slice(1)}</span>
                        <div class="mood-log-time">${item.date} • ${item.time}</div>
                    </div>
                </div>
            `;
            moodLogList.appendChild(logItem);
        });
    }
    renderMoodHistory(); // Load saved history

    // ------------------------------------------------------------------------
    // CALM SOUNDSCAPE SYNTHESIZER (WEB AUDIO API)
    // ------------------------------------------------------------------------
    let audioCtx = null;
    let synthNodes = {
        rain: null,
        ocean: null,
        wind: null,
        binaural: null
    };

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            document.getElementById("audio-status").textContent = "Audio Active";
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
    }

    // Helper: Create Noise Buffer (White/Pink/Brown)
    function createNoiseBuffer(type) {
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (type === "white") {
                output[i] = white;
            } else if (type === "pink") {
                // Pink noise approximation
                output[i] = (lastOut + (0.12 * white)) / 1.12;
                lastOut = output[i];
                output[i] *= 3.5; // compensation
            } else if (type === "brown") {
                // Brown noise (Brownian motion / Red noise)
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 4.5; // compensation
            }
        }
        return noiseBuffer;
    }

    // --- Synthesizers ---
    function startRainSynth() {
        const noise = audioCtx.createBufferSource();
        noise.buffer = createNoiseBuffer("white");
        noise.loop = true;

        // Bandpass filter to make it sound soft
        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 1000;
        bandpass.Q.value = 0.8;

        // Lowpass to shave off crackles
        const lowpass = audioCtx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 2500;

        // Quick volume modulation (amplitude modulation) to mimic individual droplets
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 8; // 8 Hz droplet crackle
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 0.05;

        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);
        lfo.start();

        // Connect graph
        noise.connect(bandpass);
        bandpass.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        noise.start();

        return {
            source: noise,
            gain: gainNode,
            lfo: lfo,
            volTarget: 0.15
        };
    }

    function startOceanSynth() {
        const noise = audioCtx.createBufferSource();
        noise.buffer = createNoiseBuffer("brown");
        noise.loop = true;

        // Lowpass filter whose frequency we will sweep slowly
        const sweepFilter = audioCtx.createBiquadFilter();
        sweepFilter.type = "lowpass";
        sweepFilter.frequency.value = 400;

        // Low Frequency Oscillator for wave cycle (~12 seconds)
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 0.08; // 0.08 Hz = 12.5s cycle

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 250; // Sweep width (freq offset)

        // Connect LFO to filter frequency
        lfo.connect(lfoGain);
        lfoGain.connect(sweepFilter.frequency);
        lfo.start();

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);

        noise.connect(sweepFilter);
        sweepFilter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        noise.start();

        return {
            source: noise,
            gain: gainNode,
            lfo: lfo,
            volTarget: 0.25
        };
    }

    function startWindSynth() {
        const noise = audioCtx.createBufferSource();
        noise.buffer = createNoiseBuffer("pink");
        noise.loop = true;

        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 400;
        bandpass.Q.value = 2.0;

        const lfo = audioCtx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.05; // 20s cycle

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 200; // wind gusts

        lfo.connect(lfoGain);
        lfoGain.connect(bandpass.frequency);
        lfo.start();

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);

        noise.connect(bandpass);
        bandpass.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        noise.start();

        return {
            source: noise,
            gain: gainNode,
            lfo: lfo,
            volTarget: 0.2
        };
    }

    function startBinauralSynth() {
        const oscL = audioCtx.createOscillator();
        const oscR = audioCtx.createOscillator();
        const merger = audioCtx.createChannelMerger(2);

        // Theta wave beat: 100Hz and 104Hz => 4Hz theta frequency for meditation
        oscL.frequency.value = 100;
        oscR.frequency.value = 104;

        oscL.type = "sine";
        oscR.type = "sine";

        const lowpass = audioCtx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 150; // Deep comforting hum

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

        // Route oscillators to distinct stereo channels
        oscL.connect(merger, 0, 0); // Osc L -> Left Channel
        oscR.connect(merger, 0, 1); // Osc R -> Right Channel

        merger.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscL.start();
        oscR.start();

        return {
            source: oscL,
            sourceRight: oscR,
            gain: gainNode,
            volTarget: 0.08
        };
    }

    // Toggle Sound Function
    function toggleSound(soundName, playButton, volInput) {
        initAudio();

        if (synthNodes[soundName]) {
            // Already playing, so stop it
            stopSoundNode(soundName);
            playButton.classList.remove("playing");
            playButton.innerHTML = `<i class="fa-solid fa-play"></i>`;
        } else {
            // Start playing
            try {
                let nodes;
                if (soundName === "rain") nodes = startRainSynth();
                if (soundName === "ocean") nodes = startOceanSynth();
                if (soundName === "wind") nodes = startWindSynth();
                if (soundName === "binaural") nodes = startBinauralSynth();

                synthNodes[soundName] = nodes;

                // Adjust volume immediately to user slider value
                const userVol = parseFloat(volInput.value);
                nodes.gain.gain.setValueAtTime(userVol * nodes.volTarget, audioCtx.currentTime);

                playButton.classList.add("playing");
                playButton.innerHTML = `<i class="fa-solid fa-pause"></i>`;
            } catch (err) {
                console.error("Synthesizer failed to start: ", err);
            }
        }
    }

    function stopSoundNode(soundName) {
        const nodes = synthNodes[soundName];
        if (nodes) {
            try {
                nodes.source.stop();
                if (nodes.sourceRight) nodes.sourceRight.stop();
                if (nodes.lfo) nodes.lfo.stop();
            } catch (e) {}
            synthNodes[soundName] = null;
        }
    }

    // Set volume listener
    function bindVolumeSlider(soundName, volInput) {
        volInput.addEventListener("input", (e) => {
            const userVol = parseFloat(e.target.value);
            const nodes = synthNodes[soundName];
            if (nodes) {
                nodes.gain.gain.setValueAtTime(userVol * nodes.volTarget, audioCtx.currentTime);
            }
        });
    }

    // Button Bindings
    const rainPlay = document.getElementById("play-rain");
    const rainVol = document.getElementById("vol-rain");
    const oceanPlay = document.getElementById("play-ocean");
    const oceanVol = document.getElementById("vol-ocean");
    const windPlay = document.getElementById("play-wind");
    const windVol = document.getElementById("vol-wind");
    const binauralPlay = document.getElementById("play-binaural");
    const binauralVol = document.getElementById("vol-binaural");

    rainPlay.addEventListener("click", () => toggleSound("rain", rainPlay, rainVol));
    oceanPlay.addEventListener("click", () => toggleSound("ocean", oceanPlay, oceanVol));
    windPlay.addEventListener("click", () => toggleSound("wind", windPlay, windVol));
    binauralPlay.addEventListener("click", () => toggleSound("binaural", binauralPlay, binauralVol));

    bindVolumeSlider("rain", rainVol);
    bindVolumeSlider("ocean", oceanVol);
    bindVolumeSlider("wind", windVol);
    bindVolumeSlider("binaural", binauralVol);

    // Mute All Sounds
    document.getElementById("stop-all-sounds").addEventListener("click", () => {
        Object.keys(synthNodes).forEach(soundName => {
            stopSoundNode(soundName);
        });
        const plays = [rainPlay, oceanPlay, windPlay, binauralPlay];
        plays.forEach(btn => {
            btn.classList.remove("playing");
            btn.innerHTML = `<i class="fa-solid fa-play"></i>`;
        });
    });


    // ------------------------------------------------------------------------
    // BREATHING EXERCISE WORKSPACE
    // ------------------------------------------------------------------------
    const breathCircle = document.getElementById("breathing-circle");
    const breathStateText = document.getElementById("breath-state");
    const breathTimerText = document.getElementById("breath-timer");
    const startBreathBtn = document.getElementById("btn-start-breathing");
    const stopBreathBtn = document.getElementById("btn-stop-breathing");
    const modeSelectButtons = document.querySelectorAll(".mode-select-btn");
    const breathInstruction = document.getElementById("breath-instruction");

    modeSelectButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            if (state.breathingState === "breathing") {
                pauseBreathing();
            }
            modeSelectButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.breathingMode = btn.getAttribute("data-mode");
            resetBreathingUI();
        });
    });

    function resetBreathingUI() {
        breathCircle.className = "breathing-circle-inner";
        breathStateText.textContent = "Ready";
        
        if (state.breathingMode === "box") {
            breathTimerText.textContent = "4";
            breathInstruction.textContent = "Box Breathing: Standard cycle to ground thoughts and stabilize nerves.";
        } else if (state.breathingMode === "calm") {
            breathTimerText.textContent = "4";
            breathInstruction.textContent = "4-7-8 Relaxing Breath: Drastically reduces heart rate and calms flight response.";
        } else {
            breathTimerText.textContent = "5";
            breathInstruction.textContent = "Equal Breathing: Coherent breathing pattern to balance energy levels.";
        }
    }

    startBreathBtn.addEventListener("click", () => {
        startBreathing();
    });

    stopBreathBtn.addEventListener("click", () => {
        pauseBreathing();
    });

    // Guided Breathing Cycles definitions
    const breathingCycles = {
        box: [
            { state: "Inhale", duration: 4, class: "breath-inhale", info: "Fill your lungs gently with calming sage air..." },
            { state: "Hold", duration: 4, class: "breath-hold-full", info: "Let the stillness settle inside you..." },
            { state: "Exhale", duration: 4, class: "breath-exhale", info: "Let go of all the tension slowly..." },
            { state: "Hold", duration: 4, class: "breath-hold-empty", info: "Rest in the space of empty quiet..." }
        ],
        calm: [
            { state: "Inhale", duration: 4, class: "breath-inhale", info: "Inhale fresh positive energy..." },
            { state: "Hold", duration: 7, class: "breath-hold-full", info: "Allow the peace to reach your cells..." },
            { state: "Exhale", duration: 8, class: "breath-exhale", info: "Release all stress completely..." }
        ],
        equal: [
            { state: "Inhale", duration: 5, class: "breath-inhale", info: "Slowly breathe in comfort..." },
            { state: "Exhale", duration: 5, class: "breath-exhale", info: "Slowly breathe out release..." }
        ]
    };

    function startBreathing() {
        initAudio(); // Keep synth initialized if breathing sound requested
        state.breathingState = "breathing";
        startBreathBtn.style.display = "none";
        stopBreathBtn.style.display = "inline-flex";
        state.breathingCycleIndex = 0;
        runBreathingStep();
    }

    function runBreathingStep() {
        if (state.breathingState !== "breathing") return;

        const cycle = breathingCycles[state.breathingMode];
        const step = cycle[state.breathingCycleIndex];
        
        // Update circle styling
        breathCircle.className = "breathing-circle-inner " + step.class;
        breathStateText.textContent = step.state;
        breathInstruction.textContent = step.info;

        let timeLeft = step.duration;
        breathTimerText.textContent = timeLeft;

        // Visual ticking timer loop
        if (state.breathingTimerId) clearInterval(state.breathingTimerId);
        
        state.breathingTimerId = setInterval(() => {
            timeLeft--;
            breathTimerText.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(state.breathingTimerId);
                // Advance to next cycle
                state.breathingCycleIndex = (state.breathingCycleIndex + 1) % cycle.length;
                runBreathingStep();
            }
        }, 1000);
    }

    function pauseBreathing() {
        state.breathingState = "idle";
        if (state.breathingTimerId) clearInterval(state.breathingTimerId);
        startBreathBtn.style.display = "inline-flex";
        stopBreathBtn.style.display = "none";
        resetBreathingUI();
    }


    // ------------------------------------------------------------------------
    // SAFE SPACE JOURNALING
    // ------------------------------------------------------------------------
    const journalTitleInput = document.getElementById("journal-title");
    const journalBodyInput = document.getElementById("journal-body");
    const journalSaveBtn = document.getElementById("btn-save-journal");
    const journalSaveStatus = document.getElementById("journal-save-status");
    const journalCountBadge = document.getElementById("journal-count");
    const journalEntriesList = document.getElementById("journal-entries-list");
    const changePromptBtn = document.getElementById("btn-new-prompt");
    const promptDisplay = document.getElementById("journal-prompt-display");

    let currentPrompt = journalPrompts[0];

    // Change reflection prompt
    changePromptBtn.addEventListener("click", () => {
        let newPrompt;
        do {
            newPrompt = journalPrompts[Math.floor(Math.random() * journalPrompts.length)];
        } while (newPrompt === currentPrompt);
        currentPrompt = newPrompt;
        promptDisplay.textContent = `"${currentPrompt}"`;
    });

    // Auto-Save Draft
    function saveDraft() {
        state.currentJournalDraft.title = journalTitleInput.value;
        state.currentJournalDraft.body = journalBodyInput.value;
        localStorage.setItem("solace-journal-draft", JSON.stringify(state.currentJournalDraft));
    }
    journalTitleInput.addEventListener("input", saveDraft);
    journalBodyInput.addEventListener("input", saveDraft);

    // Initial Load Draft
    journalTitleInput.value = state.currentJournalDraft.title;
    journalBodyInput.value = state.currentJournalDraft.body;

    // Save Journal Entry Function
    journalSaveBtn.addEventListener("click", () => {
        const title = journalTitleInput.value.trim();
        const body = journalBodyInput.value.trim();

        if (!body) {
            alert("Your reflection needs a body before saving, dear friend.");
            return;
        }

        const newEntry = {
            id: Date.now(),
            title: title || "Quiet Reflection",
            body: body,
            prompt: currentPrompt,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };

        state.journals.unshift(newEntry);
        localStorage.setItem("solace-journals", JSON.stringify(state.journals));

        // Reset draft
        state.currentJournalDraft = { title: "", body: "" };
        localStorage.removeItem("solace-journal-draft");
        journalTitleInput.value = "";
        journalBodyInput.value = "";

        // Trigger visual success notification
        journalSaveStatus.innerHTML = `<i class="fa-solid fa-heart"></i> Saved into garden!`;
        journalSaveStatus.classList.add("show");
        setTimeout(() => journalSaveStatus.classList.remove("show"), 3000);

        renderJournalHistory();
    });

    function deleteJournalEntry(id) {
        state.journals = state.journals.filter(j => j.id !== id);
        localStorage.setItem("solace-journals", JSON.stringify(state.journals));
        renderJournalHistory();
    }

    function renderJournalHistory() {
        const count = state.journals.length;
        journalCountBadge.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;

        if (count === 0) {
            journalEntriesList.innerHTML = `
                <div class="empty-journals">
                    <i class="fa-solid fa-feather"></i>
                    <p>No entries yet. Write your thoughts and save them to build your reflection garden.</p>
                </div>
            `;
            return;
        }

        journalEntriesList.innerHTML = "";
        state.journals.forEach(entry => {
            const card = document.createElement("div");
            card.className = "journal-card-item";
            card.innerHTML = `
                <button class="journal-delete-btn" title="Delete Reflection" data-id="${entry.id}">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
                <div class="journal-card-header">
                    <h4 class="journal-card-title">${entry.title}</h4>
                    <span class="journal-card-date">${entry.date}</span>
                </div>
                <p class="journal-card-body">${entry.body.replace(/\n/g, '<br>')}</p>
                <span class="journal-card-prompt">Prompt: "${entry.prompt}"</span>
            `;

            // Delete click listener
            card.querySelector(".journal-delete-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to gently delete this entry?")) {
                    deleteJournalEntry(entry.id);
                }
            });

            // Restore entry click listener
            card.addEventListener("click", () => {
                if (confirm("Would you like to restore this entry to the editor to update or add to it?")) {
                    journalTitleInput.value = entry.title;
                    journalBodyInput.value = entry.body;
                    saveDraft();
                    switchTab("journal");
                }
            });

            journalEntriesList.appendChild(card);
        });
    }
    renderJournalHistory();


    // ------------------------------------------------------------------------
    // 5-4-3-2-1 SENSORY GROUNDING WORKSPACE
    // ------------------------------------------------------------------------
    const btnStartGrounding = document.getElementById("btn-start-grounding");
    const groundingIntroCard = document.getElementById("grounding-intro-card");
    const groundingStepsCard = document.getElementById("grounding-steps-card");
    const groundingProgressBar = document.getElementById("grounding-progress-bar");
    const groundingStepContainer = document.getElementById("grounding-step-container");
    const btnGroundingNext = document.getElementById("btn-grounding-next");
    const btnGroundingBack = document.getElementById("btn-grounding-back");

    const groundingSteps = [
        {
            number: 5,
            prompt: "Describe 5 things you can see in your environment",
            desc: "Look around you. Focus on the shape, the light reflecting off them, or the small details. List them below:",
            inputs: 5,
            placeholder: "Something you see..."
        },
        {
            number: 4,
            prompt: "Describe 4 things you can physically feel",
            desc: "Focus on physical touch. The weight of your clothes, the keys under your fingers, or the air on your neck. List them:",
            inputs: 4,
            placeholder: "Something you feel..."
        },
        {
            number: 3,
            prompt: "Identify 3 distinct sounds you can hear",
            desc: "Listen deeply to background noise. The humming of an AC, birds outside, or traffic in the distance. List them:",
            inputs: 3,
            placeholder: "Something you hear..."
        },
        {
            number: 2,
            prompt: "Notice 2 scents you can smell in this space",
            desc: "Sniff the air. It might be the scent of clean laundry, a cup of tea, wood, or just dust. List them:",
            inputs: 2,
            placeholder: "Something you smell..."
        },
        {
            number: 1,
            prompt: "Acknowledge 1 flavor you can taste",
            desc: "Focus on the taste inside your mouth right now, or recall the pleasant taste of your last sip of tea or mint:",
            inputs: 1,
            placeholder: "Something you taste..."
        },
        {
            number: 0,
            prompt: "You are fully here, in the present.",
            desc: "Take a deep breath. Your nervous system is regulating. You have anchored yourself in the physical reality of this room.",
            inputs: 0
        }
    ];

    btnStartGrounding.addEventListener("click", () => {
        groundingIntroCard.style.display = "none";
        groundingStepsCard.style.display = "block";
        state.groundingStep = 0;
        state.groundingAnswers = [];
        renderGroundingStep();
    });

    btnGroundingNext.addEventListener("click", () => {
        // Collect current step answers
        const inputs = groundingStepContainer.querySelectorAll(".ground-input");
        const stepAnswers = [];
        inputs.forEach(inp => stepAnswers.push(inp.value.trim()));

        // Save current answers
        state.groundingAnswers[state.groundingStep] = stepAnswers;

        // Go to next step
        if (state.groundingStep < groundingSteps.length - 1) {
            state.groundingStep++;
            renderGroundingStep();
        } else {
            // Done
            groundingIntroCard.style.display = "flex";
            groundingStepsCard.style.display = "none";
            alert("Grounding complete. You did beautifully.");
        }
    });

    btnGroundingBack.addEventListener("click", () => {
        if (state.groundingStep > 0) {
            state.groundingStep--;
            renderGroundingStep();
        }
    });

    function renderGroundingStep() {
        const step = groundingSteps[state.groundingStep];
        
        // Progress bar percentage
        const pct = ((state.groundingStep + 1) / groundingSteps.length) * 100;
        groundingProgressBar.style.width = `${pct}%`;

        // Render controls visibility
        btnGroundingBack.style.visibility = state.groundingStep === 0 ? "hidden" : "visible";
        btnGroundingNext.innerHTML = state.groundingStep === groundingSteps.length - 1 
            ? `Complete <i class="fa-solid fa-heart"></i>` 
            : `Next <i class="fa-solid fa-chevron-right"></i>`;

        // Render dynamic body
        groundingStepContainer.innerHTML = "";
        
        const numDiv = document.createElement("div");
        numDiv.className = "step-number";
        numDiv.innerHTML = step.number > 0 ? step.number : `<i class="fa-solid fa-sun-plant-wilt"></i>`;
        
        const promptDiv = document.createElement("div");
        promptDiv.className = "step-prompt";
        promptDiv.textContent = step.prompt;

        const descDiv = document.createElement("p");
        descDiv.className = "step-desc";
        descDiv.textContent = step.desc;

        groundingStepContainer.appendChild(numDiv);
        groundingStepContainer.appendChild(promptDiv);
        groundingStepContainer.appendChild(descDiv);

        if (step.inputs > 0) {
            const inputGroup = document.createElement("div");
            inputGroup.className = "step-input-group";

            // Restore previous inputs if they exist
            const prevAnswers = state.groundingAnswers[state.groundingStep] || [];

            for (let i = 0; i < step.inputs; i++) {
                const input = document.createElement("input");
                input.type = "text";
                input.className = "ground-input";
                input.placeholder = step.placeholder;
                input.value = prevAnswers[i] || "";
                inputGroup.appendChild(input);
            }
            groundingStepContainer.appendChild(inputGroup);
        }
    }


    // ------------------------------------------------------------------------
    // LUMI COMPANION CHAT BOT LOGIC
    // ------------------------------------------------------------------------
    const chatPanel = document.getElementById("lumi-chat-panel");
    const chatForm = document.getElementById("lumi-chat-form");
    const chatInput = document.getElementById("lumi-chat-input");
    const quickReplyButtons = document.querySelectorAll(".quick-reply-btn");

    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const msgText = chatInput.value.trim();
        if (!msgText) return;

        submitUserMessage(msgText);
        chatInput.value = "";
    });

    quickReplyButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const replyText = btn.getAttribute("data-reply");
            submitUserMessage(replyText);
        });
    });

    function submitUserMessage(text) {
        // Append user msg bubble
        appendMessageBubble(text, "user");

        // Scroll to bottom
        scrollToBottom();

        // Simulate typing delay
        showTypingIndicator();

        setTimeout(() => {
            removeTypingIndicator();
            const botResponse = generateLumiResponse(text);
            appendMessageBubble(botResponse, "bot");
            scrollToBottom();
        }, 1500 + Math.random() * 1000);
    }

    function appendMessageBubble(text, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}-msg`;

        const avatarIcon = sender === "user" ? "fa-user-circle" : "fa-spa";
        const innerHTML = `
            <div class="msg-avatar"><i class="fa-solid ${avatarIcon}"></i></div>
            <div class="msg-bubble">${text}</div>
        `;
        msgDiv.innerHTML = innerHTML;
        chatPanel.appendChild(msgDiv);
    }

    let typingIndicatorNode = null;

    function showTypingIndicator() {
        if (typingIndicatorNode) return;

        typingIndicatorNode = document.createElement("div");
        typingIndicatorNode.className = "message bot-msg typing-node";
        typingIndicatorNode.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid fa-spa"></i></div>
            <div class="msg-bubble">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatPanel.appendChild(typingIndicatorNode);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        if (typingIndicatorNode) {
            typingIndicatorNode.remove();
            typingIndicatorNode = null;
        }
    }

    function scrollToBottom() {
        chatPanel.scrollTop = chatPanel.scrollHeight;
    }

    // Empathetic NLP Response Engine (Keyword matching)
    function generateLumiResponse(userMsg) {
        const msg = userMsg.toLowerCase();
        
        let moodCategory = "neutral";

        if (msg.includes("anxious") || msg.includes("anxiety") || msg.includes("worry") || msg.includes("nervous") || msg.includes("panic") || msg.includes("scared") || msg.includes("fear")) {
            moodCategory = "anxious";
        } else if (msg.includes("sad") || msg.includes("cry") || msg.includes("heartbroken") || msg.includes("hurt") || msg.includes("depressed") || msg.includes("down")) {
            moodCategory = "sad";
        } else if (msg.includes("overwhelmed") || msg.includes("stress") || msg.includes("busy") || msg.includes("tired") || msg.includes("exhausted") || msg.includes("burnout")) {
            moodCategory = "overwhelmed";
        } else if (msg.includes("lonely") || msg.includes("alone") || msg.includes("nobody") || msg.includes("isolated")) {
            moodCategory = "lonely";
        } else if (msg.includes("happy") || msg.includes("good") || msg.includes("excited") || msg.includes("glad") || msg.includes("wonderful") || msg.includes("smile")) {
            moodCategory = "happy";
        }

        // Draw response from correct bucket
        const bucket = lumiResponses[moodCategory];
        const randomIndex = Math.floor(Math.random() * bucket.length);
        return bucket[randomIndex];
    }


    // ------------------------------------------------------------------------
    // INSTANT CALM MODAL & QUICK BREATHING
    // ------------------------------------------------------------------------
    const quickCalmBtn = document.getElementById("btn-quick-calm");
    const modalOverlay = document.getElementById("quick-calm-modal");
    const modalCloseBtn = document.getElementById("close-quick-calm");
    const btnModalDismiss = document.getElementById("btn-modal-dismiss");
    const btnModalBreatheStart = document.getElementById("btn-modal-breathe-start");
    const modalBreatherCircle = document.getElementById("modal-breather");
    const modalBreathLabel = document.getElementById("modal-breath-label");
    const modalGroundingTip = document.getElementById("modal-grounding-tip");

    const modalTips = [
        "This feeling is a wave. It will rise, it will peak, and it will gently wash away. You are stronger than the wave.",
        "Your only job in this second is to exist and breathe. Everything else can wait. Drop your shoulders.",
        "Softly press your feet into the floor. Feel the support of the earth. You are held, safe, and completely secure.",
        "Draw a mental circle around yourself. Nothing outside this circle can affect you right now. You are at peace."
    ];

    quickCalmBtn.addEventListener("click", () => {
        openModal();
    });

    modalCloseBtn.addEventListener("click", () => closeModal());
    btnModalDismiss.addEventListener("click", () => closeModal());

    function openModal() {
        modalOverlay.classList.add("active");
        
        // Randomize comforting tip
        modalGroundingTip.textContent = `"${modalTips[Math.floor(Math.random() * modalTips.length)]}"`;
        
        // Reset breathing UI inside modal
        modalBreatherCircle.style.transform = "scale(1.0)";
        modalBreathLabel.textContent = "Ready to Breathe";
        btnModalBreatheStart.style.display = "inline-block";
        state.modalBreathingActive = false;
    }

    function closeModal() {
        modalOverlay.classList.remove("active");
        if (state.modalBreathingTimerId) {
            clearInterval(state.modalBreathingTimerId);
        }
        state.modalBreathingActive = false;
    }

    btnModalBreatheStart.addEventListener("click", () => {
        if (state.modalBreathingActive) return;
        
        initAudio();
        state.modalBreathingActive = true;
        btnModalBreatheStart.style.display = "none";
        
        let cycleIdx = 0;
        // Simple breathing helper inside modal (4s in, 4s hold, 4s out)
        const modalCycle = [
            { text: "Breathe In...", scale: 1.8, duration: 4 },
            { text: "Hold...", scale: 1.8, duration: 4 },
            { text: "Breathe Out...", scale: 1.0, duration: 4 },
            { text: "Hold...", scale: 1.0, duration: 4 }
        ];

        function runModalStep() {
            if (!state.modalBreathingActive) return;

            const step = modalCycle[cycleIdx];
            modalBreatherCircle.style.transform = `scale(${step.scale})`;
            modalBreathLabel.textContent = step.text;

            let timeLeft = step.duration;
            
            if (state.modalBreathingTimerId) clearInterval(state.modalBreathingTimerId);
            
            state.modalBreathingTimerId = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(state.modalBreathingTimerId);
                    cycleIdx = (cycleIdx + 1) % modalCycle.length;
                    runModalStep();
                }
            }, 1000);
        }

        runModalStep();
    });
});
