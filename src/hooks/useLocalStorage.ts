import { useState, useEffect, useCallback, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValue = useCallback((): T => {
    try {
      if (typeof window === 'undefined') return initialValue;
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);
  const isUpdatingRef = useRef(false);

  const prevKeyRef = useRef(key);

  // Sync state whenever key changes
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      setStoredValue(readValue());
    }
  }, [key, readValue]);

  // Listen to cross-component and storage change events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = () => {
      if (isUpdatingRef.current) return;
      try {
        const fresh = readValue();
        setStoredValue(fresh);
      } catch (err) {
        console.warn(`Error syncing key "${key}":`, err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('studymate_data_changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('studymate_data_changed', handleStorageChange);
    };
  }, [key, readValue]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        isUpdatingRef.current = true;
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          window.dispatchEvent(new CustomEvent('studymate_data_changed', { detail: { key } }));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      } finally {
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

