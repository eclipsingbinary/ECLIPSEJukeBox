class CustomPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentTrack = null;
        
        // DOM Elements
        this.playPauseBtn = document.getElementById('play-pause');
        this.prevTrackBtn = document.getElementById('prev-track');
        this.nextTrackBtn = document.getElementById('next-track');
        this.muteBtn = document.getElementById('mute');
        this.progressContainer = document.querySelector('.progress-container');
        this.progressBar = document.querySelector('.progress-bar');
        this.currentTimeDisplay = document.querySelector('.current-time');
        this.durationDisplay = document.querySelector('.duration');
        this.volumeSlider = document.querySelector('.volume-slider');
        this.volumeProgress = document.querySelector('.volume-progress');
        this.trackNameDisplay = document.querySelector('.track-name');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Play/Pause
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        
        // Progress bar
        this.progressContainer.addEventListener('click', (e) => this.seek(e));
        
        // Volume control
        this.volumeSlider.addEventListener('click', (e) => this.setVolume(e));
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        
        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
    }
    
    loadTrack(trackUrl, trackName) {
        this.currentTrack = trackUrl;
        this.audio.src = trackUrl;
        this.trackNameDisplay.textContent = trackName;
        this.audio.load();
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        this.isPlaying = true;
        this.audio.play();
        this.updatePlayPauseIcon();
    }
    
    pause() {
        this.isPlaying = false;
        this.audio.pause();
        this.updatePlayPauseIcon();
    }
    
    updatePlayPauseIcon() {
        const icon = this.playPauseBtn.querySelector('svg');
        if (this.isPlaying) {
            icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>';
        } else {
            icon.innerHTML = '<path d="M8 5v14l11-7z" fill="currentColor"/>';
        }
    }
    
    seek(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = pos * this.audio.duration;
    }
    
    setVolume(e) {
        const rect = this.volumeSlider.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.audio.volume = Math.max(0, Math.min(1, pos));
        this.volumeProgress.style.width = `${this.audio.volume * 100}%`;
        this.updateVolumeIcon();
    }
    
    toggleMute() {
        this.audio.muted = !this.audio.muted;
        this.updateVolumeIcon();
    }
    
    updateVolumeIcon() {
        const icon = this.muteBtn.querySelector('svg');
        if (this.audio.muted || this.audio.volume === 0) {
            icon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>';
        } else if (this.audio.volume < 0.5) {
            icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>';
        } else {
            icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>';
        }
    }
    
    updateProgress() {
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.currentTimeDisplay.textContent = this.formatTime(this.audio.currentTime);
    }
    
    updateDuration() {
        this.durationDisplay.textContent = this.formatTime(this.audio.duration);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    handleTrackEnd() {
        this.isPlaying = false;
        this.updatePlayPauseIcon();
        // Emit an event that can be handled by the main application
        const event = new CustomEvent('trackEnded', { detail: { track: this.currentTrack } });
        document.dispatchEvent(event);
    }
}

// Export the CustomPlayer class
export default CustomPlayer; 