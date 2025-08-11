# GELAG System - Form Management Application

## Overview
GELAG is a comprehensive form management system for quality control and production management in industrial environments. It enables the creation, capture, and management of digital forms with role-based access, signature capabilities, and workflow automation. The system features a modern web interface built with React and TypeScript, backed by a PostgreSQL database, aiming to streamline operations and enhance compliance.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The GELAG system utilizes a modern web architecture. The frontend is built with **React 18 and TypeScript**, using **shadcn/ui** for components and **Tailwind CSS** for styling. **TanStack Query** manages server state, and **Wouter** handles client-side routing, emphasizing a modular component structure. The backend is a **Node.js Express.js server** written in **TypeScript**, providing a **RESTful API** with **session-based authentication** via **Passport.js**. **Drizzle ORM** ensures type-safe database operations with **PostgreSQL** (hosted on Neon). File operations, including uploads and Excel parsing, are managed by **Multer** and **XLSX**. Key design patterns include **role-based access control** (SuperAdmin, Admin, Production, Quality, etc.), a **dynamic form builder** supporting various field types and advanced tables, and robust **workflow management** with digital signatures. Data is stored in a well-structured relational schema, with session data potentially stored in PostgreSQL for production. PDF generation is primarily handled by **Puppeteer**, with **PDFKit** as a fallback.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe database operations.
- **express**: Web server framework.
- **passport**: Authentication middleware.
- **@tanstack/react-query**: Data fetching and caching.
- **@radix-ui**: Accessible UI components foundation.
- **multer**: File upload handling.
- **xlsx**: Excel file parsing and generation.
- **puppeteer**: PDF generation from HTML.
- **pdfkit**: Alternative PDF generation library.
- **vite**: Build tool and development server.
- **typescript**: Type checking and compilation.
- **tailwindcss**: Utility-first CSS framework.
- **drizzle-kit**: Database schema management.