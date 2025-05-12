import { searchTracks } from './soundcloud.js';
import { player } from '../player/Player.js';

const CLIENT_ID = 'AXHkknI02RnaQ0vVJ3FK3pVcoToTlmFK'; // Ваш клиентский ID SoundCloud

// Кэш для хранения рекомендаций
const recommendationsCache = new Map();

/**
 * Получает рекомендации на основе трека
 * @param {string} trackId - ID трека для которого ищем рекомендации
 * @param {number} limit - Количество рекомендаций
 * @returns {Promise<Array>} - Массив рекомендованных треков
 */
export async function getRecommendations(trackId, limit = 6) {
  try {
    // Проверяем кэш
    if (recommendationsCache.has(trackId)) {
      return recommendationsCache.get(trackId);
    }

    // 1. Получаем похожие треки
    const similarResponse = await fetch(
      `https://api-v2.soundcloud.com/tracks/${trackId}/related?client_id=${CLIENT_ID}&limit=${limit}`
    );
    const similarTracks = await similarResponse.json();

    if (!similarTracks.collection?.length) {
      throw new Error('No similar tracks found');
    }

    const mainTrack = similarTracks.collection[0];
    
    // 2. Параллельно получаем треки того же жанра и популярные треки автора
    const [genreTracks, popularTracks] = await Promise.all([
      mainTrack.genre ? searchTracks(`genre:"${mainTrack.genre}"`, limit/2) : Promise.resolve([]),
      searchTracks(`user:"${mainTrack.user.username}"`, limit/2, 'popular')
    ]);

    // 3. Объединяем и фильтруем результаты
    const allTracks = [
      ...similarTracks.collection,
      ...(genreTracks.collection || []),
      ...(popularTracks.collection || [])
    ];

    const uniqueTracks = allTracks.filter((track, index, self) =>
      index === self.findIndex(t => t.id === track.id)
    ).slice(0, limit);

    // Сохраняем в кэш
    recommendationsCache.set(trackId, uniqueTracks);
    
    return uniqueTracks;
  } catch (error) {
    console.error('Ошибка получения рекомендаций:', error);
    
    // Возвращаем fallback-рекомендации
    return getFallbackRecommendations();
  }
}

/**
 * Fallback-рекомендации если API не доступно
 */
async function getFallbackRecommendations() {
  try {
    const response = await fetch('/data/fallback-recommendations.json');
    return await response.json();
  } catch {
    return []; // Возвращаем пустой массив если даже fallback не сработал
  }
}

/**
 * Воспроизводит случайную рекомендацию
 */
export async function playRandomRecommendation() {
  const recommendations = await getRecommendations(player.currentTrackInfo.id);
  if (recommendations.length > 0) {
    const randomTrack = recommendations[Math.floor(Math.random() * recommendations.length)];
    player.loadTrack(
      randomTrack.media.transcodings[0].url,
      randomTrack.title,
      randomTrack.user.username,
      randomTrack.id,
      randomTrack.artwork_url
    );
  }
}

/**
 * Отображает рекомендации в UI
 * @param {HTMLElement} container - Контейнер для вставки рекомендаций
 */
export async function displayRecommendations(container) {
  if (!player.currentTrackInfo?.id) return;

  container.innerHTML = '<h3>Рекомендуем послушать</h3><div class="loading">Загрузка...</div>';

  try {
    const recommendations = await getRecommendations(player.currentTrackInfo.id);
    
    if (recommendations.length === 0) {
      container.innerHTML = '<p>Не удалось загрузить рекомендации</p>';
      return;
    }

    const html = recommendations.map(track => `
      <div class="recommendation" data-id="${track.id}">
        <img src="${track.artwork_url || 'assets/default-cover.png'}" 
             alt="${track.title}" 
             onerror="this.src='assets/default-cover.png'">
        <div>
          <h4>${track.title}</h4>
          <p>${track.user.username}</p>
          <button class="play-btn" data-id="${track.id}">
            <i class="bi bi-play-fill"></i>
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<h3>Рекомендуем послушать</h3>${html}`;

    // Добавляем обработчики
    container.querySelectorAll('.play-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const trackId = e.target.closest('.play-btn').dataset.id;
        const track = recommendations.find(t => t.id == trackId);
        if (track) {
          player.loadTrack(
            track.media.transcodings[0].url,
            track.title,
            track.user.username,
            track.id,
            track.artwork_url
          );
        }
      });
    });
  } catch (error) {
    console.error('Ошибка отображения рекомендаций:', error);
    container.innerHTML = '<p>Ошибка загрузки рекомендаций</p>';
  }
}
export async function getTracks(query = '', limit = 10) {
  try {
    const response = await fetch(
      `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=AXHkknI02RnaQ0vVJ3FK3pVcoToTlmFK&limit=${limit}`
    );
    const data = await response.json();
    return data.collection || [];
  } catch (error) {
    console.error('Ошибка при загрузке треков:', error);
    return [];
  }
}