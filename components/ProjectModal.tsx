'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/lib/db';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  project?: Project | null;
  userId: string;
}

const EMOJI_OPTIONS = ['📁', '💼', '🚀', '📊', '💡', '🎯', '📚', '🔬', '🎨', '🏠', '💻', '✨'];

export default function ProjectModal({ isOpen, onClose, onSave, project, userId }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setIcon(project.icon);
      setDescription(project.description || '');
      setSystemPrompt(project.system_prompt || '');
    } else {
      setName('');
      setIcon('📁');
      setDescription('');
      setSystemPrompt('');
    }
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Project name is required');
      return;
    }

    onSave({
      name: name.trim(),
      icon,
      description: description.trim() || null,
      system_prompt: systemPrompt.trim() || null,
    });

    // Reset form
    setName('');
    setIcon('📁');
    setDescription('');
    setSystemPrompt('');
  };

  const handleClose = () => {
    setName('');
    setIcon('📁');
    setDescription('');
    setSystemPrompt('');
    setShowEmojiPicker(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brownish-gray-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-brownish-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-brownish-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brownish-gray-800">
          <h2 className="text-xl font-semibold text-brownish-gray-100">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={handleClose}
            className="text-brownish-gray-400 hover:text-brownish-gray-200 transition-colors rounded-lg p-1.5 hover:bg-brownish-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name and Icon */}
          <div className="flex gap-4">
            {/* Icon Picker */}
            <div className="relative">
              <label className="block text-sm font-medium text-brownish-gray-300 mb-2">
                Icon
              </label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-14 h-14 bg-brownish-gray-800 rounded-xl flex items-center justify-center text-2xl hover:bg-brownish-gray-700 transition-colors border border-brownish-gray-700"
              >
                {icon}
              </button>

              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 bg-brownish-gray-800 rounded-xl p-3 shadow-2xl border border-brownish-gray-700 z-10">
                  <div className="grid grid-cols-4 gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setIcon(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-brownish-gray-700 transition-colors ${
                          icon === emoji ? 'bg-brownish-gray-700 ring-2 ring-brownish-gray-500' : 'bg-brownish-gray-900'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex-1">
              <label htmlFor="name" className="block text-sm font-medium text-brownish-gray-300 mb-2">
                Project Name <span className="text-brownish-gray-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Personal Assistant"
                className="w-full px-4 py-2.5 bg-brownish-gray-800 border border-brownish-gray-700 rounded-xl text-brownish-gray-100 placeholder-brownish-gray-500 focus:outline-none focus:border-brownish-gray-600 focus:ring-1 focus:ring-brownish-gray-600 transition-colors"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-brownish-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this project..."
              rows={3}
              className="w-full px-4 py-2.5 bg-brownish-gray-800 border border-brownish-gray-700 rounded-xl text-brownish-gray-100 placeholder-brownish-gray-500 focus:outline-none focus:border-brownish-gray-600 focus:ring-1 focus:ring-brownish-gray-600 resize-none transition-colors"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-brownish-gray-300 mb-2">
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Instructions for the AI assistant in this project..."
              rows={5}
              className="w-full px-4 py-2.5 bg-brownish-gray-800 border border-brownish-gray-700 rounded-xl text-brownish-gray-100 placeholder-brownish-gray-500 focus:outline-none focus:border-brownish-gray-600 focus:ring-1 focus:ring-brownish-gray-600 resize-none transition-colors"
            />
            <p className="mt-2 text-xs text-brownish-gray-500">
              Define how the AI should behave for this project
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-5 border-t border-brownish-gray-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 bg-brownish-gray-800 text-brownish-gray-200 rounded-xl hover:bg-brownish-gray-700 transition-colors border border-brownish-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brownish-gray-500 text-white rounded-xl hover:bg-brownish-gray-400 transition-colors font-medium shadow-lg"
            >
              {project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
