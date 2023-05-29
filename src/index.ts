import axios from 'axios';
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import process from 'process';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Authorization token that must have been created previously. See : https://developer.spotify.com/documentation/web-api/concepts/authorization
const token = process.env.SPOTIFY_TOKEN;

const baseUrl = 'https://api.spotify.com/';

const getSongsFromOpenAi = async () => {
  const propmt = `Hey you're a great DJ. I need a playlist with 10 tracks to listen while working. Here are two songs I would like to have: "The Pretender" by "Foo Fighters" and "The Scientist" by "Coldplay". Please output just the song names in this style: <song_name>,<artist> separated by a new line and not output a single message other than the songs.`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: propmt }],
  });

  return completion.data.choices[0].message?.content;
};

const search = async (song: string, artist: string) => {
  const url = `${baseUrl}v1/search?q=${song}+${artist}&type=track&limit=1`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const getUser = async () => {
  const url = `${baseUrl}v1/me`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const createPlaylist = async (userId: string, name: string) => {
  const url = `${baseUrl}v1/users/${userId}/playlists`;
  const response = await axios.post(
    url,
    {
      name,
      description: 'Created with the Spotify API',
      public: false,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const addTracks = async (playlistId: string, tracks: string[]) => {
  const response = await axios.post(
    `${baseUrl}v1/playlists/${playlistId}/tracks`,
    {
      uris: tracks,
      position: 0,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/* eslint-disable unicorn/no-process-exit */

async function main() {
  const songs = await getSongsFromOpenAi();

  const songsArray = songs?.split('\n').map((song) => song.split(','));

  const tracksUri = await Promise.all(
    songsArray?.map((song) =>
      search(song[0], song[1]).then((result) => result.tracks.items[0].uri)
    ) ?? []
  );

  if (!tracksUri || tracksUri.length === 0) {
    throw new Error('No tracks found');
  }

  const user = await getUser();

  const playlist = await createPlaylist(user.id, 'My playlist API');

  await addTracks(playlist.id, tracksUri);
}

void main()
  .catch((error) => console.error(error))
  .then(() => process.exit());
