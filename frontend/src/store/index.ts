import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
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

// Focus tracking for RTK Query. No endpoint opts into refetchOnFocus, so this
// only powers `skipPollingIfUnfocused` — a backgrounded tab stops pinging the
// chat status, and stops holding the model in memory with it.
setupListeners(store.dispatch);

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
