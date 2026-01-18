/**
 * Frequency Generator - Web Audio API Implementation
 * Generates precise audio tones for calibration, testing, and education
 */

class FrequencyGenerator {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.analyser = null;
        this.splitter = null;
        this.merger = null;
        this.leftGain = null;
        this.rightGain = null;

        // Noise generator nodes
        this.noiseSource = null;
        this.noiseGain = null;
        this.isPlayingNoise = false;
        this.currentNoiseType = null;

        // Hearing test state
        this.hearingTestRunning = false;
        this.hearingTestFreq = 8000;
        this.hearingTestInterval = null;
        this.highestHeardFreq = 0;

        // Tinnitus matcher state
        this.tinnitusPlaying = false;

        // Polarity test state
        this.polarityPlaying = false;

        this.isPlaying = false;
        this.isSweeping = false;
        this.sweepAnimationId = null;

        // Current settings
        this.settings = {
            frequency: 440.0,
            waveform: 'sine',
            volume: 0.5,
            channel: 'both',
            duration: 'continuous'
        };

        // Sweep settings
        this.sweep = {
            startFreq: 20,
            endFreq: 20000,
            duration: 10,
            type: 'logarithmic',
            startTime: null
        };

        // Ear selector for hearing tests
        this.selectedEar = 'both';

        // Visualization
        this.waveformCanvas = null;
        this.waveformCtx = null;
        this.fftCanvas = null;
        this.fftCtx = null;
        this.animationId = null;

        // Note names for display
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCanvas();
        this.updateFrequencyDisplay(this.settings.frequency);
    }

    initAudioContext() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;

        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = this.settings.volume;

        // Create channel splitter/merger for L/R control
        this.splitter = this.audioContext.createChannelSplitter(2);
        this.merger = this.audioContext.createChannelMerger(2);

        this.leftGain = this.audioContext.createGain();
        this.rightGain = this.audioContext.createGain();

        // Connect the routing
        this.gainNode.connect(this.splitter);
        this.splitter.connect(this.leftGain, 0);
        this.splitter.connect(this.rightGain, 1);
        this.leftGain.connect(this.merger, 0, 0);
        this.rightGain.connect(this.merger, 0, 1);
        this.merger.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    createOscillator() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
        }

        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = this.settings.waveform;
        this.oscillator.frequency.setValueAtTime(this.settings.frequency, this.audioContext.currentTime);
        this.oscillator.connect(this.gainNode);
        this.oscillator.start();
    }

    setFrequency(freq) {
        // Clamp frequency to valid range
        freq = Math.max(1, Math.min(22000, freq));
        // Round to 0.1 Hz precision
        freq = Math.round(freq * 10) / 10;

        this.settings.frequency = freq;
        this.updateFrequencyDisplay(freq);

        if (this.oscillator && this.isPlaying) {
            this.oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        }

        // Update UI controls
        document.getElementById('frequencyInput').value = freq;
        document.getElementById('frequencySlider').value = freq;
    }

    updateFrequencyDisplay(freq) {
        document.getElementById('freqDisplay').textContent = freq.toFixed(1);
        document.getElementById('noteDisplay').textContent = this.frequencyToNote(freq);
    }

    frequencyToNote(freq) {
        // Calculate the note number relative to A4 (440 Hz)
        const semitones = 12 * Math.log2(freq / 440);
        const noteNum = Math.round(semitones) + 49; // A4 is note 49 (0-indexed from C0)

        if (noteNum < 0 || noteNum > 127) {
            return '---';
        }

        const octave = Math.floor(noteNum / 12);
        const noteIndex = noteNum % 12;
        const noteName = this.noteNames[noteIndex];

        // Calculate cents deviation
        const exactNote = semitones + 49;
        const cents = Math.round((exactNote - noteNum) * 100);
        const centsStr = cents === 0 ? '' : (cents > 0 ? ` +${cents}c` : ` ${cents}c`);

        return `${noteName}${octave}${centsStr}`;
    }

    setWaveform(type) {
        this.settings.waveform = type;
        if (this.oscillator && this.isPlaying) {
            this.oscillator.type = type;
        }

        // Update UI
        document.querySelectorAll('.waveform-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.waveform === type);
        });
    }

    setVolume(value) {
        this.settings.volume = value;
        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.05);
        }
    }

    setChannel(channel) {
        this.settings.channel = channel;

        if (this.leftGain && this.rightGain) {
            switch (channel) {
                case 'left':
                    this.leftGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.05);
                    this.rightGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
                    break;
                case 'right':
                    this.leftGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
                    this.rightGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.05);
                    break;
                default: // both
                    this.leftGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.05);
                    this.rightGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.05);
            }
        }

        // Update UI
        document.querySelectorAll('.channel-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.channel === channel);
        });
    }

    setDuration(duration) {
        this.settings.duration = duration;

        // Update UI
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.duration === duration);
        });
    }

    play() {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.createOscillator();
        this.isPlaying = true;
        this.updatePlayButton();
        this.updateStatus('playing');
        this.startVisualization();

        // Apply channel settings
        this.setChannel(this.settings.channel);

        // Handle timed duration
        if (this.settings.duration !== 'continuous') {
            const durationMs = parseFloat(this.settings.duration) * 1000;
            setTimeout(() => {
                if (this.isPlaying && !this.isSweeping) {
                    this.stop();
                }
            }, durationMs);
        }
    }

    stop() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
        }

        this.isPlaying = false;
        this.updatePlayButton();
        this.updateStatus('ready');
        this.stopVisualization();
    }

    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
    }

    updatePlayButton() {
        const btn = document.getElementById('playButton');
        const icon = btn.querySelector('i');
        const text = btn.querySelector('span');

        if (this.isPlaying) {
            btn.classList.add('playing');
            icon.className = 'ri-stop-fill';
            text.textContent = 'Stop';
        } else {
            btn.classList.remove('playing');
            icon.className = 'ri-play-fill';
            text.textContent = 'Play';
        }
    }

    updateStatus(state) {
        const badge = document.getElementById('statusBadge');
        const text = badge.querySelector('.status-text');

        badge.className = 'status-badge ' + state;

        switch (state) {
            case 'playing':
                text.textContent = 'Playing';
                break;
            case 'sweeping':
                text.textContent = 'Sweeping';
                break;
            default:
                text.textContent = 'Ready';
        }
    }

    // Sweep functionality
    startSweep() {
        if (this.isSweeping) {
            this.stopSweep();
            return;
        }

        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Get sweep parameters
        this.sweep.startFreq = parseFloat(document.getElementById('sweepStart').value) || 20;
        this.sweep.endFreq = parseFloat(document.getElementById('sweepEnd').value) || 20000;
        this.sweep.duration = parseFloat(document.getElementById('sweepDuration').value) || 10;

        // Create oscillator if needed
        if (!this.isPlaying) {
            this.createOscillator();
            this.isPlaying = true;
            this.setChannel(this.settings.channel);
        }

        this.isSweeping = true;
        this.sweep.startTime = this.audioContext.currentTime;

        // Update UI
        this.updateSweepButton(true);
        this.updateStatus('sweeping');
        this.startVisualization();

        // Schedule the frequency sweep
        this.animateSweep();
    }

    animateSweep() {
        if (!this.isSweeping) return;

        const elapsed = this.audioContext.currentTime - this.sweep.startTime;
        const progress = Math.min(elapsed / this.sweep.duration, 1);

        // Calculate current frequency based on sweep type
        let currentFreq;
        if (this.sweep.type === 'logarithmic') {
            // Logarithmic sweep: equal time per octave
            const logStart = Math.log(this.sweep.startFreq);
            const logEnd = Math.log(this.sweep.endFreq);
            currentFreq = Math.exp(logStart + progress * (logEnd - logStart));
        } else {
            // Linear sweep
            currentFreq = this.sweep.startFreq + progress * (this.sweep.endFreq - this.sweep.startFreq);
        }

        // Update oscillator frequency
        this.settings.frequency = Math.round(currentFreq * 10) / 10;
        if (this.oscillator) {
            this.oscillator.frequency.setValueAtTime(currentFreq, this.audioContext.currentTime);
        }

        // Update display
        this.updateFrequencyDisplay(currentFreq);
        document.getElementById('frequencyInput').value = this.settings.frequency;
        document.getElementById('frequencySlider').value = this.settings.frequency;

        // Update progress bar
        document.getElementById('sweepProgressBar').style.width = (progress * 100) + '%';

        if (progress >= 1) {
            this.stopSweep();
        } else {
            this.sweepAnimationId = requestAnimationFrame(() => this.animateSweep());
        }
    }

    stopSweep() {
        this.isSweeping = false;

        if (this.sweepAnimationId) {
            cancelAnimationFrame(this.sweepAnimationId);
            this.sweepAnimationId = null;
        }

        // Reset progress bar
        document.getElementById('sweepProgressBar').style.width = '0%';

        // Update UI
        this.updateSweepButton(false);

        // Stop audio if playing
        if (this.isPlaying) {
            this.stop();
        }
    }

    updateSweepButton(sweeping) {
        const btn = document.getElementById('sweepButton');
        const icon = btn.querySelector('i');

        if (sweeping) {
            btn.classList.add('sweeping');
            icon.className = 'ri-stop-fill';
            btn.innerHTML = '<i class="ri-stop-fill"></i> Stop Sweep';
        } else {
            btn.classList.remove('sweeping');
            icon.className = 'ri-play-fill';
            btn.innerHTML = '<i class="ri-play-fill"></i> Start Sweep';
        }
    }

    // Visualization
    setupCanvas() {
        // Waveform canvas
        this.waveformCanvas = document.getElementById('waveformCanvas');
        if (this.waveformCanvas) {
            this.waveformCtx = this.waveformCanvas.getContext('2d');
        }

        // FFT canvas
        this.fftCanvas = document.getElementById('fftCanvas');
        if (this.fftCanvas) {
            this.fftCtx = this.fftCanvas.getContext('2d');
        }

        this.resizeCanvases();
        window.addEventListener('resize', () => this.resizeCanvases());

        // Draw initial state
        this.drawStaticWaveform();
        this.drawStaticFFT();
    }

    resizeCanvases() {
        const dpr = window.devicePixelRatio || 1;

        // Waveform canvas
        if (this.waveformCanvas) {
            const container = this.waveformCanvas.parentElement;
            this.waveformCanvas.width = container.clientWidth * dpr;
            this.waveformCanvas.height = 100 * dpr;
            this.waveformCanvas.style.width = container.clientWidth + 'px';
            this.waveformCanvas.style.height = '100px';
            this.waveformCtx.scale(dpr, dpr);
        }

        // FFT canvas
        if (this.fftCanvas) {
            const container = this.fftCanvas.parentElement;
            this.fftCanvas.width = container.clientWidth * dpr;
            this.fftCanvas.height = 100 * dpr;
            this.fftCanvas.style.width = container.clientWidth + 'px';
            this.fftCanvas.style.height = '100px';
            this.fftCtx.scale(dpr, dpr);
        }

        if (!this.isPlaying) {
            this.drawStaticWaveform();
            this.drawStaticFFT();
        }
    }

    drawStaticWaveform() {
        if (!this.waveformCtx) return;

        const width = this.waveformCanvas.width / (window.devicePixelRatio || 1);
        const height = this.waveformCanvas.height / (window.devicePixelRatio || 1);

        this.waveformCtx.fillStyle = '#000';
        this.waveformCtx.fillRect(0, 0, width, height);

        // Draw center line
        this.waveformCtx.strokeStyle = '#333';
        this.waveformCtx.lineWidth = 1;
        this.waveformCtx.beginPath();
        this.waveformCtx.moveTo(0, height / 2);
        this.waveformCtx.lineTo(width, height / 2);
        this.waveformCtx.stroke();
    }

    drawStaticFFT() {
        if (!this.fftCtx) return;

        const width = this.fftCanvas.width / (window.devicePixelRatio || 1);
        const height = this.fftCanvas.height / (window.devicePixelRatio || 1);

        this.fftCtx.fillStyle = '#000';
        this.fftCtx.fillRect(0, 0, width, height);

        // Draw frequency scale markers
        this.fftCtx.strokeStyle = '#333';
        this.fftCtx.lineWidth = 1;

        const frequencies = [100, 1000, 10000];
        const sampleRate = 44100;

        frequencies.forEach(freq => {
            const x = (freq / (sampleRate / 2)) * width;
            this.fftCtx.beginPath();
            this.fftCtx.moveTo(x, 0);
            this.fftCtx.lineTo(x, height);
            this.fftCtx.stroke();
        });
    }

    startVisualization() {
        if (!this.analyser) return;

        const draw = () => {
            if (!this.isPlaying) return;

            this.animationId = requestAnimationFrame(draw);

            // Draw waveform
            this.drawWaveform();

            // Draw FFT
            this.drawFFT();
        };

        draw();
    }

    drawWaveform() {
        if (!this.waveformCtx || !this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

        const width = this.waveformCanvas.width / (window.devicePixelRatio || 1);
        const height = this.waveformCanvas.height / (window.devicePixelRatio || 1);

        this.waveformCtx.fillStyle = '#000';
        this.waveformCtx.fillRect(0, 0, width, height);

        this.waveformCtx.lineWidth = 2;
        this.waveformCtx.strokeStyle = '#10b981';
        this.waveformCtx.beginPath();

        // For better visualization of single frequencies, show fewer cycles
        const samplesPerCycle = Math.round(this.audioContext.sampleRate / this.settings.frequency);
        const cyclesToShow = Math.min(5, Math.floor(bufferLength / samplesPerCycle));
        const samplesToShow = Math.min(bufferLength, samplesPerCycle * Math.max(2, cyclesToShow));

        const sliceWidth = width / samplesToShow;
        let x = 0;

        for (let i = 0; i < samplesToShow; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
                this.waveformCtx.moveTo(x, y);
            } else {
                this.waveformCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.waveformCtx.stroke();
    }

    drawFFT() {
        if (!this.fftCtx || !this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        const width = this.fftCanvas.width / (window.devicePixelRatio || 1);
        const height = this.fftCanvas.height / (window.devicePixelRatio || 1);

        this.fftCtx.fillStyle = '#000';
        this.fftCtx.fillRect(0, 0, width, height);

        // Use logarithmic scale for frequency axis
        const barCount = 128;
        const barWidth = width / barCount;

        for (let i = 0; i < barCount; i++) {
            // Logarithmic mapping
            const logIndex = Math.pow(i / barCount, 2) * bufferLength;
            const dataIndex = Math.floor(logIndex);
            const value = dataArray[Math.min(dataIndex, bufferLength - 1)];

            const barHeight = (value / 255) * height;

            // Color based on value
            const hue = 160 - (value / 255) * 40; // Green to teal
            this.fftCtx.fillStyle = `hsl(${hue}, 80%, ${40 + (value / 255) * 30}%)`;

            this.fftCtx.fillRect(
                i * barWidth,
                height - barHeight,
                barWidth - 1,
                barHeight
            );
        }

        // Draw peak frequency marker
        const sampleRate = this.audioContext.sampleRate;
        const peakFreq = this.settings.frequency;
        const normalizedFreq = peakFreq / (sampleRate / 2);
        const peakX = Math.sqrt(normalizedFreq) * width;

        this.fftCtx.strokeStyle = '#fff';
        this.fftCtx.lineWidth = 1;
        this.fftCtx.beginPath();
        this.fftCtx.moveTo(peakX, 0);
        this.fftCtx.lineTo(peakX, height);
        this.fftCtx.stroke();

        // Draw frequency label
        this.fftCtx.fillStyle = '#fff';
        this.fftCtx.font = '10px Inter, sans-serif';
        this.fftCtx.fillText(`${Math.round(peakFreq)} Hz`, peakX + 4, 12);
    }

    stopVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.drawStaticWaveform();
        this.drawStaticFFT();
    }

    // Event Listeners
    setupEventListeners() {
        // Play button
        document.getElementById('playButton')?.addEventListener('click', () => {
            this.toggle();
        });

        // Frequency input
        const freqInput = document.getElementById('frequencyInput');
        freqInput?.addEventListener('input', (e) => {
            const freq = parseFloat(e.target.value);
            if (!isNaN(freq)) {
                this.setFrequency(freq);
            }
        });

        freqInput?.addEventListener('change', (e) => {
            const freq = parseFloat(e.target.value);
            if (!isNaN(freq)) {
                this.setFrequency(freq);
            }
        });

        // Frequency slider
        const freqSlider = document.getElementById('frequencySlider');
        freqSlider?.addEventListener('input', (e) => {
            const freq = parseFloat(e.target.value);
            this.setFrequency(freq);
        });

        // Frequency adjust buttons
        document.querySelectorAll('.freq-adjust-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const adjust = parseFloat(btn.dataset.adjust);
                this.setFrequency(this.settings.frequency + adjust);
            });
        });

        // Waveform buttons
        document.querySelectorAll('.waveform-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setWaveform(btn.dataset.waveform);
            });
        });

        // Channel buttons
        document.querySelectorAll('.channel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setChannel(btn.dataset.channel);
            });
        });

        // Duration buttons
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setDuration(btn.dataset.duration);
            });
        });

        // Volume control
        const volumeSlider = document.getElementById('volume');
        const volumeDisplay = document.getElementById('volumeValue');
        volumeSlider?.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            volumeDisplay.textContent = Math.round(value * 100) + '%';
            this.setVolume(value);
        });

        // Sweep controls
        document.getElementById('sweepButton')?.addEventListener('click', () => {
            this.startSweep();
        });

        // Sweep type buttons
        document.querySelectorAll('.sweep-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.sweep.type = btn.dataset.type;
                document.querySelectorAll('.sweep-type-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.type === btn.dataset.type);
                });
            });
        });

        // Sweep duration slider
        const sweepDurationSlider = document.getElementById('sweepDuration');
        const sweepDurationDisplay = document.getElementById('sweepDurationValue');
        sweepDurationSlider?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            sweepDurationDisplay.textContent = value + ' sec';
            this.sweep.duration = value;
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const freq = parseFloat(btn.dataset.freq);
                if (!isNaN(freq)) {
                    this.setFrequency(freq);

                    // Update active state
                    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Start playing if not already
                    if (!this.isPlaying) {
                        this.play();
                    }
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.toggle();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.setFrequency(this.settings.frequency + (e.shiftKey ? 10 : 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.setFrequency(this.settings.frequency - (e.shiftKey ? 10 : 1));
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.setFrequency(this.settings.frequency - 0.1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.setFrequency(this.settings.frequency + 0.1);
                    break;
            }
        });
    }

    // ============================================
    // NOISE GENERATOR
    // ============================================

    createNoiseBuffer(type) {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        if (type === 'white') {
            // White noise: random values
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            // Pink noise: using Paul Kellet's refined method
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                b6 = white * 0.115926;
            }
        } else if (type === 'brown') {
            // Brown noise: integrated white noise
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; // Boost the signal
            }
        }

        return buffer;
    }

    playNoise(type) {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Stop any current noise
        this.stopNoise();

        // Stop any oscillator
        if (this.isPlaying) {
            this.stop();
        }

        // Create noise source
        this.noiseSource = this.audioContext.createBufferSource();
        this.noiseSource.buffer = this.createNoiseBuffer(type);
        this.noiseSource.loop = true;

        // Create gain for noise
        this.noiseGain = this.audioContext.createGain();
        this.noiseGain.gain.value = this.settings.volume;

        // Connect through the routing
        this.noiseSource.connect(this.noiseGain);
        this.noiseGain.connect(this.splitter);

        // Apply channel settings
        this.applyChannelToNoise();

        this.noiseSource.start();
        this.isPlayingNoise = true;
        this.currentNoiseType = type;

        // Update UI
        this.updateNoiseButtons(type);
        this.updateNoiseDescription(type);
        this.updateStatus('playing');
        this.startVisualization();
    }

    stopNoise() {
        if (this.noiseSource) {
            try {
                this.noiseSource.stop();
            } catch (e) {}
            this.noiseSource.disconnect();
            this.noiseSource = null;
        }
        if (this.noiseGain) {
            this.noiseGain.disconnect();
            this.noiseGain = null;
        }
        this.isPlayingNoise = false;
        this.currentNoiseType = null;
        this.updateNoiseButtons(null);
        this.updateStatus('ready');
        this.stopVisualization();
    }

    applyChannelToNoise() {
        if (!this.leftGain || !this.rightGain) return;

        switch (this.settings.channel) {
            case 'left':
                this.leftGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.05);
                this.rightGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
                break;
            case 'right':
                this.leftGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
                this.rightGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.05);
                break;
            default:
                this.leftGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.05);
                this.rightGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.05);
        }
    }

    updateNoiseButtons(activeType) {
        document.querySelectorAll('.noise-btn').forEach(btn => {
            const isActive = btn.dataset.noise === activeType;
            btn.classList.toggle('active', isActive);
            if (isActive) {
                btn.innerHTML = `<span class="noise-icon ${activeType}"></span> Stop`;
            } else {
                const type = btn.dataset.noise;
                const label = type.charAt(0).toUpperCase() + type.slice(1) + ' Noise';
                btn.innerHTML = `<span class="noise-icon ${type}"></span> ${label}`;
            }
        });
    }

    updateNoiseDescription(type) {
        const desc = document.getElementById('noiseDescription');
        if (!desc) return;

        const descriptions = {
            pink: '<strong>Pink Noise:</strong> Equal energy per octave. Best for speaker testing and room acoustics measurement.',
            white: '<strong>White Noise:</strong> Equal energy at all frequencies. Useful for testing and masking sounds.',
            brown: '<strong>Brown Noise:</strong> Deeper, bass-heavy noise. Good for relaxation and masking low-frequency sounds.'
        };

        desc.innerHTML = type ? descriptions[type] : 'Select a noise type to learn more and play.';
    }

    // ============================================
    // STEREO / SPEAKER TESTS
    // ============================================

    playStereoTest(channel) {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Update channel setting
        this.settings.channel = channel;
        this.setChannel(channel);

        // If not playing, start with 440Hz
        if (!this.isPlaying) {
            this.setFrequency(440);
            this.play();
        }

        // Update stereo indicators
        this.updateStereoIndicators(channel);

        // Update stereo buttons
        document.querySelectorAll('.stereo-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.channel === channel);
        });
    }

    updateStereoIndicators(channel) {
        const leftInd = document.getElementById('leftIndicator');
        const rightInd = document.getElementById('rightIndicator');

        if (leftInd) {
            leftInd.classList.toggle('active', channel === 'left' || channel === 'both');
        }
        if (rightInd) {
            rightInd.classList.toggle('active', channel === 'right' || channel === 'both');
        }
    }

    // ============================================
    // POLARITY TEST
    // ============================================

    playPolarityTest(inPhase) {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Stop any current sound
        if (this.isPlaying) this.stop();
        if (this.isPlayingNoise) this.stopNoise();

        // Create two oscillators for each channel
        const oscL = this.audioContext.createOscillator();
        const oscR = this.audioContext.createOscillator();
        const gainL = this.audioContext.createGain();
        const gainR = this.audioContext.createGain();

        oscL.frequency.value = 75; // Low frequency for bass test
        oscR.frequency.value = 75;
        oscL.type = 'sine';
        oscR.type = 'sine';

        gainL.gain.value = this.settings.volume;
        gainR.gain.value = this.settings.volume;

        // If out of phase, invert one channel
        if (!inPhase) {
            // Create an inverter for the right channel
            const inverter = this.audioContext.createGain();
            inverter.gain.value = -1;
            oscR.connect(inverter);
            inverter.connect(gainR);
        } else {
            oscR.connect(gainR);
        }

        oscL.connect(gainL);

        // Create merger for stereo output
        const merger = this.audioContext.createChannelMerger(2);
        gainL.connect(merger, 0, 0);
        gainR.connect(merger, 0, 1);
        merger.connect(this.analyser);

        oscL.start();
        oscR.start();

        // Play for 3 seconds
        oscL.stop(this.audioContext.currentTime + 3);
        oscR.stop(this.audioContext.currentTime + 3);

        this.updateStatus('playing');
        this.startVisualization();

        // Update buttons
        document.getElementById('polarityInPhase')?.classList.toggle('active', inPhase);
        document.getElementById('polarityOutPhase')?.classList.toggle('active', !inPhase);

        setTimeout(() => {
            this.updateStatus('ready');
            this.stopVisualization();
            document.getElementById('polarityInPhase')?.classList.remove('active');
            document.getElementById('polarityOutPhase')?.classList.remove('active');
        }, 3000);
    }

    // ============================================
    // HEARING TEST
    // ============================================

    startHearingTest() {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.hearingTestRunning = true;
        this.hearingTestFreq = 8000; // Start at 8kHz
        this.highestHeardFreq = 0;

        // Update UI
        document.getElementById('startHearingTest').style.display = 'none';
        document.getElementById('stopHearingTest').style.display = 'inline-flex';
        document.getElementById('hearingResult').style.display = 'block';
        document.getElementById('hearingResultValue').textContent = 'Testing...';

        this.playHearingTestTone();
    }

    playHearingTestTone() {
        if (!this.hearingTestRunning) return;

        // Stop current oscillator
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
        }

        // Check if we've gone too high
        if (this.hearingTestFreq > 20000) {
            this.finishHearingTest();
            return;
        }

        // Create new oscillator
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = this.hearingTestFreq;
        this.oscillator.connect(this.gainNode);
        this.oscillator.start();

        // Update display
        document.getElementById('hearingResultValue').textContent =
            `${this.hearingTestFreq.toLocaleString()} Hz - Can you hear this?`;

        // After 2 seconds, move to next frequency
        this.hearingTestInterval = setTimeout(() => {
            // Record this frequency as heard
            this.highestHeardFreq = this.hearingTestFreq;

            // Increment frequency
            if (this.hearingTestFreq < 12000) {
                this.hearingTestFreq += 1000;
            } else if (this.hearingTestFreq < 16000) {
                this.hearingTestFreq += 500;
            } else {
                this.hearingTestFreq += 250;
            }

            this.playHearingTestTone();
        }, 2000);
    }

    stopHearingTest() {
        this.hearingTestRunning = false;

        if (this.hearingTestInterval) {
            clearTimeout(this.hearingTestInterval);
            this.hearingTestInterval = null;
        }

        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
        }

        this.finishHearingTest();
    }

    finishHearingTest() {
        this.hearingTestRunning = false;

        // Update UI
        document.getElementById('startHearingTest').style.display = 'inline-flex';
        document.getElementById('stopHearingTest').style.display = 'none';

        // Show result
        let message = `${this.highestHeardFreq.toLocaleString()} Hz`;
        if (this.highestHeardFreq >= 17000) {
            message += ' (Excellent - Under 25)';
        } else if (this.highestHeardFreq >= 15000) {
            message += ' (Good - 25-35 years)';
        } else if (this.highestHeardFreq >= 12000) {
            message += ' (Average - 35-50 years)';
        } else if (this.highestHeardFreq >= 8000) {
            message += ' (Some high-frequency loss)';
        } else {
            message += ' (Consider consulting an audiologist)';
        }

        document.getElementById('hearingResultValue').textContent = message;

        this.updateStatus('ready');
    }

    // ============================================
    // AUDIOMETRIC TEST
    // ============================================

    playAudiometricFreq(freq) {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Apply selected ear
        this.settings.channel = this.selectedEar;
        this.setChannel(this.selectedEar);

        // Set frequency and play
        this.setFrequency(freq);

        if (!this.isPlaying) {
            this.play();
        }

        // Update button states
        document.querySelectorAll('.audio-freq-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.freq) === freq);
        });
    }

    setSelectedEar(ear) {
        this.selectedEar = ear;

        // Update button states
        document.querySelectorAll('.ear-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.ear === ear);
        });

        // If currently playing, update the channel
        if (this.isPlaying) {
            this.settings.channel = ear;
            this.setChannel(ear);
        }
    }

    // ============================================
    // TINNITUS MATCHER
    // ============================================

    updateTinnitusDisplay(freq) {
        const display = document.getElementById('tinnitusFreqDisplay');
        if (display) {
            display.textContent = `${freq.toLocaleString()} Hz`;
        }
    }

    playTinnitusTone() {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const freq = parseInt(document.getElementById('tinnitusSlider')?.value || 4000);

        if (this.tinnitusPlaying) {
            this.stop();
            this.tinnitusPlaying = false;
            document.getElementById('playTinnitus').innerHTML = '<i class="ri-play-fill"></i> Play Tone';
            return;
        }

        this.setFrequency(freq);
        this.play();
        this.tinnitusPlaying = true;
        document.getElementById('playTinnitus').innerHTML = '<i class="ri-stop-fill"></i> Stop Tone';
    }

    checkTinnitusOctave() {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const baseFreq = parseInt(document.getElementById('tinnitusSlider')?.value || 4000);

        // Stop any current tone
        if (this.isPlaying) this.stop();
        this.tinnitusPlaying = false;
        document.getElementById('playTinnitus').innerHTML = '<i class="ri-play-fill"></i> Play Tone';

        // Play sequence: base, octave up, octave down
        const sequence = [baseFreq, baseFreq * 2, baseFreq / 2];
        let index = 0;

        const playNext = () => {
            if (index >= sequence.length) {
                this.stop();
                return;
            }

            const freq = sequence[index];
            if (freq >= 20 && freq <= 20000) {
                this.setFrequency(freq);
                if (!this.isPlaying) this.play();
            }

            index++;
            setTimeout(() => {
                playNext();
            }, 1500);
        };

        playNext();
    }

    // ============================================
    // BASS TEST
    // ============================================

    playBassTest(freq) {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.setFrequency(freq);

        if (!this.isPlaying) {
            this.play();
        }

        // Update button states
        document.querySelectorAll('.bass-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.freq) === freq);
        });
    }

    // ============================================
    // ADDITIONAL EVENT LISTENERS
    // ============================================

    setupAdditionalListeners() {
        // Noise buttons
        document.querySelectorAll('.noise-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const noiseType = btn.dataset.noise;
                if (this.isPlayingNoise && this.currentNoiseType === noiseType) {
                    this.stopNoise();
                } else {
                    this.playNoise(noiseType);
                }
            });
        });

        // Stereo test buttons
        document.querySelectorAll('.stereo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.playStereoTest(btn.dataset.channel);
            });
        });

        // Polarity test buttons
        document.getElementById('polarityInPhase')?.addEventListener('click', () => {
            this.playPolarityTest(true);
        });
        document.getElementById('polarityOutPhase')?.addEventListener('click', () => {
            this.playPolarityTest(false);
        });

        // Bass test buttons
        document.querySelectorAll('.bass-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.playBassTest(parseInt(btn.dataset.freq));
            });
        });

        // Hearing test buttons
        document.getElementById('startHearingTest')?.addEventListener('click', () => {
            this.startHearingTest();
        });
        document.getElementById('stopHearingTest')?.addEventListener('click', () => {
            this.stopHearingTest();
        });

        // Ear selector buttons
        document.querySelectorAll('.ear-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setSelectedEar(btn.dataset.ear);
            });
        });

        // Audiometric frequency buttons
        document.querySelectorAll('.audio-freq-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.playAudiometricFreq(parseInt(btn.dataset.freq));
            });
        });

        // Tinnitus controls
        document.getElementById('tinnitusSlider')?.addEventListener('input', (e) => {
            this.updateTinnitusDisplay(parseInt(e.target.value));
            if (this.tinnitusPlaying) {
                this.setFrequency(parseInt(e.target.value));
            }
        });
        document.getElementById('playTinnitus')?.addEventListener('click', () => {
            this.playTinnitusTone();
        });
        document.getElementById('checkOctave')?.addEventListener('click', () => {
            this.checkTinnitusOctave();
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.frequencyGenerator = new FrequencyGenerator();
    window.frequencyGenerator.setupAdditionalListeners();
});
