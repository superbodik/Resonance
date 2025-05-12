const CLIENT_ID = 'AXHkknI02RnaQ0vVJ3FK3pVcoToTlmFK';

export async function searchTracks(query, limit = 10) {
  try {
    let url;
    if (query === 'popular') {
      url = `https://api-v2.soundcloud.com/charts?kind=top&genre=soundcloud%3Agenres%3Aall-music&client_id=${CLIENT_ID}&limit=${limit}`;
    } else {
      url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${CLIENT_ID}&limit=${limit}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    const collection = query === 'popular' ? 
      (data.collection || []).map(item => item.track) : 
      data.collection;
    
    if (!collection) return [];
    
    return collection.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.user?.username || 'Unknown Artist',
      duration: track.duration,
      permalink_url: track.permalink_url,
      avatar: track.artwork_url ? track.artwork_url.replace('large', 't500x500') : 'assets/default-avatar.png',
      source: 'soundcloud'
    }));
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}
export async function getRecommendations(trackId, limit = 6) {
  try {
    const response = await fetch(
      `https://api-v2.soundcloud.com/tracks/${trackId}/related?client_id=${CLIENT_ID}&limit=${limit}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    return data.collection.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.user?.username || 'Unknown Artist',
      duration: track.duration,
      url: track.permalink_url,
      stream_url: `https://api.soundcloud.com/tracks/${track.id}/stream`,
      avatar: track.artwork_url ? track.artwork_url.replace('large', 't500x500') : 'assets/default-avatar.png',
      source: 'soundcloud'
    }));
  } catch (error) {
    console.error('Recommendations error:', error);
    throw error;
  }
}