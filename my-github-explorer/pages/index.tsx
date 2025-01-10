import type { NextPage } from 'next';
import RepoExplorer from '../components/RepoExplorer';
import FetchButton from '../components/FetchButton';
import '../styles/globals.scss';

const Home: NextPage = () => {
    return (
        <div>
            <FetchButton />
            <div className="bg-red-500"> HELLO WORLD </div>
            {/* <RepoExplorer /> */}
        </div>
    );
};

export default Home;