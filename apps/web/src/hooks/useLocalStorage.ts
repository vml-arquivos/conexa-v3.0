import { useState, useEffect } from 'react';

/**
 * Hook para persistir estado no localStorage
 * 
 * @param key - Chave do localStorage
 * @param initialValue - Valor inicial se não houver nada no localStorage
 * @returns [value, setValue] - Estado e função para atualizar
 * 
 * @example
 * const [unitId, setUnitId] = useLocalStorage<string>('lastSelectedUnit', '');
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Ler valor inicial do localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Atualizar localStorage quando o valor mudar
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
