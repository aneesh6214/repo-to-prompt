import React, { useState } from 'react';
import styles from '../styles/CopyButton.module.scss';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button onClick={handleCopy} className={styles.copyButton}>
      {copied ? (
        'Copied!'
      ) : (
        <>
          <svg
            viewBox="0 0 512 512"
            className={styles.svgIcon}
            height="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M288 448H64V224h64V160H64c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H288c35.3 0 64-28.7 64-64V384H288v64zm-64-96H448c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H224c-35.3 0-64 28.7-64 64V288c0 35.3 28.7 64 64 64z" />
          </svg>
          <span className={styles.text}>COPY</span>
        </>
      )}
    </button>
  );
};

export default CopyButton; 