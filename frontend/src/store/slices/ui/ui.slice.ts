import { createSlice } from '@reduxjs/toolkit';
import { initialUiState, UI_SLICE_NAME } from './ui.constants';

const uiSlice = createSlice({
  name: UI_SLICE_NAME,
  initialState: initialUiState,
  reducers: {
    toggleNav: (state) => {
      state.isNavOpen = !state.isNavOpen;
    },
  },
});

export const { toggleNav } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
