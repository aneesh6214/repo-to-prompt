import React, { useState } from 'react';
import styles from '../styles/RepoExplorer.module.scss';
import CopyButton from './CopyButton';
import Loader from './Loader';

const RepoExplorer: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [content, setContent] = useState<string | null>(null);
  const [directory, setDirectory] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isWhitelist, setIsWhitelist] = useState<boolean>(true);
  const [filterExtensions, setFilterExtensions] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setContent(null);
    setDirectory(null);

    try {
      const response = await fetch('/api/fetchRepo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, filterMode: isWhitelist ? 'whitelist' : 'blacklist', filterExtensions }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repository data.');
      }

      const data = await response.json();
      setContent(data.repoContents);
      setDirectory(data.directoryStructure);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.container} aria-live="polite">
        {loading && <div className={styles.overlay}></div>}
        <h1 className={styles.title}> Wanna Talk to Your Codebase? </h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="url"
            placeholder="Enter repository URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
            className={styles.input}
          />
          <div className={styles.filterContainer}>
            <label>
              <input
                type="checkbox"
                checked={isWhitelist}
                onChange={() => setIsWhitelist(!isWhitelist)}
              />
              {isWhitelist ? 'Whitelist' : 'Blacklist'}
            </label>
          </div>
          <input
            type="text"
            placeholder={isWhitelist ? 'tsx, scss' : 'md, json'}
            value={filterExtensions}
            onChange={(e) => setFilterExtensions(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.button} disabled={loading} aria-busy={loading}>
            {loading ? 'Loading...' : 'Fetch'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        {directory && (
          <div className={styles.results}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Directory Structure</h2>
              <CopyButton textToCopy={directory} />
            </div>
            <pre className={styles.codeBlock}>{directory}</pre>
          </div>
        )}
      
        {content && (
          <div className={styles.results}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Repository Contents</h2>
              <CopyButton textToCopy={content} />
            </div>
            <pre className={styles.codeBlock}>{content}</pre>
          </div>
        )}
      </div>
      <div className={styles.loaderContainer}>
        {loading && <Loader />}
      </div>
    </>
  );
};

export default RepoExplorer;