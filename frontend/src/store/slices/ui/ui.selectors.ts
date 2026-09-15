import type { RootState } from '@/store';

export const selectIsNavOpen = (state: RootState) => state.ui.isNavOpen;
