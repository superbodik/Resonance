import { getTracks } from './api/recommendations.js';
import { createTrackElement } from './ui/elements.js';
import { MusicPlayer } from './player/Player.js';

// Инициализация плеера
const player = new MusicPlayer();
let isSearching = false; // Флаг для предотвращения дублирования поиска

async function renderTracks() {
  try {
    const tracks = await getTracks(); // Теперь функция определена
    const container = document.getElementById('tracks-container');
    
    if (!container) {
      console.error('Контейнер треков не найден');
      return;
    }

    container.innerHTML = ''; // Очищаем контейнер
    
    tracks.forEach((track, index) => {
      const element = createTrackElement(track, index, player);
      container.appendChild(element);
    });
  } catch (error) {
    console.error('Ошибка рендеринга треков:', error);
  }
}

// Используем единую функцию для поиска, чтобы избежать дублирования
async function performSearch() {
  // Проверяем флаг, чтобы избежать повторного запуска поиска
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

// Обработчик для кнопки поиска
document.getElementById('search-btn')?.addEventListener('click', performSearch);

// Обработчик для Enter в поле поиска
document.getElementById('search-input')?.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); // Предотвращаем стандартное поведение формы
    await performSearch();
  }
});

// Добавляем обработчик для очистки ресурсов при выгрузке страницы
window.addEventListener('beforeunload', () => {
  if (player) {
    player.destroy(); // Явно вызываем метод очистки ресурсов
  }
});