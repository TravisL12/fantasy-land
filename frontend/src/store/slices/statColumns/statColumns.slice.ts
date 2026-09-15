import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  initialStatColumnsState,
  STAT_COLUMNS_SLICE_NAME,
} from './statColumns.constants';
import type { StatColumnPayload } from './statColumns.types';

const statColumnsSlice = createSlice({
  name: STAT_COLUMNS_SLICE_NAME,
  initialState: initialStatColumnsState,
  reducers: {
    toggleStatColumn: (
      state,
      {
        payload: { scope, stat, defaults, order },
      }: PayloadAction<StatColumnPayload>,
    ) => {
      const current = state.selected[scope] ?? defaults;
      const next = current.includes(stat)
        ? current.filter((key) => key !== stat)
        : [...current, stat];
      state.selected[scope] = order.filter((key) => next.includes(key));
    },
    resetStatColumns: (state, { payload: scope }: PayloadAction<string>) => {
      delete state.selected[scope];
    },
  },
});

export const { toggleStatColumn, resetStatColumns } = statColumnsSlice.actions;
export const statColumnsReducer = statColumnsSlice.reducer;
