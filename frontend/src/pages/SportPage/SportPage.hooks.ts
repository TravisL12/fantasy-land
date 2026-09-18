import { useOutletContext } from 'react-router';
import type { SportOutletContext } from './SportPage.types';

/**
 * The catalog the sport layout already loaded. Views read it from here rather
 * than each fetching the sports list again, and it is what tells them which
 * seasons, groups, positions and scoring presets exist.
 */
export const useSportContext = () => useOutletContext<SportOutletContext>();
