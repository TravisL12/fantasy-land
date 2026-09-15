import { useGetMeQuery } from '@/api/auth';

export const useCurrentUser = () => {
  const { data, isLoading } = useGetMeQuery();
  return { user: data?.user ?? null, isLoading };
};
