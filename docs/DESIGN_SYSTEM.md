# Frontend Design System

This document defines the design rules and patterns for the Headhunter application frontend.

## Brand Colors

| Purpose | Color | Tailwind Class |
|---------|-------|----------------|
| **Primary** | Indigo | `bg-indigo-600`, `text-indigo-600` |
| **Primary Hover** | Indigo Dark | `bg-indigo-700` |
| **Secondary** | Slate | `bg-slate-100`, `text-slate-600` |
| **Success** | Emerald | `bg-emerald-500`, `text-emerald-600` |
| **Warning** | Amber | `bg-amber-500`, `text-amber-600` |
| **Danger** | Red | `bg-red-500`, `text-red-600` |
| **AI/Magic** | Indigo (same as primary) | `bg-indigo-600` |

## Typography

- **Headings**: `font-bold text-slate-900`
- **Labels**: `text-xs font-bold text-slate-500 uppercase`
- **Body Text**: `text-sm text-slate-600`
- **Helper Text**: `text-xs text-slate-400`

## Components

### Buttons

#### Primary Button (Form Submit, Save)

> **Note:** Use solid colors only. Do not use gradients for primary buttons to maintain consistency with the clean, flat design system.

```jsx
className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50"
```

#### Ghost Button — AI/Generate Actions (PREFERRED)

The simpler ghost/text style is preferred for AI generate and refresh buttons:

```jsx
className="text-sm flex items-center gap-1.5 text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-2 rounded-lg"
```

**Design Rules for AI Buttons:**

1. Use **Sparkles** icon (keep same icon, don't swap to Loader2)
2. Add `animate-spin` class to icon when loading
3. **Keep text static** (e.g., "Generate") during loading to prevent layout shifts/glitches
4. **Avoid opacity transitions** on disabled state to prevent ghosting artifacts

Example:

```jsx
<button onClick={generate} disabled={loading} className="text-sm flex items-center gap-1.5 text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-2 rounded-lg">
    <Sparkles size={14} className={loading ? "animate-spin" : ""} />
    <span>Generate</span>
</button>
```

#### Secondary Button

```jsx
className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
```

#### Danger Button

```jsx
className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700 transition"
```

### Inputs

#### Text Input

```jsx
className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
```

#### Select

```jsx
className="w-full p-2 border border-slate-200 rounded-lg text-sm"
```

#### Textarea

```jsx
className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
```

### Cards & Containers

#### Modal Container

```jsx
className="bg-white rounded-2xl shadow-2xl max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
```

#### Card

```jsx
className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
```

#### Section with Border

```jsx
className="border-t border-slate-200 pt-6"
```

### Tags & Badges

#### Skill Tag

```jsx
className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium"
```

#### Status Badge

```jsx
// Active/Success
className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold"

// Inactive/Pending
className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold"
```

### Icons

- Use **Lucide React** icons exclusively
- Default size: `size={16}` for buttons, `size={14}` for inline
- Loading spinner: `<Loader2 className="animate-spin" />`
- AI/Magic indicator: `<Sparkles />`

### Icon Containers (Auth/Features)

For feature icons or auth page headers, use solid light backgrounds with colored icons. **Do not use gradients.**

```jsx
// Correct
<div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
  <Icon className="w-8 h-8 text-indigo-600" />
</div>

// Incorrect (Do not use)
<div className="bg-gradient-to-br from-indigo-500 to-purple-600 ..." />
```

## Layout Patterns

### Page Header

Standardized header for all main pages.

```jsx
<PageHeader
    title="Page Title"
    subtitle="Optional subtitle text"
    icon={IconComponent}
    onOpenMobileSidebar={() => setShowSidebar(true)}
    actions={
        <button className="...">Action Button</button>
    }
/>
```

**Props:**

- `title`: String or React Node (required)
- `subtitle`: String (required) - Mini description of the page's purpose
- `icon`: Lucide Icon Component (required) - Displayed next to the title
- `actions`: React Node (optional) - Buttons or controls on the right
- `onOpenMobileSidebar`: Function (required) - Handler for mobile menu trigger

### Modal Header

```jsx
<div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
  <h2 className="text-xl font-bold text-slate-900">Title</h2>
  <button className="p-2 hover:bg-slate-200 rounded-lg transition">
    <X size={20} className="text-slate-500" />
  </button>
</div>
```

### Responsive Dashboard Grids

For KPI card layouts, use the following responsive grid pattern to preventing squeezing on tablet screens:

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards... */}
</div>
```

### Form Field with Label

```jsx
<div>
  <label className="block text-sm font-bold text-slate-700 mb-1">Label</label>
  <input ... />
</div>
```

### Input with Button (AI Generate Pattern)

```jsx
<div className="flex gap-2">
  <input className="flex-1 ..." />
  <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl ...">
    <Sparkles size={16} /> Generate
  </button>
</div>
<p className="text-xs text-slate-400 mt-1.5">Helper text</p>
```

## Animation Classes

- **Fade In**: `animate-in fade-in`
- **Slide Up**: `animate-in slide-in-from-bottom-4`
- **Zoom In**: `animate-in zoom-in-95`
- **Spin (Loading)**: `animate-spin`

## Spacing

- Modal padding: `p-6` or `p-8`
- Section gap: `space-y-6`
- Component gap: `gap-2` or `gap-4`
- Form fields: `space-y-4`

## Border Radius

- Buttons & Inputs: `rounded-xl` (12px)
- Cards & Modals: `rounded-2xl` (16px)
- Tags & Badges: `rounded-lg` (8px) or `rounded-full`
- Small elements: `rounded-lg` (8px)
