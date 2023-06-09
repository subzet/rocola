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

const parseSongs = (songs: string) => {
  const songsRaw = songs.split('\n');

  return songsRaw
    .filter((song) => song[0] === '#')
    .map((song) => song.replace('#', '').split(','));
};

const getSongsFromOpenAi = async (
  prompt = "Hey I would like to listen to some music while working. I like to listen to rock and pop. I like the songs 'Smells Like Teen Spirit' by Nirvana, 'The Scientist' by Coldplay and 'I Want To Break Free' by Queen."
) => {
  const systemPrompt = `
  You are a great DJ. 
  I would prompt you with a playlist request with some requested song or styles I would like to hear. 
  The playlist should have at least 10 songs unless the user requests more. 
  The format of the output should be: #<song_name>,<artist> and each song should be in a new line. The starting '#' of each song is important to identify the song. 
  Please just output the songs in the format requested and nothing else with no previous or after text.
  Here is a sample output:
  
  #Smells Like Teen Spirit,Nirvana \n
  #The Scientist,Coldplay \n
  #I Want To Break Free,Queen \n
  
  `;

  const songCompletion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  });

  const playlistName = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content:
          "Please create a short name for the playlist you've recently created",
      },
    ],
  });

  console.log(songCompletion.data.choices[0].message?.content);

  return {
    songs: parseSongs(
      songCompletion.data.choices[0].message?.content as string
    ),
    playlistName: playlistName.data.choices[0].message?.content,
  };
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
  const { songs, playlistName } = await getSongsFromOpenAi(
    'Hey I would like to hear songs that helps me focus while working, create a playlist with 10 songs'
  );

  const tracksUri: string[] =
    songs?.map(
      async (song) =>
        await search(song[0], song[1]).then(
          (result) => result.tracks.items[0].uri
        )
    ) ?? [];

  if (!tracksUri || tracksUri.length === 0) {
    throw new Error('No tracks found');
  }

  const user = await getUser();

  const playlist = await createPlaylist(
    user.id,
    playlistName ?? 'My API playlist'
  );

  await addTracks(playlist.id, tracksUri);
}

void main()
  .catch((error) => console.error(error))
  .then(() => process.exit());
