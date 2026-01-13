'use client';

import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';

export interface MentionableElement {
  id: string;
  name: string;
  imageUrl?: string;
  type?: 'character' | 'style' | 'image';
}

export interface ParsedMention {
  name: string;
  element: MentionableElement;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  elements: MentionableElement[];
  onMentionsChange?: (mentions: ParsedMention[]) => void;
}

interface MentionPosition {
  start: number;
  end: number;
  query: string;
}

export default function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  className = '',
  elements,
  onMentionsChange,
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<MentionPosition | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter elements based on current query
  const filteredElements = mentionPosition
    ? elements.filter(el =>
        el.name.toLowerCase().includes(mentionPosition.query.toLowerCase())
      )
    : [];

  // Parse all mentions from the current value
  const parseMentions = useCallback((text: string): ParsedMention[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: ParsedMention[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1];
      const element = elements.find(el => el.name.toLowerCase() === mentionName.toLowerCase());
      if (element) {
        mentions.push({ name: mentionName, element });
      }
    }

    return mentions;
  }, [elements]);

  // Notify parent of mention changes
  useEffect(() => {
    if (onMentionsChange) {
      const mentions = parseMentions(value);
      onMentionsChange(mentions);
    }
  }, [value, parseMentions, onMentionsChange]);

  // Detect @ mentions and show dropdown
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;

    // Look for @ before cursor
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show dropdown if there's no whitespace after @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionPosition({
          start: lastAtIndex,
          end: cursorPos,
          query: textAfterAt,
        });
        setShowDropdown(true);
        setSelectedIndex(0);

        // Calculate dropdown position
        updateDropdownPosition();
        return;
      }
    }

    setShowDropdown(false);
    setMentionPosition(null);
  };

  // Update dropdown position based on cursor
  const updateDropdownPosition = () => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;

    // Create a temporary div to measure text
    const div = document.createElement('div');
    const styles = window.getComputedStyle(textarea);

    // Copy textarea styles to div
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.font = styles.font;
    div.style.padding = styles.padding;
    div.style.width = styles.width;
    div.style.lineHeight = styles.lineHeight;

    // Get text up to cursor
    div.textContent = value.substring(0, cursorPos);
    document.body.appendChild(div);

    // Get position
    const textRect = textarea.getBoundingClientRect();
    const divHeight = div.offsetHeight;

    document.body.removeChild(div);

    setDropdownPosition({
      top: Math.min(divHeight + 5, 150), // Max 150px from top
      left: 10,
    });
  };

  // Handle mention selection
  const insertMention = (element: MentionableElement) => {
    if (!mentionPosition || !textareaRef.current) return;

    const before = value.substring(0, mentionPosition.start);
    const after = value.substring(mentionPosition.end);
    const newValue = `${before}@${element.name} ${after}`;

    onChange(newValue);
    setShowDropdown(false);
    setMentionPosition(null);

    // Set cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionPosition.start + element.name.length + 2;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredElements.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredElements.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredElements[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        setMentionPosition(null);
        return;
      }
    }

    // Call parent's onKeyDown if dropdown is not shown or key wasn't handled
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render textarea with styled mentions
  const renderHighlightedText = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(value)) !== null) {
      const mentionName = match[1];
      const element = elements.find(el => el.name.toLowerCase() === mentionName.toLowerCase());

      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {value.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add mention with highlighting
      parts.push(
        <span
          key={`mention-${match.index}`}
          className={element ? 'text-lime-400 font-medium' : 'text-gray-400'}
        >
          @{mentionName}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {value.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : value;
  };

  return (
    <div className="relative w-full">
      {/* Highlight layer (behind textarea) */}
      <div
        className={`absolute inset-0 px-4 py-3 whitespace-pre-wrap break-words pointer-events-none overflow-hidden ${className}`}
        style={{
          minHeight: '48px',
          maxHeight: '200px',
          lineHeight: '1.5',
          color: 'transparent',
        }}
        aria-hidden="true"
      >
        {renderHighlightedText()}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={`relative bg-transparent ${className}`}
        style={{
          minHeight: '48px',
          maxHeight: '200px',
          caretColor: 'white',
        }}
      />

      {/* Dropdown for element selection */}
      {showDropdown && filteredElements.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          style={{
            bottom: `calc(100% + 5px)`,
            left: dropdownPosition.left,
            minWidth: '250px',
            maxWidth: '350px',
          }}
        >
          {filteredElements.map((element, index) => (
            <button
              key={element.id}
              onClick={() => insertMention(element)}
              className={`w-full px-3 py-2 text-left hover:bg-zinc-700 flex items-center gap-3 transition-colors ${
                index === selectedIndex ? 'bg-zinc-700' : ''
              }`}
            >
              {element.imageUrl && (
                <img
                  src={element.imageUrl}
                  alt={element.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  @{element.name}
                </p>
                {element.type && (
                  <p className="text-xs text-gray-400 capitalize">
                    {element.type}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Export helper function to parse mentions from text
export function parseMentions(text: string, elements: MentionableElement[]): ParsedMention[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: ParsedMention[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionName = match[1];
    const element = elements.find(el => el.name.toLowerCase() === mentionName.toLowerCase());
    if (element) {
      mentions.push({ name: mentionName, element });
    }
  }

  return mentions;
}
