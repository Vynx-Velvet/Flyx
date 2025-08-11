/**
 * Simple test to verify Jest setup
 */

describe('Jest Setup', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have access to DOM testing utilities', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello World';
    expect(div).toHaveTextContent('Hello World');
  });
});