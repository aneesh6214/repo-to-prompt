import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import { URL } from 'url';
import path from 'path';

type Data = {
  repoContents?: string;
  directoryStructure?: string;
  error?: string;
};

const fetchRepoContents = async (apiUrl: string, parentDir = ''): Promise<[string, string][]> => {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Error fetching repository contents: ${response.status}`);
  }

  const items = await response.json();
  const allFiles: [string, string][] = [];

  for (const item of items) {
    if (item.type === 'file') {
      const fileUrl = item.download_url;
      const filePath = path.join(parentDir, item.name);

      const fileResponse = await fetch(fileUrl);
      if (fileResponse.ok) {
        const fileContent = await fileResponse.text();
        allFiles.push([filePath, fileContent]);
      } else {
        console.error(`Error fetching file: ${filePath}`);
      }
    } else if (item.type === 'dir') {
      const dirPath = path.join(parentDir, item.name);
      const subdirApiUrl = item.url;
      const subFiles = await fetchRepoContents(subdirApiUrl, dirPath);
      allFiles.push(...subFiles);
    }
  }

  return allFiles;
};

const generateDirectoryStructure = (files: [string, string][]): string => {
  const tree: Record<string, any> = {};

  files.forEach(([filePath]) => {
    const parts = filePath.split(path.sep);
    let current = tree;
    parts.forEach((part) => {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    });
  });

  const formatTree = (structure: Record<string, any>, prefix = ''): string[] => {
    const lines: string[] = [];
    const entries = Object.keys(structure).sort();

    entries.forEach((key, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${connector}${key}`);
      const extension = isLast ? '    ' : '│   ';
      if (Object.keys(structure[key]).length > 0) {
        lines.push(...formatTree(structure[key], prefix + extension));
      }
    });

    return lines;
  };

  return formatTree(tree).join('\n');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: 'Repository URL is required.' });
  }

  try {
    const url = new URL(repoUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub repository URL.');
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

    const allFiles = await fetchRepoContents(apiUrl);

    if (allFiles.length === 0) {
      throw new Error('No files found or failed to fetch repository contents.');
    }

    // Generate repository contents string
    let repoContents = '';
    allFiles.forEach(([filePath, fileContent]) => {
      repoContents += `====== File: ${filePath} ======\n`;
      repoContents += `${fileContent}\n\n`;
    });

    // Generate directory structure string
    const directoryStructure = generateDirectoryStructure(allFiles);

    res.status(200).json({
      repoContents,
      directoryStructure,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}