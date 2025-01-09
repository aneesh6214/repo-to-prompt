import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import { URL } from 'url';
import path from 'path';

type Data = {
  repoContents?: string;
  directoryStructure?: string;
  error?: string;
};

const fetchRepoContents = async (apiUrl: string, headers: Record<string, string>): Promise<[string, string][]> => {
  const response = await fetch(apiUrl, { headers });
  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Unexpected API response format.');
  }

  const files: [string, string][] = [];

  for (const item of data) {
    if (item.type === 'file') {
      const fileResponse = await fetch(item.download_url, { headers });
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${item.path}`);
      }
      const content = await fileResponse.text();
      files.push([item.path, content]);
    } else if (item.type === 'dir') {
      const subFiles = await fetchRepoContents(item.url, headers);
      files.push(...subFiles);
    }
  }

  return files;
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

  const { repoUrl, filterMode, filterExtensions } = req.body;

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

    const headers = {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    let allFiles = await fetchRepoContents(apiUrl, headers);

    if (filterExtensions) {
      const extensions = filterExtensions.split(',').map(ext => ext.trim().toLowerCase());
      if (filterMode === 'whitelist') {
        allFiles = allFiles.filter(([filePath]) => {
          const fileExt = path.extname(filePath).slice(1).toLowerCase();
          return extensions.includes(fileExt);
        });
      } else if (filterMode === 'blacklist') {
        allFiles = allFiles.filter(([filePath]) => {
          const fileExt = path.extname(filePath).slice(1).toLowerCase();
          return !extensions.includes(fileExt);
        });
      }
    }

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