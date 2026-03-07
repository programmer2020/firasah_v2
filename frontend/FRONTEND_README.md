# Firasah AI - React Frontend

A modern React application for school management built with Vite, React Router, and Axios.

## Features

- **Authentication**: Login and Registration
- **Dashboard**: Main dashboard with quick access to all management features
- **Data Management**: 
  - Schools Management
  - Teachers Management
  - Classes Management
  - Subjects Management
  - Grades Management
  - Sections Management
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **JWT Authentication**: Secure API communication

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx              # Login page
│   │   ├── Register.jsx           # Registration page
│   │   ├── Dashboard.jsx          # Main dashboard
│   │   ├── Schools.jsx            # Schools management
│   │   ├── Teachers.jsx           # Teachers management
│   │   ├── Classes.jsx            # Classes management
│   │   ├── Subjects.jsx           # Subjects management
│   │   ├── Grades.jsx             # Grades management
│   │   ├── Sections.jsx           # Sections management
│   │   ├── Auth.css               # Authentication pages styles
│   │   ├── Dashboard.css          # Dashboard styles
│   │   └── DataManagement.css     # Data management pages styles
│   ├── services/
│   │   ├── api.js                 # Axios API configuration
│   │   └── authService.js         # Authentication API calls
│   ├── context/
│   │   └── AuthContext.jsx        # Auth context and hooks
│   ├── App.jsx                    # Main App component with routing
│   ├── App.css                    # Global styles
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Base styles
├── public/                        # Static files
├── package.json                   # Dependencies
├── vite.config.js                 # Vite configuration
└── README.md                      # This file
```

## Installation

### Prerequisites
- Node.js 20.17.0 or higher
- npm or yarn
- Backend server running on http://localhost:5000

### Setup Steps

1. **Navigate to frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173` (Vite default port)

## Available Scripts

### Development
```bash
npm run dev
```
Starts the development server with hot reload.

### Build
```bash
npm run build
```
Creates an optimized production build in the `dist/` folder.

### Preview
```bash
npm run preview
```
Preview the production build locally.

### Lint
```bash
npm run lint
```
Check code quality with ESLint.

## Environment Configuration

The frontend connects to the backend API running on `http://localhost:5000`.

**Modify API URL** in `src/services/api.js` if needed:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

## Key Technologies

- **React 19**: JavaScript library for building UI
- **Vite 8**: Next generation frontend tooling
- **React Router 7**: Client-side routing
- **Axios**: HTTP client for API calls
- **Context API**: State management for authentication

## Authentication Flow

1. User registers or logs in
2. JWT token is stored in localStorage
3. Token is automatically included in all API requests
4. Protected routes require valid token
5. Invalid tokens redirect to login

## API Integration

### Authentication Endpoints (Backend)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `POST /api/auth/change-password` - Change password (protected)

### Data Management Endpoints (TODO - To be created in backend)
- `GET /api/schools` - Get all schools
- `POST /api/schools` - Create school
- `DELETE /api/schools/:id` - Delete school
- Similar endpoints for teachers, classes, subjects, grades, sections

## Features & Pages

### Public Pages
- **Login**: Email and password login with error handling
- **Register**: New user registration with password confirmation

### Protected Pages
- **Dashboard**: Overview with quick stats and action buttons
- **Schools**: Add, view, edit, delete schools
- **Teachers**: Manage teacher information
- **Classes**: Manage class details
- **Subjects**: Manage subjects
- **Grades**: Manage grade levels
- **Sections**: Manage sections

## Setting Up Backend Integration

To enable data management features, the backend needs the following routes:

```javascript
// Schools Management
GET    /api/schools              // Get all schools
POST   /api/schools              // Create school
PUT    /api/schools/:id          // Update school
DELETE /api/schools/:id          // Delete school

// Teachers Management
GET    /api/teachers             // Get all teachers
POST   /api/teachers             // Create teacher
PUT    /api/teachers/:id         // Update teacher
DELETE /api/teachers/:id         // Delete teacher

// Classes Management
GET    /api/classes              // Get all classes
POST   /api/classes              // Create class
PUT    /api/classes/:id          // Update class
DELETE /api/classes/:id          // Delete class

// Subjects Management
GET    /api/subjects             // Get all subjects
POST   /api/subjects             // Create subject
PUT    /api/subjects/:id         // Update subject
DELETE /api/subjects/:id         // Delete subject

// Grades Management
GET    /api/grades               // Get all grades
POST   /api/grades               // Create grade
PUT    /api/grades/:id           // Update grade
DELETE /api/grades/:id           // Delete grade

// Sections Management
GET    /api/sections             // Get all sections
POST   /api/sections             // Create section
PUT    /api/sections/:id         // Update section
DELETE /api/sections/:id         // Delete section
```

## Styling

The application uses a modern gradient design with:
- Purple gradient theme (#667eea to #764ba2)
- Responsive grid layouts
- Smooth animations and transitions
- Clean and minimal design

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Lazy loading of routes
- Optimized bundle size with Vite
- Efficient API calls with request/response caching
- Automatic token refresh on 401 errors

## Future Enhancements

- [ ] Add edit functionality for data management
- [ ] Add search and filter capabilities
- [ ] Add export to CSV/PDF
- [ ] Add user profile editing
- [ ] Add system notifications
- [ ] Add dark mode support
- [ ] Add multi-language support (Arabic/English)
- [ ] Add advanced reporting

## Troubleshooting

### CORS Errors
If you get CORS errors:
- Ensure backend is running on http://localhost:5000
- Check CORS configuration in backend

### API Not Working
- Check if backend server is running
- Verify API endpoint URLs in `src/services/api.js`
- Check browser console for detailed errors

### Login Not Working
- Verify credentials are correct
- Check if backend database has user data
- Review backend logs for authentication errors

## Support & Documentation

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [React Router Documentation](https://reactrouter.com)
- [Axios Documentation](https://axios-http.com)

## License

This project is part of Firasah AI - School Management System.
