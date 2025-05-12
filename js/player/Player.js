// Player.js
import { searchTracks, getRecommendations } from '../api/soundcloud.js';

const CLIENT_ID = 'AXHkknI02RnaQ0vVJ3FK3pVcoToTlmFK';

export class MusicPlayer {
  constructor() {
    this.audio = new Audio();
    this.currentTrack = null;
    this.isPlaying = false;
    this.volume = 0.7;
    this.tracks = [];
    this.currentTrackIndex = -1;
    this.errorShown = false;
    this.errorTimeout = null;
    this.isLoading = false;
    this.progressUpdateInterval = null;
    this.widget = null;
    
    this.initElements();
    this.setupEventListeners();
    this.loadInitialContent();
    this.loadSoundCloudWidgetAPI();
  }

  async loadSoundCloudWidgetAPI() {
    return new Promise((resolve) => {
      if (window.SC) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.onload = () => {
        // Даем время для инициализации API
        setTimeout(resolve, 500);
      };
      script.onerror = () => {
        console.error('Failed to load SoundCloud Widget API');
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  async loadInitialContent() {
    try {
      this.showLoader();
      this.tracks = await searchTracks('popular', CLIENT_ID);
      
      if (this.tracks.length > 0) {
        this.renderTracks();
        const recommendations = await getRecommendations(this.tracks[0].id, CLIENT_ID);
        this.renderRecommendations(recommendations);
      } else {
        this.showError('Не удалось загрузить популярные треки');
      }
    } catch (error) {
      console.error('Ошибка загрузки начального контента:', error);
      this.showError('Не удалось загрузить начальный контент');
    }
  }

  initElements() {
    this.elements = {
      playerRoot: document.getElementById('player-root'),
      trackAvatar: document.getElementById('track-avatar'),
      currentTrack: document.getElementById('current-track'),
      currentArtist: document.getElementById('current-artist'),
      trackSource: document.getElementById('track-source'),
      playBtn: document.getElementById('play-btn'),
      prevBtn: document.getElementById('prev-btn'),
      nextBtn: document.getElementById('next-btn'),
      progressBar: document.getElementById('progress-bar'),
      currentTime: document.getElementById('current-time'),
      duration: document.getElementById('duration'),
      volumeControl: document.getElementById('volume-control'),
      tracksContainer: document.getElementById('tracks-container'),
      recommendationsContainer: document.getElementById('recommendations'),
      searchInput: document.getElementById('search-input'),
      searchBtn: document.getElementById('search-btn'),
      playerIframe: document.getElementById('sc-player')
    };
    
    if (this.elements.trackAvatar) {
      this.elements.trackAvatar.onerror = () => {
        this.elements.trackAvatar.src = 'assets/default-avatar.png';
      };
    }
    
    if (this.elements.volumeControl) {
      this.elements.volumeControl.value = this.volume;
      this.audio.volume = this.volume;
    }
  }

  setupEventListeners() {
    this.clearEventListeners();
    
    // UI события
    if (this.elements.playBtn) {
      this.elements.playBtn.addEventListener('click', () => this.togglePlay());
    }
    if (this.elements.prevBtn) {
      this.elements.prevBtn.addEventListener('click', () => this.prev());
    }
    if (this.elements.nextBtn) {
      this.elements.nextBtn.addEventListener('click', () => this.next());
    }
    if (this.elements.volumeControl) {
      this.elements.volumeControl.addEventListener('input', () => {
        this.volume = parseFloat(this.elements.volumeControl.value);
        if (this.widget) {
          this.widget.setVolume(this.volume * 100);
        }
      });
    }
    if (this.elements.searchBtn) {
      this.elements.searchBtn.addEventListener('click', () => {
        this.searchTracks(this.elements.searchInput?.value || '');
      });
    }
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.searchTracks(this.elements.searchInput.value);
        }
      });
    }
    
    this.startProgressUpdate();
  }

  clearEventListeners() {
    this.stopProgressUpdate();
  }

  handleAudioError(e) {
    console.error('Audio error:', e);
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    
    this.handleErrorMessage('Ошибка воспроизведения трека');
    this.errorShown = true;
    
    this.errorTimeout = setTimeout(() => {
      this.errorShown = false;
    }, 3000);
  }

  async loadTrack(track) {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      this.pause();
      
      this.currentTrack = track;
      this.currentTrackIndex = this.tracks.findIndex(t => t.id === track.id);
      
      const permalinkUrl = track.permalink_url || `https://soundcloud.com/${track.user?.permalink || 'unknown'}/${track.permalink || track.id}`;
      
      await this.createPlayerIframe(permalinkUrl);
      this.updateTrackInfoUI(track);
      
      await this.play();
      this.loadRecommendations(track.id);
    } catch (error) {
      console.error('Ошибка загрузки трека:', error);
      if (!this.errorShown) {
        this.handleErrorMessage('Не удалось загрузить трек. Попробуйте другой.');
        this.errorShown = true;
      }
    } finally {
      this.isLoading = false;
    }
  }

  async createPlayerIframe(url) {
    // Удаляем старый iframe если есть
    if (this.elements.playerIframe) {
      this.elements.playerIframe.remove();
      this.widget = null;
    }

    // Ожидаем загрузку API если нужно
    await this.loadSoundCloudWidgetAPI();

    // Создаем новый iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'sc-player';
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false`;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.width = '0';
    iframe.height = '0';
    iframe.frameBorder = 'no';
    iframe.scrolling = 'no';
    iframe.style.display = 'none';
    iframe.allow = 'autoplay';
    
    document.body.appendChild(iframe);
    this.elements.playerIframe = iframe;
    
    // Инициализируем плеер
    await this.initializeSCPlayer(iframe);
  }

  async initializeSCPlayer(iframe) {
    return new Promise((resolve) => {
      if (!window.SC) {
        console.error('SoundCloud Widget API not loaded');
        resolve();
        return;
      }

      this.widget = SC.Widget(iframe);
      
      this.widget.bind(SC.Widget.Events.READY, () => {
        this.widget.setVolume(this.volume * 100);
        
        this.widget.bind(SC.Widget.Events.PLAY, () => {
          this.isPlaying = true;
          this.updatePlayButton();
          
          this.widget.getDuration((duration) => {
            if (this.elements.progressBar) {
              this.elements.progressBar.max = duration / 1000;
            }
            if (this.elements.duration) {
              this.elements.duration.textContent = this.formatTime(duration / 1000);
            }
          });
        });
        
        this.widget.bind(SC.Widget.Events.PAUSE, () => {
          this.isPlaying = false;
          this.updatePlayButton();
        });
        
        this.widget.bind(SC.Widget.Events.FINISH, () => {
          this.next();
        });
        
        this.widget.bind(SC.Widget.Events.PLAY_PROGRESS, (progress) => {
          if (this.elements.progressBar) {
            this.elements.progressBar.value = progress.currentPosition / 1000;
          }
          if (this.elements.currentTime) {
            this.elements.currentTime.textContent = this.formatTime(progress.currentPosition / 1000);
          }
        });

        resolve();
      });
    });
  }

  async play() {
    try {
      if (!this.widget) {
        throw new Error('Плеер не инициализирован');
      }
      
      await new Promise((resolve) => {
        this.widget.play();
        this.isPlaying = true;
        this.updatePlayButton();
        
        // Проверяем, что трек действительно начал играть
        const checkPlayback = setInterval(() => {
          this.widget.isPaused((paused) => {
            if (!paused) {
              clearInterval(checkPlayback);
              resolve();
            }
          });
        }, 100);
      });
      
      return true;
    } catch (error) {
      console.error('Ошибка воспроизведения:', error);
      this.isPlaying = false;
      this.updatePlayButton();
      
      if (!this.errorShown) {
        this.handleErrorMessage('Не удалось воспроизвести трек');
        this.errorShown = true;
      }
      return false;
    }
  }

  pause() {
    if (this.widget) {
      this.widget.pause();
    }
    this.isPlaying = false;
    this.updatePlayButton();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  next() {
    if (this.tracks.length === 0 || this.isLoading) return;
    
    const nextIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.currentTrackIndex = nextIndex;
    this.loadTrack(this.tracks[this.currentTrackIndex]);
  }

  prev() {
    if (this.tracks.length === 0 || this.isLoading) return;
    
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.loadTrack(this.tracks[this.currentTrackIndex]);
  }

  updatePlayButton() {
    if (!this.elements.playBtn) return;
    
    const icon = this.isPlaying ? 'bi-pause-fill' : 'bi-play-fill';
    this.elements.playBtn.innerHTML = `<i class="bi ${icon}"></i>`;
  }

  startProgressUpdate() {
    this.stopProgressUpdate();
    this.progressUpdateInterval = setInterval(() => {
      if (this.widget && this.isPlaying) {
        this.widget.getPosition((position) => {
          if (this.elements.currentTime) {
            this.elements.currentTime.textContent = this.formatTime(position / 1000);
          }
        });
      }
    }, 500);
  }

  stopProgressUpdate() {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
  }

  updateTrackInfoUI(track) {
    if (!this.elements.playerRoot) return;
    
    if (this.elements.trackAvatar) {
      this.elements.trackAvatar.src = track.avatar || 'assets/default-avatar.png';
    }
    if (this.elements.currentTrack) {
      this.elements.currentTrack.textContent = track.title;
    }
    if (this.elements.currentArtist) {
      this.elements.currentArtist.textContent = track.artist;
    }
    if (this.elements.trackSource) {
      this.elements.trackSource.textContent = 'SC';
      this.elements.trackSource.className = 'badge bg-orange';
    }
    
    this.elements.playerRoot.classList.add('show');
    this.updatePlayButton();
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  handleErrorMessage(message = 'Произошла ошибка') {
    console.error(message);
    this.pause();
    
    const errorElement = document.createElement('div');
    errorElement.className = 'alert alert-danger position-fixed top-0 end-0 m-3';
    errorElement.textContent = message;
    errorElement.style.zIndex = '1000';
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
      errorElement.remove();
    }, 3000);
  }

  async searchTracks(query) {
    if (!query.trim()) return;
    
    try {
      this.showLoader();
      this.tracks = await searchTracks(query, CLIENT_ID);
      
      if (this.tracks.length === 0) {
        this.showError('Ничего не найдено', query);
        return;
      }
      
      this.renderTracks();
      this.loadRecommendations(this.tracks[0].id);
    } catch (error) {
      console.error('Ошибка поиска:', error);
      this.showError('Ошибка при поиске треков', query);
    }
  }

  async loadRecommendations(trackId) {
    try {
      const recommendations = await getRecommendations(trackId, CLIENT_ID);
      this.renderRecommendations(recommendations);
    } catch (error) {
      console.error('Ошибка загрузки рекомендаций:', error);
    }
  }

  showLoader() {
    if (!this.elements.tracksContainer) return;
    
    this.elements.tracksContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2">Загрузка...</p>
      </div>
    `;
  }

  showError(message, query = '') {
    if (!this.elements.tracksContainer) return;
    
    this.elements.tracksContainer.innerHTML = `
      <div class="text-center py-4 text-danger">
        <p>${message}</p>
        ${query ? `
        <button class="btn btn-sm btn-primary mt-2" id="retry-search">
          Попробовать снова
        </button>
        ` : ''}
      </div>
    `;
    
    if (query) {
      const retryBtn = document.getElementById('retry-search');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.searchTracks(query);
        });
      }
    }
  }

  renderTracks() {
    if (!this.elements.tracksContainer) return;
    
    const container = this.elements.tracksContainer;
    container.innerHTML = '<h4 class="mb-3">Найденные треки</h4>';
    
    const list = document.createElement('div');
    list.className = 'tracks-list';
    
    this.tracks.forEach((track, index) => {
      const element = document.createElement('div');
      element.className = 'track-container';
      element.innerHTML = `
        <img src="${track.avatar || 'assets/default-avatar.png'}" 
             class="track-avatar"
             onerror="this.src='assets/default-avatar.png'">
        <div class="track-info">
          <div class="track-title-container">
            <span class="track-title">${track.title}</span>
            <span class="badge bg-orange">SC</span>
          </div>
          <div class="track-artist">${track.artist}</div>
          <div class="track-duration">${this.formatTime(track.duration/1000)}</div>
        </div>
        <button class="play-btn">
          <i class="bi ${this.currentTrack?.id === track.id && this.isPlaying ? 'bi-pause' : 'bi-play'}"></i>
        </button>
      `;
      
      element.addEventListener('click', (e) => {
        if (!e.target.closest('.play-btn') && !this.isLoading) {
          this.currentTrackIndex = index;
          this.loadTrack(track);
        }
      });
      
      const playBtn = element.querySelector('.play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          if (this.isLoading) return;
          e.stopPropagation();
          this.currentTrackIndex = index;
          this.loadTrack(track);
        });
      }
      
      list.appendChild(element);
    });
    
    container.appendChild(list);
  }

  renderRecommendations(recommendations) {
    if (!this.elements.recommendationsContainer) return;
    
    const container = this.elements.recommendationsContainer;
    container.innerHTML = '';
    
    if (!recommendations || recommendations.length === 0) return;
    
    container.innerHTML = `
      <h4 class="mb-3"><i class="bi bi-stars"></i> Рекомендации</h4>
      <div class="recommendations-list"></div>
    `;
    
    const list = container.querySelector('.recommendations-list');
    if (!list) return;
    
    recommendations.forEach(track => {
      const item = document.createElement('div');
      item.className = 'recommendation-item';
      item.innerHTML = `
        <img src="${track.avatar || 'assets/default-avatar.png'}" 
             class="recommendation-cover"
             onerror="this.src='assets/default-avatar.png'">
        <div class="recommendation-info">
          <div class="recommendation-title">${track.title}</div>
          <div class="recommendation-artist">${track.artist}</div>
        </div>
      `;
      
      item.addEventListener('click', () => {
        if (this.isLoading) return;
        const existingIndex = this.tracks.findIndex(t => t.id === track.id);
        if (existingIndex === -1) {
          this.tracks.push(track);
          this.renderTracks();
          this.currentTrackIndex = this.tracks.length - 1;
        } else {
          this.currentTrackIndex = existingIndex;
        }
        this.loadTrack(track);
      });
      
      list.appendChild(item);
    });
  }
  
  destroy() {
    this.pause();
    this.clearEventListeners();
    
    if (this.elements.playerIframe) {
      this.elements.playerIframe.remove();
    }
    
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    
    console.log('Player resources cleaned up');
  }
}

export const player = new MusicPlayer();

window.addEventListener('beforeunload', () => {
  player.destroy();
});