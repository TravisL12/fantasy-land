import { initialStatColumnsState } from './statColumns.constants';
import {
  resetStatColumns,
  statColumnsReducer,
  toggleStatColumn,
} from './statColumns.slice';

const base = {
  scope: 'nfl:offense',
  defaults: ['rec', 'rec_yd'],
  order: ['rec_tgt', 'rec', 'rec_yd'],
};

describe('statColumns slice', () => {
  it('starts from the defaults and keeps catalog order', () => {
    const state = statColumnsReducer(
      initialStatColumnsState,
      toggleStatColumn({ ...base, stat: 'rec_tgt' }),
    );
    expect(state.selected['nfl:offense']).toEqual(['rec_tgt', 'rec', 'rec_yd']);
  });

  it('removes a selected stat and can reset to defaults', () => {
    let state = statColumnsReducer(
      initialStatColumnsState,
      toggleStatColumn({ ...base, stat: 'rec' }),
    );
    expect(state.selected['nfl:offense']).toEqual(['rec_yd']);

    state = statColumnsReducer(state, resetStatColumns('nfl:offense'));
    expect(state.selected['nfl:offense']).toBeUndefined();
  });
});
