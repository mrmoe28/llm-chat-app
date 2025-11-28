'use client';

import { useState, useRef, useEffect } from 'react';
import { Document } from '@/lib/db';

interface DocumentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  projectName: string;
  userId: string;
}

export default function DocumentsPanel({ isOpen, onClose, projectId, projectName, userId }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadDocuments();
    }
  }, [isOpen, projectId]);

  const loadDocuments = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/documents?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!projectId) {
      alert('Please select a project first');
      return;
    }

    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} is not supported. Please upload PDF, TXT, or DOCX files.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        const response = await fetch(`/api/projects/${projectId}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }
      } catch (error: any) {
        console.error('Failed to upload file:', error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    setUploading(false);
    loadDocuments();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (documentId: string, filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/documents?userId=${userId}&documentId=${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadDocuments();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      alert(`Failed to delete document: ${error.message}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-brownish-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-brownish-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brownish-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Documents - {projectName}
            </h2>
            <p className="text-sm text-brownish-gray-400 mt-1">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-brownish-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-brownish-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-brownish-gray-500 bg-brownish-gray-700 bg-opacity-50'
                : 'border-brownish-gray-600 hover:border-brownish-gray-500'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileInput}
              className="hidden"
            />

            <svg
              className="w-12 h-12 mx-auto mb-4 text-brownish-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <p className="text-brownish-gray-200 mb-2">
              {dragActive ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-sm text-brownish-gray-400 mb-4">or</p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-brownish-gray-600 text-white rounded-xl hover:bg-brownish-gray-500 transition-colors disabled:bg-brownish-gray-700 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {uploading ? 'Uploading...' : 'Browse Files'}
            </button>

            <p className="text-xs text-brownish-gray-400 mt-3">
              Supports PDF, TXT, DOCX (max 10MB per file)
            </p>
          </div>

          {/* Documents List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-brownish-gray-400">
                <span className="inline-block w-2 h-2 bg-brownish-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="inline-block w-2 h-2 bg-brownish-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="inline-block w-2 h-2 bg-brownish-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          ) : documents.length > 0 ? (
            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-semibold text-brownish-gray-400 mb-3 uppercase tracking-wider">
                Uploaded Documents
              </h3>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-brownish-gray-700 rounded-xl hover:bg-brownish-gray-600 transition-colors group border border-brownish-gray-600"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* File icon */}
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-brownish-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {doc.original_filename}
                      </p>
                      <p className="text-xs text-brownish-gray-400">
                        {formatFileSize(doc.file_size)} • {formatDate(doc.upload_date)} • {doc.chunk_count} chunks
                      </p>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(doc.id, doc.original_filename)}
                    className="flex-shrink-0 ml-4 text-brownish-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-brownish-gray-400">
              <p>No documents uploaded yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brownish-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-brownish-gray-700 text-white rounded-xl hover:bg-brownish-gray-600 transition-colors border border-brownish-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
