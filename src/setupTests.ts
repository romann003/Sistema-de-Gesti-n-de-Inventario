// Setup testing-library matchers for Vitest
import { expect } from 'vitest';
import matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with testing-library matchers
expect.extend(matchers as any);

// polyfills or global mocks can be added here (localStorage, fetch, etc.)
import '@testing-library/jest-dom/extend-expect';
