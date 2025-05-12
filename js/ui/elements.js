const DEFAULT_AVATAR = 'assets/default-avatar.png';

export function createTrackElement(track, index, playerInstance) {
  const element = document.createElement('div');
  element.className = 'track-container';
  element.dataset.trackId = track.id;
  
  element.innerHTML = `
    <img src="${track.avatar || DEFAULT_AVATAR}" class="track-avatar" 
         onerror="this.src='${DEFAULT_AVATAR}'">
    <div class="track-info">
      <div class="track-title-container">
        <span class="track-title">${track.title}</span>
      </div>
      <div class="track-artist">${track.artist || 'Неизвестный исполнитель'}</div>
    </div>
    <button class="play-btn">
      <i class="bi bi-play"></i> Воспроизвести
    </button>
  `;

  if (playerInstance && typeof playerInstance.loadTrack === 'function') {
    const playBtn = element.querySelector('.play-btn');
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      playerInstance.loadTrack(
        track.stream_url || track.url,
        track.title,
        track.artist || track.user?.username || 'Неизвестный исполнитель',
        track.id,
        track.avatar || DEFAULT_AVATAR
      );
      
      playBtn.innerHTML = '<i class="bi bi-pause"></i> Пауза';
    });

    element.addEventListener('click', (e) => {
      if (!e.target.closest('.play-btn')) {
        playerInstance.loadTrack(
          track.stream_url || track.url,
          track.title,
          track.artist || track.user?.username || 'Неизвестный исполнитель',
          track.id,
          track.avatar || DEFAULT_AVATAR
        );
      }
    });
  } else {
    console.error('Player instance is not available or missing loadTrack method');
  }

  return element;
}

export function createRecommendationsList(tracks, playerInstance) {
  const container = document.createElement('div');
  container.className = 'recommendations-container';
  
  if (!Array.isArray(tracks)) {
    console.error('Tracks is not an array');
    return container;
  }

  const list = document.createElement('div');
  list.className = 'recommendations-list';
  
  tracks.forEach(track => {
    const trackElement = createTrackElement(track, null, playerInstance);
    list.appendChild(trackElement);
  });
  
  container.appendChild(list);
  return container;
}