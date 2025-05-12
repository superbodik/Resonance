import { getTracks } from './api/recommendations.js';
import { createTrackElement } from './ui/elements.js';
import { MusicPlayer } from './player/Player.js';

const player = new MusicPlayer();
let isSearching = false;

async function renderTracks() {
  try {
    const tracks = await getTracks();
    const container = document.getElementById('tracks-container');
    
    if (!container) {
      console.error('Контейнер треков не найден');
      return;
    }

    container.innerHTML = '';
    
    tracks.forEach((track, index) => {
      const element = createTrackElement(track, index, player);
      container.appendChild(element);
    });
  } catch (error) {
    console.error('Ошибка рендеринга треков:', error);
  }
}

async function performSearch() {
  if (isSearching) return;
  
  try {
    isSearching = true;
    const query = document.getElementById('search-input').value.trim();
    if (query) {
      await player.searchTracks(query);
    }
  } catch (error) {
    console.error('Ошибка при выполнении поиска:', error);
  } finally {
    isSearching = false;
  }
}

document.getElementById('search-btn')?.addEventListener('click', performSearch);

document.getElementById('search-input')?.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    await performSearch();
  }
});

window.addEventListener('beforeunload', () => {
  if (player) {
    player.destroy();
  }
});
