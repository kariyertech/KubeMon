import { useEffect } from 'react';

const AIAssistantRedirect = () => {
  useEffect(() => {
    window.location.replace('/ai-analyze');
  }, []);
  return null;
};

export default AIAssistantRedirect;
