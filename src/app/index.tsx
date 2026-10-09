import { Redirect } from 'expo-router';

/** The app's root URL (a fresh launch of the installed app opens `/`): start on Teams. */
export default function Index() {
  return <Redirect href="/teams" />;
}
