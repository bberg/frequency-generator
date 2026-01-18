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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.frequencyGenerator = new FrequencyGenerator();
});
