import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from './input';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface EmailTagInputProps {
  value: string; // Semicolon-separated emails
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const EmailTagInput: React.FC<EmailTagInputProps> = ({
  value,
  onChange,
  placeholder = 'E-Mail eingeben und Enter drücken',
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  
  // Parse semicolon-separated emails into array
  const emails = value
    ? value.split(';').map(e => e.trim()).filter(e => e.length > 0)
    : [];

  const addEmail = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !emails.includes(trimmed)) {
      const newEmails = [...emails, trimmed];
      onChange(newEmails.join('; '));
      setInputValue('');
    }
  };

  const removeEmail = (emailToRemove: string) => {
    const newEmails = emails.filter(e => e !== emailToRemove);
    onChange(newEmails.join('; '));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      // Remove last email when backspace on empty input
      removeEmail(emails[emails.length - 1]);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tags Display */}
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {emails.map((email, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1 pr-1">
              <span className="text-xs">{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="hover:bg-secondary-foreground/20 rounded-sm p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Input Field */}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addEmail}
        placeholder={placeholder}
        className="h-8"
      />
    </div>
  );
};
