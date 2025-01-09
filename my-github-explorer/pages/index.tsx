import type { NextPage } from 'next';
import RepoExplorer from '../components/RepoExplorer';
import '../styles/globals.scss';

const Home: NextPage = () => {
  return (
    <div>
      <RepoExplorer />
    </div>
  );
};

export default Home;