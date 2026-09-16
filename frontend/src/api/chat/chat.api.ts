import { baseApi } from '@/api/baseApi';
import type { ChatStatus } from './chat.types';

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getChatStatus: build.query<ChatStatus, void>({
      query: () => '/chat/status',
    }),
  }),
});

export const { useGetChatStatusQuery } = chatApi;
