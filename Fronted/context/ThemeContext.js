import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    background: '#fff',
    text: '#020b73',
    secondaryText: '#333',
    border: '#eee',
    primary: '#F76B45',
    switchTrack: { false: '#767577', true: '#F76B45' },
  },
  dark: {
    background: '#1a1a1a',
    text: '#ffffff',
    secondaryText: '#cccccc',
    border: '#333333',
    primary: '#F76B45',
    switchTrack: { false: '#767577', true: '#F76B45' },
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const theme = isDarkMode ? themes.dark : themes.light;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 