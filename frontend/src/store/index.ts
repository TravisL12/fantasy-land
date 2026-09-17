import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/api/baseApi';
import { loadPersistedState, savePersistedState } from './persistence';
import { statColumnsReducer } from './slices/statColumns';

export const rootReducer = combineReducers({
  statColumns: statColumnsReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

export const makeStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

export const store = makeStore(loadPersistedState());

let lastStatColumns = store.getState().statColumns;
store.subscribe(() => {
  const state = store.getState();
  if (state.statColumns === lastStatColumns) return;
  lastStatColumns = state.statColumns;
  savePersistedState(state);
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
