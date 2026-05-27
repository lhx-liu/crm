import { useState, useEffect } from 'react';

/**
 * 防抖 hook：延迟更新值，避免频繁触发请求
 * @param {*} value - 需要防抖的值
 * @param {number} delay - 延迟毫秒数
 * @returns {*} 防抖后的值
 */
export default function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
