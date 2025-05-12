import axios from 'axios';

export async function searchSpotify(query) {
  const token = await getAccessToken();
  const res = await axios.get('https://api.spotify.com/v1/search', {
    headers: { Authorization: `Bearer ${token}` },
    params: { q: query, type: 'track', limit: 10 }
  });

  return res.data.tracks.items.map(track => ({
    source: 'spotify',
    title: track.name,
    artist: track.artists[0].name,
    id: track.id,
    streamUrl: track.preview_url
  }));
}
