
import { useQuery } from '@tanstack/react-query';

export function useIcons() {
  return useQuery({
    queryKey: ['lucide-icons'],
    queryFn: async () => {
      const response = await fetch('https://lucide.dev/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch icons');
      }
      return response.json();
    }
  });
}
