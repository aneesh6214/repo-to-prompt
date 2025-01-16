// File: my-github-explorer/components/RepoExplorer.tsx

import React, { useState } from 'react';
import styles from '../styles/RepoExplorer.module.scss';
import CopyButton from './CopyButton';
import Loader from './Loader';
import FetchButton from './FetchButton';
import InputField from './InputField';
interface TokenEstimates {
  directoryTokens: number;
  contentTokens: number;
}

const RepoExplorer: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [content, setContent] = useState<string | null>(null);
  const [directory, setDirectory] = useState<string | null>(null);
  const [tokenEstimates, setTokenEstimates] = useState<TokenEstimates | null>(null);
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
    setTokenEstimates(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/fetchRepo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl, 
          filterMode: isWhitelist ? 'whitelist' : 'blacklist', 
          filterExtensions 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repository data.');
      }

      const data = await response.json();

      setContent(data.repoContents);
      setDirectory(data.directoryStructure);
      
      if (data.tokenEstimates) {
        setTokenEstimates({
          directoryTokens: data.tokenEstimates.directoryTokens,
          contentTokens: data.tokenEstimates.contentTokens,
        });
      }
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
          <div className={styles.submitArea}>
          <div className={styles.filterContainer}>
          <label>
                <input
                  type="checkbox"
                  checked={isWhitelist}
                  onChange={() => setIsWhitelist(!isWhitelist)}
                />
                {isWhitelist ? 'Whitelist' : 'Blacklist'}
              </label>
            <input
              type="text"
              placeholder={isWhitelist ? 'tsx, scss' : 'md, json'}
              value={filterExtensions}
              onChange={(e) => setFilterExtensions(e.target.value)}
              className={styles.input}
            />
            </div>
            <FetchButton />
          </div>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        {directory && (
          <div className={styles.results}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Directory Structure</h2>
              <CopyButton textToCopy={directory} />
            </div>
            <pre className={styles.codeBlock}>
              {directory}
              {tokenEstimates && (
                <div className={styles.tokenOverlay}>
                  <p><strong>Estimated Tokens:</strong> {tokenEstimates.directoryTokens}</p>
                </div>
              )}
            </pre>
          </div>
        )}
      
        {content && (
          <div className={styles.results}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Repository Contents</h2>
              <CopyButton textToCopy={content} />
            </div>
            <pre className={styles.codeBlock}>
              {content}
              {tokenEstimates && (
                <div className={styles.tokenOverlay}>
                  <p><strong>Estimated Tokens:</strong> {tokenEstimates.contentTokens}</p>
                </div>
              )}
            </pre>
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
