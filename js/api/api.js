const CLIENT_ID = 'AXHkknI02RnaQ0vVJ3FK3pVcoToTlmFK'; // Ваш клиентский ID
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/'; // Прокси для обхода CORS

export async function searchTracks(query, limit = 10) {
  try {
    const response = await fetch(
      `${PROXY_URL}https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${CLIENT_ID}&limit=${limit}`
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    return data.collection.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.user.username,
      duration: track.duration,
      url: track.permalink_url,
      stream_url: `${PROXY_URL}https://api.soundcloud.com/tracks/${track.id}/stream?client_id=${CLIENT_ID}`,
      avatar: track.artwork_url ? track.artwork_url.replace('large', 't500x500') : 'assets/default-avatar.png',
      source: 'soundcloud'
    }));
  } catch (error) {
    console.error('Ошибка поиска треков:', error);
    throw error;
  }
}