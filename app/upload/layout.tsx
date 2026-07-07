import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New quiz',
  description: 'Upload a PDF or DOCX and generate an AI-powered quiz in seconds.',
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
