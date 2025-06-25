# GELAG System - Form Management Application

## Overview

GELAG is a comprehensive form management system designed for quality control and production management in industrial environments. The system enables creation, capture, and management of digital forms with role-based access control, signature capabilities, and workflow automation. It features a modern web interface built with React and TypeScript, backed by a PostgreSQL database.

## System Architecture

### Frontend Architecture
- **Technology Stack**: React 18 with TypeScript, Vite for build tooling
- **UI Framework**: shadcn/ui components with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Component Architecture**: Modular component structure with reusable UI components

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with session-based authentication
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and bcrypt password hashing
- **File Processing**: Multer for file uploads, XLSX parsing for Excel import

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (cloud-managed)
- **Session Storage**: PostgreSQL-backed sessions for production, memory store for development
- **File Storage**: Local filesystem for uploaded files and generated PDFs
- **Database Schema**: Well-structured relational schema with proper foreign key relationships

## Key Components

### User Management System
- **Role-based Access Control**: SuperAdmin, Admin, Production, Quality, Production Manager, Quality Manager, Viewer roles
- **Department-based Organization**: Users are organized by departments (Production, Quality, Administration)
- **Authentication Flow**: Secure login with hashed passwords and session management

### Form Management System
- **Dynamic Form Builder**: Visual form builder with drag-and-drop interface
- **Form Templates**: Reusable form structures with JSON-based configuration
- **Advanced Table Components**: Complex table structures for data entry
- **Field Types**: Text, number, date, select, textarea, product picker, employee picker, advanced tables

### Production Management
- **Production Forms**: Specialized forms for manufacturing processes
- **Workflow Management**: Sequential approval processes with role-based permissions
- **Status Tracking**: Draft, In Progress, Completed, Signed, Approved statuses
- **Digital Signatures**: Canvas-based signature capture and storage

### Quality Control Features
- **Microbiological Analysis**: Specialized templates for laboratory analysis
- **Quality Verification**: Multi-stage quality control processes
- **Pre-operative Liberation**: Quality assurance workflows
- **Compliance Tracking**: Audit trail and compliance reporting

### Reporting and Export
- **PDF Generation**: Multiple PDF generation strategies (Puppeteer primary, PDFKit fallback)
- **Excel Export**: Data export to Excel format with formatting
- **Consolidated Reports**: Multi-form data aggregation and reporting
- **Custom Report Builder**: User-configurable report generation

## Data Flow

### Form Creation Flow
1. Admin/SuperAdmin creates form template using visual builder
2. Template structure stored as JSON in database
3. Template becomes available for data capture by authorized users

### Data Capture Flow
1. User selects form template and initiates data entry
2. Form data validated on client and server
3. Data stored with workflow status and creator information
4. Notifications sent to relevant stakeholders

### Workflow Approval Flow
1. Form submitted by initial user (Draft → In Progress)
2. Workflow progresses through role-based stages
3. Each stage requires specific user roles for approval
4. Final approval locks form and enables signature
5. Completed forms generate audit trail

### Export and Reporting Flow
1. User configures export parameters (date range, forms, fields)
2. System aggregates data from multiple sources
3. PDF/Excel generation with proper formatting
4. File served for download with proper headers

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **express**: Web server framework
- **passport**: Authentication middleware
- **@tanstack/react-query**: Data fetching and caching
- **@radix-ui**: Accessible UI components foundation

### File Processing
- **multer**: File upload handling
- **xlsx**: Excel file parsing and generation
- **puppeteer**: PDF generation from HTML
- **pdfkit**: Alternative PDF generation library

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database schema management

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: Neon PostgreSQL with connection pooling
- **Build Process**: Vite development server with HMR
- **Port Configuration**: Application runs on port 5000

### Production Deployment
- **Build Command**: `npm run build` (Vite + esbuild for server)
- **Start Command**: Database migration followed by server start
- **Environment Variables**: DATABASE_URL and SESSION_SECRET required
- **Scaling**: Configured for autoscale deployment target

### Database Management
- **Schema Migrations**: Drizzle Kit for schema synchronization
- **Connection Pooling**: Neon serverless driver with WebSocket support
- **Backup Strategy**: Cloud-managed backups through Neon platform

## Recent Changes

### June 25, 2025 - Complete Total Percentage Calculation System & PDF Export Fix
- **Implemented automatic total percentage calculation** for Liberación Preoperativa forms
- **Multi-field detection**: Enhanced template detection to work with formTemplate.name, formTitle, and structure properties
- **Real-time total updates**: "Porcentaje Cumplimiento Total" field updates automatically when individual section percentages change
- **Weighted average calculation**: Uses 20% weight per section (Marmitas, Dulces, Producción, Reposo, Limpieza) for balanced scoring
- **Direct calculation integration**: Total percentage updates immediately after individual section calculations complete
- **Comprehensive logging**: Detailed console logs for debugging and verification of calculation process
- **Proven functionality**: System verified working with live data showing 92% total from individual section percentages
- **Fixed PDF export formatting**: Replaced JSON display with professional structured format for Liberación Preoperativa forms
- **Added folio filter**: New filter in captured forms page allows searching by folio number or production folio
- **Employee module access for managers**: Production and quality managers can now access employee module, create operative employees, but cannot delete any employees
- **Enhanced PDF export for PR-PR-02 forms**: REVISION table moved to new page, added all additional form fields and tabs data including cono tables, empaque tables, and detailed observations

### June 24, 2025 - Checkbox System Resolution and Enhancement
- **Fixed checkbox rendering issue**: Resolved template/code mismatch where columns were defined as "select" type but needed checkbox behavior
- **Enhanced column detection**: Added smart detection for revision_visual columns to render as checkboxes regardless of type definition
- **Improved user interface**: Checkboxes now display correctly in all Liberación Preoperativa tables
- **Percentage calculation fix**: Updated calculation logic to handle both uppercase "SI" and lowercase "si" values
- **Template compatibility**: System now handles mixed column type definitions gracefully

### June 23, 2025 - Automatic Percentage Calculation System
- **Implemented automatic percentage calculation** for Liberación Preoperativa forms
- **Server-side calculation**: Percentages update automatically when checklist data is saved
- **Multi-section support**: Calculates compliance percentages for all 5 sections (Marmitas, Dulces, Producción, Reposo, Limpieza)
- **Real-time updates**: Percentages recalculate instantly when users make SI/NO selections
- **Smart logic**: Only counts "SI" selections, ignores "NO" and empty values
- **Example**: 3 out of 4 items marked "SI" = 75% compliance automatically calculated

### System Architecture Updates
- **Enhanced form processing**: Added percentage calculation middleware in server routes
- **Improved data flow**: Automatic calculation happens during form save operations
- **Template detection**: System automatically identifies Liberación Preoperativa forms for percentage processing
- **Checkbox rendering system**: Advanced table viewer now supports multiple column type interpretations for optimal user experience

## Changelog

- June 23, 2025. Initial setup and automatic percentage calculation implementation

## User Preferences

Preferred communication style: Simple, everyday language.