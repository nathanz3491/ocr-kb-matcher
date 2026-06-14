'use client';

import { LocalKnowledgeGraph } from '@/components/results/LocalKnowledgeGraph';

export default function ProtectedGraphEditorPage() {
  return (
    <div className="container mx-auto p-4">
      <LocalKnowledgeGraph searchQuery="" />
    </div>
  );
}