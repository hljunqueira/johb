# Salada Soul - Frontend React Development

## Project Structure
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Location**: `frontend/src/`

## Key Files
- `frontend/src/pages/MenuPage.js` - Public menu (3-column layout)
- `frontend/src/pages/CheckoutPage.js` - Checkout flow
- `frontend/src/pages/AdminOrdersPage.js` - Admin orders dashboard
- `frontend/src/pages/AdminProductsPage.js` - Product management
- `frontend/src/context/CartContext.js` - Cart state management
- `frontend/src/context/AuthContext.js` - Authentication state
- `frontend/src/components/admin/` - Admin components
- `frontend/src/lib/api.js` - API client
- `frontend/src/lib/constants.js` - App constants

## Design Guidelines (from `docs/design_guidelines.json`)
- **Fonts**: Outfit (headings), DM Sans (body), Great Vibes (accent)
- **Colors**: Primary `#2A7D4B`, Accent `#F28F5E`, Background `#F9F7F2`
- **Layout**: 3-column for public menu (Sidebar 250px, Content, Cart 350px)
- **Border Radius**: `rounded-2xl` for cards, `rounded-full` for buttons
- **Shadows**: `shadow-[0_4px_20px_rgb(0,0,0,0.05)]` for cards
- **Components**: Use Shadcn UI components (already installed)

## Common Commands
```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Production build
npm test         # Run tests
```

## API Base URL
- Development: `http://localhost:8001/api`
- Use `VITE_API_URL` env variable if configured

## UI Patterns
- Use `sonner` for toasts
- Use `lucide-react` for icons
- Mobile-first responsive design
- Use `toast()` from `sonner` for notifications
