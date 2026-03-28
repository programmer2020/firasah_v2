import { useEffect } from 'react';

export const useAutoHideMessage = (message, setMessage, delay = 5000) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [message, setMessage, delay]);
};

export default useAutoHideMessage;
