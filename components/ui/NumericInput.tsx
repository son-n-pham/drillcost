import React, { useState, useEffect, useCallback } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  formatDisplay?: (value: number) => string;
  parseInput?: (value: string) => number;
  className?: string;
  type?: 'text' | 'number';
  placeholder?: string;
}

/**
 * A numeric input component that allows users to fully clear the input
 * during typing. Uses local state during editing and syncs to props on blur.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min,
  max,
  formatDisplay,
  parseInput,
  className = '',
  type = 'text',
  placeholder,
}) => {
  // Local state to track raw input value during typing
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Format the value for display
  const getDisplayValue = useCallback(() => {
    if (formatDisplay) {
      return formatDisplay(value);
    }
    return String(value);
  }, [value, formatDisplay]);

  // Parse input string to number
  const parseValue = useCallback((input: string): number => {
    if (parseInput) {
      return parseInput(input);
    }
    // Default parsing: remove commas, parse as float
    const cleaned = input.replace(/,/g, '');
    return parseFloat(cleaned);
  }, [parseInput]);

  // Sync local value when prop value changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(getDisplayValue());
    }
  }, [value, isFocused, getDisplayValue]);

  const handleFocus = () => {
    setIsFocused(true);
    // On focus, show the raw number without formatting for easier editing
    setLocalValue(String(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Parse and validate the local value
    let numValue = parseValue(localValue);
    
    // If invalid, reset to previous value
    if (isNaN(numValue)) {
      numValue = value;
    }
    
    // Apply min/max constraints
    if (min !== undefined && numValue < min) {
      numValue = min;
    }
    if (max !== undefined && numValue > max) {
      numValue = max;
    }
    
    // Update parent with final value
    onChange(numValue);
    
    // Reset local display to formatted value
    setLocalValue(formatDisplay ? formatDisplay(numValue) : String(numValue));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Optionally update on each keystroke if value is valid
    const numValue = parseValue(newValue);
    if (!isNaN(numValue)) {
      // Apply min/max constraints for real-time updates
      let constrainedValue = numValue;
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min;
      }
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max;
      }
      onChange(constrainedValue);
    }
  };

  return (
    <input
      type={type}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  );
};

export default NumericInput;
