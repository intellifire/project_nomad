/**
 * MaskedDateInput Component
 *
 * A custom date input that enforces YYYY-MM-DD format with automatic cursor advancement.
 * Prevents 6-digit years by advancing to month field after 4 year digits.
 *
 * Key features:
 * - Maximum 4 digits for year, 2 for month, 2 for day
 * - Automatic cursor advancement between fields
 * - Keyboard navigation with arrow keys
 * - Supports pasting dates
 * - Visual separator dashes between fields
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';

interface MaskedDateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

// Container styles
const containerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '16px',
};

// Individual field input styles
const fieldStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  textAlign: 'center',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 500,
  color: '#333',
  outline: 'none',
  padding: '0',
  margin: '0',
};

const yearFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  width: '4ch',
};

const monthDayFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  width: '2.5ch',
};

const separatorStyle: React.CSSProperties = {
  color: '#666',
  fontWeight: 500,
  userSelect: 'none',
};

/**
 * Parse a date string into year, month, day parts
 */
function parseDateValue(value: string): { year: string; month: string; day: string } {
  const parts = value.split('-');
  return {
    year: parts[0] || '',
    month: parts[1] || '',
    day: parts[2] || '',
  };
}

/**
 * Format parts back into YYYY-MM-DD string
 */
function formatDateValue(year: string, month: string, day: string): string {
  // Pad month and day with leading zeros if needed
  const paddedMonth = month.length === 1 ? `0${month}` : month;
  const paddedDay = day.length === 1 ? `0${day}` : day;
  return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Validate and clamp month value (1-12)
 */
function validateMonth(value: string): string {
  if (!value) return '';
  const num = parseInt(value, 10);
  if (isNaN(num)) return '';
  if (num < 1) return '01';
  if (num > 12) return '12';
  return value.padStart(2, '0');
}

/**
 * Validate and clamp day value (1-31)
 */
function validateDay(value: string, year: string, month: string): string {
  if (!value) return '';
  const num = parseInt(value, 10);
  if (isNaN(num)) return '';
  if (num < 1) return '01';

  // Get max days for the month
  let maxDays = 31;
  if (month) {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10) || 2000;
    // Days in month (handle Feb with leap year)
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    maxDays = daysInMonth;
  }

  if (num > maxDays) return String(maxDays).padStart(2, '0');
  return value.padStart(2, '0');
}

export function MaskedDateInput({
  value,
  onChange,
  style,
  className,
  'aria-label': ariaLabel = 'Date input',
}: MaskedDateInputProps) {
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  // Use refs to track current values for synchronous access in keydown handlers
  const yearValueRef = useRef('');
  const monthValueRef = useRef('');
  const dayValueRef = useRef('');

  const { year, month, day } = parseDateValue(value);

  // Local state for tracking partial input
  const [localYear, setLocalYear] = useState(year);
  const [localMonth, setLocalMonth] = useState(month);
  const [localDay, setLocalDay] = useState(day);

  // Keep refs in sync with state
  useEffect(() => {
    yearValueRef.current = localYear;
  }, [localYear]);

  useEffect(() => {
    monthValueRef.current = localMonth;
  }, [localMonth]);

  useEffect(() => {
    dayValueRef.current = localDay;
  }, [localDay]);

  // Sync local state when value prop changes
  useEffect(() => {
    const parsed = parseDateValue(value);
    setLocalYear(parsed.year);
    setLocalMonth(parsed.month);
    setLocalDay(parsed.day);
    yearValueRef.current = parsed.year;
    monthValueRef.current = parsed.month;
    dayValueRef.current = parsed.day;
  }, [value]);

  // Emit change to parent
  const emitChange = useCallback(
    (newYear: string, newMonth: string, newDay: string) => {
      const formatted = formatDateValue(newYear, newMonth, newDay);
      onChange(formatted);
    },
    [onChange]
  );

  // Handle year keydown - use ref for synchronous current value
  const handleYearKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle digit keys
      if (/^[0-9]$/.test(e.key)) {
        // Read directly from the input for most up-to-date value
        const currentValue = yearRef.current?.value || '';

        // If already at 4 digits, forward this key to month field
        if (currentValue.length >= 4) {
          e.preventDefault();

          // Get current month value and add this digit
          const currentMonth = monthRef.current?.value || '';
          const digit = parseInt(e.key, 10);

          // If month is empty and digit > 1, auto-pad with 0
          if (currentMonth.length === 0 && digit > 1) {
            const newMonth = `0${e.key}`;
            setLocalMonth(newMonth);
            monthValueRef.current = newMonth;
            emitChange(currentValue, newMonth, dayValueRef.current);
            // Focus day field
            dayRef.current?.focus();
            dayRef.current?.select();
          } else if (currentMonth.length >= 2) {
            // Month is full, forward to day
            const newDay = e.key;
            setLocalDay(newDay);
            dayValueRef.current = newDay;
            emitChange(currentValue, currentMonth, newDay);
            dayRef.current?.focus();
          } else {
            // Add to month
            const newMonth = currentMonth + e.key;
            setLocalMonth(newMonth);
            monthValueRef.current = newMonth;
            emitChange(currentValue, newMonth, dayValueRef.current);
            monthRef.current?.focus();

            // If month is now 2 digits and valid, advance to day
            if (newMonth.length >= 2) {
              const monthNum = parseInt(newMonth, 10);
              if (monthNum >= 1 && monthNum <= 12) {
                dayRef.current?.focus();
                dayRef.current?.select();
              }
            }
          }
          return;
        }
      }

      // Handle navigation
      if (e.key === 'ArrowRight') {
        const target = e.target as HTMLInputElement;
        if (target.selectionStart === target.value.length) {
          e.preventDefault();
          monthRef.current?.focus();
          monthRef.current?.setSelectionRange(0, 0);
        }
      }
    },
    [emitChange]
  );

  // Handle year input
  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, ''); // Only digits

      // Limit to 4 digits
      const newYear = raw.slice(0, 4);
      setLocalYear(newYear);
      yearValueRef.current = newYear;

      emitChange(newYear, monthValueRef.current, dayValueRef.current);
    },
    [emitChange]
  );

  // Handle month keydown
  const handleMonthKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle digit keys
      if (/^[0-9]$/.test(e.key)) {
        const currentValue = monthRef.current?.value || '';
        const digit = parseInt(e.key, 10);

        // If current value is empty and digit > 1, auto-pad with 0 and advance
        if (currentValue.length === 0 && digit > 1) {
          e.preventDefault();
          const newMonth = `0${e.key}`;
          setLocalMonth(newMonth);
          monthValueRef.current = newMonth;
          emitChange(yearValueRef.current, newMonth, dayValueRef.current);
          dayRef.current?.focus();
          dayRef.current?.select();
          return;
        }

        // If already at 2 digits, forward to day field
        if (currentValue.length >= 2) {
          e.preventDefault();
          const currentDay = dayRef.current?.value || '';

          if (currentDay.length === 0 && digit > 3) {
            // Auto-pad day with 0
            const newDay = `0${e.key}`;
            setLocalDay(newDay);
            dayValueRef.current = newDay;
            emitChange(yearValueRef.current, currentValue, newDay);
          } else if (currentDay.length >= 2) {
            // Day is full, ignore
          } else {
            const newDay = currentDay + e.key;
            setLocalDay(newDay);
            dayValueRef.current = newDay;
            emitChange(yearValueRef.current, currentValue, newDay);
          }
          dayRef.current?.focus();
          return;
        }

        // If adding this digit would make it 2 digits
        if (currentValue.length === 1) {
          const potentialMonth = currentValue + e.key;
          const monthNum = parseInt(potentialMonth, 10);
          // Validate the resulting month - advance after change event
          if (monthNum >= 1 && monthNum <= 12) {
            // Let the change happen, then advance
            setTimeout(() => {
              dayRef.current?.focus();
              dayRef.current?.select();
            }, 0);
          }
        }
      }

      // Handle navigation
      if (e.key === 'ArrowRight') {
        const target = e.target as HTMLInputElement;
        if (target.selectionStart === target.value.length) {
          e.preventDefault();
          dayRef.current?.focus();
          dayRef.current?.setSelectionRange(0, 0);
        }
      } else if (e.key === 'ArrowLeft') {
        const target = e.target as HTMLInputElement;
        if (target.selectionStart === 0) {
          e.preventDefault();
          yearRef.current?.focus();
          const len = yearRef.current?.value.length || 0;
          yearRef.current?.setSelectionRange(len, len);
        }
      } else if (e.key === 'Backspace') {
        const target = e.target as HTMLInputElement;
        if (target.selectionStart === 0 && target.selectionEnd === 0) {
          e.preventDefault();
          yearRef.current?.focus();
          const len = yearRef.current?.value.length || 0;
          yearRef.current?.setSelectionRange(len, len);
        }
      }
    },
    [emitChange]
  );

  // Handle month input
  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, ''); // Only digits

      // Limit to 2 digits
      const newMonth = raw.slice(0, 2);
      setLocalMonth(newMonth);
      monthValueRef.current = newMonth;
      emitChange(yearValueRef.current, newMonth, dayValueRef.current);
    },
    [emitChange]
  );

  // Handle day keydown
  const handleDayKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle digit keys
      if (/^[0-9]$/.test(e.key)) {
        const currentValue = dayRef.current?.value || '';
        const digit = parseInt(e.key, 10);

        // If current value is empty and digit > 3, auto-pad with 0
        if (currentValue.length === 0 && digit > 3) {
          e.preventDefault();
          const newDay = `0${e.key}`;
          setLocalDay(newDay);
          dayValueRef.current = newDay;
          emitChange(yearValueRef.current, monthValueRef.current, newDay);
          return;
        }

        // If already at 2 digits, ignore additional digits
        if (currentValue.length >= 2) {
          e.preventDefault();
          return;
        }
      }

      // Handle navigation
      if (e.key === 'ArrowLeft') {
        const target = e.target as HTMLInputElement;
        if (target.selectionStart === 0) {
          e.preventDefault();
          monthRef.current?.focus();
          const len = monthRef.current?.value.length || 0;
          monthRef.current?.setSelectionRange(len, len);
        }
      } else if (e.key === 'Backspace') {
        const target = e.target as HTMLInputElement;
        if (target.selectionStart === 0 && target.selectionEnd === 0) {
          e.preventDefault();
          monthRef.current?.focus();
          const len = monthRef.current?.value.length || 0;
          monthRef.current?.setSelectionRange(len, len);
        }
      }
    },
    [emitChange]
  );

  // Handle day input
  const handleDayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, ''); // Only digits

      // Limit to 2 digits
      const newDay = raw.slice(0, 2);
      setLocalDay(newDay);
      dayValueRef.current = newDay;
      emitChange(yearValueRef.current, monthValueRef.current, newDay);
    },
    [emitChange]
  );

  // Handle blur to validate and format
  const handleMonthBlur = useCallback(() => {
    const currentMonth = monthValueRef.current;
    if (currentMonth && currentMonth.length > 0) {
      const validated = validateMonth(currentMonth);
      if (validated !== currentMonth) {
        setLocalMonth(validated);
        monthValueRef.current = validated;
        emitChange(yearValueRef.current, validated, dayValueRef.current);
      }
    }
  }, [emitChange]);

  const handleDayBlur = useCallback(() => {
    const currentDay = dayValueRef.current;
    if (currentDay && currentDay.length > 0) {
      const validated = validateDay(currentDay, yearValueRef.current, monthValueRef.current);
      if (validated !== currentDay) {
        setLocalDay(validated);
        dayValueRef.current = validated;
        emitChange(yearValueRef.current, monthValueRef.current, validated);
      }
    }
  }, [emitChange]);

  // Handle paste - try to parse a date from clipboard
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');

      // Try to parse various date formats
      let parsed: { year: string; month: string; day: string } | null = null;

      // Try YYYY-MM-DD
      const isoMatch = pastedText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        parsed = { year: isoMatch[1], month: isoMatch[2], day: isoMatch[3] };
      }

      // Try YYYYMMDD (8 digits)
      const numericMatch = pastedText.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (!parsed && numericMatch) {
        parsed = { year: numericMatch[1], month: numericMatch[2], day: numericMatch[3] };
      }

      // Try MM/DD/YYYY or DD/MM/YYYY (assume MM/DD for now)
      const slashMatch = pastedText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!parsed && slashMatch) {
        // Assume MM/DD/YYYY format
        parsed = { year: slashMatch[3], month: slashMatch[1], day: slashMatch[2] };
      }

      if (parsed) {
        e.preventDefault();
        const validatedMonth = validateMonth(parsed.month);
        const validatedDay = validateDay(parsed.day, parsed.year, validatedMonth);

        setLocalYear(parsed.year);
        setLocalMonth(validatedMonth);
        setLocalDay(validatedDay);
        yearValueRef.current = parsed.year;
        monthValueRef.current = validatedMonth;
        dayValueRef.current = validatedDay;
        emitChange(parsed.year, validatedMonth, validatedDay);

        // Focus day field after paste
        dayRef.current?.focus();
      }
    },
    [emitChange]
  );

  return (
    <div
      style={{ ...containerStyle, ...style }}
      className={className}
      role="group"
      aria-label={ariaLabel}
    >
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        value={localYear}
        onChange={handleYearChange}
        onKeyDown={handleYearKeyDown}
        onPaste={handlePaste}
        placeholder="YYYY"
        style={yearFieldStyle}
        aria-label="Year"
        maxLength={4}
      />
      <span style={separatorStyle}>-</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        value={localMonth}
        onChange={handleMonthChange}
        onKeyDown={handleMonthKeyDown}
        onBlur={handleMonthBlur}
        onPaste={handlePaste}
        placeholder="MM"
        style={monthDayFieldStyle}
        aria-label="Month"
        maxLength={2}
      />
      <span style={separatorStyle}>-</span>
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        value={localDay}
        onChange={handleDayChange}
        onKeyDown={handleDayKeyDown}
        onBlur={handleDayBlur}
        onPaste={handlePaste}
        placeholder="DD"
        style={monthDayFieldStyle}
        aria-label="Day"
        maxLength={2}
      />
    </div>
  );
}

export default MaskedDateInput;
