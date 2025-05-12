import { searchTracks, getStreamUrl } from '../api/soundcloud.js';
import { createTrackElement } from './elements.js';

let currentTrackList = [];
let currentTrackIndex = 0;

export async function handleSearch(query) {
  try {
    const data = await searchTracks(query);
    currentTrackList = [];
    
    return data.collection.map(track => {
      const trackData = {
        url: getStreamUrl(track),
        title: track.title,
        artist: track.user.username,
        id: track.id,
        avatar: track.user.avatar_url
      };
      currentTrackList.push(trackData);
      return createTrackElement(trackData, currentTrackList.length - 1);
    });
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

export function playNextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % currentTrackList.length;
  return currentTrackList[currentTrackIndex];
}

export function playPrevTrack() {
  currentTrackIndex = (currentTrackIndex - 1 + currentTrackList.length) % currentTrackList.length;
  return currentTrackList[currentTrackIndex];
}