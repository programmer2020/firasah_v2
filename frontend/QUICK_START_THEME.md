# 🎯 Quick Start: Using the New Theme

## Current State ✅

Your Firasah AI project now has a **professional Tailwind CSS v4 theme system** with:
- 12 color families with multiple shades
- Dark mode toggle support
- Professional typography (Outfit font)
- Custom shadows and utilities
- Full dark mode support

## Access Points

### 1. Test the Theme
```
🌐 Visit: http://localhost:5174/theme-test
```
- See all colors in action
- Toggle between light/dark modes
- Preview typography and shadows

### 2. Main Application
```
🌐 Visit: http://localhost:5174
```
- Currently shows login page
- Navigate to dashboard after login
- (Backend running on http://localhost:5000)

## Using the Theme in Components

### Example: Button with Theme
```jsx
import { useTheme } from '@/context/ThemeContext';

function MyButton() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      onClick={toggleTheme}
      className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 transition-colors"
    >
      Theme: {theme}
    </button>
  );
}
```

### Example: Card with Dark Mode
```jsx
function Card({ children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-lg p-6 border border-gray-200 dark:border-gray-700">
      {children}
    </div>
  );
}
```

### Example: Form Input
```jsx
function Input({ placeholder }) {
  return (
    <input
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500"
    />
  );
}
```

## Color System

### Primary Colors
- **Brand**: #465fff (Blue - Main color)
- **Success**: #12b76a (Green - Positive actions)
- **Error**: #f04438 (Red - Errors)
- **Warning**: #f79009 (Orange - Warnings)

### Neutral
- **Gray**: 25-950 shades for text and backgrounds
- **Blue Light**: Cyan variants for secondary actions

### Using Colors
```jsx
// Light background with dark text
<div className="bg-gray-50 text-gray-900">

// Dark background with light text
<div className="dark:bg-gray-900 dark:text-gray-50">

// Brand colors
<button className="bg-brand-600 hover:bg-brand-700">

// Gradients
<div className="bg-gradient-to-r from-brand-600 to-brand-400">
```

## Dark Mode

### Toggle Dark Mode
```jsx
const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  Switch to {theme === 'light' ? 'dark' : 'light'} mode
</button>
```

### Style for Dark Mode
```jsx
// Automatic with dark:
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">

// Manual if needed
import { useTheme } from '@/context/ThemeContext';
const { theme } = useTheme();
if (theme === 'dark') { /* dark mode logic */ }
```

### Dark Mode Persistence
- Automatically saved to `localStorage.theme`
- Loads on page refresh
- Updates `document.documentElement.classList` with 'dark' class

## Typography

### Font: Outfit
All text uses the Outfit font family (Google Fonts).

### Sizes
- **Title 2XL**: 72px - Main page headings
- **Title XL**: 60px - Section headings
- **Title LG**: 48px - Subsection headings
- **Title MD**: 36px - Card titles
- **Base**: 16px - Body text
- **Small**: 14px - Secondary text
- **XS**: 12px - Labels and captions

### Usage
```jsx
<h1 className="font-outfit text-title-lg">Main Heading</h1>
<p className="font-outfit text-base">Body text</p>
<span className="font-outfit text-xs">Small label</span>
```

## Shadows

For depth and layering:
```jsx
// Light shadow
<div className="shadow-theme-xs">

// Medium shadow
<div className="shadow-theme-md">

// Heavy shadow (for modals, overlays)
<div className="shadow-theme-xl">
```

## Common Patterns

### Hero Banner
```jsx
<div className="bg-gradient-to-r from-brand-600 to-brand-400 text-white px-6 py-12 rounded-lg">
  <h1 className="text-title-xl">Welcome to Firasah</h1>
  <p className="text-lg opacity-90">Modern Education Management</p>
</div>
```

### Status Badge
```jsx
<span className="px-3 py-1 rounded-full text-sm font-semibold bg-success-100 text-success-700">
  Active
</span>

<span className="px-3 py-1 rounded-full text-sm font-semibold bg-error-100 text-error-700">
  Error
</span>
```

### Data Table Header
```jsx
<thead className="bg-gray-100 dark:bg-gray-800">
  <tr>
    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
      Column Name
    </th>
  </tr>
</thead>
```

### Form Section
```jsx
<div className="flex flex-col gap-4">
  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
    Email
  </label>
  <input
    type="email"
    placeholder="you@example.com"
    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500"
  />
</div>
```

## Next Tasks

1. **Update Login Page**
   - Apply theme colors and styling
   - Remove Auth.css and use Tailwind classes
   - Add professional form styling

2. **Update Dashboard**
   - Create card components with theme
   - Add data table styling
   - Implement action buttons

3. **Create Reusable Components**
   - Button (with variants)
   - Input (with validation states)
   - Card (with hover effects)
   - Badge (for status)

4. **Add Theme Toggle**
   - Add button to header/navbar
   - Show current theme
   - Toggle on click

## Troubleshooting

### Styles not appearing?
1. Check if you're using Tailwind classes (not CSS files)
2. Verify file is in `src/` (Tailwind scans from there)
3. Clear browser cache: Ctrl+Shift+Del
4. Restart dev server: Ctrl+C and `npm run dev`

### Dark mode not working?
1. Make sure `index.html` has `<html>` tag
2. Verify ThemeContext is wrapping App in `main.jsx`
3. Check browser DevTools: should see `class="dark"` on `<html>`
4. Try: `localStorage.setItem('theme', 'dark')` in console

### Colors look wrong?
1. Check if correct color variable is used: `bg-brand-600` not `bg-primary`
2. Verify dark mode class: `dark:bg-gray-800` for dark backgrounds
3. Check contrast: use lighter text on dark backgrounds

## Resources

📚 **Documentation**:
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [Dark Mode Guide](https://tailwindcss.com/docs/dark-mode)
- [Responsive Design](https://tailwindcss.com/docs/responsive-design)

📁 **Files**:
- Theme Config: `tailwind.config.js`
- PostCSS Config: `postcss.config.js`
- Theme Colors: `src/index.css`
- Dark Mode Context: `src/context/ThemeContext.tsx`
- Test Component: `src/components/ThemeTest.jsx`

---

🎉 **Happy styling! Your theme is ready to use.**

Need help? Check the THEME_INTEGRATION.md file for detailed information.
